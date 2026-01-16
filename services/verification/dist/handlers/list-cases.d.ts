import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
/**
 * List cases (verifications) with filtering and pagination
 *
 * Query Parameters:
 * - status: Filter by status (pending, in-review, approved, rejected)
 * - dateFrom: Filter by start date (ISO 8601)
 * - dateTo: Filter by end date (ISO 8601)
 * - documentType: Filter by document type (omang, passport, drivers_licence)
 * - assignee: Filter by assignee ID
 * - search: Search by name, Omang (last 4), or email
 * - limit: Number of results per page (default: 20, max: 100)
 * - cursor: Pagination cursor for next page
 */
export declare function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=list-cases.d.ts.map