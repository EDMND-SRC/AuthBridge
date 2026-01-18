# RBAC Deployment Plan - Story 5.4

**Date:** 2026-01-18
**Environment:** staging
**AWS Account:** 979237821231
**Region:** af-south-1

---

## ⚠️ PRE-DEPLOYMENT CHECKLIST

- [ ] All code changes reviewed and approved
- [ ] Integration tests passing (with DynamoDB Local)
- [ ] Backup of existing DynamoDB tables
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (if needed)

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Infrastructure (5-10 minutes)

```bash
cd services/verification

# Deploy with verbose output
npx serverless deploy --stage staging --verbose

# Expected output:
# - CasbinPoliciesTable created
# - 4 new Lambda functions deployed (assignRole, removeRole, getUserRoles, listRoles)
# - 21 existing Lambda functions updated (RBAC middleware added)
# - IAM policies updated
```

**What gets deployed:**
- New DynamoDB table: `AuthBridgeCasbinPolicies-staging`
- New Lambda functions: 4 role management endpoints
- Updated Lambda functions: 21 handlers with RBAC middleware
- Updated IAM policies: Casbin table access permissions

---

### Step 2: Initialize Casbin Policies (1-2 minutes)

```bash
cd services/verification

# Set environment variables
export CASBIN_TABLE_NAME=AuthBridgeCasbinPolicies-staging
export AWS_REGION=af-south-1

# Run initialization script
pnpm run init-casbin

# Expected output:
# Wrote batch 1 (25 policies)
# Wrote batch 2 (25 policies)
# Wrote batch 3 (25 policies)
# ...
# ✅ Successfully initialized 150+ Casbin policies
```

**What gets created:**
- Role inheritance rules (5 rules)
- Admin policies (4 rules)
- Compliance officer policies (12 rules)
- Analyst policies (13 rules)
- Reviewer policies (6 rules)
- Developer policies (13 rules)
- API user policies (4 rules)
- Audit viewer policies (2 rules)

---

### Step 3: Verify Deployment (2-3 minutes)

```bash
# 1. Check Casbin table exists
aws dynamodb describe-table \
  --table-name AuthBridgeCasbinPolicies-staging \
  --region af-south-1

# 2. Count policies in table
aws dynamodb scan \
  --table-name AuthBridgeCasbinPolicies-staging \
  --select COUNT \
  --region af-south-1

# 3. Check Lambda functions deployed
aws lambda list-functions \
  --region af-south-1 \
  --query 'Functions[?contains(FunctionName, `authbridge-verification-staging`)].FunctionName'

# 4. Test list-roles endpoint (no auth required for this endpoint)
curl https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/roles
```

---

### Step 4: Assign Admin Role to First User (1 minute)

**Option A: Via DynamoDB Console**
1. Open AWS Console → DynamoDB → Tables → AuthBridgeTable
2. Create Item:
   ```json
   {
     "PK": "USER#<your-user-id>",
     "SK": "ROLE#admin",
     "userId": "<your-user-id>",
     "role": "admin",
     "assignedBy": "system",
     "assignedAt": "2026-01-18T12:00:00Z"
   }
   ```

**Option B: Via API (requires existing admin or system access)**
```bash
# Get your user ID from Cognito or API key
USER_ID="<your-user-id>"

# Assign admin role
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/users/${USER_ID}/roles \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Option C: Via AWS CLI + DynamoDB**
```bash
aws dynamodb put-item \
  --table-name AuthBridgeTable \
  --item '{
    "PK": {"S": "USER#<your-user-id>"},
    "SK": {"S": "ROLE#admin"},
    "userId": {"S": "<your-user-id>"},
    "role": {"S": "admin"},
    "assignedBy": {"S": "system"},
    "assignedAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }' \
  --region af-south-1
```

---

### Step 5: Test RBAC with Different Roles (5-10 minutes)

**Test 1: Admin can access everything**
```bash
# Get admin token
ADMIN_TOKEN="<your-admin-token>"

# Test case approval (should succeed)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/cases/case_test_123/approve \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"

# Expected: 200 OK or 404 (case not found, but permission granted)
```

**Test 2: Create analyst user and test permissions**
```bash
# Assign analyst role to test user
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/users/user_analyst_test/roles \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "analyst"}'

# Get analyst token (via Cognito or API key)
ANALYST_TOKEN="<analyst-token>"

# Test case approval (should succeed)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/cases/case_test_123/approve \
  -H "Authorization: Bearer ${ANALYST_TOKEN}"

# Test role assignment (should fail with 403)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/users/user_test/roles \
  -H "Authorization: Bearer ${ANALYST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "reviewer"}'

# Expected: 403 Forbidden
```

**Test 3: Create reviewer user and test permissions**
```bash
# Assign reviewer role
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/users/user_reviewer_test/roles \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "reviewer"}'

# Get reviewer token
REVIEWER_TOKEN="<reviewer-token>"

# Test case viewing (should succeed)
curl https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/cases/case_test_123 \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}"

# Test case approval (should fail with 403)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/cases/case_test_123/approve \
  -H "Authorization: Bearer ${REVIEWER_TOKEN}"

# Expected: 403 Forbidden
```

**Test 4: API user with client isolation**
```bash
# Assign api_user role
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/users/user_api_test/roles \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "api_user"}'

# Get API user token (with clientId in claims)
API_USER_TOKEN="<api-user-token>"

# Test verification creation (should succeed)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/verifications \
  -H "Authorization: Bearer ${API_USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "omang", "customerMetadata": {"email": "test@example.com"}}'

# Test case approval (should fail with 403)
curl -X POST \
  https://maybpud8y5.execute-api.af-south-1.amazonaws.com/staging/api/v1/cases/case_test_123/approve \
  -H "Authorization: Bearer ${API_USER_TOKEN}"

# Expected: 403 Forbidden
```

---

### Step 6: Monitor CloudWatch Logs (Ongoing)

**View RBAC permission checks:**
```bash
# Stream logs from all verification functions
aws logs tail /aws/lambda/authbridge-verification-staging-approveCase \
  --follow \
  --region af-south-1 \
  --filter-pattern "RBAC"

# Search for permission denied events
aws logs filter-log-events \
  --log-group-name /aws/lambda/authbridge-verification-staging-approveCase \
  --filter-pattern "RBAC_PERMISSION_DENIED" \
  --region af-south-1 \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Search for permission granted events
aws logs filter-log-events \
  --log-group-name /aws/lambda/authbridge-verification-staging-approveCase \
  --filter-pattern "RBAC_PERMISSION_GRANTED" \
  --region af-south-1 \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**Query audit logs in DynamoDB:**
```bash
# Get recent RBAC audit events
aws dynamodb query \
  --table-name AuthBridgeTable \
  --index-name GSI7-AuditByAction \
  --key-condition-expression "GSI7PK = :action" \
  --expression-attribute-values '{":action":{"S":"ACTION#RBAC_PERMISSION_DENIED"}}' \
  --limit 10 \
  --region af-south-1
```

**CloudWatch Insights Queries:**
```sql
-- Permission denied events by user
fields @timestamp, userId, resource, action, roles
| filter action = "RBAC_PERMISSION_DENIED"
| sort @timestamp desc
| limit 20

-- Permission checks by endpoint
fields @timestamp, resource, action, allowed
| filter action in ["RBAC_PERMISSION_GRANTED", "RBAC_PERMISSION_DENIED"]
| stats count() by resource, action
| sort count desc

-- Failed permission checks by role
fields @timestamp, userId, roles, resource
| filter action = "RBAC_PERMISSION_DENIED"
| stats count() by roles
```

---

## 🔄 ROLLBACK PLAN

If issues are detected:

### Option 1: Quick Rollback (Disable RBAC)
```bash
# Redeploy previous version without RBAC
git checkout <previous-commit>
cd services/verification
npx serverless deploy --stage staging
```

### Option 2: Emergency Fix
```bash
# Update policies to allow all access temporarily
aws dynamodb put-item \
  --table-name AuthBridgeCasbinPolicies-staging \
  --item '{
    "PK": {"S": "POLICY#p"},
    "SK": {"S": "emergency#/api/v1/*#read"},
    "ptype": {"S": "p"},
    "v0": {"S": "*"},
    "v1": {"S": "/api/v1/*"},
    "v2": {"S": "read"},
    "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"},
    "updatedAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }' \
  --region af-south-1
```

### Option 3: Delete Casbin Table (Nuclear Option)
```bash
# WARNING: This will remove all RBAC policies
aws dynamodb delete-table \
  --table-name AuthBridgeCasbinPolicies-staging \
  --region af-south-1

# Redeploy without RBAC
git checkout <previous-commit>
npx serverless deploy --stage staging
```

---

## 📊 SUCCESS CRITERIA

- [ ] CasbinPoliciesTable created successfully
- [ ] 150+ policies initialized in table
- [ ] All Lambda functions deployed without errors
- [ ] Admin role assigned to at least one user
- [ ] Admin can access all endpoints
- [ ] Analyst can approve/reject cases
- [ ] Reviewer cannot approve/reject cases (403)
- [ ] API user can create verifications but not approve cases
- [ ] Audit logs show RBAC_PERMISSION_GRANTED/DENIED events
- [ ] No 500 errors in CloudWatch logs
- [ ] Response times < 500ms (RBAC adds ~50-100ms)

---

## 🐛 TROUBLESHOOTING

**Issue: "Casbin table does not exist"**
```bash
# Check if table was created
aws dynamodb describe-table \
  --table-name AuthBridgeCasbinPolicies-staging \
  --region af-south-1

# If not, redeploy
npx serverless deploy --stage staging --force
```

**Issue: "Permission denied for all users"**
```bash
# Check if policies were initialized
aws dynamodb scan \
  --table-name AuthBridgeCasbinPolicies-staging \
  --select COUNT \
  --region af-south-1

# If count is 0, reinitialize
pnpm run init-casbin
```

**Issue: "User has no roles"**
```bash
# Check user role assignment
aws dynamodb query \
  --table-name AuthBridgeTable \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{
    ":pk":{"S":"USER#<user-id>"},
    ":sk":{"S":"ROLE#"}
  }' \
  --region af-south-1
```

**Issue: "Lambda timeout"**
```bash
# Check Lambda execution time
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=authbridge-verification-staging-approveCase \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --region af-south-1
```

---

## 📝 POST-DEPLOYMENT TASKS

- [ ] Update team documentation with RBAC roles
- [ ] Create user onboarding guide for role assignment
- [ ] Set up CloudWatch alarms for permission denied spikes
- [ ] Schedule security audit of RBAC policies
- [ ] Document role assignment process for new users
- [ ] Update API documentation with RBAC requirements

---

## 🎯 NEXT STEPS

After successful deployment:

1. **Monitor for 24 hours** - Watch CloudWatch logs for issues
2. **Gather feedback** - Ask team about permission issues
3. **Adjust policies** - Fine-tune based on real usage
4. **Deploy to production** - Repeat process for prod environment
5. **Complete Story 5.3** - Data export/deletion workflow

---

**Deployment Owner:** Edmond
**Review Date:** 2026-01-18
**Approval:** ⏳ Pending
