# Risk Acceptance Document

**Project:** AuthBridge
**Environment:** Staging → Production
**Date:** 2026-01-18
**Valid Until:** 2026-02-28 (6 weeks post-launch)

---

## Purpose

This document formally accepts specific security findings that will not be remediated before production launch. Each accepted risk includes justification, mitigation measures, and review schedule.

---

## Accepted Risk #1: Rate Limiting Not Configured

### Risk Details

**Finding ID:** L-1
**Severity:** Low
**Category:** Security Configuration
**Discovered:** 2026-01-18

### Description

API Gateway does not have explicit rate limiting configured via Usage Plans. The system relies on AWS default throttling limits (10,000 requests/second per account).

### Business Impact

**Likelihood:** Low
- All endpoints require authentication
- No public endpoints exposed
- AWS default throttling provides baseline protection

**Impact:** Medium
- Potential for API abuse by authenticated users
- Increased AWS costs from excessive requests
- Possible service degradation

**Overall Risk Score:** Low (Likelihood: Low × Impact: Medium)

### Justification for Acceptance

1. **Time to Market:** Production launch is critical business priority
2. **Existing Controls:**
   - AWS default throttling active (10,000 req/s)
   - All endpoints require authentication
   - CloudWatch monitoring in place
3. **Post-Launch Plan:** Usage Plans will be configured based on actual traffic patterns
4. **Cost-Benefit:** Risk is low compared to launch delay

### Mitigation Measures

**Immediate (Pre-Launch):**
- ✅ CloudWatch alarms configured for API Gateway metrics
- ✅ All endpoints require authentication
- ✅ AWS default throttling active

**Post-Launch (Week 1-2):**
- Monitor actual traffic patterns
- Analyze CloudWatch metrics for usage trends
- Configure Usage Plans with appropriate limits:
  - Burst limit: Based on p99 traffic
  - Rate limit: Based on average + 50% buffer
  - Quota: Daily/monthly limits per API key

**Post-Launch (Week 2):**
- Review and adjust throttling limits
- Implement per-endpoint rate limits if needed
- Configure different limits for different user tiers

### Monitoring & Detection

**Metrics to Monitor:**
- API Gateway 4xx/5xx error rates
- Request count per endpoint
- Latency metrics (p50, p95, p99)
- AWS costs (API Gateway charges)

**Alert Thresholds:**
- 4xx errors > 100/minute
- 5xx errors > 10/minute
- Request count > 1000/minute (per endpoint)

### Review Schedule

- **Initial Review:** 2026-01-25 (Week 1 post-launch)
- **Configuration:** 2026-02-01 (Week 2 post-launch)
- **Final Review:** 2026-02-28 (6 weeks post-launch)

### Acceptance

**Risk Owner:** Edmond (Project Lead)
**Accepted By:** Edmond (Project Lead)
**Acceptance Date:** 2026-01-18
**Expiry Date:** 2026-02-28

**Signature:** _Edmond Moepswa_ (Digital)
**Date:** 2026-01-18

---

## Risk Acceptance Summary

| Risk ID | Finding | Severity | Accepted Until | Review Date |
|---------|---------|----------|----------------|-------------|
| L-1 | Rate Limiting Not Configured | Low | 2026-02-28 | 2026-01-25 |

**Total Accepted Risks:** 1
**Highest Severity:** Low

---

## Conditions for Risk Re-evaluation

This risk acceptance will be re-evaluated if any of the following occur:

1. **Security Incident:** Any API abuse or DoS attempt detected
2. **Cost Spike:** API Gateway costs exceed budget by >50%
3. **Performance Issues:** API latency degrades due to excessive requests
4. **Compliance Requirement:** New regulatory requirement for rate limiting
5. **Business Change:** New high-volume customer onboarded

---

## Approval Chain

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | Edmond Moepswa | _Digital_ | 2026-01-18 |
| QA Engineer | Dana (Pending) | ___________ | ___________ |
| Security Review | Automated + Manual | ✅ Complete | 2026-01-18 |

---

**Document Status:** ✅ APPROVED
**Next Review:** 2026-01-25 (Week 1 post-launch)
