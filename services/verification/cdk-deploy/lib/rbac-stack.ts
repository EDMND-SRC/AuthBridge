import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class RbacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Casbin Policies Table
    const casbinTable = new dynamodb.Table(this, 'CasbinPoliciesTable', {
      tableName: 'AuthBridgeCasbinPolicies-staging',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: cdk.aws_kms.Key.fromKeyArn(
        this,
        'DataEncryptionKey',
        'arn:aws:kms:af-south-1:979237821231:key/dd242797-bf9b-4058-a079-3588989dd79b'
      ),
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for role-based queries
    casbinTable.addGlobalSecondaryIndex({
      indexName: 'GSI1-RoleUsers',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Outputs
    new cdk.CfnOutput(this, 'CasbinTableName', {
      value: casbinTable.tableName,
      description: 'Casbin Policies DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'CasbinTableArn', {
      value: casbinTable.tableArn,
      description: 'Casbin Policies DynamoDB Table ARN',
    });
  }
}
