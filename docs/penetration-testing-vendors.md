# Penetration Testing Vendor Selection

## Overview

This document evaluates penetration testing vendors for AuthBridge pre-production security validation. Testing is required before production launch per NFR14 (OWASP Top 10 compliance) and NFR15 (Penetration testing before launch).

## Requirements

### Scope of Testing

| Area | Description | Priority |
|------|-------------|----------|
| API Security | REST API endpoints, authentication, authorization | HIGH |
| Web Application | Backoffice dashboard, Web SDK | HIGH |
| Cloud Infrastructure | AWS configuration, IAM policies, S3 buckets | HIGH |
| Data Protection | Encryption, PII handling, data leakage | HIGH |
| Authentication | Cognito, API keys, JWT tokens | HIGH |
| Business Logic | Verification workflow, case management | MEDIUM |

### Compliance Requirements

- OWASP Top 10 2021 coverage
- Data Protection Act 2024 (Botswana) alignment
- PCI DSS awareness (for future payment integration)
- SOC 2 Type II preparation

### Testing Methodology

- Black-box testing (external attacker perspective)
- Gray-box testing (authenticated user perspective)
- White-box testing (code review, architecture review)

---

## Vendor Evaluation

### Tier 1: Global Security Firms

#### 1. Bishop Fox
**Website:** https://bishopfox.com

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐⭐⭐ | AWS Partner, extensive cloud experience |
| API Testing | ⭐⭐⭐⭐⭐ | Specialized API security practice |
| Compliance | ⭐⭐⭐⭐⭐ | SOC 2, PCI DSS, GDPR experience |
| Reporting | ⭐⭐⭐⭐⭐ | Executive + technical reports |
| Cost | $$$$$ | Premium pricing |
| Timeline | 4-6 weeks | Standard engagement |

**Pros:**
- Industry-leading reputation
- Comprehensive methodology
- Excellent remediation guidance

**Cons:**
- Premium pricing
- May be overkill for MVP

---

#### 2. NCC Group
**Website:** https://nccgroup.com

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐⭐⭐ | AWS Advanced Partner |
| API Testing | ⭐⭐⭐⭐⭐ | Strong API security practice |
| Compliance | ⭐⭐⭐⭐⭐ | Global compliance expertise |
| Reporting | ⭐⭐⭐⭐⭐ | Detailed technical reports |
| Cost | $$$$$ | Premium pricing |
| Timeline | 4-6 weeks | Standard engagement |

**Pros:**
- Global presence
- Strong compliance focus
- Research-driven approach

**Cons:**
- Premium pricing
- Long lead times

---

### Tier 2: Regional/Specialized Firms

#### 3. Cobalt
**Website:** https://cobalt.io

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐⭐ | Good cloud experience |
| API Testing | ⭐⭐⭐⭐⭐ | API-first platform |
| Compliance | ⭐⭐⭐⭐ | SOC 2, GDPR |
| Reporting | ⭐⭐⭐⭐ | Real-time findings platform |
| Cost | $$$ | Mid-range, credit-based |
| Timeline | 2-4 weeks | Fast turnaround |

**Pros:**
- Pentest-as-a-Service model
- Real-time findings dashboard
- Flexible credit system
- Good for startups

**Cons:**
- Variable tester quality
- Less comprehensive than Tier 1

**RECOMMENDED FOR MVP** ✅

---

#### 4. Synack
**Website:** https://synack.com

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐⭐ | Good cloud coverage |
| API Testing | ⭐⭐⭐⭐ | Crowdsourced testing |
| Compliance | ⭐⭐⭐⭐ | FedRAMP, SOC 2 |
| Reporting | ⭐⭐⭐⭐⭐ | Excellent platform |
| Cost | $$$$ | Higher than Cobalt |
| Timeline | Continuous | Ongoing testing |

**Pros:**
- Crowdsourced model (diverse perspectives)
- Continuous testing option
- Strong platform

**Cons:**
- Higher cost than Cobalt
- Overkill for initial MVP

---

### Tier 3: Africa-Based Firms

#### 5. Serianu (Kenya)
**Website:** https://serianu.com

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐ | Growing cloud practice |
| API Testing | ⭐⭐⭐ | Standard capabilities |
| Compliance | ⭐⭐⭐⭐ | Africa regulatory expertise |
| Reporting | ⭐⭐⭐ | Standard reports |
| Cost | $$ | Competitive pricing |
| Timeline | 2-4 weeks | Good availability |

**Pros:**
- Africa-based (time zone alignment)
- Regional regulatory knowledge
- Competitive pricing

**Cons:**
- Less AWS expertise
- Smaller team

---

#### 6. Telspace Systems (South Africa)
**Website:** https://telspace.co.za

| Criteria | Score | Notes |
|----------|-------|-------|
| AWS Expertise | ⭐⭐⭐ | Growing cloud practice |
| API Testing | ⭐⭐⭐ | Standard capabilities |
| Compliance | ⭐⭐⭐⭐ | POPIA expertise |
| Reporting | ⭐⭐⭐ | Standard reports |
| Cost | $$ | Competitive pricing |
| Timeline | 2-4 weeks | Good availability |

**Pros:**
- SADC region expertise
- POPIA compliance knowledge
- Competitive pricing

**Cons:**
- Less API-specific expertise
- Smaller team

---

## Recommendation

### For MVP Launch: Cobalt

**Rationale:**
1. **Cost-effective** - Credit-based model fits startup budget
2. **Fast turnaround** - 2-4 week engagement
3. **API-first** - Strong API security testing
4. **Real-time platform** - Immediate visibility into findings
5. **Startup-friendly** - Experience with early-stage companies

**Estimated Cost:** $15,000 - $25,000 USD

**Scope:**
- API penetration testing (all endpoints)
- Web application testing (Backoffice)
- AWS configuration review
- Authentication/authorization testing

### For Production (Post-Funding): NCC Group or Bishop Fox

**Rationale:**
1. **Comprehensive** - Full security assessment
2. **Compliance** - SOC 2 Type II preparation
3. **Ongoing relationship** - Quarterly assessments

**Estimated Cost:** $50,000 - $100,000 USD annually

---

## Engagement Timeline

### Pre-Production (MVP)

| Week | Activity |
|------|----------|
| Week 1 | Vendor selection, scoping call |
| Week 2 | Contract signing, environment setup |
| Week 3-4 | Active testing |
| Week 5 | Report delivery, remediation planning |
| Week 6 | Remediation, retest critical findings |

### Post-Production (Ongoing)

| Quarter | Activity |
|---------|----------|
| Q1 | Full penetration test |
| Q2 | Vulnerability assessment |
| Q3 | Full penetration test |
| Q4 | Vulnerability assessment + annual review |

---

## Budget Allocation

### Year 1 (MVP + Initial Production)

| Item | Cost (USD) |
|------|------------|
| MVP Pentest (Cobalt) | $20,000 |
| Remediation Support | $5,000 |
| Retest | $5,000 |
| **Total** | **$30,000** |

### Year 2 (Production)

| Item | Cost (USD) |
|------|------------|
| Quarterly Assessments | $60,000 |
| Bug Bounty Program | $20,000 |
| Compliance Audit Support | $20,000 |
| **Total** | **$100,000** |

---

## Next Steps

1. **Immediate:** Contact Cobalt for scoping call
2. **Week 1:** Finalize scope and timeline
3. **Week 2:** Sign contract, prepare test environment
4. **Week 3-4:** Execute testing
5. **Week 5:** Review findings, prioritize remediation
6. **Week 6:** Remediate critical/high findings
7. **Week 7:** Retest and sign-off

---

## Contact Information

### Cobalt (Recommended)
- **Website:** https://cobalt.io
- **Contact:** sales@cobalt.io
- **Phone:** +1 (415) 231-3068

### NCC Group (Post-Funding)
- **Website:** https://nccgroup.com
- **Contact:** info@nccgroup.com

### Bishop Fox (Post-Funding)
- **Website:** https://bishopfox.com
- **Contact:** info@bishopfox.com

---

_Document Version: 1.0_
_Last Updated: 2026-01-16_
_Author: Dana (QA Engineer)_
