#!/bin/bash
set -e

echo "Setting up DynamoDB Local table for testing..."

# Create the AuthBridgeTable with the same schema as production
aws dynamodb create-table \
  --table-name AuthBridgeTable \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
    AttributeName=GSI2PK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
    "IndexName=OmangHashIndex,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000 \
  --region af-south-1 \
  2>/dev/null || echo "Table already exists or error occurred"

echo "✅ DynamoDB Local table setup complete"
