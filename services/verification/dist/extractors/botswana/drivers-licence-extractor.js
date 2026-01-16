/**
 * Botswana Driver's Licence Extractor
 *
 * Field patterns based on actual Botswana Driving Licence images - January 2026
 */
/**
 * Driver's Licence field patterns
 */
const PATTERNS = {
    omangNumber: /ID:?\s*Omang\s*(\d{9})/i,
    gender: /Gender:?\s*([MF])/i,
    dateOfBirth: /Date\s+of\s+Birth:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    licenceNumber: /Licence\s+Number:?\s*(\d+)/i,
    licenceClass: /Class\s+([A-Z0-9]+)/i,
    validityPeriod: /Validity\s+Period:?\s*([A-Za-z]+\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{4})/i,
    firstIssue: /First\s+Issue:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    driverRestriction: /Driver\s+Restriction:?\s*(\d)/i,
    vehicleRestriction: /Veh\.?\s*Restr\.?:?\s*(\d)/i,
    endorsement: /Endorsement:?\s*(Yes|No)/i,
};
/**
 * Field weights for confidence calculation
 */
const FIELD_WEIGHTS = {
    omangNumber: 2.0,
    surname: 1.5,
    forenames: 1.5,
    licenceNumber: 1.5,
    dateOfBirth: 1.0,
    licenceClass: 1.0,
    gender: 0.5,
    validityStart: 0.5,
    validityEnd: 0.5,
    firstIssue: 0.3,
    driverRestriction: 0.3,
    vehicleRestriction: 0.3,
    endorsement: 0.3,
};
export class BotswanaDriversLicenceExtractor {
    country = 'BW';
    documentType = 'drivers_licence';
    requiredFields = [
        'omangNumber',
        'surname',
        'forenames',
        'dateOfBirth',
        'licenceNumber',
        'licenceClass',
        'validityStart',
        'validityEnd',
        'gender',
    ];
    extract(blocks) {
        const fields = {};
        const confidence = {};
        const warnings = [];
        // Get all LINE blocks with text
        const lines = blocks
            .filter((block) => block.BlockType === 'LINE' && block.Text)
            .map((block) => ({
            text: block.Text,
            confidence: block.Confidence || 0,
        }));
        const fullText = lines.map((line) => line.text).join('\n');
        // Extract name from header lines (no labels on licence)
        this.extractName(lines, fields, confidence);
        // Extract labeled fields
        this.extractLabeledFields(fullText, blocks, fields, confidence);
        // Calculate overall confidence
        const overallConfidence = this.calculateOverallConfidence(confidence);
        // Check for missing required fields
        const missingRequiredFields = this.requiredFields.filter((field) => !fields[field]);
        if (missingRequiredFields.length > 0) {
            warnings.push(`Missing required fields: ${missingRequiredFields.join(', ')}`);
        }
        if (overallConfidence < 80) {
            warnings.push('Low overall confidence - manual review recommended');
        }
        return {
            fields: fields,
            confidence,
            overallConfidence,
            documentType: this.documentType,
            country: this.country,
            requiresManualReview: missingRequiredFields.length > 0 || overallConfidence < 80,
            missingRequiredFields,
            warnings,
        };
    }
    validate(fields) {
        const errors = [];
        // Validate Omang number format (9 digits)
        if (fields.omangNumber && !/^\d{9}$/.test(fields.omangNumber)) {
            errors.push('Omang number must be exactly 9 digits');
        }
        // Validate licence number (numeric)
        if (fields.licenceNumber && !/^\d+$/.test(fields.licenceNumber)) {
            errors.push('Licence number must be numeric');
        }
        // Validate date of birth format
        if (fields.dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(fields.dateOfBirth)) {
            errors.push('Date of birth must be in DD/MM/YYYY format');
        }
        // Validate licence class
        const validClasses = ['A', 'A1', 'B', 'C1', 'C', 'EB', 'EC1', 'EC'];
        if (fields.licenceClass && !validClasses.includes(fields.licenceClass)) {
            errors.push(`Invalid licence class. Must be one of: ${validClasses.join(', ')}`);
        }
        // Validate gender
        if (fields.gender && !['M', 'F'].includes(fields.gender)) {
            errors.push('Gender must be M or F');
        }
        // Validate validity period (not expired)
        if (fields.validityEnd) {
            const endDate = this.parseMonthYear(fields.validityEnd);
            if (endDate && endDate < new Date()) {
                errors.push('Licence has expired');
            }
        }
        return { valid: errors.length === 0, errors };
    }
    extractName(lines, fields, confidence) {
        // Name appears as two lines without labels - all caps, no numbers
        const nameLines = lines.filter((line) => {
            const text = line.text.trim();
            return (/^[A-Z\s]+$/.test(text) &&
                text.length > 2 &&
                !text.includes('REPUBLIC') &&
                !text.includes('BOTSWANA') &&
                !text.includes('DRIVING') &&
                !text.includes('LICENCE') &&
                !text.includes('SADC'));
        });
        if (nameLines.length >= 2) {
            fields.surname = nameLines[0].text.trim();
            confidence.surname = nameLines[0].confidence;
            fields.forenames = nameLines[1].text.trim();
            confidence.forenames = nameLines[1].confidence;
        }
        else if (nameLines.length === 1) {
            fields.surname = nameLines[0].text.trim();
            confidence.surname = nameLines[0].confidence;
        }
    }
    extractLabeledFields(fullText, blocks, fields, confidence) {
        // Omang number
        const omangMatch = fullText.match(PATTERNS.omangNumber);
        if (omangMatch) {
            fields.omangNumber = omangMatch[1];
            confidence.omangNumber = this.findBlockConfidence(blocks, omangMatch[0]);
        }
        // Gender
        const genderMatch = fullText.match(PATTERNS.gender);
        if (genderMatch) {
            fields.gender = genderMatch[1];
            confidence.gender = this.findBlockConfidence(blocks, genderMatch[0]);
        }
        // Date of Birth
        const dobMatch = fullText.match(PATTERNS.dateOfBirth);
        if (dobMatch) {
            fields.dateOfBirth = dobMatch[1];
            confidence.dateOfBirth = this.findBlockConfidence(blocks, dobMatch[0]);
        }
        // Licence Number
        const licenceMatch = fullText.match(PATTERNS.licenceNumber);
        if (licenceMatch) {
            fields.licenceNumber = licenceMatch[1];
            confidence.licenceNumber = this.findBlockConfidence(blocks, licenceMatch[0]);
        }
        // Licence Class
        const classMatch = fullText.match(PATTERNS.licenceClass);
        if (classMatch) {
            fields.licenceClass = classMatch[1];
            confidence.licenceClass = this.findBlockConfidence(blocks, classMatch[0]);
        }
        // Validity Period
        const validityMatch = fullText.match(PATTERNS.validityPeriod);
        if (validityMatch) {
            fields.validityStart = validityMatch[1];
            fields.validityEnd = validityMatch[2];
            const conf = this.findBlockConfidence(blocks, validityMatch[0]);
            confidence.validityStart = conf;
            confidence.validityEnd = conf;
        }
        // First Issue
        const firstIssueMatch = fullText.match(PATTERNS.firstIssue);
        if (firstIssueMatch) {
            fields.firstIssue = firstIssueMatch[1];
            confidence.firstIssue = this.findBlockConfidence(blocks, firstIssueMatch[0]);
        }
        // Driver Restriction
        const driverRestrMatch = fullText.match(PATTERNS.driverRestriction);
        if (driverRestrMatch) {
            fields.driverRestriction = driverRestrMatch[1];
            confidence.driverRestriction = this.findBlockConfidence(blocks, driverRestrMatch[0]);
        }
        // Vehicle Restriction
        const vehRestrMatch = fullText.match(PATTERNS.vehicleRestriction);
        if (vehRestrMatch) {
            fields.vehicleRestriction = vehRestrMatch[1];
            confidence.vehicleRestriction = this.findBlockConfidence(blocks, vehRestrMatch[0]);
        }
        // Endorsement
        const endorsementMatch = fullText.match(PATTERNS.endorsement);
        if (endorsementMatch) {
            fields.endorsement = endorsementMatch[1];
            confidence.endorsement = this.findBlockConfidence(blocks, endorsementMatch[0]);
        }
    }
    findBlockConfidence(blocks, matchedText) {
        const matchingBlock = blocks.find((block) => block.BlockType === 'LINE' &&
            block.Text &&
            (block.Text.includes(matchedText) || matchedText.includes(block.Text)));
        return matchingBlock?.Confidence || 0;
    }
    calculateOverallConfidence(confidence) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const [field, score] of Object.entries(confidence)) {
            if (score && score > 0) {
                const weight = FIELD_WEIGHTS[field] || 1.0;
                totalWeightedScore += score * weight;
                totalWeight += weight;
            }
        }
        return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    }
    parseMonthYear(monthYear) {
        const months = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        };
        const match = monthYear.match(/([A-Za-z]+)\s+(\d{4})/);
        if (!match)
            return null;
        const monthNum = months[match[1].toLowerCase()];
        const year = parseInt(match[2], 10);
        if (monthNum === undefined || isNaN(year))
            return null;
        return new Date(year, monthNum + 1, 0); // Last day of month
    }
}
//# sourceMappingURL=drivers-licence-extractor.js.map