---
stepsCompleted: [1, 2, 3]
inputDocuments: ['context.md', 'BOTSWANA_SETUP_GUIDE.md', '_bmad-output/project-overview.md', 'package.json', 'apps/backoffice/package.json', 'sdks/web-sdk/package.json']
session_topic: 'Full-featured Botswana market customization for AuthBridge with dependency upgrades and AWS backend integration'
session_goals: 'Retain full Ballerine functionality while customizing for Botswana; Upgrade all dependencies to current LTS versions; Implement AWS serverless backend; Integrate with Botswana regulatory requirements'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['First Principles Thinking', 'Resource Constraints', 'Role Playing', 'Morphological Analysis']
context_file: '_bmad/bmm/data/project-context-template.md'
---

# AuthBridge Botswana: Full-Featured Customization Brainstorming Report

**Session Date:** January 12, 2026
**Facilitator:** Mary (Business Analyst Agent)
**Participant:** Edmond Moepswa
**Project:** AuthBridge (based on Ballerine)

---

## Executive Summary

This brainstorming session focuses on **retaining the full functionality** of the Ballerine-based AuthBridge platform while customizing it for the Botswana market. The session covers:

1. **Critical Dependency Upgrades** - Bringing all packages to current LTS versions
2. **Botswana Market Customization** - Localization, document types, compliance
3. **AWS Backend Architecture** - Serverless implementation using free tier
4. **Regulatory Compliance** - Bank of Botswana, NBFIRA, Data Protection Act
5. **Full Feature Retention** - Keeping all existing KYC/KYB capabilities

---

## PART 1: CRITICAL DEPENDENCY UPGRADES

### Current State Analysis (From package.json files)

Your codebase has **significantly outdated dependencies** that need immediate attention:

| Package | Current Version | Latest Version | Risk Level |
|---------|-----------------|----------------|------------|
| **Node.js** | >=16.15.1 | 22.x LTS (24.x available) | 🔴 CRITICAL |
| **React** | 18.2.0 | 19.x | 🟡 MEDIUM |
| **TypeScript** | 4.7.4 | 5.9.x | 🟡 MEDIUM |
| **Mantine** | 5.7.2 | 8.1.x | 🔴 CRITICAL |
| **Refine** | 3.18.0 | 5.x | 🔴 CRITICAL |
| **Svelte** | 3.39.0 | 5.38.x | 🔴 CRITICAL |
| **Vite** | 2.9.15 | 7.x | 🔴 CRITICAL |
| **pnpm** | 7.11.0 | 10.26.x | 🟡 MEDIUM |
| **Nx** | 15.0.2 | Latest | 🟡 MEDIUM |


### AWS Lambda Runtime Implications

**CRITICAL:** AWS Lambda is ending support for older Node.js runtimes:

| Runtime | Status | Block New Functions | Block Updates |
|---------|--------|---------------------|---------------|
| Node.js 16 | ❌ EOL | Already blocked | March 2026 |
| Node.js 18 | ❌ EOL (April 2025) | October 2025 | March 2026 |
| Node.js 20 | ⚠️ Maintenance | Ending soon | TBD |
| Node.js 22 | ✅ Active LTS | Supported until Sept 2026 | N/A |
| Node.js 24 | ✅ Current | Supported until April 2028 | N/A |

**Recommendation:** Target **Node.js 22 LTS** for stability, with path to Node.js 24.

---

### Dependency Upgrade Strategy

#### Phase 1: Foundation Upgrades (Week 1-2)

**1.1 Node.js Upgrade**
```bash
# Update .nvmrc or engines in package.json
"engines": {
  "node": ">=22.0.0",
  "pnpm": ">=10.0.0"
}
```

**Why Node.js 22:**
- Active LTS until September 2026
- Full AWS Lambda support (nodejs22.x runtime)
- ESM modules fully stable
- Performance improvements over Node 20

**1.2 pnpm Upgrade**
```bash
# Install latest pnpm
npm install -g pnpm@latest
# Currently pnpm 10.26.x
```

**1.3 TypeScript Upgrade**
```bash
# Upgrade to TypeScript 5.9
pnpm add -D typescript@^5.9.0
```

**New TypeScript 5.9 Features:**
- `import defer` for lazy loading
- `node20` module support
- Better ESM interoperability
- Improved type inference

#### Phase 2: Framework Upgrades (Week 2-3)

**2.1 React 19 Upgrade (Backoffice)**

React 19 brings significant improvements:
- Actions for data mutations
- Improved Concurrent Rendering
- Better Suspense handling
- Server Components support

```json
// apps/backoffice/package.json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Migration Notes:**
- Update `@types/react` to `^19.0.0`
- Review deprecated lifecycle methods
- Test Concurrent Mode compatibility

**2.2 Mantine 8.x Upgrade (Backoffice)**

This is a **major breaking change** from v5 to v8:

```json
{
  "dependencies": {
    "@mantine/core": "^8.1.0",
    "@mantine/hooks": "^8.1.0"
  }
}
```

**Breaking Changes to Address:**
- Complete theming system overhaul
- Component API changes
- CSS-in-JS to CSS modules migration
- Remove `@mantine/rte` (deprecated) - use `@mantine/tiptap`

**Migration Path:**
1. Read official 7.x → 8.x migration guide
2. Update theme configuration
3. Replace deprecated components
4. Update styling approach

**2.3 Refine 5.x Upgrade (Backoffice)**

Refine v5 is a major upgrade from v3:

```json
{
  "dependencies": {
    "@refinedev/core": "^5.0.0",
    "@refinedev/mantine": "^5.0.0",
    "@refinedev/react-router": "^5.0.0",
    "@refinedev/simple-rest": "^5.0.0"
  }
}
```

**Key Changes:**
- Package names changed from `@pankod/refine-*` to `@refinedev/*`
- React 19 and TanStack Query v5 support
- Restructured hook interfaces
- Improved TypeScript types

**Migration Steps:**
1. Update all package names
2. Review hook API changes
3. Update data provider configuration
4. Test all CRUD operations

#### Phase 3: SDK Upgrades (Week 3-4)

**3.1 Svelte 5 Upgrade (Web SDK)**

Svelte 5 is a **complete rewrite** with new reactivity system:

```json
// sdks/web-sdk/package.json
{
  "devDependencies": {
    "svelte": "^5.38.0",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte-check": "^4.0.0"
  }
}
```

**Major Changes:**
- New "runes" reactivity system (`$state`, `$derived`, `$effect`)
- `$:` reactive statements deprecated
- Component composition changes
- Improved TypeScript support

**Migration Approach:**
1. Enable Svelte 5 compatibility mode first
2. Gradually migrate components to runes
3. Update event handling syntax
4. Test all SDK flows thoroughly

**3.2 Vite 7 Upgrade**

```json
{
  "devDependencies": {
    "vite": "^7.0.0"
  }
}
```

**Benefits:**
- Rolldown integration (faster builds)
- Improved HMR
- Better ESM handling
- Modern browser targeting

---

## PART 2: FULL-FEATURED BOTSWANA CUSTOMIZATION

### Retaining ALL Existing Features

The Ballerine platform includes these features that **MUST be retained**:

#### KYC/KYB Verification Workflows
- ✅ Document capture (camera + upload)
- ✅ Selfie/liveness detection
- ✅ Multi-step verification flows
- ✅ Configurable workflow steps
- ✅ Document type selection

#### Case Management Dashboard
- ✅ Case listing and filtering
- ✅ Manual review and approval
- ✅ User/case details view
- ✅ Document preview
- ✅ Audit trail
- ✅ Role-based access control (Casbin)

#### SDK Capabilities
- ✅ Embeddable web component
- ✅ Customizable UI/theming
- ✅ Multi-language support (i18next)
- ✅ Camera integration
- ✅ Image compression
- ✅ Progress indicators

#### Technical Features
- ✅ REST API integration
- ✅ TypeScript throughout
- ✅ Monorepo architecture (Nx)
- ✅ Component library structure


### Botswana-Specific Customizations (Additive, Not Reductive)

#### 2.1 Document Types Enhancement

**Current Document Types (KEEP ALL):**
- Passport
- Driver's License
- ID Card
- Residence Permit
- Voter ID
- Work Permit
- Visa
- Bank Statement
- Proof of Business Tax ID
- Operating License
- Business Registration
- Selfie

**ADD Botswana-Specific Types:**

```typescript
// sdks/web-sdk/src/lib/contexts/app-state/types.ts

export enum DocumentType {
  // Existing types (KEEP ALL)
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  ID_CARD = 'id_card',
  RESIDENCE_PERMIT = 'residence_permit',
  VOTER_ID = 'voter_id',
  WORK_PERMIT = 'work_permit',
  VISA = 'visa',
  BANK_STATEMENT = 'bank_statement',
  PROOF_OF_BUSINESS_TAX_ID = 'proof_of_business_tax_id',
  OPERATING_LICENSE = 'operating_license',
  BUSINESS_REGISTRATION = 'business_registration',
  SELFIE = 'selfie',

  // NEW: Botswana-specific types
  OMANG = 'omang',                           // National ID (9 digits)
  BOTSWANA_DRIVERS_LICENSE = 'bw_drivers_license',
  BURS_TAX_CLEARANCE = 'burs_tax_clearance', // Tax clearance certificate
  CIPA_REGISTRATION = 'cipa_registration',   // Company registration
  UTILITY_BILL_BW = 'utility_bill_bw',       // BPC, WUC bills
  BANK_STATEMENT_BW = 'bank_statement_bw',   // Local bank statements
}

// NEW: Botswana document metadata
export interface BotswanaDocumentConfig {
  omangFormat: RegExp;           // /^\d{9}$/
  phoneFormat: RegExp;           // /^\+267\d{8}$/
  postalCodeFormat: RegExp;      // Botswana postal codes
  supportedBanks: string[];      // FNB, Standard, Barclays, Stanbic, etc.
  supportedMobileWallets: string[]; // Orange Money, MyZaka, Smega
}
```

#### 2.2 Validation Rules (New Module)

Create comprehensive Botswana validation:

```typescript
// sdks/web-sdk/src/lib/utils/validators/botswana/index.ts

export const BotswanaValidators = {
  // Omang validation (9 digits, checksum algorithm)
  validateOmang: (omang: string): ValidationResult => {
    const omangRegex = /^\d{9}$/;
    if (!omangRegex.test(omang)) {
      return { valid: false, error: 'Omang must be exactly 9 digits' };
    }
    // Add checksum validation if known
    return { valid: true };
  },

  // Phone number validation (+267 XX XXX XXXX)
  validatePhone: (phone: string): ValidationResult => {
    const phoneRegex = /^\+267[0-9]{8}$/;
    const mobileRegex = /^\+267(7[1-7])[0-9]{6}$/; // Mobile prefixes
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: 'Invalid Botswana phone format' };
    }
    return { valid: true, isMobile: mobileRegex.test(phone) };
  },

  // Business registration (CIPA format)
  validateCIPA: (regNumber: string): ValidationResult => {
    // CIPA registration format: BW00001234567
    const cipaRegex = /^BW\d{11}$/;
    return { valid: cipaRegex.test(regNumber) };
  },

  // Tax Identification Number (TIN)
  validateTIN: (tin: string): ValidationResult => {
    // BURS TIN format
    const tinRegex = /^[A-Z]\d{9}$/;
    return { valid: tinRegex.test(tin) };
  },

  // Address validation
  validateAddress: (address: BotswanaAddress): ValidationResult => {
    const requiredFields = ['plotNumber', 'locality', 'district'];
    const districts = [
      'Central', 'Ghanzi', 'Kgalagadi', 'Kgatleng', 'Kweneng',
      'North-East', 'North-West', 'South-East', 'Southern'
    ];
    // Validation logic
    return { valid: true };
  }
};
```

#### 2.3 Localization (Setswana + English)

**Expand existing i18next setup:**

```typescript
// apps/backoffice/src/i18n/locales/tn.json (Setswana)
{
  "common": {
    "welcome": "Dumelang",
    "submit": "Romela",
    "cancel": "Khansela",
    "next": "E e latelang",
    "back": "Morago",
    "loading": "E a laiwa...",
    "error": "Phoso",
    "success": "Katlego"
  },
  "documents": {
    "omang": "Omang (Karata ya Boitshupo)",
    "passport": "Phasepoto",
    "drivers_license": "Laesense ya go Kgweetsa",
    "bank_statement": "Setatamente sa Banka",
    "selfie": "Setshwantsho sa Sefatlhego",
    "upload_prompt": "Tsenya tokomane ya gago",
    "capture_prompt": "Tsaya setshwantsho sa tokomane"
  },
  "verification": {
    "title": "Netefatso ya Boitshupo",
    "step_document": "Tokomane",
    "step_selfie": "Setshwantsho",
    "step_review": "Tlhatlhobo",
    "pending": "E emetse tlhatlhobo",
    "approved": "E amogetse",
    "rejected": "E ganetswe"
  },
  "errors": {
    "invalid_omang": "Nomoro ya Omang ga e a siama",
    "invalid_phone": "Nomoro ya mogala ga e a siama",
    "document_required": "Tokomane e a tlhokega",
    "upload_failed": "Go tsenya go paletse"
  }
}
```

**SDK Localization:**

```typescript
// sdks/web-sdk/src/lib/i18n/tn.ts (Setswana)
export const tn = {
  start: {
    title: "Simolola Netefatso",
    subtitle: "Re tlhoka go netefatsa boitshupo jwa gago",
    button: "Simolola"
  },
  documentSelection: {
    title: "Tlhopha Tokomane",
    omang: "Omang",
    passport: "Phasepoto",
    driversLicense: "Laesense ya go Kgweetsa"
  },
  camera: {
    title: "Tsaya Setshwantsho",
    instruction: "Baya tokomane mo gare ga foreimi",
    capture: "Tsaya Setshwantsho",
    retake: "Tsaya Gape"
  },
  selfie: {
    title: "Tsaya Setshwantsho sa Sefatlhego",
    instruction: "Lebisa sefatlhego sa gago mo kamereng",
    tips: [
      "Netefatsa gore lesedi le lekaneng",
      "Ntsha digalase fa o di rwele",
      "Lebisa pele"
    ]
  },
  complete: {
    title: "Re a Leboga!",
    message: "Netefatso ya gago e rometse",
    status: "Re tla go itsise ka email"
  }
};
```


#### 2.4 UI/UX Customizations

**Theming for Botswana Market:**

```typescript
// apps/backoffice/src/theme/botswana-theme.ts
import { MantineThemeOverride } from '@mantine/core';

export const botswanaTheme: MantineThemeOverride = {
  // Botswana flag colors as accent options
  colors: {
    botswanaBlue: ['#75AADB', '#6BA3D6', '#5E9AD0', '#4F90C9', '#3F85C2', '#2E79BA', '#1E6DB2', '#0E61AA', '#0055A2', '#004A8F'],
    botswanaBlack: ['#4A4A4A', '#3D3D3D', '#303030', '#232323', '#161616', '#0A0A0A', '#000000', '#000000', '#000000', '#000000'],
  },
  primaryColor: 'botswanaBlue',

  // Mobile-first responsive design
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '576px',   // Large phones
    md: '768px',   // Tablets
    lg: '992px',   // Laptops
    xl: '1200px',  // Desktops
  },

  // Accessibility for varying literacy levels
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
};
```

**Mobile-Optimized SDK Configuration:**

```typescript
// sdks/web-sdk/src/lib/config/botswana-config.ts
export const botswanaSDKConfig = {
  // Optimize for mobile data costs
  imageCompression: {
    maxWidth: 1200,      // Reduced from default
    maxHeight: 1200,
    quality: 0.7,        // Balance quality vs size
    maxSizeMB: 1,        // Strict size limit
  },

  // Offline-first considerations
  offlineMode: {
    enabled: true,
    queueUploads: true,
    maxQueueSize: 5,
  },

  // Network-aware behavior
  networkAdaptive: {
    enabled: true,
    lowBandwidthThreshold: '2g',
    reducedQualityOnSlow: true,
  },

  // Currency display
  currency: {
    code: 'BWP',
    symbol: 'P',
    locale: 'en-BW',
  },

  // Date/time formatting
  dateFormat: 'DD/MM/YYYY',
  timeZone: 'Africa/Gaborone',
};
```

---

## PART 3: AWS SERVERLESS BACKEND ARCHITECTURE

### Complete Backend Implementation

Since the backend is currently a git submodule that's not initialized, you'll need to build a new AWS-native backend:

#### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHBRIDGE AWS ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Netlify    │     │   Netlify    │     │  CloudFront  │                │
│  │  (Backoffice)│     │  (Web SDK)   │     │    (CDN)     │                │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                │
│         │                    │                    │                         │
│         └────────────────────┼────────────────────┘                         │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        API GATEWAY (REST)                              │ │
│  │  /auth/* │ /verify/* │ /cases/* │ /documents/* │ /webhooks/*          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Lambda     │     │   Lambda     │     │   Lambda     │                │
│  │ (Auth/User)  │     │ (Verify)     │     │ (Cases)      │                │
│  │ Node.js 22   │     │ Node.js 22   │     │ Node.js 22   │                │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                │
│         │                    │                    │                         │
│         └────────────────────┼────────────────────┘                         │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Cognito    │     │  DynamoDB    │     │     S3       │                │
│  │   (Auth)     │     │   (Data)     │     │  (Documents) │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      INTEGRATIONS                                      │ │
│  │  Make.com (Workflows) │ SES (Email) │ SNS (SMS) │ Dodo (Payments)     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 AWS Services Breakdown

| Service | Purpose | Free Tier Limit | Estimated Usage |
|---------|---------|-----------------|-----------------|
| **Lambda** | API handlers | 1M requests/month | ~10K requests |
| **API Gateway** | REST API | 1M calls/month | ~10K calls |
| **DynamoDB** | Data storage | 25GB, 25 RCU/WCU | ~1GB |
| **S3** | Document storage | 5GB | ~2GB |
| **Cognito** | Authentication | 50,000 MAU | ~100 users |
| **SES** | Email notifications | 62,000/month | ~1,000 |
| **CloudWatch** | Monitoring | 10 metrics | Basic |
| **IAM** | Access control | Free | N/A |

**Total Estimated Cost: $0/month** (within free tier)


#### 3.3 DynamoDB Schema Design

```typescript
// services/backend/src/models/dynamodb-schema.ts

// Single-table design for efficiency
export const AuthBridgeSchema = {
  TableName: 'AuthBridge',

  // Primary key structure
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },  // Partition key
    { AttributeName: 'SK', KeyType: 'RANGE' }, // Sort key
  ],

  // Global Secondary Indexes
  GlobalSecondaryIndexes: [
    {
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
      ],
    },
    {
      IndexName: 'StatusIndex',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' },
      ],
    },
  ],
};

// Entity patterns
export const EntityPatterns = {
  // User: PK=USER#<userId>, SK=PROFILE
  User: {
    PK: (userId: string) => `USER#${userId}`,
    SK: 'PROFILE',
  },

  // Case: PK=CASE#<caseId>, SK=META
  Case: {
    PK: (caseId: string) => `CASE#${caseId}`,
    SK: 'META',
  },

  // Document: PK=CASE#<caseId>, SK=DOC#<docId>
  Document: {
    PK: (caseId: string) => `CASE#${caseId}`,
    SK: (docId: string) => `DOC#${docId}`,
  },

  // Verification: PK=USER#<userId>, SK=VERIFY#<timestamp>
  Verification: {
    PK: (userId: string) => `USER#${userId}`,
    SK: (timestamp: string) => `VERIFY#${timestamp}`,
  },

  // Audit Log: PK=AUDIT#<date>, SK=<timestamp>#<eventId>
  AuditLog: {
    PK: (date: string) => `AUDIT#${date}`,
    SK: (timestamp: string, eventId: string) => `${timestamp}#${eventId}`,
  },
};

// Example Case entity
export interface CaseEntity {
  PK: string;           // CASE#<caseId>
  SK: string;           // META
  GSI1PK: string;       // USER#<userId>
  GSI1SK: string;       // CASE#<createdAt>

  caseId: string;
  userId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';

  // Botswana-specific fields
  omangNumber?: string;
  verificationType: 'kyc' | 'kyb';

  // Metadata
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Document references
  documents: {
    docId: string;
    type: string;
    s3Key: string;
    status: string;
  }[];
}
```

#### 3.4 Lambda Functions Structure

```
services/backend/
├── src/
│   ├── handlers/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   ├── verify-token.ts
│   │   │   └── refresh-token.ts
│   │   ├── verification/
│   │   │   ├── start-verification.ts
│   │   │   ├── upload-document.ts
│   │   │   ├── submit-verification.ts
│   │   │   └── get-status.ts
│   │   ├── cases/
│   │   │   ├── list-cases.ts
│   │   │   ├── get-case.ts
│   │   │   ├── update-case.ts
│   │   │   └── approve-reject.ts
│   │   ├── documents/
│   │   │   ├── get-upload-url.ts
│   │   │   ├── process-document.ts
│   │   │   └── get-document.ts
│   │   └── webhooks/
│   │       ├── dodo-payment.ts
│   │       └── make-automation.ts
│   ├── lib/
│   │   ├── dynamodb.ts
│   │   ├── s3.ts
│   │   ├── cognito.ts
│   │   ├── ses.ts
│   │   └── validators/
│   │       └── botswana.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── response.ts
│       └── error-handler.ts
├── serverless.yml
├── package.json
└── tsconfig.json
```

#### 3.5 Serverless Framework Configuration

```yaml
# services/backend/serverless.yml
service: authbridge-api

provider:
  name: aws
  runtime: nodejs22.x
  region: af-south-1  # Cape Town (closest to Botswana)
  stage: ${opt:stage, 'dev'}

  environment:
    DYNAMODB_TABLE: ${self:service}-${self:provider.stage}
    S3_BUCKET: ${self:service}-documents-${self:provider.stage}
    COGNITO_USER_POOL_ID: !Ref UserPool

  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - !GetAtt DynamoDBTable.Arn
            - !Sub "${DynamoDBTable.Arn}/index/*"
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource:
            - !Sub "${DocumentsBucket.Arn}/*"
        - Effect: Allow
          Action:
            - ses:SendEmail
          Resource: "*"

functions:
  # Auth functions
  login:
    handler: src/handlers/auth/login.handler
    events:
      - http:
          path: auth/login
          method: post
          cors: true

  register:
    handler: src/handlers/auth/register.handler
    events:
      - http:
          path: auth/register
          method: post
          cors: true

  # Verification functions
  startVerification:
    handler: src/handlers/verification/start-verification.handler
    events:
      - http:
          path: verify/start
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  uploadDocument:
    handler: src/handlers/verification/upload-document.handler
    events:
      - http:
          path: verify/upload
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  # Case management functions
  listCases:
    handler: src/handlers/cases/list-cases.handler
    events:
      - http:
          path: cases
          method: get
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  getCase:
    handler: src/handlers/cases/get-case.handler
    events:
      - http:
          path: cases/{caseId}
          method: get
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  updateCase:
    handler: src/handlers/cases/update-case.handler
    events:
      - http:
          path: cases/{caseId}
          method: put
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  # Webhook handlers
  dodoWebhook:
    handler: src/handlers/webhooks/dodo-payment.handler
    events:
      - http:
          path: webhooks/dodo
          method: post

resources:
  Resources:
    # DynamoDB Table
    DynamoDBTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:provider.environment.DYNAMODB_TABLE}
        BillingMode: PAY_PER_REQUEST  # Free tier friendly
        AttributeDefinitions:
          - AttributeName: PK
            AttributeType: S
          - AttributeName: SK
            AttributeType: S
          - AttributeName: GSI1PK
            AttributeType: S
          - AttributeName: GSI1SK
            AttributeType: S
          - AttributeName: status
            AttributeType: S
          - AttributeName: createdAt
            AttributeType: S
        KeySchema:
          - AttributeName: PK
            KeyType: HASH
          - AttributeName: SK
            KeyType: RANGE
        GlobalSecondaryIndexes:
          - IndexName: GSI1
            KeySchema:
              - AttributeName: GSI1PK
                KeyType: HASH
              - AttributeName: GSI1SK
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
          - IndexName: StatusIndex
            KeySchema:
              - AttributeName: status
                KeyType: HASH
              - AttributeName: createdAt
                KeyType: RANGE
            Projection:
              ProjectionType: ALL

    # S3 Bucket for documents
    DocumentsBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:provider.environment.S3_BUCKET}
        CorsConfiguration:
          CorsRules:
            - AllowedHeaders: ['*']
              AllowedMethods: [GET, PUT, POST]
              AllowedOrigins: ['*']
              MaxAge: 3000

    # Cognito User Pool
    UserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        UserPoolName: ${self:service}-${self:provider.stage}-users
        AutoVerifiedAttributes:
          - email
        UsernameAttributes:
          - email
        Policies:
          PasswordPolicy:
            MinimumLength: 8
            RequireLowercase: true
            RequireNumbers: true
            RequireSymbols: false
            RequireUppercase: true

    UserPoolClient:
      Type: AWS::Cognito::UserPoolClient
      Properties:
        ClientName: ${self:service}-${self:provider.stage}-client
        UserPoolId: !Ref UserPool
        GenerateSecret: false
        ExplicitAuthFlows:
          - ALLOW_USER_PASSWORD_AUTH
          - ALLOW_REFRESH_TOKEN_AUTH

    # API Gateway Authorizer
    ApiGatewayAuthorizer:
      Type: AWS::ApiGateway::Authorizer
      Properties:
        Name: CognitoAuthorizer
        Type: COGNITO_USER_POOLS
        IdentitySource: method.request.header.Authorization
        RestApiId: !Ref ApiGatewayRestApi
        ProviderARNs:
          - !GetAtt UserPool.Arn
```


---

## PART 4: BOTSWANA REGULATORY COMPLIANCE

### 4.1 Regulatory Framework

Based on research, AuthBridge must comply with:

| Regulator | Scope | Key Requirements |
|-----------|-------|------------------|
| **Bank of Botswana** | Banks, payment systems | KYC, AML, transaction monitoring |
| **NBFIRA** | Non-bank financial institutions | Licensing, KYC, consumer protection |
| **Data Protection Act** | All data processors | Consent, data residency, breach notification |
| **BURS** | Tax compliance | TIN verification, tax clearance |
| **CIPA** | Business registration | Company verification |

### 4.2 KYC Requirements for Botswana

**Individual KYC (Know Your Customer):**
1. Full legal name
2. Omang number (or passport for non-citizens)
3. Date of birth
4. Residential address
5. Contact information (phone, email)
6. Source of funds (for higher-risk transactions)
7. Selfie/photo for biometric matching

**Business KYB (Know Your Business):**
1. Company name and registration number (CIPA)
2. Tax Identification Number (TIN)
3. Business address
4. Directors and shareholders (>25% ownership)
5. Ultimate Beneficial Owners (UBOs)
6. Business activity description
7. Bank account details

### 4.3 Compliance Features to Implement

```typescript
// services/backend/src/lib/compliance/botswana-compliance.ts

export interface ComplianceCheck {
  checkType: string;
  status: 'passed' | 'failed' | 'pending' | 'manual_review';
  details: Record<string, any>;
  timestamp: string;
}

export class BotswanaComplianceService {
  // Omang verification against national database (future integration)
  async verifyOmang(omangNumber: string): Promise<ComplianceCheck> {
    // For MVP: Format validation only
    // Future: Integration with government API
    const isValid = /^\d{9}$/.test(omangNumber);
    return {
      checkType: 'omang_verification',
      status: isValid ? 'passed' : 'failed',
      details: { omangNumber, formatValid: isValid },
      timestamp: new Date().toISOString(),
    };
  }

  // Sanctions/PEP screening
  async screenSanctions(name: string, dob?: string): Promise<ComplianceCheck> {
    // Integration with sanctions list provider
    // Options: ComplyAdvantage, Refinitiv, or open sanctions lists
    return {
      checkType: 'sanctions_screening',
      status: 'passed', // Placeholder
      details: { name, screened: true },
      timestamp: new Date().toISOString(),
    };
  }

  // Business verification via CIPA
  async verifyCIPA(registrationNumber: string): Promise<ComplianceCheck> {
    // Future: CIPA API integration
    const isValidFormat = /^BW\d{11}$/.test(registrationNumber);
    return {
      checkType: 'cipa_verification',
      status: isValidFormat ? 'pending' : 'failed',
      details: { registrationNumber, formatValid: isValidFormat },
      timestamp: new Date().toISOString(),
    };
  }

  // Generate compliance report for audit
  async generateComplianceReport(caseId: string): Promise<ComplianceReport> {
    // Compile all checks for regulatory reporting
    return {
      caseId,
      generatedAt: new Date().toISOString(),
      checks: [],
      overallStatus: 'compliant',
      riskScore: 0,
    };
  }
}
```

### 4.4 Audit Trail Implementation

```typescript
// services/backend/src/lib/audit/audit-logger.ts

export interface AuditEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  userId?: string;
  caseId?: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private dynamodb: DynamoDBClient;

  async log(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      eventId: generateUUID(),
      timestamp: new Date().toISOString(),
    };

    const date = auditEvent.timestamp.split('T')[0];

    await this.dynamodb.put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        PK: `AUDIT#${date}`,
        SK: `${auditEvent.timestamp}#${auditEvent.eventId}`,
        ...auditEvent,
        // TTL for automatic cleanup (retain 7 years for compliance)
        ttl: Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60),
      },
    });
  }

  // Query audit logs for compliance reporting
  async queryLogs(params: {
    startDate: string;
    endDate: string;
    caseId?: string;
    userId?: string;
  }): Promise<AuditEvent[]> {
    // Implementation for querying audit logs
    return [];
  }
}

// Usage in handlers
export const auditMiddleware = (handler: Handler) => async (event: APIGatewayEvent) => {
  const auditLogger = new AuditLogger();

  // Log request
  await auditLogger.log({
    eventType: 'api_request',
    action: `${event.httpMethod} ${event.path}`,
    userId: event.requestContext.authorizer?.claims?.sub,
    details: {
      queryParams: event.queryStringParameters,
      pathParams: event.pathParameters,
    },
    ipAddress: event.requestContext.identity.sourceIp,
    userAgent: event.headers['User-Agent'],
  });

  const response = await handler(event);

  // Log response
  await auditLogger.log({
    eventType: 'api_response',
    action: `${event.httpMethod} ${event.path}`,
    userId: event.requestContext.authorizer?.claims?.sub,
    details: {
      statusCode: response.statusCode,
    },
  });

  return response;
};
```

---

## PART 5: INTEGRATION WITH EXISTING TOOLS

### 5.1 Make.com Integration (Pre-paid)

Leverage your existing Make.com subscription for workflow automation:

**Scenarios to Create:**

1. **New Verification Notification**
   - Trigger: Webhook from AuthBridge API
   - Actions: Send email, Slack notification, update Amplitude

2. **Case Status Update**
   - Trigger: Webhook on case approval/rejection
   - Actions: Send customer email, update CRM, log to Amplitude

3. **Daily Summary Report**
   - Trigger: Scheduled (daily)
   - Actions: Query API for stats, send summary email

4. **Payment Webhook Handler**
   - Trigger: Dodo Payments webhook
   - Actions: Update subscription status, send confirmation

```typescript
// services/backend/src/handlers/webhooks/make-automation.ts

export const handler = async (event: APIGatewayEvent) => {
  const { action, data } = JSON.parse(event.body || '{}');

  // Trigger Make.com webhook
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

  await fetch(makeWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      data,
      timestamp: new Date().toISOString(),
    }),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
```

### 5.2 Amplitude Integration (Pre-paid)

Track user behavior and conversion funnels:

```typescript
// sdks/web-sdk/src/lib/analytics/amplitude.ts

import * as amplitude from '@amplitude/analytics-browser';

export const initAmplitude = (apiKey: string) => {
  amplitude.init(apiKey, {
    defaultTracking: {
      sessions: true,
      pageViews: true,
      formInteractions: true,
    },
  });
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  amplitude.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    platform: 'web',
    country: 'BW',
  });
};

// Pre-defined events for KYC funnel
export const KYCEvents = {
  FLOW_STARTED: 'kyc_flow_started',
  DOCUMENT_SELECTED: 'kyc_document_selected',
  DOCUMENT_CAPTURED: 'kyc_document_captured',
  SELFIE_CAPTURED: 'kyc_selfie_captured',
  SUBMISSION_COMPLETED: 'kyc_submission_completed',
  VERIFICATION_APPROVED: 'kyc_verification_approved',
  VERIFICATION_REJECTED: 'kyc_verification_rejected',
};
```

### 5.3 Intercom Integration (Pre-paid)

Customer support and onboarding:

```typescript
// apps/backoffice/src/lib/intercom.ts

export const initIntercom = (appId: string, user?: IntercomUser) => {
  window.Intercom('boot', {
    app_id: appId,
    ...(user && {
      user_id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.createdAt,
      custom_attributes: {
        plan: user.plan,
        company: user.company,
        country: 'Botswana',
      },
    }),
  });
};

// Trigger help articles contextually
export const showArticle = (articleId: string) => {
  window.Intercom('showArticle', articleId);
};

// Custom bot for common questions
export const IntercomArticles = {
  OMANG_HELP: 'article-id-for-omang-verification',
  DOCUMENT_TIPS: 'article-id-for-document-capture',
  REJECTION_REASONS: 'article-id-for-rejection-reasons',
};
```

### 5.4 Dodo Payments Integration

```typescript
// services/backend/src/lib/payments/dodo.ts

export interface DodoSubscription {
  customerId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodEnd: string;
}

export class DodoPaymentsService {
  private apiKey: string;
  private baseUrl = 'https://api.dodopayments.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCustomer(data: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<{ customerId: string }> {
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async createSubscription(data: {
    customerId: string;
    planId: string;
  }): Promise<DodoSubscription> {
    const response = await fetch(`${this.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Webhook handler for payment events
  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    // Process payment events (subscription created, payment failed, etc.)
  }
}

// Pricing plans for Botswana market
export const PricingPlans = {
  FREE: {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    currency: 'BWP',
    verificationsPerMonth: 25,
    features: ['Basic KYC', 'Email support'],
  },
  STARTER: {
    id: 'plan_starter',
    name: 'Starter',
    price: 299,
    currency: 'BWP',
    verificationsPerMonth: 200,
    features: ['Full KYC/KYB', 'Priority support', 'API access'],
  },
  BUSINESS: {
    id: 'plan_business',
    name: 'Business',
    price: 999,
    currency: 'BWP',
    verificationsPerMonth: 1000,
    features: ['Everything in Starter', 'Custom workflows', 'Dedicated support'],
  },
  ENTERPRISE: {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    currency: 'BWP',
    verificationsPerMonth: null, // Unlimited
    features: ['Everything in Business', 'SLA', 'On-premise option', 'Custom integrations'],
  },
};
```


---

## PART 6: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Environment & Dependencies**
| Task | Description | Effort |
|------|-------------|--------|
| Upgrade Node.js | Update to Node.js 22 LTS | 2 hours |
| Upgrade pnpm | Update to pnpm 10.x | 1 hour |
| Upgrade TypeScript | Update to TypeScript 5.9 | 4 hours |
| Fix breaking changes | Address any immediate issues | 4 hours |
| Update CI/CD | Update GitHub Actions for new versions | 2 hours |

**Week 2: Framework Upgrades (Backoffice)**
| Task | Description | Effort |
|------|-------------|--------|
| Upgrade React | Update to React 19 | 8 hours |
| Upgrade Mantine | Update from v5 to v8 (major) | 16 hours |
| Upgrade Refine | Update from v3 to v5 (major) | 12 hours |
| Test backoffice | Verify all features work | 8 hours |

**Week 3: SDK Upgrades**
| Task | Description | Effort |
|------|-------------|--------|
| Upgrade Svelte | Update from v3 to v5 (major) | 16 hours |
| Upgrade Vite | Update to Vite 7 | 4 hours |
| Migrate to runes | Convert reactive statements | 12 hours |
| Test SDK | Verify all flows work | 8 hours |

### Phase 2: AWS Backend (Weeks 4-6)

**Week 4: Infrastructure Setup**
| Task | Description | Effort |
|------|-------------|--------|
| AWS account setup | Configure account, billing alerts | 2 hours |
| Serverless setup | Initialize Serverless Framework | 4 hours |
| DynamoDB tables | Create tables and indexes | 4 hours |
| S3 buckets | Create document storage | 2 hours |
| Cognito setup | Configure user pool | 4 hours |

**Week 5: Core API Development**
| Task | Description | Effort |
|------|-------------|--------|
| Auth handlers | Login, register, token refresh | 8 hours |
| Verification handlers | Start, upload, submit | 12 hours |
| Case handlers | CRUD operations | 8 hours |
| Document handlers | Upload URLs, processing | 8 hours |

**Week 6: Integration & Testing**
| Task | Description | Effort |
|------|-------------|--------|
| Connect SDK to API | Update API endpoints | 4 hours |
| Connect backoffice to API | Update data providers | 8 hours |
| End-to-end testing | Full flow testing | 8 hours |
| Bug fixes | Address issues found | 8 hours |

### Phase 3: Botswana Customization (Weeks 7-9)

**Week 7: Document Types & Validation**
| Task | Description | Effort |
|------|-------------|--------|
| Add Omang document type | SDK and backoffice | 4 hours |
| Implement Omang validation | 9-digit format validation | 4 hours |
| Add BW phone validation | +267 format | 2 hours |
| Add CIPA validation | Business registration | 4 hours |
| Update document UI | Botswana-specific labels | 4 hours |

**Week 8: Localization**
| Task | Description | Effort |
|------|-------------|--------|
| Create Setswana translations | SDK strings | 8 hours |
| Create Setswana translations | Backoffice strings | 8 hours |
| Implement language switcher | UI component | 4 hours |
| Test bilingual flows | Both languages | 4 hours |

**Week 9: Compliance & Audit**
| Task | Description | Effort |
|------|-------------|--------|
| Implement audit logging | All API actions | 8 hours |
| Create compliance checks | Validation framework | 8 hours |
| Generate compliance reports | PDF/export | 8 hours |
| Test compliance features | Verify audit trail | 4 hours |

### Phase 4: Integrations & Launch (Weeks 10-12)

**Week 10: Tool Integrations**
| Task | Description | Effort |
|------|-------------|--------|
| Make.com scenarios | Notification workflows | 8 hours |
| Amplitude tracking | Event implementation | 4 hours |
| Intercom setup | Help articles, bot | 4 hours |
| Dodo Payments | Subscription integration | 8 hours |

**Week 11: Testing & Polish**
| Task | Description | Effort |
|------|-------------|--------|
| Performance testing | Load testing, optimization | 8 hours |
| Security review | Vulnerability assessment | 8 hours |
| Mobile testing | Various devices | 8 hours |
| UI/UX polish | Final refinements | 8 hours |

**Week 12: Launch Preparation**
| Task | Description | Effort |
|------|-------------|--------|
| Documentation | User guides, API docs | 12 hours |
| Landing page | Marketing site | 8 hours |
| Beta testing | 3-5 pilot customers | 8 hours |
| Launch! | Go live | 4 hours |

---

## PART 7: DETAILED UPGRADE GUIDES

### 7.1 Mantine v5 → v8 Migration

This is the most complex upgrade. Key changes:

**Theme System:**
```typescript
// OLD (v5)
import { MantineProvider } from '@mantine/core';

<MantineProvider theme={{ colorScheme: 'light' }}>

// NEW (v8)
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

const theme = createTheme({
  primaryColor: 'blue',
});

<MantineProvider theme={theme}>
```

**Component Changes:**
```typescript
// OLD (v5) - sx prop
<Button sx={{ marginTop: 10 }}>Click</Button>

// NEW (v8) - style prop or CSS modules
<Button style={{ marginTop: 10 }}>Click</Button>
// or
<Button className={classes.button}>Click</Button>
```

**Rich Text Editor:**
```typescript
// OLD (v5)
import { RichTextEditor } from '@mantine/rte';

// NEW (v8) - Use Tiptap
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
```

### 7.2 Refine v3 → v5 Migration

**Package Names:**
```json
// OLD
"@pankod/refine-core": "^3.18.0",
"@pankod/refine-mantine": "^1.11.6",

// NEW
"@refinedev/core": "^5.0.0",
"@refinedev/mantine": "^5.0.0",
```

**Hook Changes:**
```typescript
// OLD (v3)
import { useList } from '@pankod/refine-core';
const { data } = useList({ resource: 'cases' });

// NEW (v5)
import { useList } from '@refinedev/core';
const { data } = useList({ resource: 'cases' });
// API is similar but check for breaking changes in specific hooks
```

### 7.3 Svelte 3 → 5 Migration

**Reactivity System:**
```svelte
<!-- OLD (v3) -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<!-- NEW (v5) - Runes -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**Event Handling:**
```svelte
<!-- OLD (v3) -->
<button on:click={handleClick}>Click</button>

<!-- NEW (v5) -->
<button onclick={handleClick}>Click</button>
```

**Component Props:**
```svelte
<!-- OLD (v3) -->
<script>
  export let name;
</script>

<!-- NEW (v5) -->
<script>
  let { name } = $props();
</script>
```

---

## SUMMARY & NEXT STEPS

### What This Report Covers

1. **Complete dependency upgrade path** from outdated versions to current LTS
2. **Full AWS serverless architecture** with DynamoDB, Lambda, S3, Cognito
3. **Botswana-specific customizations** while retaining ALL existing features
4. **Regulatory compliance framework** for Bank of Botswana, NBFIRA
5. **Integration with your pre-paid tools** (Make.com, Amplitude, Intercom)
6. **12-week implementation roadmap** with detailed tasks

### Immediate Actions (This Week)

1. **Create a new branch** for the upgrade work
2. **Update Node.js** to version 22 LTS
3. **Update pnpm** to version 10.x
4. **Run existing tests** to establish baseline
5. **Start with TypeScript upgrade** (least breaking)

### Key Decisions Needed

1. **AWS Region:** Recommend `af-south-1` (Cape Town) for lowest latency to Botswana
2. **Svelte Migration Strategy:** Gradual (compatibility mode) vs. full rewrite
3. **Mantine Migration:** Consider if Mantine 8 is worth the effort vs. alternatives
4. **Launch Timeline:** 12 weeks is aggressive - adjust based on your availability

### Resources

- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.11.0)
- [Mantine 7.x → 8.x Migration Guide](https://mantine.dev/changelog/8-0-0/)
- [Refine v5 Announcement](https://refine.dev/blog/refine-v5-announcement/)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [AWS Lambda Node.js 22 Runtime](https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/)

---

*Brainstorming Session Completed: January 12, 2026*
*Facilitator: Mary (Business Analyst Agent)*
*Participant: Edmond Moepswa*
*Report Type: Full-Featured Customization (Revised)*
