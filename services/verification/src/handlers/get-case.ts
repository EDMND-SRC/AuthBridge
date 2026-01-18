import middy from '@middy/core';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auditContextMiddleware } from '../middleware/audit-context';
import { securityHeadersMiddleware } from '../middleware/security-headers';
import { requirePermission } from '../middleware/rbac';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'af-south-1' }));
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'af-south-1' });

async function baseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { id } = event.pathParameters || {};
  const userId = event.requestContext?.authorizer?.claims?.sub || 'unknown';
  const ipAddress = event.requestContext?.identity?.sourceIp || 'unknown';
  const requestId = event.requestContext?.requestId || 'unknown';
  const startTime = Date.now();

  if (!id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Case ID required' }),
    };
  }

  try {
    // Get case data
    const caseResult = await ddbClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { PK: `CASE#${id}`, SK: `CASE#${id}` },
      })
    );

    if (!caseResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Case not found' }),
      };
    }

    const caseData = caseResult.Item;

    // Generate presigned URLs for documents
    const documents = await generateDocumentUrls(caseData.documents);

    // Get case history
    const historyResult = await ddbClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CASE#${id}`,
          ':sk': 'HISTORY#',
        },
        ScanIndexForward: false,
        Limit: 50,
      })
    );

    // Audit log the case view
    await logCaseView(id, userId, ipAddress);

    const queryTimeMs = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          caseId: id,
          status: caseData.status,
          customer: caseData.customer,
          documents,
          extractedData: caseData.extractedData,
          verificationChecks: caseData.verificationChecks,
          history: historyResult.Items?.map(formatHistoryItem) || [],
          metadata: caseData.metadata,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          queryTimeMs,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching case:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

export const handler = middy(baseHandler)
  .use(auditContextMiddleware())
  .use(requirePermission('/api/v1/cases/*', 'read'))
  .use(securityHeadersMiddleware());

async function generateDocumentUrls(docs: any) {
  const result: any = {};
  for (const [key, doc] of Object.entries(docs || {})) {
    if (doc && typeof doc === 'object' && 's3Key' in doc && typeof doc.s3Key === 'string') {
      result[key] = {
        url: await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: doc.s3Key,
          }),
          { expiresIn: 900 }
        ),
        uploadedAt: 'uploadedAt' in doc ? doc.uploadedAt : undefined,
      };
    }
  }
  return result;
}

async function logCaseView(caseId: string, userId: string, ipAddress: string) {
  const timestamp = new Date().toISOString();
  await ddbClient.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        PK: `CASE#${caseId}`,
        SK: `AUDIT#${timestamp}`,
        action: 'CASE_VIEWED',
        resourceType: 'CASE',
        resourceId: caseId,
        userId,
        ipAddress,
        timestamp,
        details: { fullOmangAccessed: true },
      },
    })
  );
}

function formatHistoryItem(item: any) {
  return {
    timestamp: item.timestamp,
    type: item.type || 'system',
    action: item.action,
    userId: item.userId,
    userName: item.userName,
    details: item.details,
  };
}
