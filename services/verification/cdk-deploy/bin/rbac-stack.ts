#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RbacStack } from '../lib/rbac-stack';

const app = new cdk.App();

new RbacStack(app, 'AuthBridgeRbacStack', {
  env: {
    account: '979237821231',
    region: 'af-south-1',
  },
  description: 'AuthBridge RBAC Infrastructure - Casbin Policies Table',
});

app.synth();
