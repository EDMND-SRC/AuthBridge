# Create a flow

## Table of contents
1. [What will be done in these steps?](#what-will-be-done-in-these-steps)
2. [Setup](#setup)
3. [Session Management](#session-management)
4. [Overview](#overview)
5. [Adding a step](#adding-a-step)
6. [Collect a document](#collect-a-document)
7. [Where to go from here](#where-to-go-from-here)

### What will be done in these steps?
These steps will take you through the process of recreating your KYC flow using Ballerine.

### Setup
1. Clone Ballerine's repository
```bash
git clone git@github.com:ballerine-io/ballerine.git
```
2. Navigate to the directory and install dependencies
```bash
cd ballerine && pnpm install
```
3. Start the dev server
```bash
pnpm dev
```
4. Open the page in your [browser](http://localhost:3000/)

### Session Management

**Important**: Verification sessions expire after **30 minutes** of inactivity. This timeout is enforced server-side for security compliance with the Botswana Data Protection Act 2024.

#### Session Expiry Behavior

- Sessions automatically expire 30 minutes after the last API interaction
- Expired sessions cannot be resumed - users must start a new verification flow
- The SDK will emit a `session.expired` event when expiry is detected

#### Handling Session Expiry

```typescript
import { flows } from './main';

flows.init({
  // ... your config
}).then(() => {
  flows.openModal('my-kyc-flow', {
    onSessionExpired: () => {
      // Handle session expiry - show user-friendly message
      alert('Your session has expired. Please start again.');
      // Optionally restart the flow
      flows.openModal('my-kyc-flow', {});
    },
  });
});
```

#### Best Practices

1. **Inform users upfront**: Display a message that the session will expire after 30 minutes of inactivity
2. **Show progress indicators**: Let users know how far along they are in the verification process
3. **Save partial progress**: If your flow allows, save completed steps so users don't have to restart entirely
4. **Handle expiry gracefully**: Provide clear messaging and an easy way to restart

```typescript
// Example: Show remaining time warning
flows.init({
  uiConfig: {
    sessionWarningMinutes: 5, // Warn user 5 minutes before expiry
    onSessionWarning: (remainingMinutes) => {
      console.log(`Session expires in ${remainingMinutes} minutes`);
    },
  },
});
```

### Overview
```typescript
// sdks/web-sdk/src/dev.ts

import { flows } from './main';

// init is used for configurations
flows.init({
    // Here we could add flows, change the theme colors, and configure translations.
}).then(() => {
  // Open a modal for a flow of the same name after initialization is done.
  flows.openModal('my-kyc-flow', {});
});

```
### Adding a step
1. Let's start with adding an empty flow to our config
```typescript
// sdks/web-sdk/src/dev.ts

import { flows } from './main';

// init is used for configurations
flows.init({
  uiConfig: {
      // On the flows object we add a flow with its name as a property.
       flows: {
         // Matches the name passed into openModal
         ['my-kyc-flow']: {
         // ...
         },
     },
 },
}).then(() => {
  // Open a modal for a flow of the same name after initialization is done.
  flows.openModal('my-kyc-flow', {});
});
```
2. The steps array
```typescript
// sdks/web-sdk/src/dev.ts

import { flows } from './main';
// An enum with the available steps.
import { Steps } from './lib/contexts/configuration';
// An enum with the available flow options. i.e identification using a selfie.
import { DocumentType } from './lib/contexts/app-state';
// Want to move the config out of the init method? You can use FlowsInitOptions to keep the object typesafe.
// import { FlowsInitOptions } from './types/BallerineSDK';

// init is used for configurations
flows.init({
  uiConfig: {
      // On the flows object we add a flow with its name as a property.
       flows: {
         // Matches the name passed into openModal
         ['my-kyc-flow']: {
              steps: [
                 // A step is an object with name, id, and additional properties.
                  {
                    name: Steps.DocumentSelection,
                    id: Steps.DocumentSelection,
                    documentOptions: [
                      DocumentType.SELFIE,
                    ],
                  },
              ],
            },
         },
     },
}).then(() => {
  // Open a modal for a flow of the same name after initialization is done.
  flows.openModal('my-kyc-flow', {});
});
```
3. Creating a full flow
```typescript
// sdks/web-sdk/src/dev.ts

import { flows } from './main';
// An enum with the available steps.
import { Steps } from './lib/contexts/configuration';
// An enum with the available flow options. i.e identification using a selfie.
import { DocumentType } from './lib/contexts/app-state';
// Want to move the config out of the init method? You can use FlowsInitOptions to keep the object typesafe.
// import { FlowsInitOptions } from './types/BallerineSDK';

// init is used for configurations
flows.init({
  uiConfig: {
      // On the flows object we add a flow with its name as a property.
       flows: {
         // Matches the name passed into openModal
         ['my-kyc-flow']: {
                 steps: [
                   { name: Steps.Welcome, id: Steps.Welcome },
                   {
                     name: Steps.DocumentSelection,
                     id: Steps.DocumentSelection,
                     documentOptions: [
                       DocumentType.SELFIE,
                     ],
                   },
                   { name: Steps.SelfieStart, id: Steps.SelfieStart },
                   { name: Steps.Selfie, id: Steps.Selfie },
                   { name: Steps.CheckSelfie, id: Steps.CheckSelfie },
                   { name: Steps.Loading, id: Steps.Loading },
                 ],
       },
     },
 },
}).then(() => {
  // Open a modal for a flow of the same name after initialization is done.
  flows.openModal('my-kyc-flow', {});
});
```
### Collect a document
Now that we have know about flows and steps, let's create a flow that collects a document.
```typescript
// sdks/web-sdk/src/dev.ts

import { flows } from './main';
// An enum with the available steps.
import { Steps } from './lib/contexts/configuration';
// An enum with the available flow options. i.e identification using a selfie.
import { DocumentType } from './lib/contexts/app-state';
// Want to move the config out of the init method? You can use FlowsInitOptions to keep the object typesafe.
// import { FlowsInitOptions } from './types/BallerineSDK';

// init is used for configurations
flows.init({
  uiConfig: {
      // On the flows object we add a flow with its name as a property.
       flows: {
         // Matches the name passed into openModal
         ['my-kyc-flow']: {
                 steps: [
                   { name: Steps.Welcome, id: Steps.Welcome },
                   {
                     name: Steps.DocumentSelection,
                     id: Steps.DocumentSelection,
                     documentOptions: [
                       DocumentType.ID_CARD,
                     ],
                   },
                   { name: Steps.DocumentPhoto, id: Steps.DocumentPhoto },
                   // Show the user the image result for confirmation!
                   { name: Steps.CheckDocument, id: Steps.CheckDocument },
                   { name: Steps.Loading, id: Steps.Loading },
                 ],
       },
     },
 },
}).then(() => {
  // Open a modal for a flow of the same name after initialization is done.
  flows.openModal('my-kyc-flow', {});
});
```
### Where to go from here
* [Examples]()
* [Documentation]()
* [Discord]()
* [Contribution guidelines]()
