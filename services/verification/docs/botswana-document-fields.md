# Botswana Identity Document Field Reference

## Overview

This document provides the authoritative field reference for Botswana identity documents used in AuthBridge verification. These field patterns are based on **actual document images** and should be used for all OCR extraction, validation, and storage operations.

> **IMPORTANT**: This document supersedes any previous field definitions. The patterns here are verified against real Botswana government-issued documents.

## Architecture: Country-Based Extractors

AuthBridge uses a country-based extractor architecture to support regional expansion. Each country has its own set of document extractors that implement a common interface.

```
src/extractors/
├── types.ts              # Common types and interfaces
├── registry.ts           # Extractor registry
├── index.ts              # Public exports
└── botswana/             # Botswana-specific extractors
    ├── index.ts
    ├── types.ts          # Botswana-specific types
    ├── omang-extractor.ts
    ├── drivers-licence-extractor.ts
    └── passport-extractor.ts
```

### Usage

```typescript
import { getExtractor, hasExtractor } from './extractors';

// Check if extractor exists
if (hasExtractor('BW', 'passport')) {
  const extractor = getExtractor('BW', 'passport');
  const result = extractor.extract(textractBlocks);
  console.log(result.fields);
}
```

---

## Omang (National Identity Card)

The Omang is Botswana's National Identity Card, issued to all citizens.

### Front Side Fields

| Field Label (on card) | Internal Field Name | Pattern | Example | Required |
|-----------------------|---------------------|---------|---------|----------|
| `SURNAME` | `surname` | `SURNAME:?\s*([A-Z\s]+)` | MOEPSWA | ✅ Yes |
| `FORENAMES` | `forenames` | `FORENAMES?:?\s*([A-Z\s]+)` | MOTLOTLEGI EDMOND P | ✅ Yes |
| `ID NUMBER` | `idNumber` | `ID\s+NUMBER:?\s*(\d{9})` | 059016012 | ✅ Yes |
| `DATE OF BIRTH` | `dateOfBirth` | `DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})` | 25/08/1994 | ✅ Yes |
| `PLACE OF BIRTH` | `placeOfBirth` | `PLACE\s+OF\s+BIRTH:?\s*([A-Z\s]+)` | FRANCISTOWN | ❌ Optional |
| `SIGNATURE OF BEARER` | - | Not extracted | - | - |

### Back Side Fields

| Field Label (on card) | Internal Field Name | Pattern | Example | Required |
|-----------------------|---------------------|---------|---------|----------|
| `NATIONALITY` | `nationality` | `NATIONALITY:?\s*([A-Z\s]+)` | MOTSWANA | ❌ Optional |
| `SEX` | `sex` | `SEX:?\s*([MF])` | M | ✅ Yes |
| `COLOUR OF EYES` | `colourOfEyes` | `COLOUR\s+OF\s+EYES:?\s*([A-Z\s]+)` | BROWN | ❌ Optional |
| `DATE OF EXPIRY` | `dateOfExpiry` | `DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})` | 22/05/2032 | ✅ Yes |
| `PLACE OF APPLICATION` | `placeOfApplication` | `PLACE\s+OF\s+APPLICATION:?\s*([A-Z\s]+)` | GABORONE | ❌ Optional |
| `SIGNATURE OF REGISTRAR` | - | Not extracted | - | - |
| MRZ (Machine Readable Zone) | - | Future enhancement | - | - |

### Address Fields (Back Side - Optional)

| Field Label | Internal Field Name | Pattern | Example |
|-------------|---------------------|---------|---------|
| `PLOT` | `plot` | `PLOT\s+(\d+[A-Z]?)` | 12345 |
| Locality | `locality` | Heuristic (middle line) | GABORONE |
| District | `district` | `(.*?)\s+DISTRICT` | SOUTH EAST DISTRICT |

### Key Corrections from Previous Implementation

| ❌ Previous (Incorrect) | ✅ Correct | Notes |
|-------------------------|------------|-------|
| `FIRST NAMES` | `FORENAMES` | Actual card uses "FORENAMES" |
| `OMANG NO` / `OMANG NUMBER` | `ID NUMBER` | Actual card uses "ID NUMBER" |
| `DATE OF ISSUE` | **Does not exist** | Omang cards do NOT have a date of issue field |
| `SEX` on front | `SEX` on back | Sex field is on the back of the card |

### Omang Validation Rules

1. **ID Number Format**: Exactly 9 digits, numeric only
2. **Expiry Validation**: Document must not be expired
3. **No Issue Date**: Cannot validate 10-year validity period (no issue date on card)
4. **Biometric Match**: Photo on card compared to selfie (≥80% confidence)

---

## Driver's Licence (Driving Licence)

Botswana Driver's Licence issued by the Department of Road Transport and Safety.

### Front Side Fields

| Field Label (on card) | Internal Field Name | Pattern | Example | Required |
|-----------------------|---------------------|---------|---------|----------|
| Name Line 1 | `surname` | First all-caps name line | MOEPSWA | ✅ Yes |
| Name Line 2 | `forenames` | Second all-caps name line | MOTLOTLEGI EDMOND P | ✅ Yes |
| `ID: Omang` | `omangNumber` | `ID:?\s*Omang\s*(\d{9})` | 059016012 | ✅ Yes |
| `Gender` | `gender` | `Gender:?\s*([MF])` | M | ✅ Yes |
| `Date of Birth` | `dateOfBirth` | `Date\s+of\s+Birth:?\s*(\d{2}\/\d{2}\/\d{4})` | 25/08/1994 | ✅ Yes |
| `Licence Number` | `licenceNumber` | `Licence\s+Number:?\s*(\d+)` | 687215 | ✅ Yes |
| `Class` | `licenceClass` | `Class\s+([A-Z0-9]+)` | B | ✅ Yes |
| `Validity Period` | `validityPeriodStart`, `validityPeriodEnd` | `Validity\s+Period:?\s*([A-Za-z]+\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{4})` | Oct 2024 - Oct 2029 | ✅ Yes |
| `First Issue` | `firstIssue` | `First\s+Issue:?\s*(\d{2}\/\d{2}\/\d{4})` | 04/10/2024 | ❌ Optional |
| `Driver Restriction` | `driverRestriction` | `Driver\s+Restriction:?\s*(\d)` | 0 | ❌ Optional |
| `Veh. Restr.` | `vehicleRestriction` | `Veh\.?\s*Restr\.?:?\s*(\d)` | 0 | ❌ Optional |
| `Endorsement` | `endorsement` | `Endorsement:?\s*(Yes\|No)` | No | ❌ Optional |

### Driver Restriction Codes

| Code | Meaning |
|------|---------|
| 0 | None |
| 1 | Glasses/contact lenses required |
| 2 | Artificial limb |

### Vehicle Restriction Codes

| Code | Meaning |
|------|---------|
| 0 | None |
| 1 | Automatic transmission only |
| 2 | Electrically powered vehicles only |
| 3 | Physically disabled adaptations |
| 4 | Bus >16,000kg (GVM) permitted |

### Licence Class Categories

| Class | Description |
|-------|-------------|
| A | Motorcycle >125cc |
| A1 | Motorcycle ≤125cc |
| B | Light vehicle ≤3500kg, GVM ≤750kg |
| C1 | Medium vehicle, GVM ≤16,000kg |
| C | Heavy vehicle, GVM >16,000kg |
| EB | Light vehicle with trailer |
| EC1 | Medium vehicle with trailer |
| EC | Heavy vehicle with trailer |

### PrDP Categories (Professional Driving Permit)

| Code | Meaning |
|------|---------|
| P | Passengers |
| G | Goods |
| H | Hazardous materials |

### Driver's Licence Validation Rules

1. **Omang Number**: Must match the linked Omang ID (9 digits)
2. **Validity Period**: Licence must not be expired
3. **Cross-Reference**: Can verify against Omang for same person
4. **Biometric Match**: Photo on licence compared to selfie (≥80% confidence)

---

## Passport

Botswana Passport issued by the Ministry of Labour and Home Affairs (MLHA). Follows ICAO 9303 TD3 standard with bilingual labels (English/French).

### Bio-Data Page Fields

| Field Label (on passport) | Internal Field Name | Pattern | Example | Required |
|---------------------------|---------------------|---------|---------|----------|
| `Type/Type` | `type` | `Type\/?Type:?\s*([A-Z])` | P | ✅ Yes |
| `Code/Code` | `countryCode` | `Code\/?Code:?\s*([A-Z]{3})` | BWA | ✅ Yes |
| `Passport No./N° de passeport` | `passportNumber` | `Passport\s+No\.?\/?N°\s*de\s*passeport:?\s*([A-Z0-9]+)` | BN0221546 | ✅ Yes |
| `Surname/Nom` | `surname` | `Surname\/?Nom:?\s*([A-Z\s]+)` | MOEPSWA | ✅ Yes |
| `Given names/Prénoms` | `forenames` | `Given\s+names?\/?Pr[ée]noms?:?\s*([A-Z\s]+)` | MOTLOTLEGI EDMOND POLOKO | ✅ Yes |
| `Nationality/Nationalité` | `nationality` | `Nationality\/?Nationalit[ée]:?\s*([A-Z]+)` | MOTSWANA | ✅ Yes |
| `Date of birth/Date de naissance` | `dateOfBirth` | `Date\s+of\s+birth\/?Date\s+de\s+naissance:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})` | 25 AUG/AOUT 94 | ✅ Yes |
| `Sex/Sexe` | `sex` | `Sex\/?Sexe:?\s*([MF])` | M | ✅ Yes |
| `Place of birth/Lieu de naissance` | `placeOfBirth` | `Place\s+of\s+birth\/?Lieu\s+de\s+naissance:?\s*([A-Z\s]+)` | FRANCISTOWN | ❌ Optional |
| `Personal No./N° personnel` | `personalNumber` | `Personal\s+No\.?\/?N°\s*personnel:?\s*(\d{9})` | 059016012 | ✅ Yes |
| `Date of issue/Date de délivrance` | `dateOfIssue` | `Date\s+of\s+issue\/?Date\s+de\s+d[ée]livrance:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})` | 05 JAN/JAN 12 | ❌ Optional |
| `Date of expiry/Date d'expiration` | `dateOfExpiry` | `Date\s+of\s+expiry\/?Date\s+d['']?expiration:?\s*(\d{2}\s+[A-Z]+\/?[A-Z]+\s+\d{2})` | 04 JAN/JAN 22 | ✅ Yes |
| `Authority/Autorité` | `issuingAuthority` | `Authority\/?Autorit[ée]:?\s*([A-Z\s\-]+)` | MLHA - DIC | ❌ Optional |

### Machine Readable Zone (MRZ)

The passport includes a 2-line MRZ (TD3 format, 44 characters per line):

**Line 1 Format**: `P<[Country3][Surname]<<[Given Names]<<<<...`
- Example: `P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<`

**Line 2 Format**: `[Passport#9][Check1][Country3][DOB6][Check2][Sex1][Expiry6][Check3][Personal14][Check4][FinalCheck1]`
- Example: `BN02215460BWA9408252M2201041059016012<<<<84`

| Position | Length | Field | Example |
|----------|--------|-------|---------|
| 1-9 | 9 | Passport Number | BN0221546 |
| 10 | 1 | Check Digit 1 | 0 |
| 11-13 | 3 | Country Code | BWA |
| 14-19 | 6 | Date of Birth (YYMMDD) | 940825 |
| 20 | 1 | Check Digit 2 | 2 |
| 21 | 1 | Sex | M |
| 22-27 | 6 | Date of Expiry (YYMMDD) | 220104 |
| 28 | 1 | Check Digit 3 | 1 |
| 29-42 | 14 | Personal Number (Omang) | 059016012<<<< |
| 43 | 1 | Check Digit 4 | 8 |
| 44 | 1 | Final Check Digit | 4 |

### Personal Number (Omang Link)

The `Personal No./N° personnel` field contains the holder's Omang number, enabling cross-reference verification between passport and national ID.

### Passport Validation Rules

1. **Passport Number Format**: 2 letters + 7 digits (e.g., BN0221546)
2. **Personal Number**: Must be valid 9-digit Omang number
3. **Country Code**: Must be BWA for Botswana passport
4. **Type**: Must be P for passport
5. **MRZ Check Digits**: All check digits must validate
6. **Expiry Validation**: Document must not be expired
7. **Biometric Match**: Photo on passport compared to selfie (≥80% confidence)

---

## Proof of Address Documents

Proof of address documents are used to verify a customer's residential address. These documents must be recent (within 3 months) and show the customer's full name and physical address.

### Supported Document Types

| Document Type | Issuing Institution | Status |
|---------------|---------------------|--------|
| Water Utilities Corporation (WUC) Statement | WUC | 🗓️ Planned |
| Botswana Power Corporation (BPC) Electricity Bill | BPC | 🗓️ Planned |
| Rent Bill/Invoice | Registered Landlords | 🗓️ Planned |
| Bank Statement | Licensed Botswana Banks | 🗓️ Planned |
| Internet Service Provider Bill | BTCL, Mascom, Orange | 🗓️ Planned |
| Medical Aid Statement | BPOMAS, Bomaid, Pula Medical Aid | 🗓️ Planned |
| Pension Fund Account Statement | BPOPF, Debswana Pension Fund | 🗓️ Planned |

### Common Fields to Extract

| Field Name | Description | Required |
|------------|-------------|----------|
| `accountHolderName` | Full name on the document | ✅ Yes |
| `physicalAddress` | Street address (not P.O. Box) | ✅ Yes |
| `documentDate` | Statement/bill date | ✅ Yes |
| `issuingInstitution` | Name of the issuing company | ✅ Yes |
| `accountNumber` | Account/customer number | ❌ Optional |
| `amountDue` | Amount owed (if applicable) | ❌ Optional |

### Validation Rules

1. **Recency**: Document must be dated within the last 3 months
2. **Name Match**: Account holder name must match identity document
3. **Physical Address**: Must show physical address (P.O. Box not accepted)
4. **Recognized Institution**: Must be from a recognized Botswana institution
5. **Document Authenticity**: OCR confidence score ≥70%

### Address Format (Botswana)

Botswana addresses typically follow this format:
```
Plot [Number]
[Street/Area Name]
[Locality/Suburb]
[City/Town]
[District] DISTRICT
```

Example:
```
Plot 12345
Extension 12
Gaborone West
GABORONE
SOUTH EAST DISTRICT
```

### Implementation Status

Proof of address document extractors are planned for Phase 2. The architecture will follow the same country-based extractor pattern:

```
src/extractors/botswana/
├── ...existing extractors...
├── wuc-statement-extractor.ts      # 🗓️ Planned
├── bpc-bill-extractor.ts           # 🗓️ Planned
├── bank-statement-extractor.ts     # 🗓️ Planned
└── utility-bill-extractor.ts       # 🗓️ Planned (generic)
```

---

## Implementation Files

| Purpose | File Path |
|---------|----------|
| Extractor types | `src/extractors/types.ts` |
| Extractor registry | `src/extractors/registry.ts` |
| Botswana types | `src/extractors/botswana/types.ts` |
| Omang extractor | `src/extractors/botswana/omang-extractor.ts` |
| Driver's Licence extractor | `src/extractors/botswana/drivers-licence-extractor.ts` |
| Passport extractor | `src/extractors/botswana/passport-extractor.ts` |
| Legacy field extraction | `src/utils/field-extractors.ts` |
| Omang OCR service | `src/services/omang-ocr.ts` |
| Omang validation | `src/services/omang-validation.ts` |
| Storage service | `src/services/ocr-storage.ts` |
| OCR handler | `src/handlers/process-ocr.ts` |

---

## Regional Expansion Roadmap

AuthBridge is designed for regional expansion across the SADC region. The country-based extractor architecture enables adding support for new countries without affecting existing implementations.

### Planned Countries

| Phase | Country | Code | Documents | Priority |
|-------|---------|------|-----------|----------|
| Phase 1 (MVP) | Botswana | BW | Omang, Passport, Driver's Licence | ✅ Done |
| Phase 2 (Year 2) | South Africa | ZA | Smart ID, Passport, Driver's Licence | HIGH |
| Phase 2 (Year 2) | Namibia | NA | National ID, Passport, Driver's Licence | HIGH |
| Phase 3 (Year 3) | Zimbabwe | ZW | National ID, Passport | MEDIUM |
| Phase 3 (Year 3) | Zambia | ZM | NRC, Passport | MEDIUM |

### Country Selection Criteria

When evaluating new countries for support, consider:

1. **Target Market**: Alignment with SADC regional focus
2. **Population Size**: Larger populations = more potential verifications
3. **Country Reputation**: Stability, international standing
4. **Risk Profile**: Fraud rates, sanctions status, AML concerns
5. **Regulatory Clarity**: Clear KYC/AML laws and documentation
6. **Document Standardization**: Consistent document formats

### Adding a New Country

To add support for a new country:

1. Create `src/extractors/<country>/` folder
2. Define country-specific types in `types.ts`
3. Implement extractors for each document type
4. Register extractors in `src/extractors/registry.ts`
5. Add documentation to `docs/<country>-document-fields.md`
6. Add tests for all extractors

---

## Version History

| Version | Date | Changes |
|---------|------|--------|
| 1.0 | 2026-01-15 | Initial document based on actual Omang and Driver's Licence images |
| 1.1 | 2026-01-15 | Added Passport support with MRZ parsing, country-based extractor architecture |
| 1.2 | 2026-01-15 | Added Proof of Address documents section, Regional Expansion Roadmap |
