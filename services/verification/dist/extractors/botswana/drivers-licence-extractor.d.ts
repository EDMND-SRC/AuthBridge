/**
 * Botswana Driver's Licence Extractor
 *
 * Field patterns based on actual Botswana Driving Licence images - January 2026
 */
import { TextractBlock } from '../../types/ocr';
import { DocumentExtractor, ExtractionResult, SupportedCountry, DocumentType } from '../types';
import { BotswanaDriversLicenceFields } from './types';
export declare class BotswanaDriversLicenceExtractor implements DocumentExtractor<BotswanaDriversLicenceFields> {
    readonly country: SupportedCountry;
    readonly documentType: DocumentType;
    readonly requiredFields: string[];
    extract(blocks: TextractBlock[]): ExtractionResult<BotswanaDriversLicenceFields>;
    validate(fields: BotswanaDriversLicenceFields): {
        valid: boolean;
        errors: string[];
    };
    private extractName;
    private extractLabeledFields;
    private findBlockConfidence;
    private calculateOverallConfidence;
    private parseMonthYear;
}
//# sourceMappingURL=drivers-licence-extractor.d.ts.map