/**
 * Omang front side field patterns
 * Based on actual Botswana National Identity Card (Omang) layout
 */
const FRONT_PATTERNS = {
    surname: /SURNAME:?\s*([A-Z\s]+?)(?:\n|$)/i,
    forenames: /FORENAMES?:?\s*([A-Z\s]+?)(?:\n|$)/i,
    idNumber: /ID\s+NUMBER:?\s*(\d{9})/i,
    dateOfBirth: /DATE\s+OF\s+BIRTH:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    placeOfBirth: /PLACE\s+OF\s+BIRTH:?\s*([A-Z\s]+?)(?:\n|$)/i,
};
/**
 * Omang back side field patterns
 * Based on actual Botswana National Identity Card (Omang) layout
 */
const BACK_PATTERNS = {
    nationality: /NATIONALITY:?\s*([A-Z\s]+?)(?:\n|$)/i,
    sex: /SEX:?\s*([MF])/i,
    colourOfEyes: /COLOUR\s+OF\s+EYES:?\s*([A-Z\s]+?)(?:\n|$)/i,
    dateOfExpiry: /DATE\s+OF\s+EXPIRY:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    placeOfApplication: /PLACE\s+OF\s+APPLICATION:?\s*([A-Z\s]+?)(?:\n|$)/i,
    // Address fields (optional)
    plot: /PLOT\s+(\d+[A-Z]?)/i,
    district: /(.*?)\s+DISTRICT/i,
};
/**
 * Botswana Driver's Licence field patterns
 * Based on actual Botswana Driving Licence layout
 */
const DRIVERS_LICENCE_PATTERNS = {
    // Name is displayed as two lines without labels on the licence
    // First line after header is surname, second is forenames
    omangNumber: /ID:?\s*Omang\s*(\d{9})/i,
    gender: /Gender:?\s*([MF])/i,
    dateOfBirth: /Date\s+of\s+Birth:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    licenceNumber: /Licence\s+Number:?\s*(\d+)/i,
    licenceClass: /Class\s+([A-Z0-9]+)/i,
    // Validity Period: Oct 2024 - Oct 2029
    validityPeriod: /Validity\s+Period:?\s*([A-Za-z]+\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{4})/i,
    firstIssue: /First\s+Issue:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    driverRestriction: /Driver\s+Restriction:?\s*(\d)/i,
    vehicleRestriction: /Veh\.?\s*Restr\.?:?\s*(\d)/i,
    endorsement: /Endorsement:?\s*(Yes|No)/i,
};
/**
 * Extract fields from Omang front side using pattern matching
 */
export function extractOmangFrontFields(blocks) {
    const fields = {};
    const confidence = {};
    // Get all LINE blocks with text
    const lines = blocks
        .filter((block) => block.BlockType === 'LINE' && block.Text)
        .map((block) => ({
        text: block.Text,
        confidence: block.Confidence || 0,
    }));
    // Combine all text for pattern matching
    const fullText = lines.map((line) => line.text).join('\n');
    // Extract surname
    const surnameMatch = fullText.match(FRONT_PATTERNS.surname);
    if (surnameMatch) {
        fields.surname = surnameMatch[1].trim();
        confidence.surname = calculateFieldConfidence(blocks, surnameMatch[0]);
    }
    // Extract forenames
    const forenamesMatch = fullText.match(FRONT_PATTERNS.forenames);
    if (forenamesMatch) {
        fields.forenames = forenamesMatch[1].trim();
        confidence.forenames = calculateFieldConfidence(blocks, forenamesMatch[0]);
    }
    // Extract ID number
    const idNumberMatch = fullText.match(FRONT_PATTERNS.idNumber);
    if (idNumberMatch) {
        fields.idNumber = idNumberMatch[1];
        confidence.idNumber = calculateFieldConfidence(blocks, idNumberMatch[0]);
    }
    // Extract date of birth
    const dobMatch = fullText.match(FRONT_PATTERNS.dateOfBirth);
    if (dobMatch) {
        fields.dateOfBirth = dobMatch[1];
        confidence.dateOfBirth = calculateFieldConfidence(blocks, dobMatch[0]);
    }
    // Extract place of birth
    const pobMatch = fullText.match(FRONT_PATTERNS.placeOfBirth);
    if (pobMatch) {
        fields.placeOfBirth = pobMatch[1].trim();
        confidence.placeOfBirth = calculateFieldConfidence(blocks, pobMatch[0]);
    }
    return { fields, confidence };
}
/**
 * Extract fields from Omang back side
 */
export function extractOmangBackFields(blocks) {
    const fields = {};
    const confidence = {};
    // Get all LINE blocks with text
    const lines = blocks
        .filter((block) => block.BlockType === 'LINE' && block.Text)
        .map((block) => ({
        text: block.Text,
        confidence: block.Confidence || 0,
    }));
    // Combine all text for pattern matching
    const fullText = lines.map((line) => line.text).join('\n');
    // Extract nationality
    const nationalityMatch = fullText.match(BACK_PATTERNS.nationality);
    if (nationalityMatch) {
        fields.nationality = nationalityMatch[1].trim();
        confidence.nationality = calculateFieldConfidence(blocks, nationalityMatch[0]);
    }
    // Extract sex
    const sexMatch = fullText.match(BACK_PATTERNS.sex);
    if (sexMatch) {
        fields.sex = sexMatch[1];
        confidence.sex = calculateFieldConfidence(blocks, sexMatch[0]);
    }
    // Extract colour of eyes
    const eyesMatch = fullText.match(BACK_PATTERNS.colourOfEyes);
    if (eyesMatch) {
        fields.colourOfEyes = eyesMatch[1].trim();
        confidence.colourOfEyes = calculateFieldConfidence(blocks, eyesMatch[0]);
    }
    // Extract date of expiry
    const expiryMatch = fullText.match(BACK_PATTERNS.dateOfExpiry);
    if (expiryMatch) {
        fields.dateOfExpiry = expiryMatch[1];
        confidence.dateOfExpiry = calculateFieldConfidence(blocks, expiryMatch[0]);
    }
    // Extract place of application
    const applicationMatch = fullText.match(BACK_PATTERNS.placeOfApplication);
    if (applicationMatch) {
        fields.placeOfApplication = applicationMatch[1].trim();
        confidence.placeOfApplication = calculateFieldConfidence(blocks, applicationMatch[0]);
    }
    // Extract plot number (address - optional)
    const plotMatch = fullText.match(BACK_PATTERNS.plot);
    if (plotMatch) {
        fields.plot = plotMatch[1];
        confidence.plot = calculateFieldConfidence(blocks, plotMatch[0]);
    }
    // Extract district (address - optional)
    const districtMatch = fullText.match(BACK_PATTERNS.district);
    if (districtMatch) {
        fields.district = districtMatch[0].trim();
        confidence.district = calculateFieldConfidence(blocks, districtMatch[0]);
    }
    // Extract locality (middle line - heuristic approach for address)
    const addressLines = lines.filter((line) => {
        const text = line.text.toUpperCase();
        return (!text.includes('ADDRESS') &&
            !text.match(/PLOT\s+\d+/) &&
            !text.includes('DISTRICT') &&
            !text.includes('NATIONALITY') &&
            !text.includes('SEX') &&
            !text.includes('COLOUR') &&
            !text.includes('DATE') &&
            !text.includes('PLACE OF APPLICATION'));
    });
    if (addressLines.length > 0) {
        const localityLine = addressLines.find((line) => {
            const text = line.text.toUpperCase();
            return text.length > 2 && /^[A-Z\s]+$/.test(text);
        });
        if (localityLine) {
            fields.locality = localityLine.text.trim();
            confidence.locality = localityLine.confidence;
        }
    }
    return { fields, confidence };
}
/**
 * Calculate confidence score for a specific field by finding matching block
 */
export function calculateFieldConfidence(blocks, matchedText) {
    // Find block that contains any part of the matched text
    const matchingBlock = blocks.find((block) => block.BlockType === 'LINE' &&
        block.Text &&
        (block.Text.includes(matchedText) || matchedText.includes(block.Text)));
    return matchingBlock?.Confidence || 0;
}
/**
 * Calculate overall confidence score with weighted fields
 * Critical fields (ID number, names) have higher weight
 */
export function calculateOverallConfidence(fieldConfidence) {
    const weights = {
        // Omang front side
        surname: 1.5,
        forenames: 1.5,
        idNumber: 2.0, // Most critical
        dateOfBirth: 1.0,
        placeOfBirth: 0.5,
        // Omang back side
        nationality: 0.5,
        sex: 0.5,
        colourOfEyes: 0.3,
        dateOfExpiry: 0.5,
        placeOfApplication: 0.3,
        // Address (optional)
        plot: 0.3,
        locality: 0.3,
        district: 0.3,
        // Driver's Licence
        omangNumber: 2.0, // Critical - links to Omang
        gender: 0.5,
        licenceNumber: 1.5,
        licenceClass: 1.0,
        validityPeriodStart: 0.5,
        validityPeriodEnd: 0.5,
        firstIssue: 0.3,
        driverRestriction: 0.3,
        vehicleRestriction: 0.3,
        endorsement: 0.3,
    };
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const [field, confidence] of Object.entries(fieldConfidence)) {
        if (field === 'overall')
            continue;
        if (confidence && confidence > 0) {
            const weight = weights[field] || 1.0;
            totalWeightedScore += confidence * weight;
            totalWeight += weight;
        }
    }
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}
/**
 * Extract fields from Botswana Driver's Licence
 * Based on actual Botswana Driving Licence layout
 */
export function extractDriversLicenceFields(blocks) {
    const fields = {};
    const confidence = {};
    // Get all LINE blocks with text
    const lines = blocks
        .filter((block) => block.BlockType === 'LINE' && block.Text)
        .map((block) => ({
        text: block.Text,
        confidence: block.Confidence || 0,
    }));
    // Combine all text for pattern matching
    const fullText = lines.map((line) => line.text).join('\n');
    // Extract name - on driver's licence, name appears as two lines after header
    // Look for lines that are all caps and appear to be names
    const nameLines = lines.filter((line) => {
        const text = line.text.trim();
        // Name lines are typically all caps, no numbers, no colons
        return /^[A-Z\s]+$/.test(text) &&
            text.length > 2 &&
            !text.includes('REPUBLIC') &&
            !text.includes('BOTSWANA') &&
            !text.includes('DRIVING') &&
            !text.includes('LICENCE') &&
            !text.includes('SADC');
    });
    if (nameLines.length >= 2) {
        // First name line is surname
        fields.surname = nameLines[0].text.trim();
        confidence.surname = nameLines[0].confidence;
        // Second name line is forenames
        fields.forenames = nameLines[1].text.trim();
        confidence.forenames = nameLines[1].confidence;
    }
    else if (nameLines.length === 1) {
        // Single line might contain both
        fields.surname = nameLines[0].text.trim();
        confidence.surname = nameLines[0].confidence;
    }
    // Extract Omang number (ID: Omang 059016012)
    const omangMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.omangNumber);
    if (omangMatch) {
        fields.omangNumber = omangMatch[1];
        confidence.omangNumber = calculateFieldConfidence(blocks, omangMatch[0]);
    }
    // Extract gender
    const genderMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.gender);
    if (genderMatch) {
        fields.gender = genderMatch[1];
        confidence.gender = calculateFieldConfidence(blocks, genderMatch[0]);
    }
    // Extract date of birth
    const dobMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.dateOfBirth);
    if (dobMatch) {
        fields.dateOfBirth = dobMatch[1];
        confidence.dateOfBirth = calculateFieldConfidence(blocks, dobMatch[0]);
    }
    // Extract licence number
    const licenceNumMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.licenceNumber);
    if (licenceNumMatch) {
        fields.licenceNumber = licenceNumMatch[1];
        confidence.licenceNumber = calculateFieldConfidence(blocks, licenceNumMatch[0]);
    }
    // Extract licence class
    const classMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.licenceClass);
    if (classMatch) {
        fields.licenceClass = classMatch[1];
        confidence.licenceClass = calculateFieldConfidence(blocks, classMatch[0]);
    }
    // Extract validity period (Oct 2024 - Oct 2029)
    const validityMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.validityPeriod);
    if (validityMatch) {
        fields.validityPeriodStart = validityMatch[1];
        fields.validityPeriodEnd = validityMatch[2];
        confidence.validityPeriodStart = calculateFieldConfidence(blocks, validityMatch[0]);
        confidence.validityPeriodEnd = confidence.validityPeriodStart;
    }
    // Extract first issue date
    const firstIssueMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.firstIssue);
    if (firstIssueMatch) {
        fields.firstIssue = firstIssueMatch[1];
        confidence.firstIssue = calculateFieldConfidence(blocks, firstIssueMatch[0]);
    }
    // Extract driver restriction
    const driverRestrMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.driverRestriction);
    if (driverRestrMatch) {
        fields.driverRestriction = driverRestrMatch[1];
        confidence.driverRestriction = calculateFieldConfidence(blocks, driverRestrMatch[0]);
    }
    // Extract vehicle restriction
    const vehRestrMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.vehicleRestriction);
    if (vehRestrMatch) {
        fields.vehicleRestriction = vehRestrMatch[1];
        confidence.vehicleRestriction = calculateFieldConfidence(blocks, vehRestrMatch[0]);
    }
    // Extract endorsement
    const endorsementMatch = fullText.match(DRIVERS_LICENCE_PATTERNS.endorsement);
    if (endorsementMatch) {
        fields.endorsement = endorsementMatch[1];
        confidence.endorsement = calculateFieldConfidence(blocks, endorsementMatch[0]);
    }
    return { fields, confidence };
}
//# sourceMappingURL=field-extractors.js.map