/**
 * Botswana Document Extractors
 *
 * Supported documents:
 * - Omang (National Identity Card)
 * - Driver's Licence
 * - Passport
 */

export { BotswanaOmangExtractor } from './omang-extractor';
export { BotswanaDriversLicenceExtractor } from './drivers-licence-extractor';
export { BotswanaPassportExtractor } from './passport-extractor';

// Re-export Botswana-specific types
export type {
  BotswanaOmangFields,
  BotswanaDriversLicenceFields,
  BotswanaPassportFields,
} from './types';
