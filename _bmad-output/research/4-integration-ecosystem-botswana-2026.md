---
research_type: integration_ecosystem
topic: Botswana Integration Partners & APIs
date: 2026-01-13
status: complete
confidence: medium
sources: 10+
---

# Track 4: Integration Ecosystem - Botswana 2026

**Research Objective:** Map available integration partners and APIs in Botswana ecosystem

**Executive Summary:** Botswana's integration ecosystem is developing but limited. Orange Money has APIs, banks have limited public APIs, and government services lack public APIs. Your strategy: Start with what's available (Dodo Payments, Orange Money), build manual workarounds for gaps (Omang, BURS), and position for future API access as ecosystem matures.

---

## 1. PAYMENT INTEGRATION

### 1.1 Dodo Payments (Primary)

**Status:** ✅ Already in your stack

**What They Do:**
- Merchant of Record (MoR) service
- Handles payments, tax compliance, regulations
- Enables global transactions without licensing overhead
- Supports 150+ countries

**Integration:**
- REST API available
- Webhook support for payment events
- Dashboard for transaction management

**Pricing:**
- MoR fee (typically 5-8% + transaction fees)
- No upfront costs
- Pay-as-you-go model

**Use Case for AuthBridge:**
- Accept payments for KYC verifications
- Subscription billing
- Usage-based pricing
- Tax compliance (VAT handling)

**Documentation:**
- https://docs.dodopayments.com/

**⚠️ Note:** Dodo Payments accepts payments FROM Botswana but verify they support payments TO Botswana businesses

### 1.2 Alternative Payment Gateways

**DPO PayGate (South African)**
- Took over FNB Botswana's VCS payment gateway
- Supports Botswana merchants
- Credit/debit card processing
- Mobile money integration

**Limitations:**
- More complex setup than Dodo
- May require business registration
- Higher compliance burden

**Recommendation:** Stick with Dodo Payments for simplicity

---

## 2. MOBILE MONEY INTEGRATION

### 2.1 Orange Money Botswana

**Status:** ✅ API Available

**Market Position:**
- 1.6M+ users (70% of adult population)
- Dominant mobile money platform in Botswana
- Supports wallet-to-wallet, wallet-to-bank, bill payments

**API Access:**
- Orange Money Web Payment / M Payment API
- Available in Botswana (confirmed)
- Merchant onboarding required

**Features:**
- Payment collection
- Disbursements
- Balance inquiries
- Transaction status

**Integration Steps:**
1. Register as Orange Money merchant
2. Get API credentials
3. Integrate using Orange Developer Portal
4. Test in sandbox environment
5. Go live

**Documentation:**
- https://developer.orange.com/apis/om-webpay
- https://www.orange.co.bw/business/en/orange-developer.html

**Pricing:**
- Merchant fees (typically 2-5% of transaction)
- No monthly fees
- Pay-per-transaction

**Use Case for AuthBridge:**
- Accept payments from Orange Money wallets
- Disburse refunds to customers
- Alternative to card payments

**⚠️ Limitation:** Orange Money transfers are wallet-to-wallet, not wallet-to-bank

### 2.2 Other Mobile Money Providers

**MyZaka (BTC)**
- Botswana Telecommunications Corporation
- Smaller user base than Orange Money
- API availability unknown

**Smega (Mascom)**
- Mascom Wireless mobile money
- Limited information on API access

**Recommendation:** Start with Orange Money (largest market share), add others based on demand

---

## 3. BANKING INTEGRATION

### 3.1 Bank API Landscape

**Current State:** Limited public API access

**Banks in Botswana:**
1. First National Bank (FNB) Botswana
2. Standard Chartered Botswana
3. Barclays Bank Botswana (Absa)
4. Stanbic Bank Botswana
5. Bank of Baroda
6. Bank of India
7. BancABC
8. Access Bank

### 3.2 Standard Chartered Botswana APIs

**Status:** ⚠️ APIs exist but access unclear

**Available APIs (per API Dashboard):**
- Accounts Inquiry API - Account details, balances, transactions
- Corporate Financial Markets API - FX pricing, liquidity management
- Securities Services API - Custody holdings, valuations
- Notifications API - Real-time event callbacks

**Access:**
- Likely requires corporate banking relationship
- API documentation not publicly available
- Contact Standard Chartered directly

**Use Case for AuthBridge:**
- Bank account verification
- Balance checks for KYB
- Transaction monitoring

**⚠️ Reality Check:** Unlikely to get API access as a startup without banking relationship

### 3.3 Open Banking Status

**Botswana Open Banking:** ❌ Not yet implemented

**Regional Context:**
- South Africa has some open banking initiatives
- Kenya has M-Pesa API ecosystem
- Botswana is behind regional leaders

**Future Outlook:**
- National Fintech Strategy (2025-2030) may include open banking
- Bank of Botswana Fintech Sandbox could accelerate
- Timeline: 2-5 years for meaningful open banking

**Workaround:**
- Manual bank statement uploads
- PDF parsing for transaction data
- Third-party verification services

---

## 4. GOVERNMENT INTEGRATION

### 4.1 Omang Verification

**Status:** ❌ No public API

**Current Process:**
- Manual verification at government offices
- No digital verification service
- No third-party API providers identified

**Workarounds:**
1. **OCR + Format Validation**
   - Extract data from Omang image
   - Validate 9-digit format
   - Check expiry date (10-year validity)

2. **Biometric Matching**
   - Match selfie to Omang photo
   - Liveness detection
   - Face recognition algorithms

3. **Manual Review**
   - Human verification for high-risk cases
   - Quality assurance
   - Fraud detection

4. **Third-Party Services**
   - uqudo claims Botswana passport verification
   - Unclear if Omang verification available
   - Contact for partnership

**Future Opportunity:**
- Government digitization initiatives
- Potential API in 2-3 years
- Position AuthBridge as integration partner

### 4.2 BURS (Tax Authority) Integration

**Status:** ❌ No public TIN verification API

**BURS Initiatives:**
- E-invoicing implementation by March 2026
- Digital transformation underway
- No public API roadmap

**TIN Validation:**
- Format: [A-Z]\d{9}
- Manual verification only
- Tax clearance certificates (manual process)

**Workarounds:**
1. **Format Validation**
   - Regex check: /^[A-Z]\d{9}$/
   - Basic sanity check

2. **Manual Verification**
   - Request tax clearance certificate
   - Human review
   - Document upload

3. **Future API Integration**
   - Monitor BURS digitization
   - Apply for API access when available

**Use Case for AuthBridge:**
- KYB verification
- Business tax compliance checks
- Automated tax clearance validation

### 4.3 CIPA (Company Registration) Integration

**Status:** ❌ No public API

**CIPA Registration Format:**
- BW + 11 digits (e.g., BW00001234567)
- Manual verification at CIPA offices
- Online portal for searches (manual)

**Workarounds:**
1. **Format Validation**
   - Regex: /^BW\d{11}$/
   - Basic validation

2. **Manual Verification**
   - Request company registration certificate
   - CIPA search portal (manual)
   - Document upload

3. **Third-Party Data Providers**
   - Check if regional company data providers cover Botswana
   - Dun & Bradstreet, Bureau van Dijk

**Future Opportunity:**
- CIPA digitization
- API access for verified partners
- Position as integration partner

---

## 5. THIRD-PARTY SERVICES

### 5.1 AML/PEP Screening

**Global Providers:**
- ComplyAdvantage
- Dow Jones Risk & Compliance
- Refinitiv World-Check
- LexisNexis
- SEON

**Pricing:**
- $0.10-0.50 per screening
- Monthly minimums ($500-1,000)
- Enterprise contracts

**Integration:**
- REST APIs
- Real-time screening
- Webhook notifications

**Recommendation:**
- Start without AML screening (cost)
- Add when you have enterprise customers
- Partner with provider for volume discounts

### 5.2 Document Verification

**OCR Services:**
- AWS Textract - Extract text from documents
- Google Cloud Vision API
- Microsoft Azure Computer Vision
- Tesseract (open source)

**Pricing (AWS Textract):**
- $1.50 per 1,000 pages (first 1M pages)
- Free tier: 1,000 pages/month for 3 months

**Use Case:**
- Extract Omang data
- Parse bank statements
- Read business certificates

### 5.3 Biometric Verification

**Face Recognition:**
- AWS Rekognition - Face comparison, liveness detection
- Microsoft Azure Face API
- FaceAPI.js (open source)

**Pricing (AWS Rekognition):**
- $0.001 per image (face detection)
- $0.001 per face comparison
- Free tier: 5,000 images/month for 12 months

**Use Case:**
- Selfie to Omang photo matching
- Liveness detection
- Duplicate account detection

---

## 6. WORKFLOW AUTOMATION

### 6.1 Make.com Integration

**Status:** ✅ Already in your stack (Premium pre-paid)

**Capabilities:**
- Visual workflow builder
- 1,000+ app integrations
- Webhooks, HTTP requests
- Data transformation

**Use Cases for AuthBridge:**
1. **Verification Workflow**
   - Trigger: New verification request
   - Actions: Send email, update CRM, notify Slack

2. **Compliance Alerts**
   - Trigger: Suspicious activity detected
   - Actions: Create ticket, notify compliance team, log to database

3. **Customer Onboarding**
   - Trigger: New customer signup
   - Actions: Send welcome email, create account, assign to sales

4. **Reporting**
   - Trigger: End of month
   - Actions: Generate reports, send to stakeholders, archive data

**Integration:**
- AuthBridge webhooks → Make.com scenarios
- Make.com → AuthBridge API calls
- No-code automation for non-technical users

### 6.2 Intercom Integration

**Status:** ✅ Already in your stack (Premium pre-paid)

**Capabilities:**
- Customer messaging
- Live chat
- Help desk
- Product tours

**Use Cases for AuthBridge:**
1. **Customer Support**
   - In-app chat for verification questions
   - Automated responses for common issues
   - Escalation to human support

2. **Onboarding**
   - Product tours for new customers
   - Contextual help
   - Feature announcements

3. **Compliance Communication**
   - Notify customers of verification status
   - Request additional documents
   - Compliance updates

**Integration:**
- Intercom JavaScript SDK
- REST API for backend integration
- Webhooks for events

---

## 7. ANALYTICS & MONITORING

### 7.1 Amplitude Integration

**Status:** ✅ Already in your stack (Premium pre-paid)

**Capabilities:**
- Product analytics
- User behavior tracking
- Funnel analysis
- Cohort analysis

**Use Cases for AuthBridge:**
1. **Verification Funnel**
   - Track drop-off points
   - Optimize conversion
   - A/B testing

2. **User Engagement**
   - Active users
   - Feature adoption
   - Retention analysis

3. **Business Metrics**
   - Verification volume
   - Revenue tracking
   - Customer lifetime value

**Integration:**
- Amplitude JavaScript SDK (frontend)
- Amplitude HTTP API (backend)
- Event tracking

### 7.2 AWS CloudWatch

**Status:** ✅ Included with AWS

**Capabilities:**
- Infrastructure monitoring
- Application logs
- Custom metrics
- Alarms

**Use Cases:**
- Lambda performance
- API Gateway metrics
- DynamoDB throughput
- Error tracking

---

## 8. INTEGRATION ROADMAP

### Phase 1: Launch (Month 1-3)

**Immediate Integrations:**
- ✅ Dodo Payments (payment processing)
- ✅ Make.com (workflow automation)
- ✅ Intercom (customer support)
- ✅ Amplitude (analytics)
- ✅ AWS services (infrastructure)

**Manual Processes:**
- ⚠️ Omang verification (OCR + manual review)
- ⚠️ BURS TIN validation (format check only)
- ⚠️ CIPA verification (manual lookup)
- ⚠️ Bank account verification (statement upload)

### Phase 2: Growth (Month 4-12)

**Add Integrations:**
- 🎯 Orange Money (mobile money payments)
- 🎯 AWS Textract (OCR for documents)
- 🎯 AWS Rekognition (biometric matching)
- 🎯 Third-party AML screening (if enterprise customers)

**Improve Processes:**
- Automated Omang OCR
- Biometric face matching
- Fraud detection algorithms

### Phase 3: Scale (Year 2)

**Strategic Integrations:**
- 🎯 Bank APIs (if available)
- 🎯 Government APIs (Omang, BURS, CIPA if launched)
- 🎯 Regional expansion (Namibia, Zimbabwe banks)
- 🎯 White-label partnerships

**Advanced Features:**
- Real-time AML monitoring
- Continuous KYC
- AI-powered fraud detection

---

## 9. PARTNERSHIP STRATEGY

### 9.1 Priority Partnerships

**Tier 1: Revenue-Generating**
1. **Banks** - White-label KYC solution
2. **Fintechs** - API integration, referrals
3. **Payment Providers** - Bundled offerings

**Tier 2: Ecosystem**
1. **Orange Money** - Mobile money integration
2. **Make.com** - Workflow automation
3. **Dodo Payments** - Payment processing

**Tier 3: Government**
1. **BURS** - Tax verification API
2. **CIPA** - Company verification API
3. **Department of Immigration** - Omang verification API

### 9.2 Partnership Approach

**For Banks:**
- Pitch: "Reduce KYC costs by 70%, improve compliance"
- Offer: White-label solution, dedicated support
- Timeline: 6-12 month sales cycle

**For Fintechs:**
- Pitch: "Affordable, compliant KYC for Botswana"
- Offer: Freemium tier, developer-friendly API
- Timeline: 1-3 month sales cycle

**For Government:**
- Pitch: "Enable digital economy, reduce fraud"
- Offer: Free integration, compliance support
- Timeline: 12-24 month partnership cycle

---

## 10. KEY TAKEAWAYS

### ✅ Available Integrations

1. **Dodo Payments** - Payment processing (already in stack)
2. **Orange Money** - Mobile money (API available)
3. **Make.com** - Workflow automation (already in stack)
4. **Intercom** - Customer support (already in stack)
5. **Amplitude** - Analytics (already in stack)
6. **AWS services** - Infrastructure (already in stack)

### ⚠️ Integration Gaps

1. **Omang verification** - No API, need OCR + manual workaround
2. **BURS TIN validation** - No API, format validation only
3. **CIPA verification** - No API, manual lookup
4. **Bank APIs** - Limited access, manual processes
5. **AML/PEP screening** - Expensive, add later

### 🎯 Strategic Priorities

**Immediate (Month 1-3):**
1. Integrate Orange Money for payments
2. Build Omang OCR + validation
3. Implement AWS Textract for document extraction
4. Set up AWS Rekognition for biometric matching

**Short-term (Month 4-12):**
1. Partner with 2-3 banks for white-label
2. Add AML screening for enterprise customers
3. Improve fraud detection algorithms
4. Build Make.com workflow templates

**Long-term (Year 2+):**
1. Lobby for government API access
2. Regional expansion (bank integrations)
3. Open banking readiness
4. AI-powered verification

---

## SOURCES

Content rephrased for compliance with licensing restrictions. Key sources:

1. [Orange Money API Documentation](https://developer.orange.com/apis/om-webpay)
2. [Dodo Payments Documentation](https://docs.dodopayments.com/)
3. [Standard Chartered Botswana APIs](https://apidashboard.io/companies/standard-chartered-botswana/apis)
4. [Botswana Payment Gateways](https://weblogic.co.bw/payment-gateways-in-botswana/)
5. [BURS E-Invoicing](https://www.cleartax.com/bw/e-invoicing-botswana)
6. [Botswana Mobile Money Market](https://blog.lendsqr.com/a-report-on-how-debit-order-works-in-botswana/)

---

**Research Completed:** January 13, 2026
**Analyst:** Mary (Business Analyst Agent)
**Confidence Level:** MEDIUM (limited public information on some integrations)
**Next Action:** Contact Orange Money for merchant onboarding
