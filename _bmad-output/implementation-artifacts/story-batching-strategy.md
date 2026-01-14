---
project: AuthBridge
created: 2026-01-14
author: Bob (Scrum Master)
purpose: Optimize development velocity by batching related stories
status: approved
---

# Story Batching Strategy

## Overview

This document defines story batching recommendations to accelerate development velocity while maintaining clear acceptance criteria and testability. By combining tightly coupled stories into single implementation units, we reduce context switching and enable more efficient development.

**Impact:** 28% reduction in implementation units (25 stories → 18 units)

## Batching Principles

Stories should be batched when they meet ALL of the following criteria:

1. **Tight Coupling:** Stories touch the same code paths, data models, or AWS services
2. **Sequential Flow:** Stories represent consecutive steps in a user journey or data pipeline
3. **Shared Context:** Implementation requires understanding the same domain concepts
4. **Single PR Scope:** Combined work fits naturally into one pull request
5. **Unified Testing:** Test scenarios overlap significantly

Stories should NOT be batched when:
- They involve different AWS services or external integrations
- They represent different user roles or concerns (read vs write operations)
- One story is significantly more complex than the other
- Parallel development by multiple devs is beneficial

## Epic-by-Epic Batching Plan

### Epic 1.5: Backend Foundation (MVP - Critical Path)

**Original:** 4 stories → **Batched:** 2 implementation units

#### Batch 1.5-A: Core Verification Infrastructure
**Stories:** 1.5-2 (Create Verification Endpoint) + 1.5-4 (DynamoDB Schema)

**Rationale:**
- The endpoint cannot function without the database schema
- Both define the core verification data model
- Single coherent implementation: schema design → endpoint implementation → integration testing

**Implementation Order:**
1. Design DynamoDB single-table schema with entity prefixes
2. Create table with GSIs, encryption, PITR
3. Implement POST /api/v1/verifications endpoint
4. Write integration tests covering both layers

**Acceptance Criteria:** Combined from both stories
- DynamoDB table created with single-table design pattern
- Entity prefixes: `CASE#{verificationId}`, `DOC#{verificationId}#{documentId}`
- GSI1 for client ID + status queries
- GSI2 for creation date queries
- POST /api/v1/verifications creates case in DynamoDB
- Response time < 500ms (p95)
- Concurrent request handling verified

#### Standalone: 1.5-3 (Document Upload Endpoint with S3)
**Keep Separate Because:**
- Different AWS service (S3 vs DynamoDB)
- Different concerns: file handling, presigned URLs, size validation
- Can be developed in parallel after Batch 1.5-A is complete
- Complex enough to warrant focused attention (upload success rate > 95%)

---

### Epic 2: Omang Document Processing (MVP)

**Original:** 4 stories → **Batched:** 3 implementation units

#### Batch 2-A: OCR & Validation Pipeline
**Stories:** 2-1 (Omang OCR Extraction) + 2-2 (Omang Format Validation)

**Rationale:**
- Sequential data flow: extract → validate
- Same AWS Textract response processing
- Validation logic needs extracted data structure
- Natural error handling flow

**Implementation Order:**
1. Integrate AWS Textract for Omang card processing
2. Extract fields: Name, Omang Number, DOB, Address, Expiry
3. Implement 9-digit format validation
4. Implement expiry date validation (10-year validity)
5. Store extraction confidence scores + validation results

**Acceptance Criteria:** Combined from both stories
- All required fields extracted from Omang front/back
- Extraction confidence scores recorded
- 9-digit Omang format validated
- Expiry date checked against 10-year validity
- Invalid formats return clear error messages
- Validation results logged for audit

#### Standalone: 2-3 (Biometric Face Matching)
**Keep Separate Because:**
- Different AWS service (Rekognition vs Textract)
- Different data inputs (selfie + ID photo vs document scan)
- Liveness detection integration adds complexity
- Distinct feature with its own acceptance threshold (80% similarity)

#### Standalone: 2-4 (Duplicate Omang Detection)
**Keep Separate Because:**
- Database query logic (not AWS service integration)
- Fraud prevention concern (different domain)
- Cross-client duplicate detection has compliance implications
- Can be added after core OCR pipeline is stable

---

### Epic 3: Case Management Dashboard (MVP)

**Original:** 5 stories → **Batched:** 4 implementation units

#### Batch 3-A: Case Viewing Interface
**Stories:** 3-1 (Case List View with Filters) + 3-2 (Case Detail View)

**Rationale:**
- Both are read-side operations
- Same data queries and API endpoints
- Natural user flow: list → click → detail
- Shared UI patterns (tables, filters, pagination)

**Implementation Order:**
1. Design case list API endpoint with filtering
2. Implement case list table component (React + Mantine)
3. Add filters: Status, Date Range, Document Type, Assignee
4. Implement search by name/Omang/email
5. Create case detail view component
6. Add document viewer with zoom/rotate controls
7. Display OCR data and biometric scores

**Acceptance Criteria:** Combined from both stories
- Case list displays: Name, Omang, Status, Date, Assignee
- Filters work correctly with < 1 second response time
- Search returns accurate results
- Clicking case opens detail view
- Detail view shows complete case information
- Document images viewable with controls
- OCR extracted data displayed alongside images
- Biometric match score visible
- Case history and notes accessible

#### Standalone: 3-3 (Approve/Reject Workflow)
**Keep Separate Because:**
- Write operations with state transitions
- Webhook triggering adds complexity
- Reason code dropdown and validation logic
- Audit trail requirements
- Critical business logic deserves focused testing

#### Standalone: 3-4 (Case Notes & Comments)
**Keep Separate Because:**
- Different data model (append-only audit log)
- Immutability requirements
- Multi-user collaboration feature
- Can be added after core workflow is stable

#### Standalone: 3-5 (Bulk Case Actions)
**Keep Separate Because:**
- Complex UX (checkbox selection, bulk operations)
- Transaction handling for multiple cases
- Individual audit entries for each case
- Performance considerations for large selections

---

### Epic 4: REST API & Webhooks (MVP)

**Original:** 5 stories → **Batched:** 4 implementation units

#### Batch 4-A: Core Verification API
**Stories:** 4-2 (Create Verification Endpoint) + 4-3 (Document Upload Endpoint)

**Rationale:**
- Sequential in user journey: create verification → upload documents
- Same authentication and rate limiting middleware
- Both are write operations for verification flow
- Shared error handling patterns

**Implementation Order:**
1. Implement POST /api/v1/verifications endpoint
2. Return session token and SDK URL
3. Implement POST /api/v1/verifications/{id}/documents
4. Support base64 and multipart uploads
5. Trigger OCR processing on upload
6. Unified rate limiting (50 req/sec)
7. Integration tests for complete flow

**Acceptance Criteria:** Combined from both stories
- POST /api/v1/verifications creates session
- Session token and SDK URL returned
- Verification ID included for tracking
- POST /api/v1/verifications/{id}/documents accepts uploads
- Base64 and multipart formats supported
- Documents stored in S3
- OCR processing triggered automatically
- Document ID returned
- Upload success rate > 95%
- Response time < 500ms (p95)

#### Standalone: 4-1 (API Authentication)
**Keep Separate Because:**
- Foundation layer that other stories depend on
- API key management and rotation logic
- Rate limiting implementation
- Must be solid before building on top

#### Standalone: 4-4 (Verification Status Endpoint)
**Keep Separate Because:**
- Read operation (different concern from writes)
- Different caching strategy
- Simpler implementation
- Can be added after core write operations work

#### Standalone: 4-5 (Webhook Notifications)
**Keep Separate Because:**
- Async delivery mechanism
- Retry logic with exponential backoff
- Webhook delivery logging
- Complex enough to warrant focused attention

---

### Epic 5: Security & Compliance Foundation (MVP)

**Original:** 4 stories → **Batched:** 3 implementation units

#### Batch 5-A: Data Protection Infrastructure
**Stories:** 5-1 (Data Encryption Implementation) + 5-2 (Comprehensive Audit Logging)

**Rationale:**
- Both are cross-cutting infrastructure concerns
- Touch the same middleware and data access layers
- Encryption and audit logging often implemented together
- Shared compliance requirements (Data Protection Act 2024)

**Implementation Order:**
1. Configure KMS keys for encryption
2. Enable DynamoDB encryption at rest (AES-256)
3. Enable S3 bucket encryption
4. Implement attribute-level encryption for Omang numbers
5. Enforce TLS 1.2+ for all endpoints
6. Design audit log schema (timestamp, user, action, resource, IP)
7. Implement audit logging middleware
8. Configure 5-year retention
9. Create audit log query interface

**Acceptance Criteria:** Combined from both stories
- All data encrypted at rest (KMS managed keys)
- Omang numbers encrypted at attribute level
- TLS 1.2+ enforced for all API requests
- HTTPS required for all endpoints
- Audit log entry created for every action
- Audit logs are immutable (append-only)
- Logs retained for 5 years
- Audit logs queryable by date range and user

#### Standalone: 5-3 (Data Export & Deletion)
**Keep Separate Because:**
- GDPR workflow implementation
- Different UX (request forms, async jobs)
- Data anonymization logic
- 24-hour SLA for deletion
- Retention of deletion audit logs

#### Standalone: 5-4 (IAM & Access Control)
**Keep Separate Because:**
- Casbin RBAC integration
- Different layer (authorization vs encryption/audit)
- Role assignment UI
- Policy definition and testing

---

### Epic 6: Reporting & Analytics (MVP)

**Original:** 3 stories → **Batched:** 2 implementation units

#### Batch 6-A: Analytics & Reporting Engine
**Stories:** 6-1 (Dashboard Metrics Overview) + 6-2 (Verification Reports)

**Rationale:**
- Both are read-only analytics queries
- Same data aggregation patterns
- Shared time-series logic
- Similar export functionality (CSV)

**Implementation Order:**
1. Design analytics data model (aggregated metrics)
2. Implement dashboard metrics API
3. Create dashboard UI with key metrics
4. Add trend indicators (vs previous period)
5. Implement report generation API
6. Add date range and filter support
7. Implement CSV export
8. Optimize query performance (< 1 second dashboard load)

**Acceptance Criteria:** Combined from both stories
- Dashboard displays: Total Verifications, Approval Rate, Avg Processing Time, Pending Cases
- Metrics update in real-time
- Trend indicators show change vs previous period
- Reports generated with date range and filters
- Report shows: Volume by day, Approval/Rejection rates, Document type distribution, Processing times
- Reports exportable to CSV
- Export completes in < 30 seconds
- Dashboard loads in < 1 second

#### Standalone: 6-3 (Usage & Cost Tracking)
**Keep Separate Because:**
- Billing concern (different domain)
- Different data source (usage events vs verification data)
- Cost calculation logic
- Usage threshold alerts
- Integration with pricing tiers

---

## Implementation Guidelines

### For Developers

When implementing a batched story:

1. **Read Both Story Files:** Understand all acceptance criteria before starting
2. **Design Holistically:** Consider the combined feature surface
3. **Test Comprehensively:** Cover all acceptance criteria from both stories
4. **Single PR:** Submit as one pull request with clear description of both stories
5. **Reference Both Story IDs:** In commits and PR title (e.g., "feat: [1.5-2, 1.5-4] Core verification infrastructure")

### For Code Review

When reviewing a batched story:

1. **Check All Acceptance Criteria:** Verify both stories are fully implemented
2. **Validate Integration:** Ensure the stories work together seamlessly
3. **Test Coverage:** Confirm tests cover all scenarios from both stories
4. **Documentation:** Verify both stories are documented

### For Sprint Planning

When planning sprints with batched stories:

1. **Estimate Combined Effort:** Don't simply add story points - batching often reduces total effort
2. **Assign as Single Unit:** One developer owns the batched implementation
3. **Track as Single Item:** Move both stories together through the board
4. **Update Both Story Files:** Mark both as "done" when complete

---

## Velocity Impact Analysis

### Before Batching
- **Total MVP Stories:** 25 stories (excluding Epic 1, which is complete)
- **Estimated Sprints:** ~8-10 sprints (assuming 2-3 stories per sprint)
- **Context Switches:** 25 separate implementations

### After Batching
- **Total Implementation Units:** 18 units
- **Estimated Sprints:** ~6-7 sprints (assuming 2-3 units per sprint)
- **Context Switches:** 18 separate implementations
- **Velocity Improvement:** ~28% reduction in implementation units

### Risk Mitigation

**Risk:** Batched stories might be too large for a single sprint
**Mitigation:** If a batched unit doesn't fit in a sprint, split it back into original stories

**Risk:** Developer might skip acceptance criteria from one story
**Mitigation:** Code review checklist explicitly covers all criteria from both stories

**Risk:** Testing might be incomplete
**Mitigation:** Require test coverage report showing all scenarios from both stories

---

## Approval & Adoption

**Status:** Approved by Scrum Master (Bob) - 2026-01-14

**Next Steps:**
1. Review with development team
2. Update sprint-status.yaml to reflect batched units
3. Create combined story files for batched units (optional)
4. Begin implementation with Epic 1.5 Batch 1.5-A

**Feedback Loop:**
- After completing first batched story, retrospect on effectiveness
- Adjust strategy if batching creates issues
- Document lessons learned

---

## Appendix: Quick Reference

### Epic 1.5 Batching
- ✅ Batch 1.5-A: Stories 1.5-2 + 1.5-4 (Core Verification Infrastructure)
- ⚪ Standalone: 1.5-3 (Document Upload with S3)

### Epic 2 Batching
- ✅ Batch 2-A: Stories 2-1 + 2-2 (OCR & Validation Pipeline)
- ⚪ Standalone: 2-3 (Biometric Face Matching)
- ⚪ Standalone: 2-4 (Duplicate Detection)

### Epic 3 Batching
- ✅ Batch 3-A: Stories 3-1 + 3-2 (Case Viewing Interface)
- ⚪ Standalone: 3-3 (Approve/Reject Workflow)
- ⚪ Standalone: 3-4 (Case Notes)
- ⚪ Standalone: 3-5 (Bulk Actions)

### Epic 4 Batching
- ✅ Batch 4-A: Stories 4-2 + 4-3 (Core Verification API)
- ⚪ Standalone: 4-1 (API Authentication)
- ⚪ Standalone: 4-4 (Status Endpoint)
- ⚪ Standalone: 4-5 (Webhooks)

### Epic 5 Batching
- ✅ Batch 5-A: Stories 5-1 + 5-2 (Data Protection Infrastructure)
- ⚪ Standalone: 5-3 (Data Export & Deletion)
- ⚪ Standalone: 5-4 (IAM & Access Control)

### Epic 6 Batching
- ✅ Batch 6-A: Stories 6-1 + 6-2 (Analytics & Reporting Engine)
- ⚪ Standalone: 6-3 (Usage & Cost Tracking)
