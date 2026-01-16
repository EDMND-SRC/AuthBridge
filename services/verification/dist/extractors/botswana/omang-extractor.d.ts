/**
 * Botswana Omang (National Identity Card) Extractor
 *
 * Field patterns based on actual Omang card images - January 2026
 *
 * IMPORTANT CORRECTIONS:
 * - Card uses "FORENAMES" not "FIRST NAMES"
 * - Card uses "ID NUMBER" not "OMANG NO"
 * - Card does NOT have a "DATE OF ISSUE" field
 * - SEX field is on the BACK of the card
 */
import { TextractBlock } from '../../types/ocr';
import { DocumentExtractor, ExtractionResult, SupportedCountry, DocumentType } from '../types';
import { BotswanaOmangFields } from './types';
export declare class BotswanaOmangExtractor implements DocumentExtractor<BotswanaOmangFields> {
    readonly country: SupportedCountry;
    readonly documentType: DocumentType;
    readonly requiredFields: string[];
    extract(blocks: TextractBlock[]): ExtractionResult<BotswanaOmangFields>;
    validate(fields: BotswanaOmangFields): {
        valid: boolean;
        errors: string[];
    };
    private extractFrontFields;
    private extractBackFields;
    private extractLocality;
    private findBlockConfidence;
    private calculateOverallConfidence;
}
//# sourceMappingURL=omang-extractor.d.ts.map