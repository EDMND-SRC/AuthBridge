/**
 * Document Extractor Registry
 *
 * Central registry for country-specific document extractors.
 * Supports regional expansion by registering new country extractors.
 */
import { getExtractorKey, } from './types';
// Import Botswana extractors
import { BotswanaOmangExtractor } from './botswana/omang-extractor';
import { BotswanaDriversLicenceExtractor } from './botswana/drivers-licence-extractor';
import { BotswanaPassportExtractor } from './botswana/passport-extractor';
/**
 * Registry of all document extractors
 */
const extractorRegistry = new Map();
/**
 * Register a document extractor
 */
export function registerExtractor(extractor) {
    const key = getExtractorKey(extractor.country, extractor.documentType);
    extractorRegistry.set(key, extractor);
}
/**
 * Get an extractor for a specific country and document type
 */
export function getExtractor(country, documentType) {
    const key = getExtractorKey(country, documentType);
    return extractorRegistry.get(key);
}
/**
 * Check if an extractor exists for a country/document combination
 */
export function hasExtractor(country, documentType) {
    const key = getExtractorKey(country, documentType);
    return extractorRegistry.has(key);
}
/**
 * Get all registered extractors
 */
export function getAllExtractors() {
    return Array.from(extractorRegistry.values());
}
/**
 * Get all extractors for a specific country
 */
export function getExtractorsForCountry(country) {
    return getAllExtractors().filter((e) => e.country === country);
}
/**
 * Get all supported countries
 */
export function getSupportedCountries() {
    const countries = new Set();
    for (const extractor of extractorRegistry.values()) {
        countries.add(extractor.country);
    }
    return Array.from(countries);
}
/**
 * Get supported document types for a country
 */
export function getSupportedDocumentTypes(country) {
    return getExtractorsForCountry(country).map((e) => e.documentType);
}
// ============================================
// Register all extractors on module load
// ============================================
// Botswana (BW)
registerExtractor(new BotswanaOmangExtractor());
registerExtractor(new BotswanaDriversLicenceExtractor());
registerExtractor(new BotswanaPassportExtractor());
// Future countries can be added here:
// registerExtractor(new SouthAfricaIdExtractor());
// registerExtractor(new NamibiaIdExtractor());
// registerExtractor(new ZimbabweIdExtractor());
// registerExtractor(new ZambiaIdExtractor());
//# sourceMappingURL=registry.js.map