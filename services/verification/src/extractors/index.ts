/**
 * Document Extractors Module
 *
 * Country-based document extraction with support for regional expansion.
 *
 * Usage:
 * ```typescript
 * import { getExtractor, hasExtractor } from './extractors';
 *
 * // Get extractor for Botswana passport
 * const extractor = getExtractor('BW', 'passport');
 * if (extractor) {
 *   const result = extractor.extract(textractBlocks);
 *   console.log(result.fields);
 * }
 *
 * // Check if extractor exists
 * if (hasExtractor('BW', 'national_id')) {
 *   // Process Omang
 * }
 * ```
 */

// Export types
export * from './types';

// Export registry functions
export {
  registerExtractor,
  getExtractor,
  hasExtractor,
  getAllExtractors,
  getExtractorsForCountry,
  getSupportedCountries,
  getSupportedDocumentTypes,
} from './registry';

// Export Botswana extractors and types
export * from './botswana';
