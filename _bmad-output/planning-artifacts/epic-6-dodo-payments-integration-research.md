# Epic 6: Dodo Payments Integration Research

**Document Version:** 2.0
**Created:** 2026-01-18
**Updated:** 2026-01-18
**Owner:** Charlie (Senior Dev)
**Status:** Complete
**Estimated Effort:** 0.5 days

---

## Overview

This document provides research findings for integrating Dodo Payments as the Merchant of Record (MoR) for AuthBridge billing and payment processing.

**Source:** [Dodo Payments Documentation](https://docs.dodopayments.com/)

---

## What is Dodo Payments?

Dodo Payments is a global Merchant-of-Record platform that enables SaaS and digital businesses to sell in 150+ countries without managing tax, fraud, or compliance directly.

**Key Benefits:**
- **Merchant of Record:** Dodo handles legal, compliance, and tax liabilities
- **Global Reach:** Accept payments from 150+ countries
- **Developer-Friendly:** Single API for checkout, billing, and payouts
- **Tax Compliance:** Automatic tax calculation and remittance
- **Fraud Protection:** Built-in fraud detection and prevention
- **Adaptive Currency:** Display prices in local currency (BWP supported!)

---

## Adaptive Currency (CRITICAL FEATURE)

Dodo Payments supports **Adaptive Currency** which displays product prices in the customer's local currency. This is essential for AuthBridge's Botswana market.

### How It Works

1. **Detection:** System detects customer's country based on billing address
2. **Currency Selection:** Prices show in local currency (BWP) by default
3. **Payment Methods:** Localized payment methods appear where applicable
4. **Checkout:** Payment completed in selected currency
5. **Settlement:** AuthBridge receives settlement in USD (or configured currency)

### BWP Support Confirmed

| Currency Code | Currency Name | Country | Minimum Amount |
|---------------|---------------|---------|----------------|
| **BWP** | **Botswanan Pula** | **Botswana** | **15.00 BWP** |

**Source:** [Dodo Payments Adaptive Currency](https://dodopayments.mintlify.app/features/adaptive-currency)

### Implementation

```typescript
// Checkout session with explicit BWP currency
const payment = await client.payments.create({
  payment_link: true,
  billing_currency: 'BWP', // Force BWP for Botswana customers
  billing: {
    city: customer.city,
    country: 'BW', // Botswana
    street: customer.address,
  },
  customer: {
    email: customer.email,
    name: customer.name,
  },
  product_cart: [
    { product_id: 'authbridge-starter', quantity: 1 }
  ],
  return_url: 'https://app.authbridge.io/billing/success'
});
```

### Refunds in Adaptive Currency

Refunds are issued in the currency the customer originally paid, using the latest exchange rate. The USD amount remains fixed on the dashboard.

**Example:**
- Product: P1,400 BWP (≈$100 USD at 14 BWP/USD)
- Customer pays: P1,400 BWP
- Exchange rate changes to 13.5 BWP/USD
- Full refund: P1,350 BWP (customer receives less due to FX change)

---

## Pricing Tiers for AuthBridge (BWP)

### Exchange Rate Reference
- **Current Rate:** ~14 BWP = 1 USD (January 2026)
- **Pricing Strategy:** Round to clean BWP amounts for local market appeal

### Cost Analysis (Per Verification)

| Cost Component | Cost per Verification | Notes |
|----------------|----------------------|-------|
| AWS Textract (OCR) | ~$0.015 (P0.21) | $1.50/1000 pages, 1 page per doc |
| AWS Rekognition (Face) | ~$0.001 (P0.014) | $0.001/image for face comparison |
| AWS S3 Storage | ~$0.0001 (P0.0014) | Negligible |
| AWS Lambda | ~$0.0002 (P0.003) | Negligible |
| DynamoDB | ~$0.0001 (P0.0014) | On-demand pricing |
| **Total AWS Cost** | **~$0.017 (P0.24)** | Per verification |

### Dodo Payments Fees

**Merchant of Record Fee:** 5% + $0.30 per transaction

---

## African KYC/Identity Verification Market Research

### Competitive Landscape - Africa-Focused Providers

| Provider | Region Focus | Per-Verification Price | Monthly Minimum | Notes |
|----------|--------------|------------------------|-----------------|-------|
| **Smile Identity** | Pan-Africa | Custom (enterprise) | Contact sales | Africa's leading provider, Mastercard partnership |
| **Dojah** | Nigeria, Kenya, SA | $0.04-$0.06/API call | None | Startup-friendly, 10K free transactions |
| **Youverify** | Nigeria, Africa | Custom | Contact sales | Strong Nigeria coverage |
| **VerifyMe** | Nigeria | Custom | Contact sales | Nigeria-focused |
| **VerifyNow** | South Africa | Custom | Contact sales | FICA/RICA compliant |

### Global Providers Operating in Africa

| Provider | Per-Verification Price | Monthly Minimum | Notes |
|----------|------------------------|-----------------|-------|
| **Sumsub** | $1.85/verification | $299/month | Includes AML + PoA checks |
| **Veriff** | $0.80/verification | $49/month | 6-second verification |
| **KYCAID** | €0.60-€1.10/verification | €50 setup | Tiered by features |
| **Onfido** (Entrust) | Custom (volume-based) | Contact sales | 900+ businesses, AI-powered |
| **Jumio** | Custom (enterprise) | Contact sales | Video verification |

### Critical Benchmark: South Africa Home Affairs Pricing

**MAJOR MARKET SIGNAL (July 2025):**

South Africa's Department of Home Affairs increased ID verification fees by **6,500%**:
- **Previous:** R0.15/verification (~$0.01)
- **New Peak Hours:** R10/verification (~$0.53)
- **New Off-Peak Batch:** R1/verification (~$0.05)

**Key Insights:**
- SA's R10 (~$0.53) is **2.5x the global average** (~$0.20)
- SA's R10 is **5x the regional average** (~$0.11)
- Government explicitly stated previous pricing was "unsustainable"
- Banks like Capitec publicly responded to the fee hike
- ~180,000 verifications processed daily in SA

**Source:** [Cenfri Analysis](https://cenfri.org/articles/what-is-fair-debating-new-id-verification-fees-in-south-africa/)

### Global Benchmarks

| Country | Per-Verification Cost | Notes |
|---------|----------------------|-------|
| India (Aadhaar) | ~R3.88 (~$0.21) | 430M authentications/month, subsidized |
| Estonia | Free | Government-funded digital ID |
| Rwanda | Free/Low | Government-funded |
| South Africa | R10 (~$0.53) | New pricing July 2025 |
| Global Average | ~$0.20 | Per industry reports |
| Africa Regional Avg | ~$0.11 | Per Cenfri |

### Value-Based Pricing Rationale

**AuthBridge is NOT a commodity verification service.** It's national digital infrastructure providing:

1. **Compliance Assurance** - Data Protection Act 2024, FIA AML/KYC
2. **Fraud Prevention** - Duplicate detection, biometric matching
3. **Operational Efficiency** - Automated OCR, reduced manual review
4. **Risk Mitigation** - Audit trails, regulatory reporting
5. **Business Enablement** - Faster customer onboarding

**The value delivered far exceeds the cost of a verification check.**

---

## Strategic Pricing Tiers (BWP) - REVISED

### Pricing Philosophy

> "Smart verification isn't an expense, it's a value multiplier. Our partners consistently discover that robust systems more than pay for themselves through fraud prevention, operational efficiency gains, and enhanced customer lifetime value."
> — Hannes Bezuidenhout, VP Sales Africa, Sumsub

**AuthBridge Positioning:** Premium local provider with Botswana-specific expertise, Data Protection Act compliance, and government-grade security. Price reflects value, not just cost.

### Tier 1: Starter
- **Price:** P750/month (~$54 USD)
- **Includes:** 50 verifications/month
- **Overage:** P20/verification (~$1.43)
- **Target:** Small businesses, startups, testing

**Value Justification:**
- P15/verification included (vs P20 overage)
- Cheaper than hiring compliance staff
- Instant onboarding vs days of manual checks

### Tier 2: Professional
- **Price:** P2,500/month (~$179 USD)
- **Includes:** 200 verifications/month
- **Overage:** P18/verification (~$1.29)
- **Target:** Real estate agencies, car dealerships, microfinance

**Value Justification:**
- P12.50/verification included
- Comparable to Sumsub ($1.85 = P26)
- Full audit trail for regulatory compliance

### Tier 3: Business
- **Price:** P7,500/month (~$536 USD)
- **Includes:** 750 verifications/month
- **Overage:** P15/verification (~$1.07)
- **Target:** Banks, insurance companies, telcos

**Value Justification:**
- P10/verification included
- Matches SA Home Affairs peak pricing
- Dedicated support, priority processing

### Tier 4: Enterprise
- **Price:** P25,000+/month (~$1,786+ USD)
- **Includes:** 3,000+ verifications/month
- **Overage:** P12/verification (~$0.86)
- **Target:** Large banks, government ministries, telcos

**Value Justification:**
- P8.33/verification included
- Custom SLA, white-label options
- Dedicated account manager
- On-premise deployment option

### Pay-As-You-Go
- **Price:** P25/verification (~$1.79)
- **No monthly commitment**
- **Target:** Occasional users, pilots, testing

**Value Justification:**
- Still cheaper than Sumsub ($1.85 = P26)
- No commitment required
- Full feature access

---

## Revised Margin Analysis

### Cost Structure (Per Verification)
| Component | Cost |
|-----------|------|
| AWS Textract (OCR) | P0.21 |
| AWS Rekognition | P0.014 |
| AWS S3/Lambda/DynamoDB | P0.01 |
| **Total AWS Cost** | **~P0.25** |

### Tier Profitability

| Tier | Price/Verification | AWS Cost | Dodo Fee (5%+P4.20) | Net/Verification | Margin |
|------|-------------------|----------|---------------------|------------------|--------|
| Starter (P750/50) | P15.00 | P0.25 | P0.83 | P13.92 | **92.8%** |
| Professional (P2,500/200) | P12.50 | P0.25 | P0.65 | P11.60 | **92.8%** |
| Business (P7,500/750) | P10.00 | P0.25 | P0.52 | P9.23 | **92.3%** |
| Enterprise (P25,000/3,000) | P8.33 | P0.25 | P0.44 | P7.64 | **91.7%** |
| PAYG (P25) | P25.00 | P0.25 | P1.29 | P23.46 | **93.8%** |

**All tiers exceed 90% profit margin while remaining competitively priced.**

---

## Competitive Positioning Summary

| Metric | AuthBridge | Sumsub | Veriff | SA Home Affairs |
|--------|------------|--------|--------|-----------------|
| Per-Check (Entry) | P15 (~$1.07) | $1.85 (~P26) | $0.80 (~P11) | R10 (~P10) |
| Per-Check (Volume) | P8.33 (~$0.60) | Custom | Custom | R1 batch |
| Monthly Min | P750 (~$54) | $299 | $49 | N/A |
| Botswana Docs | ✅ Native | ❌ Limited | ❌ Limited | N/A |
| Local Support | ✅ Gaborone | ❌ Remote | ❌ Remote | N/A |
| Data Residency | ✅ af-south-1 | ❌ EU/US | ❌ EU | N/A |

**AuthBridge wins on:**
- Local document expertise (Omang, Botswana Driver's Licence)
- Data residency compliance (af-south-1)
- Local support and relationships
- Competitive pricing vs global providers

---

## Integration Options

### 1. Checkout Sessions (Recommended for AuthBridge)

**How it works:** Create a session on your server, redirect customer to hosted checkout.

**Use Case:** Best for AuthBridge subscription signup and usage-based billing.

**Implementation:**
```typescript
import DodoPayments from 'dodopayments';

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment: 'live_mode'
});

// Create checkout session with BWP pricing
const payment = await client.payments.create({
  payment_link: true,
  billing_currency: 'BWP',
  billing: {
    city: customer.city,
    country: 'BW',
    street: customer.address,
  },
  customer: {
    email: customer.email,
    name: customer.name,
    phone_number: customer.phone
  },
  product_cart: [
    { product_id: 'authbridge-professional', quantity: 1 }
  ],
  return_url: 'https://app.authbridge.io/billing/success'
});

// Redirect customer to payment.payment_link
```

### 2. Usage-Based Billing

**How it works:** Track usage events and bill customers based on consumption.

**Use Case:** Perfect for AuthBridge's per-verification overage pricing.

**Implementation:**
```typescript
// Track verification usage for overage billing
await client.usage.ingest({
  customer_id: 'cust_123',
  product_id: 'authbridge-professional',
  usage_events: [
    {
      event_name: 'verification_completed',
      quantity: 1,
      timestamp: new Date().toISOString(),
      metadata: {
        verification_id: 'ver_456',
        document_type: 'omang'
      }
    }
  ]
});
```

### 3. Subscription Management

Dodo supports flexible subscription billing:
- **Billing Cycles:** Monthly, quarterly, annual
- **Free Trials:** Configurable trial periods
- **Plan Changes:** Upgrade/downgrade with proration
- **Add-ons:** Additional features or usage packs

---

## Webhook Integration

### Webhook Events

Dodo Payments follows the [Standard Webhooks specification](https://www.standardwebhooks.com/).

**Key Events for AuthBridge:**
- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `subscription.active` - Subscription activated
- `subscription.renewed` - Subscription renewed
- `subscription.cancelled` - Subscription cancelled
- `refund.succeeded` - Refund processed

### Webhook Implementation

See `__journal/dodo-payments-webhook-setup.md` for detailed webhook configuration.

---

## Payment Methods - Deferred Integrations

### ~~Orange Money~~ (INDEFINITELY DEFERRED)

**Status:** Indefinitely deferred

**Rationale:**
- Complex integration requirements
- Limited API documentation
- Dodo Payments handles local payment methods automatically
- Focus on core verification features first

**Alternative:** Dodo Payments automatically detects customer location and shows relevant local payment options including cards, bank transfers, and mobile wallets where available.

---

## SDK Options

### TypeScript SDK (Recommended)

**Installation:**
```bash
npm install dodopayments
```

**Features:**
- Type-safe integration
- Promise-based API
- Auto-pagination
- Environment variable support

---

## Cost Analysis

### Dodo Payments Fees

**Merchant of Record Fee:** 5% + $0.30 (~P4.20) per transaction

### Why Dodo is Worth the 5% Fee

| Benefit | Estimated Savings |
|---------|-------------------|
| No tax compliance overhead | P70K-P140K/year |
| No legal entity setup per country | P140K-P700K/year |
| No fraud management overhead | Time + chargebacks |
| Global reach without licensing | Priceless for expansion |
| PCI DSS Level 1 compliance | P50K+ audit costs |

**Total Estimated Savings:** P260K-P890K/year vs self-managed payments

---

## Security Considerations

### API Key Management
- Store API keys in AWS Secrets Manager
- Use environment-specific keys (test vs live)
- Rotate keys quarterly

### Webhook Security
- Verify webhook signatures (HMAC SHA-256)
- Validate timestamp to prevent replay attacks
- Use HTTPS only for webhook endpoints

### PCI Compliance
- Dodo handles all payment data (PCI DSS Level 1)
- AuthBridge never touches credit card data
- No PCI compliance burden on AuthBridge

---

## Testing Strategy

### Sandbox Environment

**Test Mode:**
```typescript
const client = new DodoPayments({
  bearerToken: process.env.DODO_TEST_API_KEY,
  environment: 'test_mode'
});
```

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

---

## Implementation Roadmap

### Phase 1: MVP (Story 6.3)
- ✅ Create Dodo Payments account
- ✅ Create products with BWP pricing
- ✅ Integrate TypeScript SDK
- ✅ Implement checkout session creation
- ✅ Implement webhook handler
- ✅ Test in sandbox environment

### Phase 2: Usage Tracking
- Track verification completions
- Ingest usage events to Dodo
- Display usage in customer portal
- Implement overage alerts

### Phase 3: Customer Portal (Post-MVP)
- Billing history
- Invoice downloads
- Payment method management
- Subscription management

---

## References

- [Dodo Payments Documentation](https://docs.dodopayments.com/)
- [Adaptive Currency](https://dodopayments.mintlify.app/features/adaptive-currency)
- [Usage-Based Billing](https://docs.dodopayments.com/features/usage-based-billing)
- [Subscription Guide](https://docs.dodopayments.com/developer-resources/subscription-integration-guide)
- [TypeScript SDK](https://docs.dodopayments.com/developer-resources/dodo-payments-sdks)
- [Webhook Events](https://docs.dodopayments.com/developer-resources/webhook-events)

---


## Botswana Institution API Access Reality

### BURS (Botswana Unified Revenue Service)

**API Access:** ❌ **NO PUBLIC API**

**Current State:**
- BURS e-services portal exists for taxpayer self-service
- No documented API for third-party integration
- Tax Clearance Certificates (TCC) are issued as PDF documents
- Verification note on TCC: "Verification of this certificate can be done on BURS e-services Portal"

**TCC Document Analysis (from screenshot):**

| Field | Example Value | Extractable via OCR |
|-------|---------------|---------------------|
| Certificate No | TCC/24-25/037936 | ✅ Yes |
| TIN | BW00004067861 | ✅ Yes |
| Company Name | Hsnv Mining Proprietary Limited | ✅ Yes |
| Issue Date | 16/09/2024 | ✅ Yes |
| Valid From | 16/09/2024 | ✅ Yes |
| Valid To | 16/09/2025 | ✅ Yes |

**Validation Approach:** Manual verification via BURS e-services portal (no API)

---

### CIPA (Companies and Intellectual Property Authority)

**API Access:** ❌ **NO PUBLIC API**

**Current State:**
- Online portal available: https://www.cipa.co.bw/master/ui/start/CIPARegisterSearch
- Company search is publicly accessible
- Certificates and extracts can be purchased/downloaded
- No documented API for programmatic access
- Unlikely a startup would get API access even if it existed

**CIPA Portal Data Available (from screenshots):**

#### Company Search Results
| Field | Example Value | Source |
|-------|---------------|--------|
| Company Name | Hsnv Group Proprietary Limited | Portal |
| UIN | BW00005785516 | Portal |
| Old Company Number | CO2012/1587 | Portal |
| Company Type | Private Company | Portal |
| Company Sub Type | Limited by Shares | Portal |
| Company Status | Registered | Portal |
| Incorporation Date | 22 February 2012 | Portal |
| Re-registration Date | 22 February 2024 | Portal |
| Annual Return Filing Month | February | Portal |
| Annual Return Last Filed | 27 February 2025 | Portal |

#### Certificate of Incorporation
| Field | Example Value | Extractable via OCR |
|-------|---------------|---------------------|
| UIN | BW00004067861 | ✅ Yes |
| Company Name | Hsnv Mining Proprietary Limited | ✅ Yes |
| Incorporation Date | 18th of May, 2022 | ✅ Yes |
| Certificate Generated | 18 June 2024 12:19 PM CAT | ✅ Yes |

#### Company Extract (Page 1 - General Details)
| Field | Example Value | Extractable via OCR |
|-------|---------------|---------------------|
| UIN | BW00004067861 | ✅ Yes |
| Company Name | Hsnv Mining Proprietary Limited | ✅ Yes |
| Company Type | Private Company | ✅ Yes |
| Company Status | Registered | ✅ Yes |
| Incorporation Date | 18 May 2022 | ✅ Yes |
| Have Own Constitution | No | ✅ Yes |
| Annual Return Filing Month | May | ✅ Yes |
| Registered Office Address | 24 Tapologo Estate, Broadhurst, Gaborone, Botswana | ✅ Yes |
| Postal Address | P.O Box 676, Gaborone, Botswana | ✅ Yes |
| Principal Place of Business | 24 Tapologo Estate, Broadhurst, Gaborone, Botswana | ✅ Yes |

#### Company Extract - Directors
| Field | Example Value |
|-------|---------------|
| Director Name | Boikhutso Ramahobo |
| Residential Address | 24 Tapologo Estate, Broadhurst, Gaborone, Botswana |
| Postal Address | P.O Box 676, Tonota, Botswana |
| Appointment Date | 18 May 2022 |

#### Company Extract - Secretaries
| Field | Example Value |
|-------|---------------|
| Secretary Name | Future Mogopodi |
| Residential Address | Plot 13128, Extension 25, Gaborone, Botswana |
| Postal Address | P O Box 53716, Gaborone, Botswana |
| Appointment Date | 30 May 2023 |

#### Company Extract (Page 2 - Shareholders)
| Field | Example Value |
|-------|---------------|
| Shareholder Name | Boikhutso Ramahobo |
| Residential Address | 24 Tapologo Estate, Broadhurst, Gaborone, Botswana |
| Postal Address | P.O Box 676, Tonota, Botswana |
| Appointment Date | 18 May 2022 |
| Total Shares | 100 |
| Number of Shares Held | 100 |

---

## Manual Verification Automation Strategy

Given that BURS and CIPA have no API access, AuthBridge needs alternative approaches to automate manual verifications and unlock value for users.

### Strategy 1: Browser Automation (RPA)

**Approach:** Use Playwright/Puppeteer to automate portal interactions

**CIPA Portal Automation:**
```typescript
// Conceptual - requires careful implementation
import { chromium } from 'playwright';

async function verifyCIPACompany(uin: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to CIPA search
  await page.goto('https://www.cipa.co.bw/master/ui/start/CIPARegisterSearch');

  // Search for company
  await page.fill('input[name="uin"]', uin);
  await page.click('button[type="submit"]');

  // Extract company details
  const companyName = await page.textContent('.company-name');
  const status = await page.textContent('.company-status');

  await browser.close();

  return { companyName, status, verified: status === 'Registered' };
}
```

**Pros:**
- Fully automated verification
- Real-time data from official source
- No manual intervention required

**Cons:**
- Fragile (breaks when portal UI changes)
- May violate terms of service
- Rate limiting/blocking risk
- Requires maintenance

**Recommendation:** ⚠️ Use with caution, implement robust error handling and fallback to manual

---

### Strategy 2: Document OCR + Manual Verification Queue

**Approach:** Extract data from uploaded documents, queue for human verification

**Workflow:**
1. Customer uploads CIPA Certificate/Extract or BURS TCC
2. AWS Textract extracts all fields
3. System validates format and consistency
4. Case queued for manual verification
5. Analyst verifies against portal (assisted by pre-filled data)
6. Verification completed

**Implementation:**
```typescript
// CIPA Certificate OCR Extraction
interface CIPACertificateData {
  uin: string;                    // BW00004067861
  companyName: string;            // Hsnv Mining Proprietary Limited
  incorporationDate: string;      // 18th of May, 2022
  certificateGenerated: string;   // 18 June 2024 12:19 PM CAT
}

// CIPA Extract OCR Extraction
interface CIPAExtractData {
  uin: string;
  companyName: string;
  companyType: string;            // Private Company
  companyStatus: string;          // Registered
  incorporationDate: string;
  annualReturnFilingMonth: string;
  registeredOfficeAddress: string;
  postalAddress: string;
  principalPlaceOfBusiness: string;
  directors: DirectorInfo[];
  secretaries: SecretaryInfo[];
  shareholders: ShareholderInfo[];
  totalShares: number;
}

// BURS TCC OCR Extraction
interface BURSTCCData {
  certificateNo: string;          // TCC/24-25/037936
  tin: string;                    // BW00004067861
  companyName: string;
  issueDate: string;
  validFrom: string;
  validTo: string;
  isValid: boolean;               // Check if validTo > today
}
```

**Pros:**
- Compliant with portal terms of service
- Human verification ensures accuracy
- Audit trail maintained
- Works with any document format

**Cons:**
- Requires human analysts
- Slower than full automation
- Labor cost

**Recommendation:** ✅ Primary approach for MVP

---

### Strategy 3: Assisted Manual Verification

**Approach:** Pre-populate verification forms, provide portal links, streamline analyst workflow

**Features:**
1. **Smart Pre-fill:** OCR extracts data, pre-fills verification form
2. **Portal Deep Links:** Direct links to CIPA/BURS search with UIN/TIN pre-filled
3. **Side-by-Side View:** Document image + portal iframe (if allowed)
4. **One-Click Verification:** Analyst confirms match with single click
5. **Discrepancy Flagging:** Highlight mismatches between OCR and portal

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│ KYB Verification - Hsnv Mining Proprietary Limited              │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────────────┐│
│ │ Uploaded Document   │  │ CIPA Portal Verification            ││
│ │                     │  │                                     ││
│ │ [Certificate Image] │  │ [Open CIPA Portal →]                ││
│ │                     │  │                                     ││
│ │ OCR Extracted:      │  │ Verify these fields match:          ││
│ │ UIN: BW00004067861  │  │ ☐ Company Name                      ││
│ │ Name: Hsnv Mining   │  │ ☐ UIN                               ││
│ │ Date: 18 May 2022   │  │ ☐ Status: Registered                ││
│ │                     │  │ ☐ Incorporation Date                ││
│ └─────────────────────┘  └─────────────────────────────────────┘│
│                                                                 │
│ [✓ Verified - All Fields Match]  [✗ Reject - Discrepancy Found] │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Dramatically reduces verification time (2-3 min → 30 sec)
- Maintains human oversight
- Compliant with portal terms
- Scalable with analyst team

**Cons:**
- Still requires human analysts
- Not fully automated

**Recommendation:** ✅ Implement for Phase 2 KYB

---

### Strategy 4: Verification-as-a-Service Partnership

**Approach:** Partner with local verification service providers

**Potential Partners:**
- Credit bureaus (TransUnion Botswana, Compuscan)
- Legal/compliance firms with CIPA/BURS access
- Government-authorized verification agents

**Pros:**
- Offload verification complexity
- Potentially faster turnaround
- May have privileged access

**Cons:**
- Additional cost per verification
- Dependency on third party
- May not exist in Botswana market

**Recommendation:** 🔍 Research for Phase 3

---

### Strategy 5: Crowdsourced Verification Network

**Approach:** Build network of verified agents who perform manual verifications

**Model:**
- Recruit and vet local agents (accountants, lawyers, compliance officers)
- Agents receive verification requests via mobile app
- Agent visits CIPA/BURS portal, confirms details
- Agent submits verification with screenshot proof
- AuthBridge pays per verification (P20-50)

**Pros:**
- Scalable workforce
- Local knowledge
- Cost-effective at scale

**Cons:**
- Quality control challenges
- Agent vetting required
- Complex operations

**Recommendation:** 🔮 Consider for Phase 3 scale

---

## Recommended Implementation Roadmap

### Phase 1 (MVP): Document OCR + Manual Queue
- Implement OCR extraction for CIPA certificates and BURS TCC
- Build manual verification queue in Backoffice
- Analysts verify against portals manually
- **Target:** 50 KYB verifications/month capacity

### Phase 2: Assisted Verification
- Add portal deep links and side-by-side view
- Implement one-click verification workflow
- Add discrepancy detection
- **Target:** 200 KYB verifications/month capacity

### Phase 3: Automation + Scale
- Evaluate browser automation feasibility
- Explore verification partnerships
- Consider crowdsourced network
- **Target:** 1,000+ KYB verifications/month capacity

---

## KYB Document Types Summary

### Supported Documents for OCR Extraction

| Document Type | Issuing Authority | Key Fields | OCR Confidence |
|---------------|-------------------|------------|----------------|
| Certificate of Incorporation | CIPA | UIN, Company Name, Inc. Date | High |
| Company Extract | CIPA | Full company details, directors, shareholders | High |
| Tax Clearance Certificate | BURS | TIN, Company Name, Validity Period | High |

### Validation Rules

**CIPA UIN Format:** `BW` + 11 digits (e.g., BW00004067861)
**BURS TIN Format:** `BW` + 11 digits (same as UIN for companies)
**TCC Validity:** Must not be expired (check validTo date)
**Company Status:** Must be "Registered" (not struck off, liquidated, etc.)

---

_Last Updated: 2026-01-18_
_Ready for Story 6.3 and Epic 7 Implementation_

**Content was rephrased for compliance with licensing restrictions.**
