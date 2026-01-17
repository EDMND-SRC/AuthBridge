#!/bin/bash
# =============================================================================
# AuthBridge Services Deployment Script
# =============================================================================
# This script deploys all AuthBridge services in the correct order with
# proper error handling and stack state management.
#
# Usage: ./scripts/deploy-services.sh [staging|production]
# =============================================================================

set -e

STAGE=${1:-staging}
REGION="af-south-1"

echo "=============================================="
echo "AuthBridge Deployment - Stage: $STAGE"
echo "Region: $REGION"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check and fix CloudFormation stack state
check_stack_state() {
    local stack_name=$1
    local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

    echo "$status"
}

fix_rollback_failed() {
    local stack_name=$1
    log_warn "Stack $stack_name is in UPDATE_ROLLBACK_FAILED state. Attempting to fix..."

    # Get failed resources
    local failed_resources=$(aws cloudformation describe-stack-events \
        --stack-name "$stack_name" \
        --region "$REGION" \
        --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED`].LogicalResourceId' \
        --output text | tr '\t' ' ')

    if [ -n "$failed_resources" ]; then
        log_info "Skipping failed resources: $failed_resources"
        aws cloudformation continue-update-rollback \
            --stack-name "$stack_name" \
            --region "$REGION" \
            --resources-to-skip $failed_resources

        # Wait for rollback to complete
        log_info "Waiting for rollback to complete..."
        aws cloudformation wait stack-rollback-complete --stack-name "$stack_name" --region "$REGION" 2>/dev/null || true
    fi
}

wait_for_stack() {
    local stack_name=$1
    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        local status=$(check_stack_state "$stack_name")

        case "$status" in
            *COMPLETE)
                log_info "Stack $stack_name is ready ($status)"
                return 0
                ;;
            *IN_PROGRESS)
                log_info "Stack $stack_name is $status, waiting..."
                sleep 10
                ;;
            *ROLLBACK_FAILED)
                fix_rollback_failed "$stack_name"
                ;;
            DOES_NOT_EXIST)
                log_info "Stack $stack_name does not exist yet"
                return 0
                ;;
            *)
                log_error "Stack $stack_name is in unexpected state: $status"
                return 1
                ;;
        esac

        attempt=$((attempt + 1))
    done

    log_error "Timeout waiting for stack $stack_name"
    return 1
}

# =============================================================================
# Step 1: Deploy KMS Keys (prerequisite for all other services)
# =============================================================================
log_info "Step 1: Deploying KMS Keys..."

KMS_STACK="authbridge-kms-$STAGE"
KMS_STATUS=$(check_stack_state "$KMS_STACK")

if [ "$KMS_STATUS" = "DOES_NOT_EXIST" ]; then
    log_info "Creating KMS stack..."
    aws cloudformation create-stack \
        --stack-name "$KMS_STACK" \
        --template-body file://services/shared/cloudformation/kms-keys.yml \
        --parameters ParameterKey=Stage,ParameterValue=$STAGE \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    aws cloudformation wait stack-create-complete --stack-name "$KMS_STACK" --region "$REGION"
else
    wait_for_stack "$KMS_STACK"
    log_info "Updating KMS stack..."
    aws cloudformation update-stack \
        --stack-name "$KMS_STACK" \
        --template-body file://services/shared/cloudformation/kms-keys.yml \
        --parameters ParameterKey=Stage,ParameterValue=$STAGE \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" 2>/dev/null || log_info "No KMS updates needed"
    aws cloudformation wait stack-update-complete --stack-name "$KMS_STACK" --region "$REGION" 2>/dev/null || true
fi

log_info "KMS Keys deployed successfully"

# =============================================================================
# Step 2: Deploy DynamoDB Table
# =============================================================================
log_info "Step 2: Deploying DynamoDB Table..."

DYNAMO_STACK="authbridge-dynamodb-$STAGE"
DYNAMO_STATUS=$(check_stack_state "$DYNAMO_STACK")

if [ "$DYNAMO_STATUS" = "DOES_NOT_EXIST" ]; then
    log_info "Creating DynamoDB stack..."
    aws cloudformation create-stack \
        --stack-name "$DYNAMO_STACK" \
        --template-body file://services/shared/cloudformation/dynamodb-table.yml \
        --parameters ParameterKey=Stage,ParameterValue=$STAGE \
        --region "$REGION"
    aws cloudformation wait stack-create-complete --stack-name "$DYNAMO_STACK" --region "$REGION"
else
    wait_for_stack "$DYNAMO_STACK"
    log_info "Updating DynamoDB stack..."
    aws cloudformation update-stack \
        --stack-name "$DYNAMO_STACK" \
        --template-body file://services/shared/cloudformation/dynamodb-table.yml \
        --parameters ParameterKey=Stage,ParameterValue=$STAGE \
        --region "$REGION" 2>/dev/null || log_info "No DynamoDB updates needed"
    aws cloudformation wait stack-update-complete --stack-name "$DYNAMO_STACK" --region "$REGION" 2>/dev/null || true
fi

log_info "DynamoDB Table deployed successfully"

# =============================================================================
# Step 3: Deploy Auth Service (required by Verification service authorizers)
# =============================================================================
log_info "Step 3: Deploying Auth Service..."

AUTH_STACK="authbridge-auth-$STAGE"
wait_for_stack "$AUTH_STACK"

cd services/auth
npx serverless deploy --stage "$STAGE" --region "$REGION"
cd ../..

log_info "Auth Service deployed successfully"

# =============================================================================
# Step 4: Deploy Verification Service
# =============================================================================
log_info "Step 4: Deploying Verification Service..."

VERIFICATION_STACK="authbridge-verification-$STAGE"
wait_for_stack "$VERIFICATION_STACK"

cd services/verification
npx serverless deploy --stage "$STAGE" --region "$REGION"
cd ../..

log_info "Verification Service deployed successfully"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
echo "Stage: $STAGE"
echo "Region: $REGION"
echo ""
echo "Deployed stacks:"
echo "  - $KMS_STACK"
echo "  - $DYNAMO_STACK"
echo "  - $AUTH_STACK"
echo "  - $VERIFICATION_STACK"
echo "=============================================="
