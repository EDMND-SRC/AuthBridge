import { describe, it, expect, beforeEach } from 'vitest';
import { auditContextMiddleware, getAuditContext, AuditContext } from './audit-context';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('auditContextMiddleware', () => {
  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      path: '/test',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/test',
    },
    resource: '/test',
    ...overrides,
  });

  describe('before middleware', () => {
    it('extracts IP address from requestContext.identity.sourceIp', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent();
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.ipAddress).toBe('192.168.1.1');
    });

    it('extracts IP address from X-Forwarded-For header as fallback', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        headers: { 'X-Forwarded-For': '10.0.0.1, 10.0.0.2' },
        requestContext: {
          ...createMockEvent().requestContext,
          identity: {
            ...createMockEvent().requestContext.identity,
            sourceIp: '',
          },
        },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.ipAddress).toBe('10.0.0.1');
    });

    it('extracts IP address from lowercase x-forwarded-for header', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        headers: { 'x-forwarded-for': '172.16.0.1' },
        requestContext: {
          ...createMockEvent().requestContext,
          identity: {
            ...createMockEvent().requestContext.identity,
            sourceIp: '',
          },
        },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.ipAddress).toBe('172.16.0.1');
    });

    it('returns unknown when no IP address available', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          identity: {
            ...createMockEvent().requestContext.identity,
            sourceIp: '',
          },
        },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.ipAddress).toBe('unknown');
    });

    it('extracts user agent from User-Agent header', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        headers: { 'User-Agent': 'Mozilla/5.0 Test Browser' },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('extracts user agent from lowercase user-agent header', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        headers: { 'user-agent': 'Custom Agent/1.0' },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.userAgent).toBe('Custom Agent/1.0');
    });

    it('extracts userId from JWT authorizer claims', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent({
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: {
            claims: {
              sub: 'user-123',
              'custom:clientId': 'client-456',
            },
          },
        },
      });
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.userId).toBe('user-123');
      expect(auditContext.clientId).toBe('client-456');
    });

    it('returns null userId when no authorizer claims', async () => {
      const middleware = auditContextMiddleware();
      const event = createMockEvent();
      const request = { event, context: {} as Context } as any;

      await middleware.before!(request);

      const auditContext = getAuditContext(request);
      expect(auditContext.userId).toBeNull();
      expect(auditContext.clientId).toBeNull();
    });
  });

  describe('getAuditContext', () => {
    it('returns default context when auditContext not set', () => {
      const request = { event: createMockEvent(), context: {} as Context };

      const auditContext = getAuditContext(request);

      expect(auditContext).toEqual({
        userId: null,
        clientId: null,
        ipAddress: 'unknown',
        userAgent: 'unknown',
      });
    });

    it('returns attached audit context', () => {
      const expectedContext: AuditContext = {
        userId: 'test-user',
        clientId: 'test-client',
        ipAddress: '10.0.0.1',
        userAgent: 'Test Agent',
      };
      const request = { auditContext: expectedContext } as any;

      const auditContext = getAuditContext(request);

      expect(auditContext).toEqual(expectedContext);
    });
  });
});
