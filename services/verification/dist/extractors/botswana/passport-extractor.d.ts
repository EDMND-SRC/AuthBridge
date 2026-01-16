/**
 * Botswana Passport Extractor
 *
 * Field patterns based on actual Botswana passport images - January 2026
 * Follows ICAO 9303 TD3 standard (Machine Readable Passport)
 *
 * Passport layout (bilingual English/French):
 * - Type/Type: P
 * - Code/Code: BWA
 * - Passport No./N° de passeport: BN0221546
 * - Surname/Nom: MOEPSWA
 * - Given names/Prénoms: MOTLOTLEGI EDMOND POLOKO
 * - Nationality/Nationalité: MOTSWANA
 * - Date of birth/Date de naissance: 25 AUG/AOUT 94
 * - Sex/Sexe: M
 * - Place of birth/Lieu de naissance: FRANCISTOWN
 * - Personal No./N° personnel: 059016012 (Omang number)
 * - Date of issue/Date de délivrance: 05 JAN/JAN 12
 * - Date of expiry/Date d'expiration: 04 JAN/JAN 22
 * - Authority/Autorité: MLHA - DIC
 *
 * MRZ (2 lines, 44 characters each):
 * Line 1: P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<
 * Line 2: BN02215460BWA9408252M2201041059016012<<<<84
 */
import { TextractBlock } from '../../types/ocr';
import { DocumentExtractor, ExtractionResult, SupportedCountry, DocumentType } from '../types';
import { BotswanaPassportFields } from './types';
export declare class BotswanaPassportExtractor implements DocumentExtractor<BotswanaPassportFields> {
    readonly country: SupportedCountry;
    readonly documentType: DocumentType;
    readonly requiredFields: string[];
    extract(blocks: TextractBlock[]): ExtractionResult<BotswanaPassportFields>;
    validate(fields: BotswanaPassportFields): {
        valid: boolean;
        errors: string[];
    };
    private extractVisualZoneFields;
    private extractMRZ;
    private reconcileMRZWithVisualZone;
    private validateCheckDigit;
    private formatMRZDate;
    private parseBilingualDate;
    private findBlockConfidence;
    private calculateOverallConfidence;
}
//# sourceMappingURL=passport-extractor.d.ts.map