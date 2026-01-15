---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-problem', 'step-04-solution', 'step-05-users', 'step-06-requirements', 'step-07-technical', 'step-08-ux', 'step-09-metrics', 'step-10-gtm', 'step-11-complete']
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-AuthBridge-2026-01-13.md'
  - '_bmad-output/analysis/brainstorming-session-2026-01-12-revised.md'
  - '_bmad-output/research/RESEARCH-SUMMARY-2026-01-13.md'
  - '_bmad-output/research/1-regulatory-compliance-botswana-2026.md'
  - '_bmad-output/research/2-competitive-positioning-analysis-2026.md'
  - '_bmad-output/research/3-technical-security-architecture-2026.md'
  - '_bmad-output/research/4-integration-ecosystem-botswana-2026.md'
  - '_bmad-output/project-overview.md'
  - '_bmad-output/architecture-backoffice.md'
  - '_bmad-output/architecture-web-sdk.md'
  - '_bmad-output/development-guide.md'
  - '_bmad-output/index.md'
workflowType: 'prd'
projectType: 'brownfield'
date: '2026-01-13'
author: 'Edmond Moepswa'
version: '2.1'
status: 'complete'
revision_notes: 'Balanced dual-track approach (Enterprise 60% + API Access 40%), added National Development Alignment, Strategic Opportunities (Qatar-BDC, BURS e-invoicing, Citizen Wallet), Funding Strategy'
documentCounts:
  productBrief: 1
  brainstorming: 1
  research: 5
  projectDocs: 6
---

# Product Requirements Document - AuthBridge

**Botswana's Trusted Identity Verification Partner**

**Author:** Edmond Moepswa
**Date:** January 13, 2026
**Version:** 2.1
**Status:** Complete

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | Edmond Moepswa | Initial PRD creation |
| 2.0 | 2026-01-13 | Edmond Moepswa | Strategic pivot to enterprise-first approach |
| 2.1 | 2026-01-13 | Edmond Moepswa | Balanced dual-track approach (Enterprise + API Access), added National Development Alignment, Strategic Opportunities, Funding Strategy |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Strategy](#product-vision--strategy)
3. [Market Analysis](#market-analysis)
4. [User Personas & Segments](#user-personas--segments)
5. [Product Requirements](#product-requirements)
6. [Technical Architecture](#technical-architecture)
7. [User Experience & Design](#user-experience--design)
8. [Success Metrics & KPIs](#success-metrics--kpis)
9. [Go-to-Market Strategy](#go-to-market-strategy)
10. [Roadmap & Milestones](#roadmap--milestones)
11. [Risk Assessment](#risk-assessment)
12. [Appendices](#appendices)

---


## 1. Executive Summary

### 1.1 Product Overview

AuthBridge is Botswana's first locally-focused identity verification platform, purpose-built to serve both enterprises and mid-market businesses with compliant KYC/KYB verification. As a proprietary platform with deep local expertise, AuthBridge delivers regulatory-compliant identity verification through a balanced dual-track approach.

**Dual-Track Strategy:**
- **Enterprise Track (60% of revenue):** Banks, insurance companies, government ministries, pension funds with annual contracts (P200K-1M/year) and dedicated support
- **Mid-Market API Access Track (40% of revenue):** Medium businesses with specific verification needs via self-service, pay-as-you-go pricing (P3-5/verification)

**Strategic Vision:** Build a profitable, sustainable business aligned with Botswana's Vision 2036 and NDP 12 priorities, funding long-term community contribution through startup support programs (AuthBridge Launchpad), educational fellowships, internship programs, and partnerships with government and academic institutions.

**Core Value Proposition:** "Local expertise, enterprise standards, accessible to all."

### 1.2 Problem Statement

Botswana's enterprises and mid-market businesses face mounting pressure to digitize identity verification while maintaining regulatory compliance:

**Enterprise Pain Points:**
- Manual KYC costs P50-100 per customer and takes 3-5 days
- Global KYC providers (Onfido, Jumio, Sumsub) charge $1-3 per verification with no local expertise
- Lack of Botswana-specific compliance expertise (Omang verification, Data Protection Act 2024, CIPA/BURS integration)
- No Setswana language support from global providers
- Data residency concerns with foreign cloud providers
- Increasing regulatory pressure (Data Protection Act 2024, Bank of Botswana mandates)

**Mid-Market Pain Points:**
- No affordable, accessible KYC solution for specific use cases
- Real estate agencies need tenant verification
- Recruitment agencies need employee background checks
- Retailers need age verification for restricted products
- Legal/accounting firms need client onboarding compliance

### 1.3 Solution

AuthBridge addresses these challenges through a dual-track approach:

**Track 1: Enterprise (High-Touch)**
1. **Enterprise-Grade Capabilities:** White-label solutions, dedicated support with SLA, custom integrations, on-premise deployment option
2. **Compliance Partnership:** Consulting, DPO-as-a-Service, training and certification programs
3. **Local Support:** Gaborone-based team, same timezone, understanding of local business and regulatory context

**Track 2: Mid-Market API Access (Low-Touch)**
1. **Self-Service Signup:** Online registration, instant API access
2. **Pay-As-You-Go Pricing:** P3-5 per verification, no annual commitment
3. **Use Case Packages:** Tenant verification, employee background checks, age verification, client onboarding

**Both Tracks:**
- Botswana-Specific Features: Omang verification, CIPA/BURS integration, Setswana language support
- Regulatory Compliance: Data Protection Act 2024 compliant, AWS Cape Town data residency, FIA-aligned AML/KYC

### 1.4 Market Opportunity

- **Global KYC Market:** $6.73B (2025) → $14.39B (2030) at 16.42% CAGR
- **Botswana Digital Payments:** $1.53B (2024) → $2.20B (2028) at 9.59% CAGR
- **Target Market:** 100+ enterprises + 500+ mid-market businesses
- **Government Budget:** P966.37M allocated to Ministry of Communications and Innovation (FY 2025/2026)
- **Strategic Opportunities:** Qatar-BDC $12B investment (cybersecurity focus), BURS e-invoicing (March 2026), Citizen Wallet initiative

### 1.5 Business Model

**Dual-Track Revenue:**

| Tier | Model | Target | Pricing |
|------|-------|--------|---------|
| **API Access** | Per-verification | Mid-market, specific use cases | P3-5/verification |
| **Business** | Monthly subscription + usage | Growing companies | P5K-15K/month + P2-3/verification |
| **Enterprise** | Annual contract | Banks, insurance, government | P200K-1M/year |
| **AuthBridge Launchpad** | Credits program | Eligible startups | Subsidized (Year 3+) |

**Year 1 Revenue Target:** P1.5M-3M (60% Enterprise / 40% API Access)

### 1.6 Success Criteria

**Launch (Month 3):**
- Platform ready for enterprise pilots and API access
- 1-2 paid enterprise pilots
- API Access tier live with self-service signup
- Bank of Botswana Fintech Sandbox participation

**Growth (Month 6):**
- 3-5 enterprise customers
- 10-20 API Access customers
- P300K+ revenue
- 1 bank in pilot program

**Scale (Month 12):**
- 5-10 enterprise customers
- 20-50 API Access customers
- P1.5M+ revenue (60/40 split)
- 1-2 bank contracts signed
- Government pilot initiated
- Profitable operations

### 1.7 Long-Term Vision: AuthBridge Impact

When AuthBridge achieves sustainable profitability, we commit to giving back:

- **AuthBridge Launchpad:** Startup credits program for eligible Botswana startups (Year 3+)
- **Fellowship Program:** Annual fellowships for top high school graduates
- **Talent Development:** Paid internships and graduate programs
- **Government Partnerships:** Support national digital transformation initiatives

### 1.8 National Development Alignment

AuthBridge is strategically aligned with Botswana's Vision 2036 and NDP 12:

| National Priority | AuthBridge Alignment |
|-------------------|---------------------|
| Digital transformation | Core enabler of digital services |
| Knowledge-based economy | Tech company creating local IP |
| Financial inclusion | Enables digital financial services |
| Economic diversification | Non-diamond tech sector |
| Job creation | Tech jobs, internships, fellowships |
| Cybersecurity | Identity verification prevents fraud |

---


## 2. Product Vision & Strategy

### 2.1 Vision Statement

**"To be Botswana's trusted identity verification partner, enabling enterprises to verify identities compliantly while building a sustainable business that contributes to the nation's technology ecosystem."**

### 2.2 Mission

Enable Botswana enterprises to verify customer identities quickly, securely, and compliantly—serving as a compliance partner that understands local regulations and business context. Build a profitable business that funds long-term community contribution.

### 2.3 Product Positioning

**Positioning Statement:**
"For Botswana banks, insurance companies, government agencies, and mid-market businesses who need compliant KYC/identity verification, AuthBridge is a trusted verification partner that combines deep local expertise with enterprise-grade capabilities—accessible to businesses of all sizes. Unlike expensive global providers like Onfido or Jumio who lack local knowledge, we offer Botswana-specific compliance, dedicated support, and flexible pricing from pay-per-verification to enterprise contracts."

**Brand Promise:** "Local expertise, enterprise standards, accessible to all."

### 2.4 Strategic Pillars

**1. Local Market Expertise (STRONG - Hard to Replicate)**
- Deep understanding of Botswana regulations (Data Protection Act 2024, Bank of Botswana, NBFIRA, FIA)
- Omang-specific verification capabilities
- Setswana language support
- Local business practices and cultural context
- Relationships with regulators and enterprise ecosystem
- **Defensibility:** HIGH - Global players would need years to build this knowledge

**2. Compliance Partner Positioning (UNIQUE)**
- Not just technology—compliance consulting included
- DPO-as-a-Service offering
- DPIA templates and assistance
- Regulatory update notifications
- Help clients navigate Data Protection Act 2024
- **Defensibility:** HIGH - Requires deep regulatory knowledge + trust

**3. Enterprise-First Approach (STRONG)**
- White-label solutions for brand consistency
- Dedicated support with SLA guarantees
- Custom integrations with legacy systems
- On-premise deployment option for banks
- Quarterly business reviews
- **Defensibility:** HIGH - Relationships and switching costs

**4. Botswana-First Positioning (UNIQUE)**
- Only KYC platform built specifically for Botswana market
- First-mover advantage in underserved market
- "Built for Botswana, by Botswana" brand positioning
- Local support and same timezone

**3. Cost Structure Advantage (MEDIUM - Sustainable)**
- 50-70% cheaper than Onfido/Jumio/Sumsub
- Proprietary platform with efficient architecture
- AWS free tier optimization
- Lower operational costs (Botswana vs. US/Europe)
- Solo founder efficiency (no team overhead initially)

**4. Compliance-as-a-Service (STRONG)**
- Data Protection Act 2024 expertise
- DPO services (outsourced or guidance)
- DPIA templates and assistance
- Audit trail and compliance reporting built-in
- Regulatory update notifications

**5. Data Residency (MEDIUM)**
- AWS Cape Town (af-south-1) keeps data in Africa
- Compliance with cross-border data restrictions
- Faster performance (lower latency)
- Trust signal for local businesses

### 2.5 Product Principles

1. **Compliance First:** Every feature must meet or exceed regulatory requirements
2. **Local Context:** Design for Botswana users, not generic global audience
3. **Affordability:** Pricing must be accessible to startups and SMEs
4. **Transparency:** Clear pricing, no hidden fees, straightforward terms
5. **Developer-Friendly:** Simple APIs, comprehensive docs, fast integration
6. **Privacy by Design:** Data minimization, encryption, user control
7. **Continuous Improvement:** Iterate based on customer feedback and regulatory changes

### 2.6 Competitive Advantages

**Sustainable Advantages:**
1. Local regulatory expertise (HIGH defensibility)
2. Botswana-specific features (Omang, CIPA, BURS)
3. Cost structure (efficient architecture + AWS free tier)
4. First-mover relationships with regulators
5. Cultural and language understanding

**Temporary Advantages:**
1. First-mover in Botswana market
2. Early customer relationships
3. Brand recognition as "local option"

### 2.7 Product Strategy

**Phase 1: Market Entry (Months 1-6)**
- Launch API Access tier for mid-market businesses
- Target 3-5 enterprise pilot customers
- Build case studies and social proof
- Establish regulatory compliance (NBFIRA, Data Protection Commissioner)
- Generate word-of-mouth through use case packages

**Phase 2: Growth (Months 7-12)**
- Expand to 20-30 customers across segments
- Land 1-2 bank contracts (enterprise tier)
- Develop partner ecosystem (Make.com, Dodo Payments, Orange Money)
- Content marketing (compliance guides, webinars)
- Attend fintech events and conferences

**Phase 3: Scale (Year 2)**
- 50+ customers, multiple bank contracts
- Regional expansion planning (Namibia, Zimbabwe)
- Enterprise features (white-label, on-premise)
- Consider fundraising if needed for expansion

---


## 3. Market Analysis

### 3.1 Market Size & Growth

**Global Market:**
- KYC Market: $6.73B (2025) → $14.39B (2030) at 16.42% CAGR
- Identity Verification Market: $14.34B → $29.32B at 15.4% CAGR
- e-KYC Market: $2.5B → $6.5B at 12.5% CAGR

**Botswana Market:**
- Digital Payments: $1.53B (2024) → $2.20B (2028) at 9.59% CAGR
- Mobile Money Users: 1.6M+ (70% of adult population)
- Mobile POS Payments: $1.05B (2025) → $2.85B (2029) at 28.36% CAGR
- Government Digital Transformation: $66.8M budget (FY 2025/2026)

**Target Market Size:**
- Fintechs: 10-50 companies (estimated)
- Banks: 8 commercial banks + microfinance institutions
- Digital Businesses: 50-100 e-commerce, platforms, marketplaces
- Total Addressable Market (TAM): ~100-200 businesses in Botswana

### 3.2 Market Drivers

1. **Regulatory Compliance:** Data Protection Act 2024, Bank of Botswana requirements, NBFIRA regulations
2. **Digital Transformation:** Government investment, fintech growth, mobile money adoption
3. **Fraud Prevention:** Rising online fraud, need for identity verification
4. **Customer Expectations:** Fast, seamless onboarding experiences
5. **Cost Pressure:** Need for affordable solutions vs. expensive global providers

### 3.3 Competitive Landscape

**Tier 1: Global Enterprise Players**
- Onfido, Jumio, Sumsub, Veriff
- Pricing: $1.00-$3.00 per verification
- Strengths: Advanced features, global coverage, brand recognition
- Weaknesses: Expensive, no Botswana expertise, English-only

**Tier 2: Mid-Market Players**
- iDenfy, Persona, AU10TIX, KYCAID
- Pricing: $0.60-$1.50 per verification
- Strengths: Competitive pricing, good feature set
- Weaknesses: Generic solutions, no local customization

**Tier 3: Budget/Niche Players**
- Identomat, Didit
- Pricing: $0.28-$0.30 per verification (Didit has free tier)
- Strengths: Very affordable
- Weaknesses: Limited features, no local expertise

**Local Competition:**
- No identified Botswana-specific KYC providers
- Manual verification services only
- **Opportunity:** First-mover advantage

### 3.4 Market Trends

1. **Passkey/Biometric Authentication:** Moving beyond passwords to biometric verification
2. **Decentralized Identity:** Self-sovereign identity, blockchain-based credentials
3. **AI-Powered Fraud Detection:** Real-time behavioral analysis and pattern recognition
4. **Continuous KYC:** Ongoing monitoring vs. one-time verification
5. **Embedded Finance:** Non-financial companies offering financial services (need KYC)
6. **Open Banking:** API-driven financial services (Botswana 2-5 years away)

### 3.5 Regulatory Environment

**Key Regulators:**
- Financial Intelligence Agency (FIA): AML/KYC oversight
- Bank of Botswana: Banking sector, fintech sandbox
- NBFIRA: Non-bank financial institutions
- Data Protection Commissioner: Data privacy enforcement
- BURS: Tax compliance
- CIPA: Company registration

**Key Legislation:**
- Financial Intelligence Act (2025 amendments): AML/KYC framework
- Data Protection Act 2024: Privacy, breach notification, DPO requirements
- Banking Act: Banking licensing and operations
- NBFIRA Act: Non-bank financial regulation

**Compliance Requirements:**
- Customer Due Diligence (CDD): Identity verification, address verification, source of funds
- Enhanced Due Diligence (EDD): PEPs, high-risk customers, non-residents
- Ongoing Monitoring: Transaction monitoring, periodic reviews
- Record Retention: Minimum 5 years
- Suspicious Transaction Reporting: Report to FIA without tipping off customer
- Data Protection: 72-hour breach notification, DPO appointment, DPIA for high-risk processing

### 3.6 Market Gaps & Opportunities

**Underserved Needs:**
1. Enterprise-grade KYC with local expertise (global providers lack Botswana knowledge)
2. Omang-specific verification (no provider specializes)
3. Setswana language support (all global providers English-only)
4. Local compliance consulting (enterprises struggle with Data Protection Act 2024)
5. Compliance partner approach (not just technology vendor)
6. Accessible API access for mid-market businesses with specific use cases

**AuthBridge Opportunity:**
- Position as trusted compliance partner for enterprises
- Provide Botswana-specific expertise that global players lack
- Offer professional services (consulting, DPO-as-a-Service) as revenue stream
- Build regulatory relationships as competitive moat
- Serve mid-market with use-case specific API packages
- Future: AuthBridge Launchpad for startup ecosystem support (Year 3+)

### 3.7 National Development Alignment

AuthBridge is strategically aligned with Botswana's national development priorities:

| National Priority | AuthBridge Alignment |
|-------------------|---------------------|
| **Digital transformation** | Core enabler of digital services across sectors |
| **Knowledge-based economy** | Tech company creating local intellectual property |
| **Financial inclusion** | Enables digital financial services for all Batswana |
| **Economic diversification** | Non-diamond technology sector development |
| **Job creation** | Tech jobs, internships, fellowships for Batswana |
| **Cybersecurity** | Identity verification prevents fraud and protects citizens |

**Government Budget Context:**
- **P966.37 million ($66.8M)** allocated to Ministry of Communications and Innovation (FY 2025/2026)
- **Botswana Economic Transformation Program:** 186 projects worth $38.4 billion, targeting 512,000 jobs
- AuthBridge positioned as enabler of government digital transformation initiatives

### 3.8 Strategic Opportunities

**A. Qatar-BDC $12 Billion Investment (August 2025)**

Qatar's Al Mansour Holdings signed $12B deal with Botswana Development Corporation. **Cybersecurity is explicitly listed as a priority sector.**

- **Sectors covered:** Infrastructure, energy, mining, agriculture, tourism, **cybersecurity**, defence
- **AuthBridge alignment:** Identity verification is foundational to cybersecurity infrastructure
- **Action:** Approach BDC about accessing cybersecurity funding allocation
- **Positioning:** Frame AuthBridge as critical cybersecurity infrastructure for digital Botswana

**B. BURS E-Invoicing Initiative (March 2026)**

Mandatory e-invoicing for all VAT-registered businesses by March 2026.

- **Context:** Three-year pilot (2022-2025) completed successfully
- **Goal:** Recover 30-50% of VAT revenue lost to fraud
- **AuthBridge opportunity:** Business verification (KYB) critical for e-invoicing compliance
- **Use case:** Companies need to verify trading partners before issuing invoices
- **Potential partnership:** AuthBridge as verification layer for e-invoicing ecosystem
- **Timeline:** Engage BURS Q1 2026

**C. Citizen Wallet & Cryptographic Card (2025)**

Government unveiled digital identity infrastructure (with PEMANDU):

- **Citizen Wallet:** E-wallet for government services, subsidies, financial inclusion
- **Cryptographic Card:** Smart card with secure chip for citizen verification
- **AuthBridge opportunity:**
  - Verification provider for Citizen Wallet onboarding
  - Private sector integration layer for Citizen Wallet
  - Bridge between government identity and private sector KYC
- **Action:** Engage Ministry of Communications about partnership opportunities

### 3.9 Funding Strategy

**Funding Sources:**

| Source | Type | Relevance | Website |
|--------|------|-----------|---------|
| **BDC** | Development finance + Qatar funds | Cybersecurity funding from $12B Qatar investment | bdc.bw |
| **CEDA** | Loans & grants | Citizen-owned business support | ceda.co.bw |
| **BIF** | Innovation grants | Tech development (TRL 4-8) | bif.co.bw |
| **LEA** | Grants & support | SMME development | lea.co.bw |
| **BDIH** | Incubation & access to BIF | Tech park, programs | bih.co.bw |
| **AfDB** | Development finance | Economic diversification projects | - |
| **BPOPF/LAPF** | Pension fund investment | Local tech venture investment | - |

**Funding Strategy:**

**Immediate Actions (Q1 2026):**
1. Register with BDIH (required for BIF eligibility)
2. Contact BDC about cybersecurity funding from Qatar investment
3. Apply to CEDA for loan/grant
4. Engage LEA for business development support
5. Monitor BIF for application reopening

**Positioning for Different Funders:**
- **BDC/Qatar:** Frame as **cybersecurity infrastructure** protecting Botswana's digital economy
- **Government:** Frame as **digital transformation enabler** supporting Vision 2036
- **Development Finance:** Frame as **financial inclusion tool** enabling digital services for all
- **BIF/BDIH:** Frame as **local innovation & job creator** building Botswana tech capacity

---


## 4. User Personas & Segments

### 4.1 Segment Prioritization (Enterprise-First)

**Tier 1 - High Budget, Immediate Need (Primary Focus)**

| Segment | Size | Deal Value | Sales Cycle | Priority |
|---------|------|------------|-------------|----------|
| Banks | 8 commercial + microfinance | P200K-1M/year | 6-12 months | HIGHEST |
| Insurance Companies | 15+ insurers | P100K-500K/year | 4-8 months | HIGH |
| Pension Funds | BPOPF, Debswana, etc. | P150K-400K/year | 6-12 months | HIGH |
| Government Ministries | 10+ ministries | P200K-800K/year | 6-18 months | HIGH |
| Parastatals | BPC, WUC, BTC, etc. | P100K-300K/year | 4-8 months | HIGH |

**Tier 2 - Growing Need, Good Budgets (Secondary Focus)**

| Segment | Size | Deal Value | Sales Cycle | Priority |
|---------|------|------------|-------------|----------|
| Real Estate Agencies | 50+ agencies | P30K-150K/year | 2-4 months | MEDIUM |
| Legal Firms | 100+ firms | P20K-100K/year | 2-4 months | MEDIUM |
| Accounting/Audit Firms | Big 4 + local | P50K-200K/year | 3-6 months | MEDIUM |
| Recruitment Agencies | 30+ agencies | P20K-80K/year | 1-3 months | MEDIUM |
| Healthcare (Private) | Hospitals, medical aids | P50K-200K/year | 3-6 months | MEDIUM |

**TRACK 2: MID-MARKET API ACCESS (Low-Touch) - 40% of Revenue**

Self-service signup, pay-as-you-go pricing (P3-5 per verification), days-to-weeks sales cycle.

**Use Case Packages:**

| Use Case | Target Segment | Volume Est. | Priority |
|----------|----------------|-------------|----------|
| **Tenant Verification** | Real estate agencies, landlords, property managers | 50+ agencies | HIGH |
| **Employee Background Checks** | Recruitment agencies, HR departments | 30+ agencies | HIGH |
| **Age Verification** | Alcohol retailers, gaming, tobacco sellers | 100+ retailers | HIGH |
| **Client Onboarding** | Legal firms, accounting firms (Law Society/BICA compliance) | 100+ firms | HIGH |
| **Seller/Vendor Verification** | Marketplaces, e-commerce platforms | 20+ platforms | MEDIUM |
| **Patient Verification** | Private hospitals, clinics, medical aids | 50+ facilities | MEDIUM |
| **Member Verification** | Associations, clubs, cooperatives | 100+ orgs | MEDIUM |
| **Contractor Verification** | Construction, mining companies | 50+ companies | MEDIUM |

---

**TRACK 3: COMMUNITY CONTRIBUTION (AuthBridge Launchpad) - Year 3+**

| Segment | Size | Deal Value | Sales Cycle | Priority |
|---------|------|------------|-------------|----------|
| Fintechs/Startups | 10-50 companies | Subsidized credits | Application-based | YEAR 3+ |

### 4.2 Primary Segment: Banks & Financial Institutions

**Persona 1: Gorata - Head of Digital Banking (Decision Maker)**

**Demographics:**
- Age: 45
- Role: Head of Digital Banking
- Company: Commercial bank (top 3 in Botswana)
- Team Size: 150+ in digital division
- Location: Gaborone

**Goals:**
- Modernize KYC process (board mandate)
- Reduce operational costs by 30%
- Launch digital-only account opening
- Meet Bank of Botswana digital transformation requirements

**Pain Points:**
- Legacy manual KYC is expensive (P50-100 per customer)
- Takes 3-5 days to open account
- Regulatory pressure to digitize
- Risk-averse culture (need proven solutions)
- Vendor lock-in concerns with global providers
- Data residency requirements

**Needs from AuthBridge:**
- Enterprise-grade security and compliance
- White-label option (bank branding)
- Dedicated support and SLA
- Compliance consulting included
- Proof of concept / pilot program (paid)
- Local team for face-to-face meetings
- On-premise deployment option

**Success Metrics:**
- 70% cost reduction vs. manual process
- Account opening time < 1 day
- Zero regulatory violations
- Board approval and budget allocation

**Influence:** Final decision maker, budget holder

**Persona 2: Lesego - Compliance Manager (Influencer)**

**Demographics:**
- Age: 40
- Role: Compliance Manager
- Company: Commercial bank
- Team Size: 12 compliance officers
- Location: Gaborone

**Goals:**
- Ensure 100% regulatory compliance
- Pass Bank of Botswana audits
- Implement Data Protection Act 2024 requirements
- Reduce compliance risk

**Pain Points:**
- Manual audit trails are incomplete
- Difficult to prove compliance
- Worried about Data Protection Act penalties
- Need to report to regulators quarterly

**Needs from AuthBridge:**
- Complete audit trail (who, what, when)
- Compliance reports for regulators
- Data Protection Act 2024 compliance built-in
- 5-year data retention
- Suspicious transaction detection
- DPO support

**Success Metrics:**
- 100% audit trail completeness
- Zero regulatory findings
- Successful Data Protection Commissioner registration
- Quarterly compliance reports automated

### 4.3 Tertiary Segment: Digital Businesses

**Persona 5: Kgosi - E-commerce Founder**

**Demographics:**
- Age: 30
- Role: Founder & CEO
- Company: Online alcohol retailer
- Team Size: 5 people
- Location: Gaborone

**Goals:**
- Verify customer age (legal requirement)
- Reduce fraud and chargebacks
- Scale to P5M revenue/year
- Expand to other restricted products

**Pain Points:**
- Currently using manual age verification (slow)
- High fraud rate (5% of orders)
- Payment provider requires KYC
- Limited budget for enterprise solutions

**Needs from AuthBridge:**
- Simple age verification
- Affordable pricing (pay per use)
- Easy integration (no developers)
- Fraud prevention

**Success Metrics:**
- Fraud rate < 1%
- Age verification time < 1 minute
- Cost < P2 per verification
- Zero compliance violations

### 4.4 Segment Prioritization

**Phase 1 (Months 1-6): Enterprise + API Access Launch**
- Enterprise: Banks, insurance, government (high-touch sales)
- API Access: Mid-market businesses with specific use cases (self-service)
- Target: 3-5 enterprise pilots + 10-20 API Access customers

**Phase 2 (Months 7-12): Scale Both Tracks**
- Enterprise: Land bank contracts, expand insurance/government
- API Access: Scale use case packages, content marketing
- Target: 5-10 enterprise + 20-50 API Access customers

**Phase 3 (Year 2+): Regional Expansion + AuthBridge Launchpad**
- Replicate Botswana playbook in Namibia, Zimbabwe, Zambia
- Launch AuthBridge Launchpad for startup ecosystem support
- Target: 25+ enterprise + 100+ API Access customers

---


## 5. Product Requirements

### 5.1 MVP Features (Launch - Month 3)

#### 5.1.1 KYC Verification Flow

**User Story:** As a customer, I want to verify my identity quickly and easily so I can access financial services.

**Requirements:**
- Document type selection (Omang, Passport, Driver's License, ID Card)
- Camera capture with real-time guidance
- Fallback to file upload for desktop users
- Image compression and optimization (< 1MB per image)
- Selfie capture with liveness detection
- Progress indicators at each step
- Multi-language support (English, Setswana)
- Mobile-responsive design

**Acceptance Criteria:**
- User can complete verification in < 2 minutes
- Image quality validation before submission
- Clear error messages in user's language
- Works on mobile (iOS, Android) and desktop
- Accessibility compliant (WCAG 2.1 AA)

#### 5.1.2 Omang-Specific Verification

**User Story:** As a Botswana citizen, I want to verify my Omang quickly so I can prove my identity.

**Requirements:**
- 9-digit Omang format validation
- OCR extraction from Omang card (front and back)
- Date of birth validation
- Address parsing (plot number, locality, district)
- Expiry date check (10-year validity from issue)
- Photo extraction for biometric matching
- Duplicate Omang detection

**Acceptance Criteria:**
- 95%+ OCR accuracy for Omang cards
- Format validation catches invalid Omang numbers
- Biometric match score > 80% for approval
- Duplicate detection prevents multiple accounts with same Omang

#### 5.1.3 Case Management Dashboard (Backoffice)

**User Story:** As a compliance officer, I want to review and approve verification cases so I can ensure regulatory compliance.

**Requirements:**
- Case listing with filters (status, date, type, assignee)
- Case detail view with document preview
- Approve/reject workflow with reason codes
- Case notes and comments
- Audit trail (who did what when)
- User management and permissions (Casbin RBAC)
- Bulk actions (approve/reject multiple cases)
- Search functionality (by name, Omang, email)

**Acceptance Criteria:**
- Case review time < 2 minutes per case
- All actions logged in audit trail
- Role-based access control enforced
- Document preview works for all supported formats
- Search returns results in < 1 second

#### 5.1.4 REST API

**User Story:** As a developer, I want to integrate AuthBridge into my application so my users can verify their identity.

**Requirements:**
- Authentication (JWT tokens, API keys)
- Start verification endpoint (POST /api/v1/verifications)
- Upload document endpoint (POST /api/v1/verifications/{id}/documents)
- Submit verification endpoint (POST /api/v1/verifications/{id}/submit)
- Get verification status endpoint (GET /api/v1/verifications/{id})
- Webhook notifications for status changes
- Rate limiting (50 requests/second)
- Comprehensive error responses

**Acceptance Criteria:**
- API response time < 500ms (p95)
- 99.5% uptime
- Clear API documentation with examples
- Webhook delivery within 5 seconds of status change
- Rate limiting prevents abuse

#### 5.1.5 Web SDK

**User Story:** As a developer, I want to embed AuthBridge verification into my website so users don't leave my application.

**Requirements:**
- Embeddable JavaScript library (UMD/ES modules)
- Customizable UI themes (colors, fonts, logos)
- Multi-language support (English, Setswana)
- Responsive design (mobile-first)
- Progress indicators
- Error handling and retry logic
- Event callbacks (onComplete, onError, onCancel)
- CDN distribution

**Acceptance Criteria:**
- SDK loads in < 2 seconds
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile-optimized (touch-friendly, responsive)
- Integration time < 1 day for developers
- Bundle size < 200KB (gzipped)

#### 5.1.6 Compliance & Security

**User Story:** As a compliance officer, I want to ensure all data is secure and compliant so we meet regulatory requirements.

**Requirements:**
- Data encryption at rest (S3, DynamoDB)
- Data encryption in transit (TLS 1.2+)
- IAM least privilege (dedicated roles per Lambda)
- Audit logging (all API actions)
- 5-year data retention
- GDPR-style data export and deletion
- 72-hour breach notification system
- DPO contact information
- DPIA documentation

**Acceptance Criteria:**
- All data encrypted (verified by security audit)
- Audit trail 100% complete
- Data export completes in < 5 minutes
- Data deletion completes in < 24 hours
- Breach detection alerts within 1 hour

#### 5.1.7 Basic Reporting

**User Story:** As a business owner, I want to see verification metrics so I can track usage and costs.

**Requirements:**
- Verification volume by day/week/month
- Approval/rejection rates
- Average processing time
- Document type distribution
- Cost tracking
- Export to CSV

**Acceptance Criteria:**
- Reports update in real-time
- Export completes in < 30 seconds
- Charts are clear and easy to understand

### 5.2 Phase 2 Features (Month 4-6)

#### 5.2.1 KYB (Know Your Business) Verification

**Requirements:**
- CIPA registration number validation (BW + 11 digits)
- BURS TIN validation (format check)
- Business document upload (registration certificate, tax clearance)
- Ultimate Beneficial Owner (UBO) identification
- Director verification
- Business address validation

#### 5.2.2 Enhanced Omang Verification

**Requirements:**
- Checksum validation (if algorithm available)
- Cross-reference with other documents
- Duplicate detection (same Omang used multiple times)
- Fraud pattern detection

#### 5.2.3 Orange Money Integration

**Requirements:**
- Accept payments via Orange Money
- Subscription billing
- Usage-based billing
- Payment webhooks

#### 5.2.4 Advanced Reporting & Analytics

**Requirements:**
- Compliance reports (for regulators)
- Fraud detection reports
- Customer segmentation
- Funnel analysis (drop-off points)
- Export to PDF/CSV

#### 5.2.5 Setswana Language Pack

**Requirements:**
- Complete UI translation
- Setswana error messages
- Setswana help documentation
- Language switcher

### 5.3 Phase 3 Features (Month 7-12)

#### 5.3.1 AML/PEP Screening (Enterprise)

**Requirements:**
- Integration with sanctions lists
- PEP (Politically Exposed Persons) screening
- Adverse media screening
- Ongoing monitoring
- Risk scoring

#### 5.3.2 Continuous KYC

**Requirements:**
- Periodic re-verification
- Risk-based review frequency
- Automated alerts for expired documents
- Customer data update requests

#### 5.3.3 White-Label Solution (Enterprise)

**Requirements:**
- Custom branding (logo, colors, fonts)
- Custom domain
- Branded email notifications
- Branded SDK

#### 5.3.4 Advanced Fraud Detection

**Requirements:**
- Machine learning models for fraud patterns
- Device fingerprinting
- IP geolocation checks
- Velocity checks (multiple attempts)
- Duplicate document detection

#### 5.3.5 Mobile SDKs

**Requirements:**
- Native Android SDK
- Native iOS SDK
- Camera integration
- Biometric authentication

#### 5.3.6 Workflow Builder

**Requirements:**
- Visual workflow editor
- Custom verification steps
- Conditional logic
- Custom validation rules
- No-code configuration

### 5.4 Feature Prioritization

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Omang Verification | HIGH | MEDIUM | P0 | MVP |
| Case Management | HIGH | MEDIUM | P0 | MVP |
| REST API | HIGH | MEDIUM | P0 | MVP |
| Web SDK | HIGH | HIGH | P0 | MVP |
| Compliance & Security | HIGH | HIGH | P0 | MVP |
| KYB Verification | HIGH | MEDIUM | P1 | Phase 2 |
| Orange Money | MEDIUM | LOW | P1 | Phase 2 |
| Setswana Language | MEDIUM | MEDIUM | P1 | Phase 2 |
| AML/PEP Screening | MEDIUM | HIGH | P2 | Phase 3 |
| White-Label | MEDIUM | MEDIUM | P2 | Phase 3 |
| Mobile SDKs | LOW | HIGH | P3 | Phase 3 |
| Workflow Builder | LOW | HIGH | P3 | Phase 3 |

### 5.5 Non-Functional Requirements

#### 5.5.1 Performance

- API response time < 500ms (p95)
- SDK load time < 2 seconds
- Document upload success rate > 95%
- Verification completion time < 2 minutes
- Dashboard page load < 1 second

#### 5.5.2 Scalability

- Support 10,000 verifications/month initially
- Scale to 100,000 verifications/month by Year 2
- Auto-scaling for traffic spikes
- No single point of failure

#### 5.5.3 Reliability

- 99.5% uptime SLA
- Automated failover
- Data backup every 24 hours
- Disaster recovery plan (RTO < 4 hours, RPO < 1 hour)

#### 5.5.4 Security

- OWASP Top 10 compliance
- Penetration testing before launch
- Quarterly security audits
- Dependency vulnerability scanning
- Incident response plan

#### 5.5.5 Compliance

- Data Protection Act 2024 compliant
- FIA AML/KYC requirements met
- Bank of Botswana aligned
- NBFIRA compliant (if required)
- ISO 27001 ready (future)

#### 5.5.6 Usability

- Mobile-first design
- Accessibility (WCAG 2.1 AA)
- Multi-language support
- Clear error messages
- Contextual help

#### 5.5.7 Maintainability

- Infrastructure as Code (Serverless Framework)
- Automated testing (unit, integration, e2e)
- CI/CD pipeline
- Comprehensive documentation
- Monitoring and alerting

---


## 6. Technical Architecture

### 6.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHBRIDGE ARCHITECTURE                            │
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
│  │  Make.com │ Amplitude │ Intercom │ Orange Money │ Dodo Payments       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Technology Stack

**Frontend:**
- Backoffice: React 19, TypeScript 5.9, Mantine 8, Refine 5
- Web SDK: Svelte 5, TypeScript 5.9, Vite 7
- Build Tools: Nx workspace, pnpm 10
- Hosting: Netlify (free tier)

**Backend:**
- Runtime: Node.js 22 LTS (AWS Lambda)
- API: API Gateway REST API
- Authentication: AWS Cognito
- Database: DynamoDB (single-table design)
- Storage: S3 (document storage)
- Framework: Serverless Framework
- Region: af-south-1 (Cape Town)

**Infrastructure:**
- Cloud Provider: AWS
- IaC: Serverless Framework + CloudFormation
- Monitoring: CloudWatch Logs, CloudWatch Alarms
- Audit: CloudTrail
- Secrets: AWS Secrets Manager

**Integrations:**
- Payments: Dodo Payments (Merchant of Record)
- Mobile Money: Orange Money (Phase 2)
- Automation: Make.com
- Analytics: Amplitude
- Support: Intercom
- OCR: AWS Textract
- Biometrics: AWS Rekognition

### 6.3 Dodo Payments Integration

**Role:** Merchant of Record (MoR) - Dodo is the legal seller, handling tax compliance, chargebacks, and payment processing.

**Key Features Used:**

| Feature | AuthBridge Use Case |
|---------|---------------------|
| Adaptive Currency (BWP) | Display prices in Botswana Pula |
| Subscriptions | Business/Enterprise tier billing |
| On-Demand Subscriptions | API Access tier (pay-per-verification) |
| Usage-Based Billing | Track verifications as billable events |
| Customer Credits | AuthBridge Launchpad startup program |
| Customer Portal | Self-service billing management |
| Discount Codes | Promotions, enterprise negotiations |
| Webhooks | Real-time payment event handling |

**Integration Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dodo Payments Integration                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Customer   │───▶│  AuthBridge  │───▶│    Dodo      │       │
│  │   Signup     │    │   Backend    │    │   Checkout   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                   │                │
│                             │                   │                │
│                             ▼                   ▼                │
│                      ┌──────────────┐    ┌──────────────┐       │
│                      │   Webhook    │◀───│   Payment    │       │
│                      │   Handler    │    │   Events     │       │
│                      └──────────────┘    └──────────────┘       │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │   Actions:   │                           │
│                      │ - Activate   │                           │
│                      │ - Provision  │                           │
│                      │ - Notify     │                           │
│                      │ - Log Audit  │                           │
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Webhook Events Handled:**

| Event | Action |
|-------|--------|
| `payment.succeeded` | Activate account, send welcome email |
| `payment.failed` | Notify account manager, send retry email |
| `subscription.active` | Provision API access |
| `subscription.renewed` | Reset monthly quotas |
| `subscription.on_hold` | Suspend API access, notify customer |
| `subscription.cancelled` | Deactivate account |
| `dispute.opened` | Alert compliance team |

**Dodo Products Configuration:**

| Product | Type | Price (BWP) |
|---------|------|-------------|
| API Access | On-Demand Subscription | P0 (mandate only) |
| Business Monthly | Subscription | P5,000/month |
| Business Annual | Subscription | P50,000/year |
| Enterprise Starter | Subscription | P200,000/year |
| Verification Pack 100 | One-Time | P300 |

**Cost Structure:**
- Platform fee: 4% + 40¢ per transaction
- Subscription fee: +0.5%
- Adaptive Currency: 0% (customer pays 2-4% FX)
- **No upfront costs** - pay only when processing payments

### 6.4 Intercom Integration (Customer Support)

**Role:** AI-first customer support platform with Fin AI Agent for automated query resolution.

**Current Plan: Advanced (Startup Partner Program)**
| Detail | Value |
|--------|-------|
| Plan | Advanced |
| Expires | 30 August 2026 |
| Year 1 Discount | 100% (FREE) |
| Year 2 Discount | 50% (~$425/mo) |
| Year 3 Discount | 25% (~$637/mo) |

**Included Features:**
| Feature | Quantity |
|---------|----------|
| Full seats | 6 |
| Bulk emails/month | 99 |
| Fin AI Resolutions/month | 300 |
| Proactive Support Plus | Included |
| Fin AI Copilot seats | 6 |

**Key Features Used:**

| Feature | AuthBridge Use Case |
|---------|---------------------|
| Fin AI Agent | Resolve 70%+ of support queries automatically |
| Help Center | Self-service knowledge base for API docs, guides |
| Messenger | Embedded chat in Backoffice dashboard |
| Product Tours | Guided onboarding for new customers |
| Outbound Messaging | Proactive support and re-engagement |
| Webhooks | Sync support events with AuthBridge backend |

**Fin AI Training Sources:**
- Help Center articles (API docs, SDK guides, FAQs)
- Custom Procedures (step-by-step troubleshooting)
- Past conversation history
- Product documentation

**User Segmentation:**
```javascript
window.intercomSettings = {
  app_id: "YOUR_APP_ID",
  user_id: user.id,
  email: user.email,
  company: {
    company_id: company.id,
    plan: company.plan,  // enterprise, business, api_access
    verification_count: company.verifications_this_month
  }
};
```

**Product Tours:**
- Welcome Tour (first login)
- API Key Setup (first API page visit)
- First Verification (dashboard empty state)
- Onboarding Checklist (8 steps to production)

**Cost Timeline:**
| Period | Cost |
|--------|------|
| Jan-Aug 2026 | P0 (FREE) |
| Sep 2026-Aug 2027 | ~P6,375/month |
| Sep 2027-Aug 2028 | ~P9,555/month |

### 6.5 Make.com Integration (Workflow Automation)

**Role:** No-code automation platform connecting AuthBridge with third-party services.

**Current Plan: Teams**
| Detail | Value |
|--------|-------|
| Plan | Teams |
| Expires | 12 August 2026 |
| Cost | FREE (startup program) |
| Operations/month | 10,000 |

**Key Scenarios:**

| Scenario | Trigger | Actions |
|----------|---------|---------|
| Verification Alerts | Webhook (verification.completed) | Slack notification, CRM update |
| CRM Sync | Webhook (verification.completed) | Update HubSpot/Salesforce contact |
| Daily Reports | Schedule (8 AM) | Query API → Google Sheets → Email |
| Error Alerting | Webhook (error.occurred) | PagerDuty + Slack #engineering |
| Customer Onboarding | Dodo (subscription.created) | Create accounts, send emails, schedule calls |
| Churn Prevention | Schedule (daily) | Identify at-risk → Tag in Intercom → Alert CS |

**AWS Modules Used:**
- Amazon Lambda (invoke functions)
- AWS S3 (upload/download files)
- Amazon DynamoDB (CRUD operations)
- Amazon SES (send emails)

**Integration Architecture:**
```
AuthBridge Webhook → Make.com Scenario → Router:
  ├── Slack (notifications)
  ├── HubSpot (CRM sync)
  ├── Google Sheets (reporting)
  ├── Intercom (support triggers)
  └── PagerDuty (alerting)
```

**Cost Timeline:**
| Period | Cost |
|--------|------|
| Jan-Aug 2026 | P0 (FREE) |
| Sep 2026+ | ~P435/month (Teams) |

### 6.6 Amplitude Integration (Product Analytics)

**Role:** Product analytics platform for tracking user behavior, funnels, and retention.

**Current Plan: Scholarship**
| Detail | Value |
|--------|-------|
| Plan | Scholarship |
| Expires | 8 November 2026 |
| Cost | FREE |

**Key Features Used:**

| Feature | AuthBridge Use Case |
|---------|---------------------|
| Event Tracking | Track verifications, API calls, user actions |
| Funnel Analysis | Optimize onboarding and verification flows |
| Retention Analysis | Understand customer stickiness and churn |
| Cohort Analysis | Segment customers by behavior and plan |
| Session Replay | Debug UX issues with real user sessions |
| Experiment | A/B test features and pricing |

**Event Taxonomy:**

| Category | Key Events |
|----------|------------|
| Verification | Started, Completed, Approved, Rejected |
| Backoffice | Dashboard Viewed, Case Opened, Case Approved |
| API | Key Generated, Request Made, Webhook Configured |
| Billing | Plan Selected, Payment Completed, Subscription Upgraded |

**Key Funnels:**

1. **Verification Funnel** (Target: 65% completion)
   - Started → Document Selected → Captured → Uploaded → Selfie → Submitted → Completed

2. **Onboarding Funnel** (Target: 40% to production in 30 days)
   - Account Created → Profile → API Key → First Call → First Verification → Webhook → Production

**User Properties:**
```javascript
amplitude.identify({
  user_id: user.id,
  plan: user.company.plan,
  total_verifications: user.stats.total,
  company_id: user.company.id,
  role: user.role,
  health_score: calculateHealthScore(user)
});
```

**Behavioral Cohorts:**
- Power Users (50+ verifications/month)
- At Risk (no activity 14+ days)

**Cost Timeline:**
| Period | Cost |
|--------|------|
| Jan-Nov 2026 | P0 (FREE) |
| Dec 2026+ | ~P735/month (Plus) |

### 6.7 Integration Cost Milestones

**⚠️ CRITICAL: Plan Expiry Timeline**

| Date | Event | New Monthly Cost |
|------|-------|------------------|
| 12 Aug 2026 | Make.com expires | +P435 |
| 30 Aug 2026 | Intercom Year 1 ends | +P6,375 |
| 8 Nov 2026 | Amplitude expires | +P735 |
| 30 Aug 2027 | Intercom Year 2 ends | +P3,180 |

**Total Integration Costs by Period:**

| Period | Intercom | Make.com | Amplitude | Total |
|--------|----------|----------|-----------|-------|
| Jan-Aug 2026 | P0 | P0 | P0 | **P0/mo** |
| Sep-Nov 2026 | P6,375 | P435 | P0 | **P6,810/mo** |
| Dec 2026-Aug 2027 | P6,375 | P435 | P735 | **P7,545/mo** |
| Sep 2027+ | P9,555 | P435 | P735 | **P10,725/mo** |

**Revenue Milestones Required:**

| By Date | Tool Cost | Min Revenue Needed | Target |
|---------|-----------|-------------------|--------|
| Aug 2026 | P6,810/mo | P10,000/mo | 2 Business customers OR 3,300 API verifications |
| Nov 2026 | P7,545/mo | P12,000/mo | 2-3 Business customers OR 4,000 API verifications |
| Aug 2027 | P10,725/mo | P15,000/mo | 1 Enterprise OR 5,000 API verifications |

**Contingency Plans:**
1. **Make.com:** Downgrade to Core plan ($9/mo) - lose team collaboration
2. **Intercom:** Reduce seats from 6 to 2, rely on Fin AI self-service
3. **Amplitude:** Use free tier (50K MTUs) - lose advanced features

**Year 1 Savings from Startup Programs:** ~P85,000
- Upgrade Candidates (approaching quota)
- Enterprise VIP (plan = enterprise)

**Cost Projection:**
- MVP: $0 (Free tier: 50K MTUs, 10M events)
- Growth: $49/month (Plus: 5K MTUs)
- Scale: ~$200/month (Plus: 50K MTUs)

### 6.7 Data Model (DynamoDB Single-Table Design)

**Entity Patterns:**

```typescript
// User: PK=USER#<userId>, SK=PROFILE
User {
  PK: "USER#123",
  SK: "PROFILE",
  userId: "123",
  email: "user@example.com",
  name: "John Doe",
  role: "admin",
  createdAt: "2026-01-13T10:00:00Z"
}

// Case: PK=CASE#<caseId>, SK=META
Case {
  PK: "CASE#456",
  SK: "META",
  GSI1PK: "USER#123",
  GSI1SK: "CASE#2026-01-13T10:00:00Z",
  caseId: "456",
  userId: "123",
  status: "pending",
  verificationType: "kyc",
  omangNumber: "123456789",
  documents: [...],
  createdAt: "2026-01-13T10:00:00Z"
}

// Document: PK=CASE#<caseId>, SK=DOC#<docId>
Document {
  PK: "CASE#456",
  SK: "DOC#789",
  docId: "789",
  type: "omang",
  s3Key: "uploads/123/456/789.jpg",
  status: "approved",
  extractedData: {...},
  createdAt: "2026-01-13T10:00:00Z"
}

// Audit Log: PK=AUDIT#<date>, SK=<timestamp>#<eventId>
AuditLog {
  PK: "AUDIT#2026-01-13",
  SK: "2026-01-13T10:00:00Z#abc",
  eventId: "abc",
  eventType: "case_approved",
  userId: "123",
  caseId: "456",
  action: "approve_case",
  details: {...},
  ipAddress: "1.2.3.4"
}
```

**Global Secondary Indexes:**
- GSI1: GSI1PK (HASH) + GSI1SK (RANGE) - User's cases sorted by date
- StatusIndex: status (HASH) + createdAt (RANGE) - Cases by status

### 6.4 Security Architecture

**Authentication & Authorization:**
- Cognito User Pools for user authentication
- JWT tokens for API authentication
- Casbin for role-based access control (RBAC)
- API Gateway authorizers

**Data Security:**
- Encryption at rest: S3 (AES-256), DynamoDB (KMS)
- Encryption in transit: TLS 1.2+
- Attribute-level encryption for sensitive fields (Omang numbers)
- Presigned URLs for document uploads (5-minute expiry)

**IAM Security:**
- Least privilege principle (dedicated role per Lambda)
- No wildcard permissions
- Resource-specific ARNs
- Condition keys for additional restrictions

**Network Security:**
- API Gateway rate limiting (50 req/sec)
- CloudFront DDoS protection
- VPC isolation (optional for Phase 2)
- Security groups and NACLs

**Compliance:**
- Audit logging (all API actions)
- 5-year data retention
- 72-hour breach notification system
- DPIA completed before launch
- Data export and deletion capabilities

### 6.5 Scalability & Performance

**Auto-Scaling:**
- Lambda: Automatic scaling (1M requests/month free tier)
- DynamoDB: On-demand billing (auto-scales)
- S3: Unlimited storage
- API Gateway: Automatic scaling

**Performance Optimization:**
- CloudFront CDN for static assets
- Lambda cold start optimization (<1s)
- DynamoDB single-table design (minimize queries)
- S3 presigned URLs (direct upload, no Lambda proxy)
- Image compression (client-side)

**Cost Optimization:**
- AWS free tier for first 12 months
- On-demand billing (pay only for usage)
- Lambda memory optimization (512MB default)
- S3 lifecycle policies (delete old documents)
- CloudWatch log retention (30 days)

**Estimated AWS Costs:**
- Month 1-12: $0 (within free tier)
- Year 2: $50-200/month (10K-50K verifications)
- Year 3: $200-500/month (50K-200K verifications)

### 6.6 Deployment Architecture

**Environments:**
- Development: Local development with mock data
- Staging: AWS staging environment (af-south-1)
- Production: AWS production environment (af-south-1)

**CI/CD Pipeline:**
1. Code commit to GitHub
2. GitHub Actions runs tests
3. Build artifacts
4. Deploy to staging (automatic)
5. Run integration tests
6. Deploy to production (manual approval)

**Deployment Strategy:**
- Blue-green deployment for zero downtime
- Automated rollback on errors
- Canary releases for high-risk changes

### 6.7 Monitoring & Observability

**Metrics:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Lambda invocations and duration
- DynamoDB read/write capacity
- S3 storage and requests

**Logging:**
- Structured JSON logs
- CloudWatch Logs for all Lambda functions
- 30-day retention
- Log aggregation and search

**Alerting:**
- High error rate (> 5%)
- High latency (> 1s p95)
- Lambda throttling
- DynamoDB throttling
- S3 upload failures

**Dashboards:**
- Real-time metrics dashboard
- Business metrics (verifications, revenue)
- System health dashboard

### 6.8 Disaster Recovery

**Backup Strategy:**
- DynamoDB: Point-in-time recovery enabled
- S3: Versioning enabled
- Daily snapshots to separate AWS account

**Recovery Objectives:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour

**Disaster Recovery Plan:**
1. Detect incident (automated alerts)
2. Assess impact and severity
3. Activate DR plan
4. Restore from backups
5. Verify system functionality
6. Resume normal operations
7. Post-incident review

---


## 7. User Experience & Design

### 7.1 Design Principles

1. **Mobile-First:** Design for mobile devices first, then scale up to desktop
2. **Simplicity:** Minimize cognitive load, clear calls-to-action
3. **Accessibility:** WCAG 2.1 AA compliance, keyboard navigation, screen reader support
4. **Localization:** Setswana and English language support, culturally appropriate imagery
5. **Trust:** Professional design, clear privacy messaging, security indicators
6. **Speed:** Fast load times, instant feedback, progress indicators
7. **Error Prevention:** Validate inputs, provide guidance, prevent mistakes

### 7.2 User Flows

#### 7.2.1 KYC Verification Flow (End User)

```
1. Start Verification
   ↓
2. Select Document Type (Omang, Passport, Driver's License)
   ↓
3. Capture Document (Front)
   - Camera guidance overlay
   - Real-time quality checks
   - Retry if needed
   ↓
4. Capture Document (Back) [if applicable]
   ↓
5. Review Document Images
   - Confirm or retake
   ↓
6. Capture Selfie
   - Liveness detection
   - Face positioning guidance
   ↓
7. Review Selfie
   - Confirm or retake
   ↓
8. Submit Verification
   - Processing indicator
   ↓
9. Verification Complete
   - Success message
   - Next steps
```

**Drop-off Prevention:**
- Save progress at each step
- Allow users to resume later
- Clear progress indicators (Step 1 of 5)
- Estimated time remaining

#### 7.2.2 Case Review Flow (Backoffice)

```
1. Dashboard
   - Pending cases count
   - Recent activity
   ↓
2. Case List
   - Filter by status, date, type
   - Search by name, Omang, email
   ↓
3. Case Detail
   - Customer information
   - Document preview
   - Extracted data
   - Verification history
   ↓
4. Review Documents
   - Zoom, rotate, enhance
   - Compare selfie to ID photo
   - Check extracted data
   ↓
5. Make Decision
   - Approve or Reject
   - Add notes
   - Select reason code (if reject)
   ↓
6. Confirm Action
   - Review decision
   - Submit
   ↓
7. Case Updated
   - Customer notified
   - Audit log updated
   - Next case
```

### 7.3 UI Components

#### 7.3.1 Web SDK Components

**Document Capture:**
- Camera view with overlay guide
- Capture button (large, accessible)
- Flash toggle
- Switch camera (front/back)
- File upload fallback

**Selfie Capture:**
- Face detection overlay
- Liveness prompts (blink, turn head)
- Capture button
- Retry button

**Progress Indicator:**
- Step numbers (1 of 5)
- Progress bar
- Estimated time remaining

**Error Messages:**
- Clear, actionable error text
- Retry button
- Help link

#### 7.3.2 Backoffice Components

**Case Card:**
- Customer name and photo
- Case ID and status
- Document type icons
- Timestamp
- Assignee

**Document Viewer:**
- Image zoom and pan
- Rotate controls
- Enhance/adjust brightness
- Side-by-side comparison

**Decision Panel:**
- Approve button (green)
- Reject button (red)
- Reason dropdown
- Notes textarea
- Confirm button

### 7.4 Visual Design

#### 7.4.1 Color Palette

**Primary Colors:**
- Botswana Blue: #75AADB (from flag)
- Botswana Black: #000000 (from flag)
- White: #FFFFFF

**Semantic Colors:**
- Success: #10B981 (green)
- Error: #EF4444 (red)
- Warning: #F59E0B (amber)
- Info: #3B82F6 (blue)

**Neutral Colors:**
- Gray 50: #F9FAFB
- Gray 100: #F3F4F6
- Gray 200: #E5E7EB
- Gray 300: #D1D5DB
- Gray 400: #9CA3AF
- Gray 500: #6B7280
- Gray 600: #4B5563
- Gray 700: #374151
- Gray 800: #1F2937
- Gray 900: #111827

#### 7.4.2 Typography

**Font Family:**
- Primary: Inter (sans-serif)
- Monospace: JetBrains Mono (for code)

**Font Sizes:**
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)
- 4xl: 2.25rem (36px)

#### 7.4.3 Spacing

**Scale:** 4px base unit
- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 3: 0.75rem (12px)
- 4: 1rem (16px)
- 5: 1.25rem (20px)
- 6: 1.5rem (24px)
- 8: 2rem (32px)
- 10: 2.5rem (40px)
- 12: 3rem (48px)
- 16: 4rem (64px)

### 7.5 Responsive Design

**Breakpoints:**
- xs: 320px (small phones)
- sm: 576px (large phones)
- md: 768px (tablets)
- lg: 992px (laptops)
- xl: 1200px (desktops)

**Mobile Optimizations:**
- Touch-friendly buttons (min 44x44px)
- Simplified navigation
- Reduced content density
- Optimized images
- Offline support (service worker)

### 7.6 Accessibility

**WCAG 2.1 AA Compliance:**
- Color contrast ratio ≥ 4.5:1 for text
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators
- Alt text for images
- ARIA labels
- Skip navigation links

**Internationalization:**
- Right-to-left (RTL) support (future)
- Date/time formatting (DD/MM/YYYY for Botswana)
- Number formatting (P for Pula currency)
- Language switcher

### 7.7 Localization (Setswana)

**Key Translations:**
- "Start Verification" → "Simolola Netefatso"
- "Upload Document" → "Tsenya Tokomane"
- "Take Photo" → "Tsaya Setshwantsho"
- "Submit" → "Romela"
- "Approved" → "E amogetse"
- "Rejected" → "E ganetswe"
- "Pending" → "E emetse"

**Cultural Considerations:**
- Use respectful language (Setswana is formal)
- Avoid slang or colloquialisms
- Use culturally appropriate imagery
- Consider literacy levels (clear, simple language)

---


## 8. Success Metrics & KPIs

### 8.1 Business Metrics

**Revenue Metrics:**
- **ARR Target:** P1.5M-3M Year 1
- **Enterprise ACV:** P150K-400K
- **API Access ARPU:** P3K-10K/month
- **Revenue Mix:** 60% Enterprise / 40% API Access
- **Gross Margin:** 80%+

**Customer Metrics:**
- **Enterprise Customers:** 5-10 by Month 12
- **API Access Customers:** 20-50 by Month 12
- **Net Revenue Retention:** >110%
- **Customer Churn:** <10% annually
- **NPS:** >50

**Sales Metrics:**
- **Enterprise Pipeline Coverage:** 3x target
- **Enterprise Win Rate:** 25-35%
- **Enterprise Sales Cycle:** 4-8 months average
- **API Access Conversion:** 5-10% of signups
- **CAC Payback:** <12 months

### 8.2 Product Metrics

**Conversion Funnel:**
- SDK Load → Start: >80%
- Start → Document Upload: >70%
- Document Upload → Selfie: >85%
- Selfie → Submit: >90%
- Submit → Approval: >80%
- Overall Conversion: >40%

**Performance Metrics:**
- Average Verification Time: <2 minutes (automated)
- Manual Review Time: <30 minutes
- API Response Time (p95): <500ms
- SDK Load Time: <2 seconds
- Document Upload Success Rate: >95%

**Quality Metrics:**
- False Positive Rate: <2% (legitimate users rejected)
- False Negative Rate: <1% (fraudulent users approved)
- Document Quality Issues: <10% (blurry, incomplete)
- Manual Review Rate: <20% (80% automated)

### 8.3 Compliance Metrics

**Regulatory Compliance:**
- Data Breach Incidents: 0
- Breach Notification Time: <72 hours (if incident occurs)
- Audit Trail Completeness: 100%
- Data Retention Compliance: 100%
- DPIA Completion: Before launch

**Security Metrics:**
- Security Vulnerabilities (Critical): 0
- Security Vulnerabilities (High): <5
- Penetration Test Pass Rate: 100%
- Dependency Vulnerabilities: <10 (medium or lower)

### 8.4 Customer Success Metrics

**Satisfaction:**
- Customer Satisfaction (CSAT): >4.5/5
- Support Response Time: <2 hours
- Support Resolution Time: <24 hours
- Documentation Completeness: >90%

**Engagement:**
- API Integration Time: <5 days average
- Time to First Verification: <1 day after signup
- Active Users (MAU): >80% of customers
- Feature Adoption Rate: >60% for core features

### 8.5 Growth Metrics

**Acquisition:**
- Website Visitors: 1,000/month by Month 6
- Signup Conversion: >10%
- Demo Requests: 5-10/month
- Pilot Programs: 3-5 by Month 6

**Expansion:**
- Upsell Rate: 30% (API Access → Business → Enterprise)
- Cross-sell Rate: 20% (KYC → KYB)
- Referral Rate: 15% (customers refer others)

### 8.6 Milestone Targets

**Month 3 (MVP Launch):**
- Platform ready for enterprise pilots and API access
- 1-2 paid enterprise pilots
- API Access tier live with self-service signup
- Bank of Botswana Fintech Sandbox participation
- Security audit complete

**Month 6 (Traction):**
- 3-5 enterprise customers
- 10-20 API Access customers
- P300K+ revenue
- 1 bank in pilot program
- Case studies published

**Month 9 (Growth):**
- 8-10 enterprise customers
- 30-40 API Access customers
- P800K+ revenue
- 1 bank contract signed
- Government pilot initiated

**Month 12 (Scale):**
- 5-10 enterprise customers
- 20-50 API Access customers
- P1.5M+ revenue (60/40 split)
- 1-2 bank contracts
- Government contract in progress
- Profitable operations

**Year 2 Targets:**
- 25+ enterprise customers
- 100+ API Access customers
- P4M+ revenue
- 3+ bank contracts
- ISO 27001 certification
- AuthBridge Launchpad planning
- Regional expansion assessment

**Year 3+ Targets:**
- 50+ enterprise customers
- 200+ API Access customers
- P8M+ revenue
- AuthBridge Launchpad launch
- Fellowship program initiation
- Regional expansion (Namibia/Zimbabwe)

### 8.7 Measurement & Tracking

**Tools:**
- Amplitude: Product analytics, funnel analysis
- Intercom: Customer satisfaction, support metrics
- AWS CloudWatch: System performance, uptime
- Custom Dashboard: Business metrics, revenue tracking

**Reporting Cadence:**
- Daily: System health, critical errors
- Weekly: Product metrics, customer feedback
- Monthly: Business metrics, board updates
- Quarterly: Strategic review, roadmap planning

**Data-Driven Decision Making:**
- A/B testing for key features
- Cohort analysis for retention
- Funnel optimization
- Customer feedback loops

---


## 9. Go-to-Market Strategy

### 9.1 Market Entry Strategy

**Positioning:** "Local expertise, enterprise standards, accessible to all."

**Target:** Dual-track approach serving Enterprise (Banks, Insurance, Government) + Mid-Market API Access simultaneously

**Differentiation:**
1. Compliance partner approach (not just technology vendor)
2. Botswana-specific expertise (Data Protection Act 2024, Omang, CIPA, BURS)
3. Enterprise-grade capabilities (white-label, SLA, dedicated support)
4. Accessible API access for mid-market (P3-5 per verification)
5. Local accountability and relationships
6. Professional services (consulting, DPO-as-a-Service)

### 9.2 Pricing Strategy

**Dual-Track Pricing Philosophy:**
AuthBridge serves two distinct markets with appropriate pricing models:
- **Enterprise Track:** Premium pricing reflecting value of local expertise, compliance support, and dedicated service
- **API Access Track:** Accessible per-verification pricing for mid-market businesses with specific use cases

**Pricing Tiers:**

| Tier | Model | Target | Pricing |
|------|-------|--------|---------|
| **API Access** | Per-verification | Mid-market, specific use cases | P3-5/verification |
| **Business** | Monthly subscription + usage | Growing companies | P5K-15K/month + P2-3/verification |
| **Enterprise** | Annual contract | Banks, insurance, government | P200K-1M/year |
| **AuthBridge Launchpad** | Credits program | Eligible startups | Subsidized (Year 3+) |

**Track 1: Enterprise Pricing (High-Touch)**

**Model 1: Platform Subscription + Usage (Banks, Large Enterprises)**

| Component | Pricing |
|-----------|---------|
| Platform Fee | P10,000-25,000/month |
| Per Verification | P1.50-2.50 |
| Included Verifications | 2,000-5,000/month |
| Overage Rate | P2.00-3.00 |

**Model 2: Annual Contract (Insurance, Government)**

| Tier | Annual Fee | Included Verifications | Overage |
|------|------------|------------------------|---------|
| Business | P60K-180K/year | 2,500-7,500/month | P2.50 |
| Enterprise | P200K-1M/year | Custom | Custom |

**Track 2: API Access Pricing (Low-Touch)**

**Self-Service, Pay-As-You-Go:**

| Volume/Month | Per Verification | Features |
|--------------|------------------|----------|
| 1-500 | P5.00 | API access, basic dashboard |
| 501-2,000 | P4.00 | + Priority support |
| 2,001-5,000 | P3.50 | + Custom branding |
| 5,000+ | P3.00 | + Dedicated account manager |

**Use Case Packages:**
- Tenant Verification Package
- Employee Background Check Package
- Age Verification Package
- Client Onboarding Package
- Seller/Vendor Verification Package

**Professional Services Pricing:**

| Service | Pricing |
|---------|---------|
| Compliance Consulting | P500-1,500/hour |
| DPO-as-a-Service | P7,500-15,000/month |
| DPIA Preparation | P25,000-50,000 |
| Integration Services | P15,000-50,000 |
| Training Workshop | P5,000/session |

**White-Label Premium:**
- Custom Branding: +50% of base
- Custom Domain: +P2,000/month
- Branded SDK: +P5,000/month
- On-Premise Deployment: Custom quote

### 9.3 Enterprise Sales Approach

**Sales Philosophy:** Consultative selling, not transactional

**Sales Process:**

1. **Lead Generation** (Ongoing)
   - Industry events and conferences
   - Regulatory workshops
   - Referrals from partners
   - Content marketing (compliance guides)

2. **Discovery** (Week 1-2)
   - Understand pain points and compliance gaps
   - Map decision-making process
   - Identify budget and timeline
   - Assess technical requirements

3. **Proof of Concept** (Week 3-8)
   - Paid pilot program (P25,000-50,000)
   - Limited scope, clear success criteria
   - Dedicated support during pilot
   - Executive sponsor engagement

4. **Proposal** (Week 9-10)
   - Custom pricing based on volume and features
   - ROI analysis and business case
   - Implementation timeline
   - SLA and support terms

5. **Procurement** (Week 11-20)
   - Navigate tender/procurement process
   - Legal and security review
   - Contract negotiation
   - Board/committee approval

6. **Implementation** (Week 21-28)
   - Dedicated onboarding team
   - Integration support
   - Training for client staff
   - Go-live support

7. **Success** (Ongoing)
   - Quarterly business reviews
   - Usage optimization
   - Expansion opportunities
   - Reference and case study

### 9.4 Customer Acquisition by Segment

**Track 1: Enterprise (High-Touch) - 60% of Revenue**

**Phase 1: Banks & Insurance (Months 1-12)**

**Channels:**
1. Direct Enterprise Sales
   - Target Head of Digital Banking, Compliance Manager, IT Director
   - Relationship-based, consultative approach
   - Paid proof-of-concept pilots (P25,000-50,000)

2. Bank of Botswana Fintech Sandbox
   - Apply to sandbox program
   - Network with sandbox participants
   - Regulatory credibility

3. Industry Events
   - Bankers Association of Botswana conferences
   - Insurance Institute workshops
   - NBFIRA compliance seminars

4. Partner Referrals
   - Big 4 accounting firms (compliance audits)
   - System integrators (core banking implementations)
   - Legal firms (client recommendations)

**Phase 2: Government & Parastatals (Months 6-18)**

**Channels:**
1. PPADB Registration
   - Register as approved vendor
   - Understand tender cycles and budget timelines

2. Ministry Relationships
   - Ministry of Communications
   - Ministry of Finance
   - e-Government Botswana

3. Pilot Programs
   - Start with progressive ministries
   - Build case studies for broader adoption

---

**Track 2: Mid-Market API Access (Low-Touch) - 40% of Revenue**

**Channels:**
1. Self-Service Online Signup
   - Website with use case landing pages
   - Instant API key generation
   - Pay-as-you-go billing

2. Content Marketing
   - Use case guides (Tenant Verification, Employee Background Checks, Age Verification)
   - "Data Protection Act 2024 Compliance Guide"
   - Industry-specific compliance guides
   - Webinars on KYC best practices

3. Use Case Landing Pages
   _Note: These URLs use authbridge.io (MVP domain). Future migration to .co.bw post-funding._
   - authbridge.io/tenant-verification
   - authbridge.io/employee-background-checks
   - authbridge.io/age-verification
   - authbridge.io/client-onboarding
   - authbridge.io/seller-verification

4. Partner Channel
   - Dodo Payments (bundled offering)
   - Accounting firms (client referrals)
   - Legal firms (AML compliance)
   - Real estate associations

### 9.5 Key Messages

**For Enterprise (Banks, Insurance, Government):**
"Modernize your KYC process with a compliant, auditable platform that reduces costs by 70% while meeting all Bank of Botswana and Data Protection Act requirements. Local expertise, enterprise standards."

**For Mid-Market API Access:**
"Add identity verification to your business in minutes. Tenant screening, employee background checks, age verification—simple API, transparent pricing (P3-5 per verification), local support."

**For Digital Businesses:**
"Enterprise-grade verification, now accessible to every business. Simple API, pay-as-you-go pricing, no annual commitment."

### 9.6 Sales Process

**API Access (Self-Service):**
1. Signup (email, password)
2. API key generation
3. Documentation access
4. First verification (< 1 day)
5. Automated onboarding emails
6. Upgrade prompts at volume thresholds

**Business Tier (Low-Touch):**
1. Demo request
2. 30-minute product demo
3. Technical Q&A
4. Pilot program (1 month)
5. Contract negotiation
6. Onboarding and integration support

**Enterprise (High-Touch):**
1. Initial meeting (discovery)
2. Stakeholder meetings (compliance, IT, legal)
3. Paid proof of concept (P25,000-50,000)
4. Security audit
5. Contract negotiation (6-12 months)
6. Implementation and training

### 9.7 Launch Plan

**Pre-Launch (Weeks 1-4):**
- Complete regulatory compliance (NBFIRA, Data Protection Commissioner)
- Security audit and penetration testing
- PPADB vendor registration
- Professional indemnity insurance
- Enterprise sales collateral creation
- API Access self-service portal ready

**Soft Launch (Weeks 5-8):**
- Launch with 1-2 paid enterprise pilots
- API Access tier live with self-service signup
- Gather feedback and iterate
- Build case studies
- Fintech Sandbox participation

**Market Entry (Weeks 9-16):**
- Begin enterprise outreach
- Launch use case landing pages (tenant verification, employee background checks, etc.)
- Industry event attendance
- Partner channel development
- Content marketing launch

**Growth Phase (Months 5-12):**
- Scale to 5-10 enterprise customers
- Scale to 20-50 API Access customers
- Land first bank contract
- Government pilot initiation
- Professional services expansion

### 9.8 Partnership Strategy

**Strategic Partners:**

| Partner Type | Target Partners | Value Exchange |
|--------------|-----------------|----------------|
| System Integrators | Core banking vendors | Referrals, joint implementations |
| Consulting Firms | Big 4, local firms | Compliance audit referrals |
| Legal Firms | Top commercial firms | Client recommendations |
| Industry Associations | Bankers Association, Insurance Institute | Event access, credibility |
| Payment Providers | Dodo Payments, Orange Money | Bundled offerings |

**Technology Partners:**
1. AWS (startup credits, co-marketing)
2. Netlify (hosting, startup program)

**Government Partners:**
1. Bank of Botswana (fintech sandbox)
2. NBFIRA (regulatory guidance)
3. Data Protection Commissioner (compliance support)
4. BURS (tax verification API - future)
5. CIPA (company verification API - future)

**Partner Program (Year 2):**
- Referral fees (10-15% of first year)
- Co-marketing opportunities
- Joint solution development
- Partner certification program

### 9.9 Competitive Moat Strategy

**Building Defensible Advantages:**

1. **Regulatory Relationships** - Become trusted KYC advisor for regulators
2. **Data Network Effects** - Fraud detection improves with scale
3. **Integration Lock-In** - Deep integrations create switching costs
4. **Certification & Accreditation** - ISO 27001, SOC 2 (Year 2)
5. **Exclusive Partnerships** - Preferred vendor agreements
6. **Government API Access** - Position for official Omang/CIPA/BURS APIs

---


## 10. Roadmap & Milestones

### 10.1 Development Roadmap

#### Phase 0: Pre-Launch Preparation (Weeks 1-4)

**Week 1-2: Regulatory & Business Setup**
- [ ] Contact NBFIRA (licensing question)
- [ ] Apply to Bank of Botswana Fintech Sandbox
- [ ] Register with Data Protection Commissioner
- [ ] Appoint DPO
- [ ] PPADB vendor registration
- [ ] Professional indemnity insurance quote

**Week 3-4: Technical Foundation**
- [ ] Complete dependency upgrades (Node 22, TypeScript 5.9)
- [ ] AWS account setup (af-south-1)
- [ ] Configure billing alerts
- [ ] Initialize Serverless Framework
- [ ] Set up CI/CD pipeline

#### Phase 1: Core Development (Weeks 5-10)

**Week 5-6: Backend Infrastructure**
- [ ] Create DynamoDB tables and indexes
- [ ] Create S3 buckets for document storage
- [ ] Configure Cognito user pool
- [ ] Implement auth handlers
- [ ] Set up IAM roles (least privilege)

**Week 7-8: Core API Development**
- [ ] Implement verification handlers
- [ ] Implement case handlers
- [ ] Implement document handlers
- [ ] Configure API Gateway
- [ ] Webhook notification system

**Week 9-10: Frontend & SDK**
- [ ] Complete React/Mantine upgrades
- [ ] Case management dashboard
- [ ] Web SDK development
- [ ] Omang verification flow
- [ ] End-to-end testing

#### Phase 2: Enterprise Features (Weeks 11-14)

**Week 11-12: Compliance & Security**
- [ ] Comprehensive audit logging
- [ ] Compliance reporting
- [ ] Security hardening
- [ ] Penetration testing
- [ ] DPIA completion

**Week 13-14: Enterprise Readiness**
- [ ] White-label configuration
- [ ] SLA monitoring dashboard
- [ ] Advanced reporting
- [ ] Documentation completion
- [ ] Demo environment

#### Phase 3: Go-to-Market (Weeks 15-20)

**Week 15-16: Sales Preparation**
- [ ] Sales collateral creation
- [ ] Pricing finalization
- [ ] Contract templates
- [ ] Target account list (50 enterprises)
- [ ] Partner outreach

**Week 17-20: Market Entry**
- [ ] Launch website
- [ ] Begin enterprise outreach
- [ ] First pilot customer
- [ ] Fintech Sandbox participation
- [ ] Industry event attendance

#### Phase 4: MVP Development (Weeks 5-12)

**Week 5-6: Backend Foundation**
- [ ] Set up AWS infrastructure (Serverless Framework)
- [ ] DynamoDB schema implementation
- [ ] S3 bucket configuration
- [ ] Cognito user pool setup
- [ ] API Gateway configuration

**Week 7-8: Core Verification Logic**
- [ ] Document upload endpoints
- [ ] Omang OCR integration
- [ ] Biometric matching (AWS Rekognition)
- [ ] Verification workflow engine
- [ ] Webhook system

**Week 9-10: Frontend Development**
- [ ] Web SDK development (Svelte 5)
- [ ] Backoffice dashboard (React 19)
- [ ] Case management UI
- [ ] Document viewer
- [ ] Responsive design

**Week 11: Integration & Testing**
- [ ] End-to-end testing
- [ ] Security testing
- [ ] Performance testing
- [ ] User acceptance testing (UAT)

**Week 12: Launch Preparation**
- [ ] Documentation completion
- [ ] Marketing website
- [ ] Beta customer onboarding
- [ ] Final security audit

#### Phase 2: Growth Features (Months 4-6)

**Month 4:**
- [ ] KYB verification (CIPA, BURS)
- [ ] Enhanced Omang verification
- [ ] Fraud detection algorithms
- [ ] Advanced reporting

**Month 5:**
- [ ] Orange Money payment integration
- [ ] Setswana language pack
- [ ] Compliance reports for regulators
- [ ] Customer segmentation

**Month 6:**
- [ ] White-label customization (basic)
- [ ] Custom workflows
- [ ] Bulk operations
- [ ] Export functionality

#### Phase 3: Scale Features (Months 7-12)

**Month 7-8:**
- [ ] AML/PEP screening integration
- [ ] Continuous KYC
- [ ] Risk scoring
- [ ] Advanced fraud detection

**Month 9-10:**
- [ ] Mobile SDKs (Android, iOS)
- [ ] Workflow builder (no-code)
- [ ] Advanced white-label
- [ ] On-premise option (enterprise)

**Month 11-12:**
- [ ] Regional expansion preparation
- [ ] Multi-country support
- [ ] Advanced analytics
- [ ] API v2 (improvements)

### 10.2 Business Milestones

**Month 3 (MVP Launch):**
- ✅ Regulatory compliance established
- ✅ Platform ready for enterprise pilots
- 🎯 1-2 paid pilot customers
- 🎯 Bank of Botswana Fintech Sandbox participation
- 🎯 Security audit complete

**Month 6 (Traction):**
- 🎯 3-5 paying enterprise customers
- 🎯 P300K+ revenue
- 🎯 1 bank in pilot program
- 🎯 Case studies published
- 🎯 Partner channel initiated

**Month 9 (Growth):**
- 🎯 8-10 paying customers
- 🎯 P800K+ revenue
- 🎯 1 bank contract signed
- 🎯 Government pilot initiated
- 🎯 Professional services revenue growing

**Month 12 (Scale):**
- 🎯 10-15 paying enterprise customers
- 🎯 P1.5M+ revenue
- 🎯 1-2 bank contracts
- 🎯 Government contract in progress
- 🎯 Profitable operations
- 🎯 Year 2 planning complete

**Year 2 Targets:**
- 🎯 25+ enterprise customers
- 🎯 P4M+ revenue
- 🎯 3+ bank contracts
- 🎯 ISO 27001 certification
- 🎯 AuthBridge Launchpad planning
- 🎯 Regional expansion assessment

**Year 3+ Targets:**
- 🎯 50+ customers
- 🎯 P8M+ revenue
- 🎯 AuthBridge Launchpad launch
- 🎯 Fellowship program initiation
- 🎯 Regional expansion (Namibia/Zimbabwe)
- 🎯 10,000 verifications processed
- 🎯 P100K MRR
- 🎯 1 bank pilot program

**Month 9:**
- 🎯 20 paying customers
- 🎯 30,000 verifications processed
- 🎯 P150K MRR
- 🎯 Regional expansion planning

**Month 12:**
- 🎯 28 total customers (18 paid)
- 🎯 50,000 verifications processed
- 🎯 P44K MRR (P532K ARR)
- 🎯 1 bank contract signed
- 🎯 Regional launch preparation

### 10.3 Feature Release Schedule

**MVP (Month 1):**
- KYC verification flow
- Omang verification
- Case management dashboard
- REST API
- Web SDK
- Basic reporting

**Release 1.1 (Month 2):**
- Performance optimizations
- Bug fixes
- Documentation improvements
- Additional document types

**Release 1.2 (Month 3):**
- Setswana language support
- Mobile optimizations
- Enhanced error handling
- Webhook improvements

**Release 2.0 (Month 4):**
- KYB verification
- CIPA/BURS integration
- Advanced reporting
- Compliance dashboard

**Release 2.1 (Month 5):**
- Orange Money integration
- Fraud detection
- Bulk operations
- Export functionality

**Release 2.2 (Month 6):**
- White-label customization
- Custom workflows
- SLA monitoring
- Performance dashboard

**Release 3.0 (Month 7):**
- AML/PEP screening
- Continuous KYC
- Risk scoring
- Advanced analytics

**Release 3.1 (Month 9):**
- Mobile SDKs
- Workflow builder
- Advanced white-label
- Multi-tenancy

**Release 3.2 (Month 11):**
- Regional support
- Multi-country workflows
- Advanced fraud detection
- API v2

### 10.4 Dependencies & Risks

**Critical Dependencies:**
- NBFIRA licensing approval (or sandbox acceptance)
- Data Protection Commissioner registration
- DPO appointment
- AWS account setup
- Professional indemnity insurance
- PPADB vendor registration (for government)

**Technical Risks:**
- AWS free tier limits exceeded
- Omang OCR accuracy < 95%
- Biometric matching false positives
- API performance issues
- Security vulnerabilities

**Business Risks:**
- Long enterprise sales cycles (6-12 months)
- Reference customer requirement
- Government procurement complexity
- Competitor enters market
- Key person dependency

**Mitigation Strategies:**
- Apply to fintech sandbox early
- Paid pilots generate early revenue
- Professional services for cash flow
- Build regulatory relationships as moat
- Document everything, plan for key hire

### 10.5 Success Criteria by Phase

**MVP Success (Month 3):**
- Platform ready for enterprise pilots
- 1-2 paid pilot customers
- 95% verification success rate
- Zero critical security issues
- Fintech Sandbox participation

**Traction Success (Month 6):**
- 3-5 paying enterprise customers
- P300K+ revenue
- 1 bank in pilot
- Case studies published
- Partner channel initiated

**Scale Success (Month 12):**
- 10-15 enterprise customers
- P1.5M+ revenue
- 1-2 bank contracts
- Government pilot initiated
- Profitable operations

---


## 11. Risk Assessment

### 11.1 Regulatory Risks

**Risk 1: NBFIRA License Required**
- **Likelihood:** MEDIUM
- **Impact:** CRITICAL (could block launch)
- **Description:** Unclear if KYC service requires NBFIRA licensing
- **Mitigation:**
  - Contact NBFIRA immediately for clarification
  - Apply to Bank of Botswana Fintech Sandbox
  - Consult with regulatory lawyer
  - Plan for 3-6 month licensing process if required
- **Contingency:** Operate under sandbox while pursuing license

**Risk 2: Data Protection Act Violation**
- **Likelihood:** LOW
- **Impact:** HIGH (fines, reputational damage)
- **Description:** Non-compliance with Data Protection Act 2024
- **Mitigation:**
  - Complete DPIA before launch
  - Appoint DPO
  - Implement 72-hour breach notification
  - Regular compliance audits
  - Legal review of privacy policy
- **Contingency:** Incident response plan, insurance

**Risk 3: Regulatory Changes**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (feature changes, compliance costs)
- **Description:** New regulations or changes to existing laws
- **Mitigation:**
  - Monitor regulatory updates
  - Maintain relationship with regulators
  - Build flexible architecture
  - Budget for compliance changes
- **Contingency:** Rapid response team, legal counsel

### 11.2 Enterprise Sales Risks

**Risk 4: Long Sales Cycles**
- **Likelihood:** HIGH
- **Impact:** HIGH (delayed revenue)
- **Description:** Enterprise sales take 6-12 months to close
- **Mitigation:**
  - Paid pilots generate early revenue
  - Professional services (consulting) for cash flow
  - Diversified pipeline across segments
  - Multiple deals in parallel
- **Contingency:** Extend runway through consulting revenue

**Risk 5: Reference Customer Requirement**
- **Likelihood:** HIGH
- **Impact:** HIGH (chicken-and-egg problem)
- **Description:** Enterprises want to see similar clients before buying
- **Mitigation:**
  - Land 1-2 lighthouse customers (even at discount)
  - Build compelling case studies
  - Offer extended pilots with success guarantees
  - Leverage Fintech Sandbox credibility
- **Contingency:** Partner with established firm for credibility

**Risk 6: Government Procurement Complexity**
- **Likelihood:** HIGH
- **Impact:** MEDIUM (slow revenue from government)
- **Description:** Tender processes are slow and bureaucratic
- **Mitigation:**
  - PPADB registration early
  - Understand budget cycles
  - Build relationships before tenders
  - Start with progressive ministries
- **Contingency:** Focus on private sector if government too slow

**Risk 7: Compliance Liability**
- **Likelihood:** LOW
- **Impact:** HIGH (legal exposure)
- **Description:** If verification fails and client faces regulatory action
- **Mitigation:**
  - Clear SLAs with liability caps
  - Professional indemnity insurance
  - Comprehensive audit trails
  - Client training on proper use
- **Contingency:** Legal defense fund, insurance claims

### 11.3 Technical Risks

**Risk 4: AWS Free Tier Exceeded**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (unexpected costs)
- **Description:** Usage exceeds free tier limits
- **Mitigation:**
  - Monitor usage daily
  - Set up billing alarms
  - Optimize resource usage
  - Plan for paid tier transition
- **Contingency:** Cost optimization, pricing adjustment

**Risk 5: Security Breach**
- **Likelihood:** LOW
- **Impact:** CRITICAL (data loss, regulatory penalties)
- **Description:** Unauthorized access to customer data
- **Mitigation:**
  - Implement security best practices
  - Regular penetration testing
  - Security monitoring and alerts
  - Incident response plan
  - Cyber insurance
- **Contingency:** 72-hour breach notification, forensic investigation

**Risk 6: Omang OCR Accuracy**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (manual review burden)
- **Description:** OCR accuracy < 95% target
- **Mitigation:**
  - Use AWS Textract (proven accuracy)
  - Implement quality checks
  - Manual review fallback
  - Continuous improvement
- **Contingency:** Increase manual review capacity

**Risk 7: API Performance Issues**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (customer churn)
- **Description:** API response time > 500ms or downtime
- **Mitigation:**
  - Load testing before launch
  - Auto-scaling configuration
  - Performance monitoring
  - CDN for static assets
- **Contingency:** Rapid response team, status page

### 11.3 Business Risks

**Risk 8: Slow Customer Acquisition**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (revenue shortfall)
- **Description:** Fewer than 10 customers by Month 6
- **Mitigation:**
  - API Access tier for fast mid-market adoption
  - Direct enterprise sales to banks and insurance
  - Paid pilots with flexible terms
  - Word-of-mouth through use case packages
- **Contingency:** Adjust pricing, increase marketing spend

**Risk 9: Global Competitor Enters Market**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (pricing pressure, feature competition)
- **Description:** Onfido/Jumio launches Botswana-specific offering
- **Mitigation:**
  - Build strong customer relationships
  - Lock-in through integrations
  - Emphasize local expertise
  - Maintain price advantage
- **Contingency:** Differentiate on service, not just price

**Risk 10: Customer Churn**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (revenue loss)
- **Description:** Monthly churn > 5%
- **Mitigation:**
  - Excellent customer support
  - Regular check-ins
  - Feature requests prioritization
  - Long-term contracts with discounts
- **Contingency:** Win-back campaigns, exit interviews

**Risk 11: Pricing Pressure**
- **Likelihood:** MEDIUM
- **Impact:** MEDIUM (margin compression)
- **Description:** Customers demand lower prices
- **Mitigation:**
  - Demonstrate value (compliance, support)
  - Volume discounts for growth
  - Bundle with value-added services
  - Focus on total cost of ownership
- **Contingency:** Cost optimization, feature differentiation

### 11.4 Market Risks

**Risk 12: Small Market Size**
- **Likelihood:** HIGH
- **Impact:** MEDIUM (limited growth)
- **Description:** Botswana market too small for sustainable business
- **Mitigation:**
  - Plan regional expansion (Year 2)
  - Target high-value customers (banks)
  - Expand to adjacent markets (compliance consulting)
  - Build for SADC region from start
- **Contingency:** Accelerate regional expansion

**Risk 13: Economic Downturn**
- **Likelihood:** LOW
- **Impact:** MEDIUM (reduced spending)
- **Description:** Economic recession reduces fintech investment
- **Mitigation:**
  - Focus on cost savings value proposition
  - Target essential use cases (regulatory compliance)
  - Flexible pricing
  - Diversify customer segments
- **Contingency:** Reduce burn rate, extend runway

### 11.5 Operational Risks

**Risk 14: Solo Founder Burnout**
- **Likelihood:** MEDIUM
- **Impact:** HIGH (project stalls)
- **Description:** Founder overwhelmed, unable to execute
- **Mitigation:**
  - Prioritize ruthlessly (MVP only)
  - Outsource non-core tasks (DPO, legal)
  - Automate where possible
  - Build support network
  - Take breaks
- **Contingency:** Hire contractor, delay timeline

**Risk 15: Key Dependency Failure**
- **Likelihood:** LOW
- **Impact:** HIGH (service disruption)
- **Description:** AWS outage, critical third-party service unavailable
- **Mitigation:**
  - Multi-region deployment (future)
  - Monitor dependency health
  - Backup plans for critical services
- **Contingency:** Failover procedures, communication plan

### 11.6 Risk Mitigation Summary

**High Priority (Address Before Launch):**
1. NBFIRA licensing clarity
2. Data Protection Act compliance
3. Security implementation
4. Performance testing
5. Incident response plan

**Medium Priority (Address in First 3 Months):**
1. Customer acquisition strategy
2. Competitive differentiation
3. Pricing optimization
4. Regional expansion planning
5. Operational efficiency

**Low Priority (Monitor and Address as Needed):**
1. Economic conditions
2. Dependency health
3. Market size validation
4. Technology trends
5. Partnership opportunities

### 11.7 Risk Monitoring

**Weekly:**
- Security alerts
- System performance
- Customer feedback
- Regulatory updates

**Monthly:**
- Customer acquisition metrics
- Churn analysis
- Competitive intelligence
- Financial health

**Quarterly:**
- Strategic risk review
- Regulatory compliance audit
- Technology stack assessment
- Market conditions

---


## 12. Appendices

### Appendix A: Glossary

**AML (Anti-Money Laundering):** Regulations and procedures to prevent money laundering and terrorist financing.

**API (Application Programming Interface):** Software interface that allows applications to communicate with each other.

**ARR (Annual Recurring Revenue):** Predictable revenue from subscriptions over a year.

**AWS (Amazon Web Services):** Cloud computing platform providing infrastructure services.

**Bank of Botswana:** Central bank and primary financial regulator in Botswana.

**BURS (Botswana Unified Revenue Service):** Tax authority responsible for tax collection and compliance.

**CAC (Customer Acquisition Cost):** Cost to acquire a new customer.

**Casbin:** Access control library for role-based permissions.

**CIPA (Companies and Intellectual Property Authority):** Government agency for company registration.

**CloudFront:** AWS content delivery network (CDN) service.

**Cognito:** AWS authentication and user management service.

**Data Protection Act 2024:** Botswana's primary data privacy legislation.

**DPO (Data Protection Officer):** Person responsible for data protection compliance.

**DPIA (Data Protection Impact Assessment):** Assessment of privacy risks for high-risk processing.

**DynamoDB:** AWS NoSQL database service.

**EDD (Enhanced Due Diligence):** Additional verification for high-risk customers.

**FIA (Financial Intelligence Agency):** Botswana's AML/KYC oversight body.

**IAM (Identity and Access Management):** AWS service for managing access to resources.

**JWT (JSON Web Token):** Standard for securely transmitting information between parties.

**KMS (Key Management Service):** AWS encryption key management service.

**KYB (Know Your Business):** Business verification process.

**KYC (Know Your Customer):** Customer identity verification process.

**Lambda:** AWS serverless compute service.

**LTV (Lifetime Value):** Total revenue expected from a customer over their lifetime.

**MRR (Monthly Recurring Revenue):** Predictable revenue from subscriptions per month.

**NBFIRA (Non-Bank Financial Institutions Regulatory Authority):** Regulator for non-bank financial services.

**NPS (Net Promoter Score):** Customer satisfaction metric.

**OCR (Optical Character Recognition):** Technology to extract text from images.

**Omang:** Botswana national identity card (9-digit number).

**PEP (Politically Exposed Person):** Individual in prominent public position (higher risk).

**Pula (P):** Botswana currency (1 USD ≈ P13.50).

**RBAC (Role-Based Access Control):** Access control based on user roles.

**Rekognition:** AWS facial recognition and analysis service.

**REST (Representational State Transfer):** Architectural style for web APIs.

**RPO (Recovery Point Objective):** Maximum acceptable data loss in disaster.

**RTO (Recovery Time Objective):** Maximum acceptable downtime in disaster.

**S3 (Simple Storage Service):** AWS object storage service.

**SADC (Southern African Development Community):** Regional economic community (16 countries).

**SDK (Software Development Kit):** Tools for developers to integrate software.

**Serverless Framework:** Infrastructure as Code tool for serverless applications.

**SLA (Service Level Agreement):** Commitment to service availability and performance.

**STR (Suspicious Transaction Report):** Report to FIA of suspicious activity.

**Svelte:** JavaScript framework for building user interfaces.

**Textract:** AWS document text extraction service.

**TIN (Tax Identification Number):** Unique identifier for tax purposes.

**TLS (Transport Layer Security):** Cryptographic protocol for secure communication.

**UBO (Ultimate Beneficial Owner):** Individual who ultimately owns/controls a business.

**WCAG (Web Content Accessibility Guidelines):** Standards for web accessibility.

### Appendix B: Regulatory References

**Botswana Legislation:**
- Data Protection Act 2024 (enacted October 29, 2024)
- Financial Intelligence Act (2025 amendments)
- Banking Act (Cap. 46:04)
- NBFIRA Act
- Companies Act

**Regulatory Bodies:**
- Bank of Botswana: https://www.bankofbotswana.bw/
- NBFIRA: https://www.nbfira.org.bw/
- Financial Intelligence Agency: https://www.fia.gov.bw/
- BURS: https://www.burs.org.bw/
- CIPA: https://www.cipa.co.bw/

**International Standards:**
- FATF (Financial Action Task Force) Recommendations
- GDPR (General Data Protection Regulation) - reference for best practices
- ISO 27001 (Information Security Management)
- WCAG 2.1 (Web Content Accessibility Guidelines)

### Appendix C: Competitive Analysis Summary

| Provider | Pricing | Strengths | Weaknesses | AuthBridge Advantage |
|----------|---------|-----------|------------|---------------------|
| **Onfido** | $1-3 | Brand, features | Expensive, no local expertise | 70% cheaper, local compliance |
| **Jumio** | $1.50-3 | Global coverage | Expensive, complex | 70% cheaper, simpler |
| **Sumsub** | $0.80-2.50 | Feature-rich | Complex, expensive | 60% cheaper, focused |
| **iDenfy** | $0.60-1.50 | Good value | Generic | 50% cheaper, Botswana-specific |
| **KYCAID** | €0.60-1.10 | Affordable | No local support | Local support, Omang expertise |
| **Identomat** | $0.28 | Very cheap | Limited features | Similar price, better features |
| **Didit** | FREE/$0.30 | Free tier | Basic features | More comprehensive, local |

### Appendix D: Technology Stack Details

**Frontend Technologies:**
- React 19.0.0
- TypeScript 5.9.x
- Mantine 8.1.x
- Refine 5.x
- Svelte 5.38.x
- Vite 7.x

**Backend Technologies:**
- Node.js 22.x LTS
- AWS Lambda (nodejs22.x runtime)
- AWS API Gateway
- AWS Cognito
- AWS DynamoDB
- AWS S3
- AWS Textract
- AWS Rekognition

**Development Tools:**
- pnpm 10.26.x
- Nx workspace
- ESLint
- Prettier
- TypeScript
- Serverless Framework

**Monitoring & Analytics:**
- AWS CloudWatch
- AWS CloudTrail
- Amplitude
- Intercom

**Integrations:**
- Dodo Payments
- Orange Money
- Make.com

### Appendix E: Document Types Supported

**Personal Identity Documents:**
1. Omang (Botswana National ID) - 9 digits
2. Passport (international)
3. Driver's License (Botswana and international)
4. ID Card (generic)
5. Residence Permit
6. Voter ID
7. Work Permit
8. Visa

**Business Documents:**
1. CIPA Registration Certificate (BW + 11 digits)
2. BURS Tax Clearance Certificate
3. Operating License
4. Business Registration
5. Proof of Business Tax ID

**Proof of Address Documents (Botswana):**
1. Water Utilities Corporation (WUC) Statement
2. Botswana Power Corporation (BPC) Electricity Bill
3. Rent Bill/Invoice (from registered landlord)
4. Bank Statement (from licensed Botswana bank)
5. Internet Service Provider Bill (e.g., BTCL, Mascom, Orange)
6. Medical Aid Statement (e.g., BPOMAS, Bomaid, Pula Medical Aid)
7. Pension Fund Account Statement (e.g., BPOPF, Debswana Pension Fund)

**Proof of Address Validation Rules:**
- Document must be dated within the last 3 months
- Must show full name matching identity document
- Must show physical address (not P.O. Box)
- Must be from a recognized Botswana institution
- OCR extraction of: name, address, date, issuing institution

**Financial Documents:**
1. Bank Statement
2. Utility Bill (proof of address)

**Biometric:**
1. Selfie (with liveness detection)

**Country-Based Document Support:**

AuthBridge uses a country-based extractor architecture to support regional expansion. Each country has specific document formats and validation rules.

| Country | Code | Documents Supported | Status |
|---------|------|---------------------|--------|
| Botswana | BW | Omang, Passport, Driver's Licence, Proof of Address | ✅ Implemented |
| South Africa | ZA | Smart ID, Passport, Driver's Licence | 🗓️ Year 2 |
| Namibia | NA | National ID, Passport, Driver's Licence | 🗓️ Year 2 |
| Zimbabwe | ZW | National ID, Passport | 🗓️ Year 3 |
| Zambia | ZM | NRC, Passport | 🗓️ Year 3 |

**Country Selection Criteria:**
1. Target market alignment (SADC region focus)
2. Population size and economic activity
3. Country reputation and regulatory stability
4. Clear KYC/AML laws and documentation
5. Risk profile (fraud rates, sanctions status)

### Appendix F: API Endpoints Summary

**Authentication:**
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

**Verifications:**
- POST /api/v1/verifications (start verification)
- GET /api/v1/verifications/{id} (get status)
- POST /api/v1/verifications/{id}/documents (upload document)
- POST /api/v1/verifications/{id}/submit (submit for review)
- GET /api/v1/verifications (list verifications)

**Cases (Backoffice):**
- GET /api/v1/cases (list cases)
- GET /api/v1/cases/{id} (get case details)
- PUT /api/v1/cases/{id} (update case)
- POST /api/v1/cases/{id}/approve (approve case)
- POST /api/v1/cases/{id}/reject (reject case)

**Documents:**
- GET /api/v1/documents/{id} (get document)
- GET /api/v1/documents/{id}/url (get presigned URL)

**Webhooks:**
- POST /api/v1/webhooks/dodo (Dodo Payments)
- POST /api/v1/webhooks/orange (Orange Money)

**Reports:**
- GET /api/v1/reports/verifications (verification metrics)
- GET /api/v1/reports/compliance (compliance reports)

### Appendix G: Compliance Checklist

**Pre-Launch:**
- [ ] NBFIRA licensing clarified
- [ ] Bank of Botswana Fintech Sandbox application submitted
- [ ] Data Protection Commissioner registration
- [ ] DPO appointed
- [ ] DPIA completed
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] AML/KYC policies documented
- [ ] Data retention policy implemented
- [ ] Breach notification procedure documented

**Security:**
- [ ] IAM least privilege implemented
- [ ] S3 encryption enabled
- [ ] DynamoDB encryption enabled
- [ ] API Gateway authentication configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Secrets Manager configured
- [ ] CloudWatch alarms set up
- [ ] CloudTrail enabled
- [ ] Penetration testing completed

**Operational:**
- [ ] Monitoring dashboard configured
- [ ] Incident response plan documented
- [ ] Backup and recovery tested
- [ ] Documentation completed
- [ ] Support processes defined
- [ ] SLA commitments documented

### Appendix H: Contact Information

**Project Owner:**
- Name: Edmond Moepswa
- Email: [contact email]
- Location: Gaborone, Botswana

**Regulatory Contacts:**
- NBFIRA: info@nbfira.org.bw
- Bank of Botswana: info@bankofbotswana.bw
- Data Protection Commissioner: [to be determined]
- FIA: info@fia.gov.bw

**Technology Partners:**
- AWS Support: [AWS account]
- Netlify: [Netlify account]

**Service Providers:**
- Dodo Payments: [merchant account]
- Orange Money: [merchant account]
- Make.com: [account]
- Amplitude: [account]
- Intercom: [account]

### Appendix I: AuthBridge Impact (Long-Term Vision)

**Mission:** Build a profitable, sustainable business that funds long-term community contribution to Botswana's technology ecosystem.

**AuthBridge Launchpad (Year 3+)**
- Annual application cycles for eligible Botswana startups
- P5,000-10,000 in AuthBridge credits per startup
- 10-20 startups supported per cohort
- Priority support during integration
- Pipeline for future enterprise customers

**Fellowship Program (Year 4+)**
- Annual fellowships for top high school graduates
- P10,000 scholarship + mentorship
- Summer internship at AuthBridge
- University application support

**Talent Development (Year 3+)**
- Paid internships for university students (4-6 annually)
- Graduate rotation programs
- Partnerships with UB, BIUST, BA ISAGO
- Guest lectures and curriculum input

**Government & Institutional Partnerships**
- Support national digital transformation initiatives
- Contribute to fintech policy development
- Partner with BURS, CIPA for API integration
- Collaborate on identity verification standards

**Funding Model:**
- Self-funded from enterprise profits (1-2% of revenue)
- Potential sponsorship from banks (CSR budgets)
- Government grants (innovation support programs)

---

## Document Approval

**Prepared By:** Edmond Moepswa, Founder & CEO
**Date:** January 13, 2026
**Version:** 2.1
**Status:** Complete

**Key Changes in v2.1:**
- Balanced dual-track approach: Enterprise (60%) + Mid-Market API Access (40%)
- Added National Development Alignment section (Vision 2036, NDP 12)
- Added Strategic Opportunities section (Qatar-BDC $12B investment, BURS e-invoicing, Citizen Wallet)
- Added Funding Strategy section (BDC, CEDA, BIF, LEA, BDIH)
- Updated pricing to dual-track structure (API Access P3-5/verification + Enterprise annual contracts)
- Added use case packages for API Access (Tenant Verification, Employee Background Checks, Age Verification, etc.)
- Updated success metrics to include API Access customer targets
- Updated channel strategy for dual-track acquisition
- Removed "freemium" language, replaced with "API Access tier"

**Key Changes in v2.0:**
- Strategic pivot to enterprise-first approach
- Repositioned from "affordable alternative" to "trusted enterprise partner"
- Prioritized enterprise segments (banks, insurance, government) over startups
- Added professional services revenue stream
- Introduced AuthBridge Launchpad for future startup support
- Added AuthBridge Impact vision (fellowship, internships, partnerships)
- Updated pricing to enterprise models
- Enhanced competitive moat strategy
- Revised financial projections for enterprise focus
- Added enterprise-specific risks and mitigations

**Review & Approval:**
- [ ] Technical Review (Architecture, Security)
- [ ] Legal Review (Compliance, Contracts)
- [ ] Business Review (Strategy, Financials)
- [ ] Final Approval

**Next Steps:**
1. Begin regulatory compliance process (NBFIRA, Data Protection Commissioner)
2. PPADB vendor registration
3. Professional indemnity insurance
4. Start MVP development
5. Build target account list (50 enterprises)
6. Begin enterprise outreach
7. Land first paid pilot customer

---

**END OF DOCUMENT**

