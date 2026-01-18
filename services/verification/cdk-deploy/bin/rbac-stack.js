#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
const rbac_stack_1 = require("../lib/rbac-stack");
const app = new cdk.App();
new rbac_stack_1.RbacStack(app, 'AuthBridgeRbacStack', {
    env: {
        account: '979237821231',
        region: 'af-south-1',
    },
    description: 'AuthBridge RBAC Infrastructure - Casbin Policies Table',
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmJhYy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJiYWMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsdUNBQXFDO0FBQ3JDLG1DQUFtQztBQUNuQyxrREFBOEM7QUFFOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRTtJQUN4QyxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsY0FBYztRQUN2QixNQUFNLEVBQUUsWUFBWTtLQUNyQjtJQUNELFdBQVcsRUFBRSx3REFBd0Q7Q0FDdEUsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFJiYWNTdGFjayB9IGZyb20gJy4uL2xpYi9yYmFjLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxubmV3IFJiYWNTdGFjayhhcHAsICdBdXRoQnJpZGdlUmJhY1N0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiAnOTc5MjM3ODIxMjMxJyxcbiAgICByZWdpb246ICdhZi1zb3V0aC0xJyxcbiAgfSxcbiAgZGVzY3JpcHRpb246ICdBdXRoQnJpZGdlIFJCQUMgSW5mcmFzdHJ1Y3R1cmUgLSBDYXNiaW4gUG9saWNpZXMgVGFibGUnLFxufSk7XG5cbmFwcC5zeW50aCgpO1xuIl19