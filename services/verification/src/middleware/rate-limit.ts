/**
 * Rate Limiting Middleware for Data Requests
 * Implements per-client rate limiting for data export/deletion requests
 * Story 5.3 - Task 1, Subtask 1.5
 */

import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getAuditContext } from './audit-context';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME || 'AuthBridgeTable';

/** Default: 10 requests per hour per client for data requests */
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_HOURS = 1;

export interface RateLimitConfig {
  maxRequests?: number;
  windowHours?: number;
}

interface RateLimitEntry {
  PK: string;
  SK: string;
  requestCount: number;
  windowStart: string;
  ttl: number;
}

/**
 * Rate limit middleware for data request endpoints
 * Uses DynamoDB for distributed rate limiting across Lambda instances
 */
export function rateLimitMiddleware(config?: RateLimitConfig): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> {
  const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowHours = config?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const windowMs = windowHours * 60 * 60 * 1000;

  return {
    before: async (request) => {
      const auditContext = getAuditContext(request.event);
      const clientId = auditContext.clientId || auditContext.userId || 'anonymous';

      const now = Date.now();
      const rateLimitKey = `RATE_LIMIT#DATA_REQUEST#${clientId}`;

      try {
        // Get current rate limit entry
        const response = await dynamodb.send(
          new GetItemCommand({
            TableName: tableName,
            Key: {
              PK: { S: rateLimitKey },
              SK: { S: 'COUNTER' },
            },
          })
        );

        let entry: RateLimitEntry | null = null;
        if (response.Item) {
          entry = unmarshall(response.Item) as RateLimitEntry;
        }

        // Check if window has expired
        const windowStart = entry ? new Date(entry.windowStart).getTime() : now;
        const windowExpired = now - windowStart >= windowMs;

        if (!entry || windowExpired) {
          // Start new window
          const newEntry: RateLimitEntry = {
            PK: rateLimitKey,
            SK: 'COUNTER',
            requestCount: 1,
            windowStart: new Date(now).toISOString(),
            ttl: Math.floor((now + windowMs * 2) / 1000), // TTL: 2x window for cleanup
          };

          await dynamodb.send(
            new PutItemCommand({
              TableName: tableName,
              Item: marshall(newEntry),
            })
          );

          // Add rate limit headers
          request.internal = request.internal || {};
          request.internal.rateLimitHeaders = {
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': String(maxRequests - 1),
            'X-RateLimit-Reset': String(Math.floor((now + windowMs) / 1000)),
          };
          return;
        }

        // Check if limit exceeded
        if (entry.requestCount >= maxRequests) {
          const resetAt = windowStart + windowMs;
          const retryAfter = Math.ceil((resetAt - now) / 1000);

          return {
            statusCode: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
            },
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Maximum ${maxRequests} data requests per ${windowHours} hour(s). Try again in ${retryAfter} seconds.`,
              retryAfter,
            }),
          };
        }

        // Increment counter
        const updatedEntry: RateLimitEntry = {
          ...entry,
          requestCount: entry.requestCount + 1,
        };

        await dynamodb.send(
          new PutItemCommand({
            TableName: tableName,
            Item: marshall(updatedEntry),
          })
        );

        // Add rate limit headers
        request.internal = request.internal || {};
        request.internal.rateLimitHeaders = {
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(maxRequests - updatedEntry.requestCount),
          'X-RateLimit-Reset': String(Math.floor((windowStart + windowMs) / 1000)),
        };
      } catch (error) {
        // Log but don't block on rate limit errors
        console.error('Rate limit check failed:', error);
      }
    },

    after: async (request) => {
      // Add rate limit headers to response
      if (request.internal?.rateLimitHeaders && request.response) {
        request.response.headers = {
          ...request.response.headers,
          ...request.internal.rateLimitHeaders,
        };
      }
    },
  };
}
