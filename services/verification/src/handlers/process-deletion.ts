import { DynamoDBClient, QueryCommand, UpdateItemCommand, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AuditService } from '../services/audit';
import { updateRequestStatus } from '../utils/data-request-utils';
import type { DeletionQueueItem, SubjectIdentifierType, SubjectIdentifier, DataRequestEntity } from '../types/data-request';

/** Supported subject identifier types for data deletion */
const SUPPORTED_IDENTIFIER_TYPES: SubjectIdentifierType[] = ['email', 'omangNumber', 'verificationId'];

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

/**
 * Processes a data deletion request.
 * Performs soft delete (anonymizes PII) and queues hard delete for 30 days later.
 * @param event - Event containing requestId
 */
export async function processDeletion(event: { requestId: string }): Promise<void> {
  const { requestId } = event;

  try {
    // Get data request details and check status for idempotency
    const dataRequest = await getDataRequest(requestId);

    // Idempotency check: skip if already processed
    if (dataRequest.status !== 'pending') {
      console.log(`Deletion request ${requestId} already ${dataRequest.status}, skipping`);
      return;
    }

    // Update status to processing
    await updateRequestStatus(dynamodb, tableName, requestId, 'processing');

    const { subjectIdentifier } = dataRequest;

    // Query all items to delete
    const verifications = await queryVerifications(subjectIdentifier);
    const documents = await queryAllDocuments(verifications);

    // Build deletion queue item
    const itemsToDelete: any[] = [];

    // Add verification cases
    verifications.forEach(verification => {
      itemsToDelete.push({
        type: 'dynamodb',
        pk: verification.PK,
        sk: verification.SK,
      });
    });

    // Add documents
    documents.forEach(doc => {
      itemsToDelete.push({
        type: 'dynamodb',
        pk: doc.PK,
        sk: doc.SK,
      });
      if (doc.s3Key) {
        itemsToDelete.push({
          type: 's3',
          bucket: process.env.DOCUMENTS_BUCKET || 'authbridge-documents-staging',
          key: doc.s3Key,
        });
      }
    });

    // Soft delete: Anonymize PII in DynamoDB
    await softDeleteVerifications(verifications);

    // Queue hard delete for 30 days later
    const scheduledDate = new Date(dataRequest.scheduledDeletionDate);
    const deletionQueueItem: DeletionQueueItem = {
      PK: `DELETION_QUEUE#${scheduledDate.toISOString().split('T')[0]}`,
      SK: `${scheduledDate.toISOString()}#${requestId}`,
      requestId,
      subjectIdentifier,
      itemsToDelete,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall(deletionQueueItem, { removeUndefinedValues: true }),
      })
    );

    // Update request status to completed (soft delete done)
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: `DSR#${requestId}` },
          SK: { S: 'META' },
        },
        UpdateExpression: 'SET #status = :status, completedAt = :completed, updatedAt = :updated',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'completed',
          ':completed': new Date().toISOString(),
          ':updated': new Date().toISOString(),
        }),
      })
    );

    // Audit log
    await auditService.logEvent({
      action: 'DATA_DELETION_COMPLETED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'success',
      metadata: {
        subjectIdentifier,
        recordCount: verifications.length,
        scheduledHardDelete: scheduledDate.toISOString(),
      },
    });

    console.log(`Soft deletion completed for request ${requestId}. Hard delete scheduled for ${scheduledDate.toISOString()}`);
  } catch (error) {
    console.error(`Deletion failed for request ${requestId}:`, error);

    // Update status to failed
    await updateRequestStatus(dynamodb, tableName, requestId, 'failed', (error as Error).message);

    // Audit log
    await auditService.logEvent({
      action: 'DATA_DELETION_FAILED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'failure',
      errorCode: 'DELETION_ERROR',
      metadata: {
        error: (error as Error).message,
      },
    });
  }
}

/**
 * Retrieves a data request by ID using direct key access.
 * @param requestId - The data request ID (without DSR# prefix)
 * @returns The data request entity
 * @throws Error if request not found
 */
async function getDataRequest(requestId: string): Promise<DataRequestEntity> {
  const response = await dynamodb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: `DSR#${requestId}` },
        SK: { S: 'META' },
      },
    })
  );

  if (!response.Item) {
    throw new Error(`Data request ${requestId} not found`);
  }

  return unmarshall(response.Item) as DataRequestEntity;
}

/**
 * Queries all verification cases for a subject identifier.
 * @param subjectIdentifier - The subject identifier (email, omangNumber, or verificationId)
 * @returns Array of verification records
 * @throws Error if subject identifier type is not supported
 */
async function queryVerifications(subjectIdentifier: SubjectIdentifier): Promise<Record<string, any>[]> {
  // Validate subject identifier type
  if (!SUPPORTED_IDENTIFIER_TYPES.includes(subjectIdentifier.type)) {
    throw new Error(`Unsupported subject identifier type: ${subjectIdentifier.type}. Supported types: ${SUPPORTED_IDENTIFIER_TYPES.join(', ')}`);
  }

  const verifications: any[] = [];
  let lastEvaluatedKey: any = undefined;

  const queryParams: any = {
    TableName: tableName,
  };

  if (subjectIdentifier.type === 'email') {
    queryParams.IndexName = 'GSI1';
    queryParams.KeyConditionExpression = 'GSI1PK = :email';
    queryParams.ExpressionAttributeValues = marshall({ ':email': `EMAIL#${subjectIdentifier.value}` });
  } else if (subjectIdentifier.type === 'omangNumber') {
    queryParams.IndexName = 'GSI1';
    queryParams.KeyConditionExpression = 'GSI1PK = :omang';
    queryParams.ExpressionAttributeValues = marshall({ ':omang': `OMANG#${subjectIdentifier.value}` });
  } else if (subjectIdentifier.type === 'verificationId') {
    queryParams.KeyConditionExpression = 'PK = :pk';
    queryParams.ExpressionAttributeValues = marshall({ ':pk': `CASE#${subjectIdentifier.value}` });
  }

  do {
    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await dynamodb.send(new QueryCommand(queryParams));
    if (response.Items) {
      verifications.push(...response.Items.map(item => unmarshall(item)));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return verifications;
}

/**
 * Queries all documents for multiple verification cases.
 * @param verifications - Array of verification records
 * @returns Array of all document records
 */
async function queryAllDocuments(verifications: Record<string, any>[]): Promise<Record<string, any>[]> {
  const allDocuments: any[] = [];

  for (const verification of verifications) {
    const response = await dynamodb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': verification.PK,
          ':sk': 'DOC#',
        }),
      })
    );

    if (response.Items) {
      allDocuments.push(...response.Items.map(item => unmarshall(item)));
    }
  }

  return allDocuments;
}

/**
 * Performs soft delete by anonymizing PII fields in verification records.
 * Replaces personal data with [DELETED] placeholder.
 * @param verifications - Array of verification records to anonymize
 */
async function softDeleteVerifications(verifications: Record<string, any>[]): Promise<void> {
  const updatePromises = verifications.map(verification =>
    dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: verification.PK },
          SK: { S: verification.SK },
        },
        UpdateExpression: 'SET #status = :deleted, customerName = :deleted_val, customerEmail = :deleted_val, customerPhone = :deleted_val, deletedAt = :deletedAt, updatedAt = :updated',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':deleted': 'deleted',
          ':deleted_val': '[DELETED]',
          ':deletedAt': new Date().toISOString(),
          ':updated': new Date().toISOString(),
        }),
      })
    )
  );

  await Promise.all(updatePromises);
}

export const handler = processDeletion;
