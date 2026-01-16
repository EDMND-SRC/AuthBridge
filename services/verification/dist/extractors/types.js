/**
 * Country-based document extraction types
 * Supports regional expansion with country-specific document formats
 */
/**
 * Registry key for extractor lookup
 */
export function getExtractorKey(country, documentType) {
    return `${country}:${documentType}`;
}
//# sourceMappingURL=types.js.map