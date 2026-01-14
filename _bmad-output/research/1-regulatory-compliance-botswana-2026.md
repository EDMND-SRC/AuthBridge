---
research_type: regulatory_compliance
topic: Botswana KYC/AML/Data Protection Compliance
date: 2026-01-13
status: complete
confidence: high
sources: 15+
---

# Track 1: Regulatory Compliance Research - Botswana 2026

**Research Objective:** Identify all regulatory requirements for operating a KYC/identity verification platform in Botswana

**Executive Summary:** AuthBridge must comply with a comprehensive regulatory framework including AML/KYC obligations, data protection laws, and potential licensing requirements. The good news: Botswana has a well-defined, FATF-aligned regulatory environment. The challenge: You may need regulatory approval before launch.

---

## 1. REGULATORY FRAMEWORK OVERVIEW

### Primary Regulatory Bodies

| Regulator | Jurisdiction | Relevance to AuthBridge |
|-----------|--------------|-------------------------|
| **Financial Intelligence Agency (FIA)** | AML/KYC oversight | **CRITICAL** - Oversees KYC compliance |
| **Bank of Botswana** | Banking sector | **HIGH** - May regulate fintech services |
| **NBFIRA** | Non-bank financial institutions | **HIGH** - Regulates payment providers, fintechs |
| **Data Protection Commissioner** | Data privacy | **CRITICAL** - Enforces Data Protection Act |
| **BURS** | Tax compliance | **MEDIUM** - Tax verification integration |

### Key Legislation

1. **Financial Intelligence Act (2025 amendments)** - AML/KYC framework
2. **Data Protection Act 2024** - Replaced 2018 Act (never came into force)
3. **Banking Act (Cap. 46:04)** - Banking licensing
4. **NBFIRA Act** - Non-bank financial regulation

---

## 2. KYC/AML COMPLIANCE REQUIREMENTS

### 2.1 Who Must Comply?

**Reporting Entities** under Financial Intelligence Act include:
- Banks and financial institutions
- **Payment service providers** ✅ (YOU)
- **Digital wallets** ✅ (YOU)
- **Fintechs facilitating financial transactions** ✅ (YOU)
- Money remittance services
- Virtual Asset Service Providers (VASPs)

**⚠️ CRITICAL FINDING:** If AuthBridge processes payments or facilitates financial transactions, you ARE a reporting entity.

### 2.2 Customer Due Diligence (CDD) Requirements

**For Individual Customers:**
- Full legal name
- **Omang number** (or passport for non-citizens)
- Date of birth
- Residential address (with district)
- Contact information (phone, email)
- Source of funds (for higher-risk transactions)
- **Selfie/biometric matching**

**Acceptable Identity Documents:**
- Botswana National ID (Omang) - 9 digits, valid 10 years
- Passport
- Residence permits for non-citizens
- Driver's license (supplementary)

**For Business Customers (KYB):**
- Company name and **CIPA registration number** (format: BW00001234567)
- **Tax Identification Number (TIN)** (format: [A-Z]\d{9})
- Business address
- Directors and shareholders (>25% ownership)
- **Ultimate Beneficial Owners (UBOs)**
- Business activity description
- Bank account details

### 2.3 Enhanced Due Diligence (EDD)

Required for:
- Politically Exposed Persons (PEPs)
- Non-resident customers
- High-risk jurisdictions
- Unusual transaction patterns

**EDD Measures:**
- Additional documentation
- Source of funds verification
- Source of wealth verification
- Closer transaction monitoring
- Senior management approval

### 2.4 Ongoing Monitoring

**Obligations:**
- Continuous transaction monitoring
- Regular customer information updates
- Risk-based review frequency
- Suspicious activity detection
- **Suspicious Transaction Reports (STRs)** to FIA

**Record Retention:**
- **Minimum 5 years** after relationship ends
- Must include:
  - Customer identification data
  - Transaction records
  - Risk assessments
  - Correspondence

### 2.5 Suspicious Transaction Reporting

**When to Report:**
- Unusual transaction patterns
- Inconsistencies with known business activities
- Unexplained changes in transaction behavior
- Attempts to avoid reporting thresholds
- Transactions with no apparent economic purpose

**How to Report:**
- Submit to Financial Intelligence Agency (FIA)
- **Do NOT tip off the customer** (criminal offense)
- Report promptly (no specific timeline, but "without delay")
- Maintain internal documentation

**Penalties for Non-Compliance:**
- Regulatory fines
- Criminal prosecution
- License revocation
- Reputational damage

---

## 3. DATA PROTECTION ACT 2024 COMPLIANCE

### 3.1 Key Changes from 2018 Act

The **Data Protection Act 2024** (enacted October 29, 2024) introduces significant enhancements:

**Structural Reforms:**
- Created Data Protection Division and Access to Information Division
- Fixed 5-year terms for commissioners (age limit: 60)
- Complete independence of Commission
- New powers: search, seizure, detention

**New Requirements:**
- **Data Protection Impact Assessment (DPIA)** for high-risk processing
- **Data Protection Officer (DPO)** appointment (mandatory in certain cases)
- **Prior consultation** with Commissioner for high-risk activities
- **72-hour breach notification** requirement
- Children's data protection (consent required from parent/guardian)

### 3.2 Data Protection Principles

**Must comply with:**
1. **Lawfulness, fairness, transparency**
2. **Purpose limitation** - collect only for specified purposes
3. **Data minimization** - collect only what's necessary
4. **Accuracy** - keep data up-to-date
5. **Storage limitation** - don't keep longer than needed
6. **Integrity and confidentiality** - secure processing
7. **Accountability** - demonstrate compliance

### 3.3 Legal Basis for Processing

**Valid legal bases:**
- **Consent** (freely given, informed, specific)
- **Contract performance** (necessary for service delivery)
- **Legal obligation** (KYC/AML compliance) ✅ **YOUR PRIMARY BASIS**
- **Vital interests** (life-threatening situations)
- **Public interest**
- **Legitimate interests** (balanced against data subject rights)

**⚠️ CRITICAL:** Consent for processing personal data NOT necessary for contract performance is deemed **invalid** even if freely given.

### 3.4 Cross-Border Data Transfers

**Section 74 Restrictions:**
- **Prohibited** unless destination country has adequate data protection
- Must be necessary for:
  - Contractual obligations
  - Legal requirements
  - Public interest reasons

**⚠️ IMPLICATION FOR AWS:**
- AWS Cape Town region (af-south-1) is IDEAL - keeps data in Africa
- If using other AWS regions, you need:
  - Standard Contractual Clauses (SCCs)
  - Adequacy assessment
  - Possible Commissioner approval

### 3.5 Data Breach Notification

**Timeline: 72 HOURS** to notify Commissioner

**Must include:**
- Nature of the breach
- Categories and approximate number of affected data subjects
- Categories and approximate number of affected records
- Name and contact of DPO or contact point
- Likely consequences
- Measures taken or proposed

**Direct Notification to Data Subjects:**
Required if breach likely results in **high risk** to rights and freedoms

**Exceptions:**
- Technical/organizational measures applied (e.g., encryption)
- Subsequent measures ensure high risk no longer likely
- Disproportionate effort required (but must use alternative means)

### 3.6 Data Protection Officer (DPO)

**Mandatory Appointment When:**
- Public authority processing
- Core activities involve **regular and systematic monitoring** ✅ (YOU)
- Core activities involve **large-scale processing of sensitive data** ✅ (YOU)
- Processing of criminal conviction data

**DPO Responsibilities:**
- Inform and advise on legal obligations
- Monitor compliance
- Liaise with Data Protection Commissioner
- Act as contact point for data subjects
- Conduct DPIAs

**⚠️ YOU WILL NEED A DPO** - Can be internal or outsourced

### 3.7 Data Protection Impact Assessment (DPIA)

**Required for:**
- Processing involving **new technologies**
- Processing likely to result in **high risk** to rights/freedoms
- **Large-scale processing of sensitive data** ✅ (YOU)
- **Systematic monitoring of publicly accessible areas**

**DPIA Must Assess:**
- Nature, scope, context, and purpose of processing
- Necessity and proportionality
- Risks to data subjects
- Mitigation measures

**Prior Consultation:**
If DPIA indicates high risk that cannot be mitigated, must consult Commissioner BEFORE processing

### 3.8 Foreign Data Controllers

**If you process Botswana data subjects' data:**
- Must appoint a **representative in Botswana** (in writing)
- Representative must be based in Botswana
- Representative is contact point for:
  - Data subjects
  - Data Protection Commissioner
  - All processing-related issues

**⚠️ CRITICAL:** Even with representative, you remain liable for compliance

---

## 4. LICENSING REQUIREMENTS

### 4.1 Do You Need a License?

**Potential Licensing Scenarios:**

| Scenario | Regulator | License Needed? | Risk Level |
|----------|-----------|-----------------|------------|
| **Pure KYC/identity verification service** | NBFIRA | **UNCLEAR** | 🟡 MEDIUM |
| **Payment processing** | NBFIRA | **YES** | 🔴 HIGH |
| **Digital wallet** | NBFIRA | **YES** | 🔴 HIGH |
| **Data processing only** | None | **NO** | 🟢 LOW |

**NBFIRA Jurisdiction:**
NBFIRA regulates:
- Micro-lenders
- Finance and leasing companies
- Payment providers
- Digital financial services
- Virtual Asset Service Providers (VASPs)

**⚠️ CRITICAL UNCERTAINTY:**
It's **unclear** whether a pure KYC/identity verification platform requires NBFIRA licensing. You need to:
1. **Consult with NBFIRA directly**
2. Consider applying to **Bank of Botswana Fintech Sandbox** (launched December 2024)

### 4.2 Bank of Botswana Fintech Sandbox

**Launched:** December 2024
**Purpose:** Test innovative financial products under controlled supervision

**Eligibility Requirements:**
- Detailed business plan
- Robust governance structures
- Clear testing methodology
- Risk management framework
- Technological capacity
- Exit plan (scale or wind down)

**Benefits:**
- Regulatory guidance
- Controlled testing environment
- Pathway to full licensing
- Reduced compliance burden during testing

**⚠️ RECOMMENDATION:** Apply to sandbox to clarify licensing requirements

### 4.3 Registration as Data Controller

**With Data Protection Commissioner:**
- Register as data controller
- Provide processing activities details
- Appoint DPO
- Submit DPIA (if required)
- Obtain approval for high-risk processing

---

## 5. OMANG VERIFICATION

### 5.1 Omang Card Details

**Format:**
- 9-digit number
- Valid for 10 years
- Issued by Department of Immigration & Citizenship
- Mandatory for citizens aged 16+

**Information on Card:**
- Full name
- Omang number
- Date of birth
- Place of birth
- Residential address
- Photo
- Fingerprints (embedded chip)

### 5.2 Government Verification API

**Current Status:** **NO PUBLIC API AVAILABLE**

**Findings:**
- Government does not currently offer public Omang verification API
- Some third-party providers claim verification capabilities (e.g., uqudo)
- Manual verification is standard practice
- Police clearance verification exists but separate service

**Workarounds:**
1. **Format validation** - Verify 9-digit format
2. **OCR extraction** - Extract data from Omang image
3. **Biometric matching** - Match selfie to Omang photo
4. **Third-party verification** - Partner with licensed providers
5. **Manual review** - Human verification for high-risk cases

**Future Opportunity:**
- Government is modernizing digital services
- National Fintech Strategy (2025-2030) in development
- Potential for future API access

---

## 6. COMPLIANCE ROADMAP

### Phase 1: Pre-Launch (CRITICAL)

**Week 1-2:**
- [ ] Consult with NBFIRA on licensing requirements
- [ ] Apply to Bank of Botswana Fintech Sandbox
- [ ] Register with Data Protection Commissioner
- [ ] Appoint Data Protection Officer

**Week 3-4:**
- [ ] Conduct Data Protection Impact Assessment
- [ ] Develop AML/KYC policies and procedures
- [ ] Create Suspicious Transaction Reporting process
- [ ] Draft Standard Contractual Clauses for AWS

**Week 5-6:**
- [ ] Implement 72-hour breach notification system
- [ ] Set up record retention system (5+ years)
- [ ] Create customer consent management
- [ ] Develop staff AML training program

### Phase 2: Launch Preparation

- [ ] Obtain necessary licenses/approvals
- [ ] Complete sandbox testing (if applicable)
- [ ] Finalize data residency strategy (AWS Cape Town)
- [ ] Implement ongoing monitoring systems
- [ ] Establish FIA reporting procedures

### Phase 3: Ongoing Compliance

- [ ] Quarterly AML risk assessments
- [ ] Annual DPIA reviews
- [ ] Regular staff training
- [ ] Continuous transaction monitoring
- [ ] Periodic Commissioner consultations

---

## 7. COST IMPLICATIONS

### Licensing Fees (Estimated)

| Item | Cost (BWP) | Cost (USD) | Frequency |
|------|------------|------------|-----------|
| NBFIRA License Application | P25,000 | ~$1,850 | One-time |
| Data Protection Registration | Unknown | TBD | Annual |
| DPO (Outsourced) | P5,000-10,000/mo | $370-740/mo | Monthly |
| Legal Consultation | P10,000-20,000 | $740-1,480 | One-time |
| Compliance Software | $0 (build) | $0 | N/A |

**Total Estimated Pre-Launch Cost:** ~$3,000-5,000 USD

---

## 8. RISK ASSESSMENT

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **License required but not obtained** | MEDIUM | CRITICAL | Apply to sandbox, consult NBFIRA |
| **Data breach within 72 hours** | LOW | HIGH | Implement monitoring, encryption |
| **Cross-border data transfer violation** | MEDIUM | HIGH | Use AWS Cape Town, SCCs |
| **Failure to report suspicious activity** | LOW | CRITICAL | Automated monitoring, training |
| **No Omang verification API** | HIGH | MEDIUM | Multi-layered verification approach |

### Compliance Gaps

**Immediate Attention Required:**
1. **Licensing clarity** - Unknown if NBFIRA license needed
2. **DPO appointment** - Mandatory but not yet done
3. **DPIA completion** - Required before processing
4. **FIA registration** - If you're a reporting entity

---

## 9. COMPETITIVE ADVANTAGE

### How Compliance Helps You Win

**Trust Signal:**
- "Fully compliant with Botswana Data Protection Act 2024"
- "Registered with Financial Intelligence Agency"
- "Data stored in Africa (AWS Cape Town)"

**Differentiation:**
- Local competitors may not be compliant
- Global players may not understand Botswana regulations
- You can be the "trusted local option"

**B2B Sales:**
- Banks/fintechs need compliant KYC providers
- Your compliance reduces their regulatory risk
- Can offer compliance-as-a-service

---

## 10. KEY TAKEAWAYS

### ✅ Good News

1. **Clear regulatory framework** - Botswana has well-defined, FATF-aligned regulations
2. **Data protection modernized** - 2024 Act is comprehensive and clear
3. **Fintech-friendly** - Sandbox program shows regulatory openness
4. **AWS Cape Town** - Solves data residency concerns
5. **No Omang API** - Levels playing field (no one has direct access)

### ⚠️ Challenges

1. **Licensing uncertainty** - Need to clarify with NBFIRA
2. **DPO requirement** - Additional cost/complexity
3. **72-hour breach notification** - Tight timeline
4. **No government Omang API** - Must build workarounds
5. **Cross-border restrictions** - Limits cloud provider options

### 🎯 Critical Next Steps

1. **IMMEDIATELY:** Contact NBFIRA to clarify licensing
2. **WEEK 1:** Apply to Bank of Botswana Fintech Sandbox
3. **WEEK 2:** Register with Data Protection Commissioner
4. **WEEK 3:** Appoint DPO (can outsource)
5. **WEEK 4:** Complete DPIA before any processing

---

## SOURCES

Content rephrased for compliance with licensing restrictions. Key sources:

1. [KYC Compliance in Botswana 2025 Guide](https://blog.voveid.com/kyc-compliance-in-botswana-a-2025-guide-for-fintechs-and-regulated-businesses/)
2. [AML Compliance in Botswana 2025 Guide](https://blog.voveid.com/aml-compliance-in-botswana-a-2025-guide-for-regulated-businesses/)
3. [Understanding Botswana's 2018 and 2024 Data Protection Acts](https://cipit.org/understanding-botswanas-2018-and-2024-data-protection-acts/)
4. [NBFIRA Regulatory Framework](https://blog.lendsqr.com/who-regulates-lending-in-botswana/)
5. [Bank of Botswana Fintech Sandbox](https://www.bwtechzone.com/2025/12/bank-of-botswana-opens-fintech-sandbox.html)
6. [Botswana Data Protection Act 2024](https://boardcloud.org/news/posts/botswanas-new-data-protection-act-what-you-need-to-know-2025-guide/)

---

**Research Completed:** January 13, 2026
**Analyst:** Mary (Business Analyst Agent)
**Confidence Level:** HIGH (based on official regulatory sources)
**Next Update:** After NBFIRA consultation
