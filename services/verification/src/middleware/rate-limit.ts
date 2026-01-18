import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

interface RateLimitOptions {
  maxRequests: number;
  windowHours: number;
}

/**
 * Rate limiting middleware using DynamoDB for distributed rate limiting.
 * Tracks requests per client within a sliding time window.
 * @param options - Rate limit configuration (maxRequests per windowHours)
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const { maxRequests, windowHours } = options;

  return {
    before: async (request: any) => {
      const event = request.event;

      // Extract client identifier from request context
      const clientId =
        event.requestContext?.authorizer?.claims?.sub ||
        event.requestContext?.identity?.sourceIp ||
        'anonymous';

      const now = Date.now();
      const windowStart = now - (windowHours * 60 * 60 * 1000);
      const rateLimitKey = `RATE_LIMIT#${clientId}#data-request`;

      try {
        // Get current rate limit record
        const response = await dynamodb.send(
          new GetItemCommand({
            TableName: tableName,
            Key: marshall({
              PK: rateLimitKey,
              SK: 'COUNTER',
            }),
          })
        );

        if (response.Item) {
          const record = unmarshall(response.Item);
          const requestCount = record.requestCount || 0;
          const lastReset = record.lastReset || 0;

          // Check if window has expired
          if (lastReset < windowStart) {
            // Reset counter
            await dynamodb.send(
              new PutItemCommand({
                TableName: tableName,
                Item: marshall({
                  PK: rateLimitKey,
                  SK: 'COUNTER',
                  requestCount: 1,
                  lastReset: now,
                  ttl: Math.floor((now + (windowHours * 60 * 60 * 1000)) / 1000),
                }),
              })
            );
          } else if (requestCount >= maxRequests) {
            // Rate limit exceeded
            const resetTime = new Date(lastReset + (windowHours * 60 * 60 * 1000)).toISOString();
            const error: any = new Error('Rate limit exceeded');
            error.statusCode = 429;
            error.body = JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Maximum ${maxRequests} requests per ${windowHours} hour(s) allowed`,
              retryAfter: resetTime,
            });
            throw error;
          } else {
            // Increment counter
            await dynamodb.send(
              new UpdateItemCommand({
                TableName: tableName,
                Key: marshall({
                  PK: rateLimitKey,
                  SK: 'COUNTER',
                }),
                UpdateExpression: 'SET requestCount = requestCount + :inc',
                ExpressionAttributeValues: marshall({
                  ':inc': 1,
                }),
              })
            );
          }
        } else {
          // First request in window
          await dynamodb.send(
            new PutItemCommand({
              TableName: tableName,
              Item: marshall({
                PK: rateLimitKey,
                SK: 'COUNTER',
                requestCount: 1,
                lastReset: now,
                ttl: Math.floor((now + (windowHours * 60 * 60 * 1000)) / 1000),
              }),
            })
          );
        }
      } catch (error: any) {
        // If it's our rate limit error, rethrow it
        if (error.statusCode === 429) {
          throw error;
        }
        // Otherwise, log and allow request (fail open)
        console.error('Rate limit check failed:', error);
      }
    },
    onError: async (request: any) => {
      // Handle rate limit errors
      if (request.error?.statusCode === 429) {
        request.response = {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600', // 1 hour in seconds
          },
          body: request.error.body,
        };
      }
    },
  };
};
