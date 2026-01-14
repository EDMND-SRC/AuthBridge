# AuthBridge Mermaid Diagrams

**Generated:** 2026-01-13
**Author:** Paige (Technical Writer Agent)

This document contains all architectural and flow diagrams for AuthBridge.

---

## 1. KYC Verification Flow (Web SDK)

End-to-end user journey through the embeddable Web SDK.

```mermaid
flowchart TD
    Start([User Opens SDK]) --> Welcome[Welcome Screen]
    Welcome --> |Start Verification| DocSelect[Document Selection]

    DocSelect --> |Omang| OmangCapture[Omang Capture]
    DocSelect --> |Passport| PassportCapture[Passport Capture]
    DocSelect --> |Driver's Licence| DLCapture[Driver's Licence Capture]

    OmangCapture --> FrontCapture[Capture Front]
    PassportCapture --> FrontCapture
    DLCapture --> FrontCapture

    FrontCapture --> |Quality OK| FrontReview{Review Image?}
    FrontCapture --> |Poor Quality| FrontCapture

    FrontReview --> |Retake| FrontCapture
    FrontReview --> |Accept| BackCapture[Capture Back]

    BackCapture --> |Quality OK| BackReview{Review Image?}
    BackCapture --> |Poor Quality| BackCapture

    BackReview --> |Retake| BackCapture
    BackReview --> |Accept| SelfieCapture[Selfie Capture]

    SelfieCapture --> LivenessCheck{Liveness Check}
    LivenessCheck --> |Blink Detected| SelfieReview{Review Selfie?}
    LivenessCheck --> |Failed| SelfieCapture

    SelfieReview --> |Retake| SelfieCapture
    SelfieReview --> |Accept| FinalReview[Final Review Screen]

    FinalReview --> |Submit| Processing[Processing...]
    FinalReview --> |Edit| DocSelect

    Processing --> Success([Verification Submitted])

    style Start fill:#75AADB,color:#fff
    style Success fill:#10B981,color:#fff
    style Processing fill:#F59E0B,color:#fff
```

---

## 2. API Verification Sequence

Shows API calls between Client App, AuthBridge API, and AWS Services.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client App
    participant API as AuthBridge API
    participant Cognito as AWS Cognito
    participant DDB as DynamoDB
    participant S3 as S3 Bucket
    participant Textract as AWS Textract
    participant Rekognition as AWS Rekognition

    Client->>API: POST /api/v1/verifications
    API->>Cognito: Validate API Key
    Cognito-->>API: Token Valid
    API->>DDB: Create Case (PK: CASE#id)
    DDB-->>API: Case Created
    API-->>Client: { verificationId, sdkUrl, sessionToken }

    Note over Client,API: User completes SDK flow

    Client->>API: POST /verifications/{id}/documents
    API->>S3: Upload Document Image
    S3-->>API: S3 URL
    API->>Textract: StartDocumentAnalysis
    Textract-->>API: JobId
    API->>DDB: Update Case (DOC#docId)
    API-->>Client: { documentId, status: processing }

    Note over Textract,API: Async OCR Processing

    Textract->>API: Webhook: OCR Complete
    API->>DDB: Store Extracted Data

    Client->>API: POST /verifications/{id}/selfie
    API->>S3: Upload Selfie
    API->>Rekognition: CompareFaces + DetectFaces
    Rekognition-->>API: { similarity: 92%, liveness: true }
    API->>DDB: Update Biometric Score
    API-->>Client: { selfieId, status: processing }

    Client->>API: POST /verifications/{id}/submit
    API->>DDB: Update Status: submitted
    API-->>Client: { status: submitted, referenceNumber }

    Note over API,Client: Webhook on Status Change

    API->>Client: POST /webhook { status: approved }
```

---

## 3. Case Management Workflow

Backoffice case review workflow with decision points and audit logging.

```mermaid
flowchart TD
    subgraph Submission
        New([New Case]) --> Validate{Auto-Validation}
        Validate --> |Pass| Queue[Review Queue]
        Validate --> |Fail| AutoReject[Auto-Reject]
        AutoReject --> Notify1[Notify Customer]
    end

    subgraph Review["Compliance Review"]
        Queue --> Assign[Assign to Analyst]
        Assign --> ViewCase[View Case Details]
        ViewCase --> CheckDocs[Review Documents]
        CheckDocs --> CheckBio[Check Biometric Score]
        CheckBio --> CheckDupe[Check Duplicates]
        CheckDupe --> Decision{Decision}
    end

    subgraph Outcomes
        Decision --> |Approve| Approved[Status: Approved]
        Decision --> |Reject| SelectReason[Select Reason Code]
        Decision --> |Need Info| RequestInfo[Request Resubmission]

        SelectReason --> Rejected[Status: Rejected]
        RequestInfo --> Resubmit[Status: Resubmission Required]

        Approved --> Webhook1[Trigger Webhook]
        Rejected --> Webhook2[Trigger Webhook]
        Resubmit --> Webhook3[Trigger Webhook]
    end

    subgraph Audit["Audit Trail"]
        Approved --> Log1[Log: Approved by User at Time]
        Rejected --> Log2[Log: Rejected by User at Time + Reason]
        Resubmit --> Log3[Log: Resubmission Requested]
    end

    style New fill:#75AADB,color:#fff
    style Approved fill:#10B981,color:#fff
    style Rejected fill:#EF4444,color:#fff
    style Resubmit fill:#F59E0B,color:#fff
```

---

## 4. DynamoDB Entity Relationships

Single-table design showing entity relationships and access patterns.

```mermaid
erDiagram
    USER ||--o{ CASE : creates
    CASE ||--|{ DOCUMENT : contains
    CASE ||--o{ NOTE : has
    CASE ||--|{ AUDIT : generates
    USER ||--o{ AUDIT : performs
    CLIENT ||--o{ USER : employs
    CLIENT ||--o{ CASE : owns

    USER {
        string PK "USER#userId"
        string SK "PROFILE"
        string email
        string name
        string role "admin|analyst|reviewer"
        string clientId
        datetime createdAt
        datetime lastLogin
    }

    CASE {
        string PK "CASE#caseId"
        string SK "META"
        string GSI1PK "CLIENT#clientId"
        string GSI1SK "2026-01-13#caseId"
        string status "pending|approved|rejected"
        string customerName
        string omangNumber "encrypted"
        string documentType
        number biometricScore
        string assigneeId
        datetime createdAt
        datetime updatedAt
    }

    DOCUMENT {
        string PK "CASE#caseId"
        string SK "DOC#docId"
        string type "omang_front|omang_back|selfie"
        string s3Key
        json ocrData
        number confidence
        datetime uploadedAt
    }

    AUDIT {
        string PK "AUDIT#date"
        string SK "timestamp#eventId"
        string GSI1PK "USER#userId"
        string GSI1SK "timestamp"
        string action "CASE_CREATED|APPROVED|REJECTED"
        string resourceId
        string ipAddress
        json metadata
    }

    NOTE {
        string PK "CASE#caseId"
        string SK "NOTE#timestamp"
        string authorId
        string content
        datetime createdAt
    }

    CLIENT {
        string PK "CLIENT#clientId"
        string SK "PROFILE"
        string companyName
        string tier "api_access|business|enterprise"
        string webhookUrl
        string apiKeyHash
        datetime createdAt
    }
```

---

## 5. Dodo Payments Billing Flow

Customer signup, subscription management, and usage-based billing.

```mermaid
flowchart TD
    subgraph Signup["Customer Signup"]
        Register([Customer Registers]) --> SelectTier{Select Tier}
        SelectTier --> |API Access| PayGo[Pay-As-You-Go]
        SelectTier --> |Business| Monthly[Monthly Subscription]
        SelectTier --> |Enterprise| Annual[Annual Contract]
    end

    subgraph Checkout["Dodo Checkout"]
        PayGo --> Mandate[Create Mandate Only]
        Monthly --> Subscribe[Create Subscription]
        Annual --> Invoice[Generate Invoice]

        Mandate --> Overlay[Dodo Overlay Checkout]
        Subscribe --> Overlay
        Invoice --> Overlay

        Overlay --> |Success| WebhookPay[payment.succeeded]
        Overlay --> |Failed| WebhookFail[payment.failed]
    end

    subgraph Activation["Account Activation"]
        WebhookPay --> Activate[Activate Account]
        Activate --> Welcome[Send Welcome Email]
        Welcome --> Ready([Account Ready])

        WebhookFail --> Retry[Send Retry Email]
        Retry --> Overlay
    end

    subgraph Usage["Usage Tracking"]
        Ready --> Verify[Customer Uses Verifications]
        Verify --> Track[Track Usage Event]
        Track --> |API Access| Charge[Charge Mandate]
        Track --> |Business| Accumulate[Accumulate for Invoice]

        Charge --> UsageWebhook[Log Usage]
        Accumulate --> |End of Month| Overage{Over Limit?}
        Overage --> |Yes| ChargeOverage[Charge Overage]
        Overage --> |No| NextMonth[Next Billing Cycle]
    end

    subgraph Lifecycle["Subscription Lifecycle"]
        NextMonth --> Renew[subscription.renewed]
        Renew --> ResetQuota[Reset Monthly Quota]

        ChargeOverage --> |Failed| OnHold[subscription.on_hold]
        OnHold --> Suspend[Suspend API Access]
        Suspend --> NotifyAM[Notify Account Manager]
    end

    style Register fill:#75AADB,color:#fff
    style Ready fill:#10B981,color:#fff
    style Suspend fill:#EF4444,color:#fff
```

---

## 6. Verification Case Lifecycle

State machine showing all possible case states and transitions.

```mermaid
stateDiagram-v2
    [*] --> Created: POST /verifications

    Created --> DocumentsUploading: Upload Started
    DocumentsUploading --> DocumentsUploading: Add Document
    DocumentsUploading --> DocumentsComplete: All Docs Uploaded

    DocumentsComplete --> Submitted: POST /submit

    Submitted --> Processing: Auto-validation

    Processing --> PendingReview: Validation Passed
    Processing --> AutoRejected: Validation Failed

    PendingReview --> InReview: Analyst Assigned

    InReview --> Approved: Analyst Approves
    InReview --> Rejected: Analyst Rejects
    InReview --> ResubmissionRequired: Need More Info

    ResubmissionRequired --> DocumentsUploading: Customer Resubmits
    ResubmissionRequired --> Expired: 7 Days No Response

    Approved --> [*]
    Rejected --> [*]
    AutoRejected --> [*]
    Expired --> [*]

    note right of Created: Session token valid 30 min
    note right of Processing: OCR + Biometrics running
    note right of PendingReview: In analyst queue
    note right of Approved: Webhook triggered
    note right of Rejected: Reason code required
```

---

## 7. Omang Processing Pipeline

Document processing flow from upload through verification result.

```mermaid
flowchart LR
    subgraph Upload["1. Upload"]
        Image([Omang Image]) --> Compress[Compress < 1MB]
        Compress --> S3[Store in S3]
        S3 --> Encrypt[Encrypt at Rest]
    end

    subgraph OCR["2. OCR Extraction"]
        Encrypt --> Textract[AWS Textract]
        Textract --> Extract[Extract Fields]
        Extract --> Fields[Name, Omang#, DOB, Address, Expiry]
        Fields --> Confidence[Confidence Scores]
    end

    subgraph Validation["3. Validation"]
        Confidence --> Format{Format Valid?}
        Format --> |9 digits| Checksum{Checksum Valid?}
        Format --> |Invalid| FailFormat[Fail: Invalid Format]

        Checksum --> |Pass| Expiry{Not Expired?}
        Checksum --> |Fail| FailChecksum[Fail: Invalid Checksum]

        Expiry --> |Valid| Duplicate{Duplicate Check}
        Expiry --> |Expired| FailExpiry[Fail: Document Expired]

        Duplicate --> |New| PassValidation[Validation Passed]
        Duplicate --> |Found| FlagDupe[Flag: Duplicate Omang]
    end

    subgraph Biometrics["4. Biometric Matching"]
        PassValidation --> ExtractPhoto[Extract ID Photo]
        FlagDupe --> ExtractPhoto
        ExtractPhoto --> Rekognition[AWS Rekognition]

        Rekognition --> Compare[CompareFaces]
        Compare --> Score{Score >= 80%?}

        Score --> |Yes| LivenessCheck[Check Liveness]
        Score --> |No| ManualReview[Flag: Manual Review]

        LivenessCheck --> |Pass| Success([Verification Ready])
        LivenessCheck --> |Fail| FailLiveness[Fail: Liveness Failed]
    end

    style Image fill:#75AADB,color:#fff
    style Success fill:#10B981,color:#fff
    style FailFormat fill:#EF4444,color:#fff
    style FailChecksum fill:#EF4444,color:#fff
    style FailExpiry fill:#EF4444,color:#fff
    style FailLiveness fill:#EF4444,color:#fff
    style ManualReview fill:#F59E0B,color:#fff
    style FlagDupe fill:#F59E0B,color:#fff
```

---

## 8. Dual-Track Revenue Model

Visual showing Enterprise vs API Access customer journeys.

```mermaid
flowchart TD
    subgraph Market["Target Market"]
        Prospect([Prospect]) --> Assess{Business Size & Need}
    end

    subgraph Enterprise["Track 1: Enterprise (60% Revenue)"]
        Assess --> |Banks, Insurance, Govt| EntSales[Enterprise Sales]
        EntSales --> Discovery[Discovery Call]
        Discovery --> Proposal[Custom Proposal]
        Proposal --> Pilot[Paid Pilot Program]
        Pilot --> Contract[Annual Contract]
        Contract --> |P200K-1M/year| EntOnboard[Dedicated Onboarding]
        EntOnboard --> EntSuccess[Customer Success Manager]
        EntSuccess --> QBR[Quarterly Business Reviews]
    end

    subgraph APIAccess["Track 2: API Access (40% Revenue)"]
        Assess --> |Mid-Market, Specific Use Case| SelfServe[Self-Service Signup]
        SelfServe --> SelectUseCase[Select Use Case Package]
        SelectUseCase --> |Tenant Verification| Package1[Real Estate Package]
        SelectUseCase --> |Background Checks| Package2[HR Package]
        SelectUseCase --> |Age Verification| Package3[Retail Package]
        SelectUseCase --> |Client Onboarding| Package4[Legal/Accounting Package]

        Package1 --> Checkout[Dodo Checkout]
        Package2 --> Checkout
        Package3 --> Checkout
        Package4 --> Checkout

        Checkout --> |P3-5/verification| APIOnboard[API Keys Issued]
        APIOnboard --> Docs[Developer Docs]
        Docs --> Integrate[Self-Integration]
    end

    subgraph Upgrade["Upgrade Path"]
        Integrate --> Growth{Volume Growing?}
        Growth --> |Yes| UpgradeCall[Upgrade Discussion]
        UpgradeCall --> EntSales
    end

    subgraph Launchpad["Track 3: Launchpad (Year 3+)"]
        Assess --> |Startup < 2 years| Apply[Apply for Credits]
        Apply --> Review[Application Review]
        Review --> |Approved| Credits[P5K-10K Credits]
        Credits --> StartupOnboard[Priority Support]
        StartupOnboard --> |Success| Growth
    end

    style Prospect fill:#75AADB,color:#fff
    style Contract fill:#10B981,color:#fff
    style APIOnboard fill:#10B981,color:#fff
    style Credits fill:#F59E0B,color:#fff
```

---

## Usage Notes

These diagrams can be rendered in:
- GitHub/GitLab markdown preview
- VS Code with Mermaid extension
- Notion, Confluence, or other documentation tools
- Export to PNG/SVG using Mermaid CLI or online editors

To update diagrams, edit the Mermaid code blocks above and re-render.
