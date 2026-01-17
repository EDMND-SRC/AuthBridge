# Verification Service - Project Context

## Overview

This is the AuthBridge Verification Service, responsible for identity document verification for Botswana citizens and residents.

## Architecture: Country-Based Extractors

The service uses a country-based extractor architecture to support regional expansion:

```
src/extractors/
├── types.ts              # Common types and interfaces
├── registry.ts           # Extractor registry
├── index.ts              # Public exports
└── botswana/             # Botswana-specific extractors
    ├── omang-extractor.ts
    ├── drivers-licence-extractor.ts
    └── passport-extractor.ts
```

## Supported Document Types

### Currently Implemented (Botswana - BW)

1. **Omang (National Identity Card)** - `national_id`
   - Front side: surname, forenames, ID number, date of birth, place of birth
   - Back side: nationality, sex, colour of eyes, date of expiry, place of application
   - Address fields (optional): plot, locality, district

2. **Driver's Licence** - `drivers_licence`
   - Links to Omang via `omangNumber` field
   - Includes licence class, validity period, restrictions

3. **Passport** - `passport`
   - ICAO 9303 TD3 format with MRZ parsing
   - Links to Omang via `personalNumber` field
   - Bilingual labels (English/French)

See: `docs/botswana-document-fields.md` for complete field reference

## Critical Implementation Notes

### Omang Field Corrections (January 2026)

The following corrections were made based on actual Omang card images:

| ❌ Previous (Incorrect) | ✅ Correct |
|-------------------------|------------|
| `FIRST NAMES` | `FORENAMES` |
| `OMANG NO` / `OMANG NUMBER` | `ID NUMBER` |
| `DATE OF ISSUE` | **Does not exist on Omang cards** |
| `SEX` on front | `SEX` on back |

**IMPORTANT**: Omang cards do NOT have a "Date of Issue" field. The validation service has been updated to only require `idNumber` and `dateOfExpiry`.

### Driver's Licence Support

Driver's licence OCR extraction is implemented with the following fields:
- `surname`, `forenames` (from name lines)
- `omangNumber` (ID: Omang field - links to Omang)
- `gender`, `dateOfBirth`
- `licenceNumber`, `licenceClass`
- `validityPeriodStart`, `validityPeriodEnd`
- `firstIssue`, `driverRestriction`, `vehicleRestriction`, `endorsement`

## Key Files

| Purpose | File |
|---------|------|
| Document field reference | `docs/botswana-document-fields.md` |
| OCR extraction documentation | `docs/ocr-extraction.md` |
| Extractor types | `src/extractors/types.ts` |
| Extractor registry | `src/extractors/registry.ts` |
| Botswana extractors | `src/extractors/botswana/` |
| Legacy field extraction | `src/utils/field-extractors.ts` |
| Omang OCR service | `src/services/omang-ocr.ts` |
| Omang validation | `src/services/omang-validation.ts` |
| Storage service | `src/services/ocr-storage.ts` |
| OCR handler | `src/handlers/process-ocr.ts` |
| Duplicate detection | `src/services/duplicate-detection.ts` |

## Testing

Run tests with:
```bash
pnpm --filter @authbridge/verification-service test
```

**🚨 CRITICAL: Docker Prohibited**

This project prohibits Docker usage for local development and testing. Use Java-based alternatives:

- **DynamoDB Local**: Install via Homebrew (`brew install dynamodb-local`)
- **LocalStack**: Not used - use AWS SDK mocks for unit tests
- **Containers**: Prohibited - use native tools and Homebrew packages

**Rationale**: Standardized development environment using Homebrew for consistency across team.

## AWS Region

**CRITICAL**: All AWS resources must be deployed to `af-south-1` (Cape Town) for Data Protection Act 2024 compliance.

## Regional Expansion

To add support for a new country:

1. Create `src/extractors/<country>/` folder
2. Implement extractors for each document type
3. Register extractors in `src/extractors/registry.ts`
4. Add documentation to `docs/<country>-document-fields.md`

### Planned Countries

| Phase | Country | Code | Priority | Rationale |
|-------|---------|------|----------|-----------|
| Phase 1 (MVP) | Botswana | BW | ✅ Done | Home market |
| Phase 2 (Year 2) | South Africa | ZA | HIGH | Largest SADC economy |
| Phase 2 (Year 2) | Namibia | NA | HIGH | Close ties, similar legal framework |
| Phase 3 (Year 3) | Zimbabwe | ZW | MEDIUM | Large population |
| Phase 3 (Year 3) | Zambia | ZM | MEDIUM | Regional hub |

### Country Selection Criteria

1. Target market alignment (SADC region)
2. Population size and economic activity
3. Country reputation and stability
4. Clear KYC/AML laws and documentation
5. Risk profile (fraud, sanctions)

## Proof of Address Documents (Roadmap)

Planned for Phase 2 implementation:

| Document Type | Issuing Institution | Status |
|---------------|---------------------|--------|
| WUC Statement | Water Utilities Corporation | 🗓️ Planned |
| BPC Electricity Bill | Botswana Power Corporation | 🗓️ Planned |
| Rent Bill/Invoice | Registered Landlords | 🗓️ Planned |
| Bank Statement | Licensed Botswana Banks | 🗓️ Planned |
| Internet Bill | BTCL, Mascom, Orange | 🗓️ Planned |
| Medical Aid Statement | BPOMAS, Bomaid, Pula Medical Aid | 🗓️ Planned |
| Pension Fund Statement | BPOPF, Debswana Pension Fund | 🗓️ Planned |

### Proof of Address Validation Rules

- Document must be dated within the last 3 months
- Must show full name matching identity document
- Must show physical address (not P.O. Box)
- Must be from a recognized Botswana institution
