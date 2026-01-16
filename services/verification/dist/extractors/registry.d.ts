/**
 * Document Extractor Registry
 *
 * Central registry for country-specific document extractors.
 * Supports regional expansion by registering new country extractors.
 */
import { DocumentExtractor, SupportedCountry, DocumentType, ExtractedDocumentFields } from './types';
/**
 * Register a document extractor
 */
export declare function registerExtractor(extractor: DocumentExtractor): void;
/**
 * Get an extractor for a specific country and document type
 */
export declare function getExtractor<T extends ExtractedDocumentFields = ExtractedDocumentFields>(country: SupportedCountry, documentType: DocumentType): DocumentExtractor<T> | undefined;
/**
 * Check if an extractor exists for a country/document combination
 */
export declare function hasExtractor(country: SupportedCountry, documentType: DocumentType): boolean;
/**
 * Get all registered extractors
 */
export declare function getAllExtractors(): DocumentExtractor[];
/**
 * Get all extractors for a specific country
 */
export declare function getExtractorsForCountry(country: SupportedCountry): DocumentExtractor[];
/**
 * Get all supported countries
 */
export declare function getSupportedCountries(): SupportedCountry[];
/**
 * Get supported document types for a country
 */
export declare function getSupportedDocumentTypes(country: SupportedCountry): DocumentType[];
//# sourceMappingURL=registry.d.ts.map