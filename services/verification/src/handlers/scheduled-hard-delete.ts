import { DynamoDBClient, QueryCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { createHash } from 'crypto';
import { AuditService } from '../services/audit';

/** Number of days to look back for missed deletions in the queue */
const DELETION_QUEUE_LOOKBACK_DAYS = 60;

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });
const auditService = new AuditService();
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

/**
 * Scheduled job to perform hard deletion of data.
 * Runs daily at 2 AM UTC via EventBridge.
 * Deletes S3 objects, DynamoDB items, and anonymizes audit logs.
 */
export async function scheduledHardDelete(): Promise<void> {
  console.log('Starting scheduled hard delete job');

  try {
    const today = new Date().toISOString().split('T')[0];
    const deletionItems = await queryDeletionQueue(today);

    console.log(`Found ${deletionItems.length} deletion items to process`);

    for (const item of deletionItems) {
      try {
        await processHardDelete(item);
      } catch (error) {
        console.error(`Failed to process deletion item ${item.requestId}:`, error);
      }
    }

    console.log('Scheduled hard delete job completed');
  } catch (error) {
    console.error('Scheduled hard delete job failed:', error);
    throw error;
  }
}

async function queryDeletionQueue(maxDate: string): Promise<any[]> {
  const items: any[] = [];
  const dates = generateDateRange(maxDate);

  for (const date of dates) {
    let lastEvaluatedKey: any = undefined;

    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: marshall({
        ':pk': `DELETION_QUEUE#${date}`,
        ':pending': 'pending',
      }),
    };

    do {
      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await dynamodb.send(new QueryCommand(queryParams));
      if (response.Items) {
        items.push(...response.Items.map(item => unmarshall(item)));
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
  }

  return items;
}

/**
 * Generates a range of dates to check for pending deletions.
 * Looks back DELETION_QUEUE_LOOKBACK_DAYS to catch any missed deletions.
 * @param maxDate - The maximum date (today) in YYYY-MM-DD format
 * @returns Array of date strings in YYYY-MM-DD format
 */
function generateDateRange(maxDate: string): string[] {
  const dates: string[] = [];
  const today = new Date(maxDate);

  for (let i = 0; i < DELETION_QUEUE_LOOKBACK_DAYS; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

async function processHardDelete(deletionItem: any): Promise<void> {
  console.log(`Processing hard delete for request ${deletionItem.requestId}`);

  const { requestId, itemsToDelete, subjectIdentifier } = deletionItem;

  try {
    // Delete S3 objects with individual error handling
    const s3Items = itemsToDelete.filter((item: any) => item.type === 's3');
    const s3Results = await Promise.allSettled(
      s3Items.map((item: any) =>
        s3.send(
          new DeleteObjectCommand({
            Bucket: item.bucket,
            Key: item.key,
          })
        )
      )
    );

    const s3Successes = s3Results.filter(r => r.status === 'fulfilled').length;
    const s3Failures = s3Results.filter(r => r.status === 'rejected');

    if (s3Failures.length > 0) {
      console.warn(`${s3Failures.length} S3 deletions failed:`, s3Failures.map(f => (f as PromiseRejectedResult).reason?.message));
    }
    console.log(`Deleted ${s3Successes}/${s3Items.length} S3 objects`);

    // Delete DynamoDB items (except audit logs) with individual error handling
    const dynamoItems = itemsToDelete.filter((item: any) => item.type === 'dynamodb' && !item.pk.startsWith('AUDIT#'));
    const dynamoResults = await Promise.allSettled(
      dynamoItems.map((item: any) =>
        dynamodb.send(
          new DeleteItemCommand({
            TableName: tableName,
            Key: {
              PK: { S: item.pk },
              SK: { S: item.sk },
            },
          })
        )
      )
    );

    const dynamoSuccesses = dynamoResults.filter(r => r.status === 'fulfilled').length;
    const dynamoFailures = dynamoResults.filter(r => r.status === 'rejected');

    if (dynamoFailures.length > 0) {
      console.warn(`${dynamoFailures.length} DynamoDB deletions failed:`, dynamoFailures.map(f => (f as PromiseRejectedResult).reason?.message));
    }
    console.log(`Deleted ${dynamoSuccesses}/${dynamoItems.length} DynamoDB items`);

    // Anonymize audit logs
    await anonymizeAuditLogs(subjectIdentifier);

    // Mark deletion queue item as completed
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: deletionItem.PK },
          SK: { S: deletionItem.SK },
        },
        UpdateExpression: 'SET #status = :completed, updatedAt = :updated',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':completed': 'completed',
          ':updated': new Date().toISOString(),
        }),
      })
    );

    // Audit log
    await auditService.logEvent({
      action: 'DATA_HARD_DELETION_COMPLETED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'success',
      metadata: {
        subjectIdentifier,
        s3ObjectsDeleted: s3Items.length,
        dynamoItemsDeleted: dynamoItems.length,
      },
    });

    console.log(`Hard delete completed for request ${requestId}`);
  } catch (error) {
    console.error(`Hard delete failed for request ${requestId}:`, error);

    await auditService.logEvent({
      action: 'DATA_HARD_DELETION_FAILED',
      resourceId: requestId,
      resourceType: 'data_request',
      status: 'failure',
      errorCode: 'HARD_DELETE_ERROR',
      metadata: {
        error: (error as Error).message,
      },
    });

    throw error;
  }
}

async function anonymizeAuditLogs(subjectIdentifier: any): Promise<void> {
  const auditLogs = await queryAuditLogsBySubject(subjectIdentifier);
  const hash = createHash('sha256').update(subjectIdentifier.value).digest('hex');

  const updatePromises = auditLogs.map(log =>
    dynamodb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          PK: { S: log.PK },
          SK: { S: log.SK },
        },
        UpdateExpression: 'SET userId = :hash, anonymizedAt = :anonymizedAt',
        ExpressionAttributeValues: marshall({
          ':hash': `ANONYMIZED#${hash}`,
          ':anonymizedAt': new Date().toISOString(),
        }),
      })
    )
  );

  await Promise.all(updatePromises);
  console.log(`Anonymized ${auditLogs.length} audit log entries`);
}

async function queryAuditLogsBySubject(subjectIdentifier: any): Promise<any[]> {
  const auditLogs: any[] = [];
  let lastEvaluatedKey: any = undefined;

  const queryParams: any = {
    TableName: tableName,
    IndexName: 'GSI5',
    KeyConditionExpression: 'GSI5PK = :userId',
    ExpressionAttributeValues: marshall({
      ':userId': `USER#${subjectIdentifier.value}`,
    }),
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
  } while (lastEvaluatedKey);

  return auditLogs;
}

export const handler = scheduledHardDelete;
