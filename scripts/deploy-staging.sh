#!/bin/bash
set -e

# AuthBridge Staging Deployment Script
# Usage: ./scripts/deploy-staging.sh

echo "🚀 AuthBridge Staging Deployment"
echo "================================"

# Check for required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not set. Loading from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

STAGE="staging"
REGION="af-south-1"
STACK_NAME="authbridge-dynamodb-$STAGE"

echo ""
echo "📋 Configuration:"
echo "   Stage: $STAGE"
echo "   Region: $REGION"
echo "   AWS Account: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'checking...')"
echo ""

# Step 1: Deploy DynamoDB Table (if not exists)
echo "📦 Step 1: Deploying DynamoDB Table..."
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null; then
    echo "   ✅ DynamoDB stack already exists"
else
    echo "   Creating DynamoDB table..."
    aws cloudformation deploy \
        --template-file services/shared/cloudformation/dynamodb-table.yml \
        --stack-name $STACK_NAME \
        --parameter-overrides Stage=$STAGE \
        --region $REGION \
        --capabilities CAPABILITY_IAM \
        --no-fail-on-empty-changeset
    echo "   ✅ DynamoDB table created"
fi

# Step 2: Build Auth Service
echo ""
echo "🔨 Step 2: Building Auth Service..."
pnpm --filter @authbridge/auth-service build
echo "   ✅ Auth service built"

# Step 3: Deploy Auth Service
echo ""
echo "🚀 Step 3: Deploying Auth Service..."
cd services/auth
npx serverless deploy --stage $STAGE --region $REGION
cd ../..
echo "   ✅ Auth service deployed"

# Step 4: Build Verification Service
echo ""
echo "🔨 Step 4: Building Verification Service..."
pnpm --filter @ballerine/verification-service build
echo "   ✅ Verification service built"

# Step 5: Deploy Verification Service
echo ""
echo "🚀 Step 5: Deploying Verification Service..."
cd services/verification
npx serverless deploy --stage $STAGE --region $REGION
cd ../..
echo "   ✅ Verification service deployed"

# Step 6: Output endpoints
echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "📍 Endpoints:"
echo "   Auth API:         https://api-staging.authbridge.io/auth"
echo "   Verification API: https://api-staging.authbridge.io/api/v1"
echo ""
echo "📊 CloudWatch Logs:"
echo "   Auth:         /aws/lambda/authbridge-auth-$STAGE-*"
echo "   Verification: /aws/lambda/authbridge-verification-$STAGE-*"
echo ""
