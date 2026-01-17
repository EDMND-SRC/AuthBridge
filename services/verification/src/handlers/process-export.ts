import { DynamoDBClient, QueryCommand, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AuditService } from '../services/audit';
import { updateRequestStatus } from '../utils/data-request-utils';
import type { ExportData, SubjectIdentifierType } from '../types/data-request';

/** Supported subject identifier types for data export */
const SUPPORTED_IDENTIFIER_TYPES: SubjectIdentifierType[] = ['email', 'omangNumber', 'verificationId'];

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';
const exportBucket = process.env.EXPORT_BUCKET || 'authbridge-data-exports-staging';
const documentsBucket = process.env.DOCUMENTS_BUCKET || 'authbridge-documents-staging';

/**
 * Processes a data export request.
 * Queries all subject data, generates JSON export, uploads to S3, and creates presigned URL.
 * @param event - Event containing requestId
 */
export async function processExport(event: { requestId: string }): Promise<void> {
  const { requestId } = event;

  try {
    // Update status to processing
    await updateRequestStatus(dynamodb, tableName, requestId, 'processing');

    // Get data request details
    const dataRequest = await getDataRequest(requestId);
    const { subjectIdentifier } = dataRequest;

    // Query all data for subject
    const verifications = await queryVerifications(subjectIdentifier);
    const auditLogs = await queryAuditLogs(subjectIdentifier);

    // Generate export data
    const exportData: ExportData = {
      exportMetadata: {
        exportId: requestId,
        exportedAt: new Date().toISOString(),
        subjectIdentifier: subjectIdentifier.value,
        dataCategories: ['verifications', 'documents', 'auditLogs'],
      },
      personalData: extractPersonalData(verifications),
      verifications: await enrichVerificationsWithDocuments(verifications),
      auditLogs: formatAuditLogs(auditLogs),
    };

    // Upload to S3
    const exportKey = `exports/${requestId}/data-export.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: exportBucket,
        Key: exportKey,
        Body: JSON.stringify(exportData, null, 2),
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
      })
    );

    // Generate presigned URL (1 hour expiry)
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: exportBucket,
        Key: exportKey,
      }),
      { expiresIn: 3600 }
    );

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Update request with download URL
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: `DSR#${requestId}` },
          SK: { S: 'META' },
        },
        UpdateExpression: 'SET #status = :status, exportUrl = :url, exportExpiresAt = :expires, completedAt = :completed, updatedAt = :updated',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':url': { S: downloadUrl },
          ':expires': { S: expiresAt },
          ':completed': { S: new Date().toISOString() },
          ':updated': { S: new Date().toISOString() },
        },
      })
    );

    // Audit log
    await auditService.logEvent({
      action: 'DATA_EXPORT_COMPLETED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'success',
      metadata: {
        subjectIdentifier,
        recordCount: verifications.length,
      },
    });

    console.log(`Export completed for request ${requestId}`);
  } catch (error) {
    console.error(`Export failed for request ${requestId}:`, error);

    // Update status to failed
    await updateRequestStatus(dynamodb, tableName, requestId, 'failed', (error as Error).message);

    // Audit log
    await auditService.logEvent({
      action: 'DATA_EXPORT_FAILED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'failure',
      errorCode: 'EXPORT_ERROR',
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
async function getDataRequest(requestId: string): Promise<any> {
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

  return unmarshall(response.Item);
}

/**
 * Queries all verification cases for a subject identifier.
 * @param subjectIdentifier - The subject identifier (email, omangNumber, or verificationId)
 * @returns Array of verification records
 * @throws Error if subject identifier type is not supported
 */
async function queryVerifications(subjectIdentifier: any): Promise<any[]> {
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

async function queryAuditLogs(subjectIdentifier: any): Promise<any[]> {
  const auditLogs: any[] = [];
  let lastEvaluatedKey: any = undefined;

  const queryParams: any = {
    TableName: tableName,
    IndexName: 'GSI5',
    KeyConditionExpression: 'GSI5PK = :userId',
    ExpressionAttributeValues: marshall({
      ':userId': `USER#${subjectIdentifier.value}`,
    }),
    Limit: 1000,
  };

  do {
    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await dynamodb.send(new QueryCommand(queryParams));
    if (response.Items) {
      auditLogs.push(...response.Items.map(item => unmarshall(item)));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey && auditLogs.length < 1000);

  return auditLogs;
}

function extractPersonalData(verifications: any[]): any {
  if (verifications.length === 0) return {};

  const firstCase = verifications[0];
  return {
    email: firstCase.customerEmail,
    name: firstCase.customerName,
    phone: firstCase.customerPhone,
  };
}

async function enrichVerificationsWithDocuments(verifications: any[]): Promise<any[]> {
  return Promise.all(
    verifications.map(async (verification) => {
      const documents = await queryDocuments(verification.verificationId);

      const documentsWithUrls = await Promise.all(
        documents.map(async (doc) => ({
          documentId: doc.documentId,
          documentType: doc.type,
          downloadUrl: await generatePresignedUrl(doc.s3Key),
          uploadedAt: doc.uploadedAt,
        }))
      );

      return {
        verificationId: verification.verificationId,
        status: verification.status,
        documentType: verification.documentType,
        createdAt: verification.createdAt,
        completedAt: verification.completedAt,
        extractedData: verification.ocrData,
        biometricScore: verification.biometricScore,
        documents: documentsWithUrls,
      };
    })
  );
}

async function queryDocuments(verificationId: string): Promise<any[]> {
  const response = await dynamodb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `CASE#${verificationId}`,
        ':sk': 'DOC#',
      }),
    })
  );

  return response.Items?.map(item => unmarshall(item)) || [];
}

async function generatePresignedUrl(s3Key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: documentsBucket,
      Key: s3Key,
    }),
    { expiresIn: 3600 }
  );
}

function formatAuditLogs(auditLogs: any[]): any[] {
  return auditLogs.map(log => ({
    timestamp: log.timestamp,
    action: log.action,
    details: log.metadata || {},
  }));
}

export const handler = processExport;
