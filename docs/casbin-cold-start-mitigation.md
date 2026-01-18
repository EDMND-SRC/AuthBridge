# Casbin Cold Start Mitigation Strategies

**Document Version:** 1.0
**Created:** 2026-01-18
**Owner:** Winston (Architect)
**Status:** Complete

---

## Problem Statement

Casbin RBAC permission checks experience ~200ms latency on cold starts when the Lambda function initializes. This occurs because:

1. **DynamoDB Policy Loading**: Casbin adapter queries DynamoDB to load all policies on first check
2. **Casbin Enforcer Initialization**: The enforcer compiles the RBAC model and builds internal data structures
3. **Lambda Cold Start**: The Lambda runtime itself takes time to initialize

**Impact:**
- First API request after cold start: +200ms latency
- Subsequent requests: <10ms (cached in memory)
- User experience: Noticeable delay on first interaction after idle period

---

## Current Implementation

**Location:** `services/verification/src/middleware/rbac.ts`

```typescript
export class RBACMiddleware {
  private enforcer: casbin.Enforcer | null = null;
  private lastPolicyLoad: number = 0;
  private readonly POLICY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getEnforcer(): Promise<casbin.Enforcer> {
    const now = Date.now();

    // Reload policies every 5 minutes
    if (!this.enforcer || now - this.lastPolicyLoad > this.POLICY_CACHE_TTL) {
      this.enforcer = await casbin.newEnforcer(
        'casbin-model.conf',
        new DynamoDBAdapter(dynamodbClient, tableName)
      );
      this.lastPolicyLoad = now;
    }

    return this.enforcer;
  }
}
```

**Cold Start Sequence:**
1. Lambda container starts (~100ms)
2. DynamoDB adapter queries policies (~50ms)
3. Casbin enforcer initialization (~50ms)
4. **Total: ~200ms**

---

## Mitigation Strategies

### Strategy 1: Lambda Provisioned Concurrency (Recommended for Production)

**How it works:** Keep Lambda containers warm with pre-initialized Casbin enforcers.

**Implementation:**
```yaml
# services/verification/serverless.yml
functions:
  approveCase:
    handler: src/handlers/approve-case.approveCase
    provisionedConcurrency: 2  # Keep 2 warm containers
    reservedConcurrency: 10    # Max 10 concurrent executions
```

**Pros:**
- Eliminates cold starts entirely for provisioned containers
- Consistent low latency (<10ms)
- Simple configuration

**Cons:**
- Cost: ~$10-15/month per provisioned container
- Only cost-effective for high-traffic endpoints

**When to use:** Production environment for critical endpoints (approve, reject, create verification)

---

### Strategy 2: Policy Preloading with Lambda Extensions

**How it works:** Use Lambda extensions to preload policies during initialization phase.

**Implementation:**
```typescript
// services/verification/src/extensions/casbin-preload.ts
import { casbin } from 'casbin';
import { DynamoDBAdapter } from './dynamodb-adapter';

// Global enforcer instance (survives across invocations)
let globalEnforcer: casbin.Enforcer | null = null;

export async function preloadEnforcer(): Promise<void> {
  if (!globalEnforcer) {
    console.log('[Casbin Preload] Initializing enforcer...');
    const startTime = Date.now();

    globalEnforcer = await casbin.newEnforcer(
      'casbin-model.conf',
      new DynamoDBAdapter(dynamodbClient, tableName)
    );

    console.log(`[Casbin Preload] Enforcer ready in ${Date.now() - startTime}ms`);
  }
}

export function getEnforcer(): casbin.Enforcer {
  if (!globalEnforcer) {
    throw new Error('Enforcer not initialized. Call preloadEnforcer() first.');
  }
  return globalEnforcer;
}

// Preload during Lambda initialization (outside handler)
preloadEnforcer().catch(console.error);
```

**Usage in handlers:**
```typescript
import { getEnforcer } from '../extensions/casbin-preload';

export const handler = async (event: APIGatewayProxyEvent) => {
  const enforcer = getEnforcer(); // No await needed, already loaded
  const allowed = await enforcer.enforce(userId, resource, action);
  // ...
};
```

**Pros:**
- No additional cost
- Policies loaded once per container lifecycle
- Works with on-demand Lambda

**Cons:**
- Still experiences cold start on first container initialization
- Requires code refactoring

**When to use:** MVP/staging environments with moderate traffic

---

### Strategy 3: Policy Caching in ElastiCache (Advanced)

**How it works:** Cache compiled policies in Redis for instant retrieval.

**Implementation:**
```typescript
// services/verification/src/services/policy-cache.ts
import { createClient } from 'redis';
import { casbin } from 'casbin';

export class PolicyCacheAdapter {
  private redis: ReturnType<typeof createClient>;
  private readonly CACHE_KEY = 'casbin:policies';
  private readonly CACHE_TTL = 300; // 5 minutes

  async getEnforcer(): Promise<casbin.Enforcer> {
    // Try cache first
    const cached = await this.redis.get(this.CACHE_KEY);

    if (cached) {
      console.log('[Casbin] Loaded policies from Redis cache');
      return casbin.newEnforcer('casbin-model.conf', JSON.parse(cached));
    }

    // Cache miss - load from DynamoDB
    const enforcer = await casbin.newEnforcer(
      'casbin-model.conf',
      new DynamoDBAdapter(dynamodbClient, tableName)
    );

    // Cache for next time
    const policies = await enforcer.getPolicy();
    await this.redis.setEx(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(policies));

    return enforcer;
  }
}
```

**Infrastructure:**
```yaml
# services/verification/serverless.yml
resources:
  Resources:
    PolicyCache:
      Type: AWS::ElastiCache::CacheCluster
      Properties:
        CacheNodeType: cache.t3.micro
        Engine: redis
        NumCacheNodes: 1
        VpcSecurityGroupIds:
          - !Ref CacheSecurityGroup
```

**Pros:**
- Sub-10ms policy retrieval
- Shared cache across all Lambda containers
- Scales horizontally

**Cons:**
- Additional infrastructure cost (~$15/month for t3.micro)
- Increased complexity
- Cache invalidation required on policy updates

**When to use:** High-scale production (>100K requests/month)

---

### Strategy 4: Inline Policy Embedding (Fastest, Limited Flexibility)

**How it works:** Embed policies directly in Lambda code instead of loading from DynamoDB.

**Implementation:**
```typescript
// services/verification/src/config/rbac-policies.ts
export const EMBEDDED_POLICIES = [
  ['admin', 'case', 'approve'],
  ['admin', 'case', 'reject'],
  ['admin', 'case', 'view'],
  ['analyst', 'case', 'view'],
  ['analyst', 'case', 'approve'],
  ['reviewer', 'case', 'view'],
  // ... all policies
];

// services/verification/src/middleware/rbac.ts
import { EMBEDDED_POLICIES } from '../config/rbac-policies';

export class RBACMiddleware {
  private enforcer: casbin.Enforcer | null = null;

  async getEnforcer(): Promise<casbin.Enforcer> {
    if (!this.enforcer) {
      this.enforcer = await casbin.newEnforcer('casbin-model.conf');

      // Load policies from memory (instant)
      for (const policy of EMBEDDED_POLICIES) {
        await this.enforcer.addPolicy(...policy);
      }
    }

    return this.enforcer;
  }
}
```

**Pros:**
- Zero latency (policies in memory)
- No DynamoDB queries
- No additional infrastructure

**Cons:**
- Policies hardcoded in deployment
- Requires redeployment to change policies
- Not suitable for dynamic role management

**When to use:** MVP with static roles, no runtime policy changes needed

---

## Recommended Approach by Environment

| Environment | Strategy | Rationale |
|-------------|----------|-----------|
| **Local Dev** | Strategy 4 (Inline) | Fast iteration, no infrastructure |
| **Staging** | Strategy 2 (Preload) | Balance cost and performance |
| **Production (MVP)** | Strategy 2 (Preload) | Cost-effective for <50K req/month |
| **Production (Scale)** | Strategy 1 (Provisioned) | Consistent performance for critical endpoints |
| **Production (Enterprise)** | Strategy 3 (ElastiCache) | Best performance at scale |

---

## Implementation Roadmap

### Phase 1: MVP Launch (Current)
- ✅ Use Strategy 2 (Policy Preloading)
- ✅ Monitor cold start frequency with CloudWatch
- ✅ Set up alerts for >500ms p95 latency

### Phase 2: Post-Launch Optimization (Month 2)
- Analyze cold start impact on user experience
- If >10% of requests experience cold starts, implement Strategy 1 for critical endpoints
- Cost analysis: Provisioned concurrency vs cold start frequency

### Phase 3: Scale Optimization (Month 6+)
- If traffic >100K req/month, evaluate Strategy 3 (ElastiCache)
- Benchmark latency improvements vs infrastructure cost
- Implement if ROI is positive

---

## Monitoring & Alerting

**CloudWatch Metrics to Track:**
```typescript
// services/verification/src/middleware/rbac.ts
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

async function emitColdStartMetric(duration: number): Promise<void> {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'AuthBridge/RBAC',
    MetricData: [{
      MetricName: 'CasbinColdStartDuration',
      Value: duration,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'Environment', Value: process.env.STAGE || 'unknown' }
      ]
    }]
  }));
}
```

**CloudWatch Alarms:**
```yaml
# services/verification/serverless.yml
resources:
  Resources:
    CasbinColdStartAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: authbridge-casbin-cold-start-high
        MetricName: CasbinColdStartDuration
        Namespace: AuthBridge/RBAC
        Statistic: Average
        Period: 300
        EvaluationPeriods: 2
        Threshold: 200
        ComparisonOperator: GreaterThanThreshold
        AlarmActions:
          - !Ref AlertTopic
```

---

## Cost Analysis

| Strategy | Monthly Cost | Latency | Complexity |
|----------|--------------|---------|------------|
| Strategy 1 (Provisioned) | $10-15/container | <10ms | Low |
| Strategy 2 (Preload) | $0 | 200ms (first), <10ms (cached) | Low |
| Strategy 3 (ElastiCache) | $15-30 | <10ms | High |
| Strategy 4 (Inline) | $0 | <5ms | Low |

**Break-even Analysis:**
- If >50% of requests experience cold starts, Strategy 1 is cost-effective
- If <10% of requests experience cold starts, Strategy 2 is optimal
- Strategy 3 only justified at >100K req/month with strict latency SLAs

---

## Testing Cold Start Mitigation

**Load Test Script:**
```bash
#!/bin/bash
# scripts/test-casbin-cold-start.sh

# Force cold start by waiting for Lambda to scale down
echo "Waiting 15 minutes for Lambda to scale down..."
sleep 900

# Test first request (cold start)
echo "Testing cold start..."
START=$(date +%s%3N)
curl -X POST https://api-staging.authbridge.io/api/v1/cases/case_123/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "All documents verified"}'
END=$(date +%s%3N)
COLD_START_MS=$((END - START))
echo "Cold start latency: ${COLD_START_MS}ms"

# Test subsequent requests (warm)
echo "Testing warm requests..."
for i in {1..10}; do
  START=$(date +%s%3N)
  curl -X GET https://api-staging.authbridge.io/api/v1/cases/case_123 \
    -H "Authorization: Bearer $TOKEN"
  END=$(date +%s%3N)
  WARM_MS=$((END - START))
  echo "Warm request $i latency: ${WARM_MS}ms"
done
```

---

## References

- [Casbin Documentation](https://casbin.org/docs/overview)
- [AWS Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [AWS Lambda Extensions](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html)
- [Story 5.4: IAM & Access Control](_bmad-output/implementation-artifacts/5-4-iam-access-control.md)

---

_Last Updated: 2026-01-18_
_Next Review: Before scaling to >50K req/month_
