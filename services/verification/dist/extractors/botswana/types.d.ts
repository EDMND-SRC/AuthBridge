/**
 * Botswana-specific document field types
 */
import { NationalIdFields, DriversLicenceFields, PassportFields } from '../types';
/**
 * Botswana Omang (National Identity Card) fields
 * Based on actual Omang card layout - January 2026
 */
export interface BotswanaOmangFields extends NationalIdFields {
    surname: string;
    forenames: string;
    idNumber: string;
    dateOfBirth: string;
    placeOfBirth?: string;
    nationality?: string;
    sex: 'M' | 'F';
    colourOfEyes?: string;
    dateOfExpiry: string;
    placeOfApplication?: string;
    plot?: string;
    locality?: string;
    district?: string;
}
/**
 * Botswana Driver's Licence fields
 * Based on actual Botswana Driving Licence layout - January 2026
 */
export interface BotswanaDriversLicenceFields extends DriversLicenceFields {
    surname: string;
    forenames: string;
    omangNumber: string;
    gender: 'M' | 'F';
    dateOfBirth: string;
    licenceNumber: string;
    licenceClass: string;
    validityStart: string;
    validityEnd: string;
    firstIssue?: string;
    driverRestriction?: string;
    vehicleRestriction?: string;
    endorsement?: string;
}
/**
 * Botswana Passport fields
 * Based on actual Botswana passport layout - January 2026
 * Follows ICAO 9303 standard with bilingual labels (English/French)
 */
export interface BotswanaPassportFields extends PassportFields {
    type: string;
    countryCode: string;
    surname: string;
    forenames: string;
    nationality: string;
    dateOfBirth: string;
    sex: 'M' | 'F';
    placeOfBirth: string;
    passportNumber: string;
    personalNumber: string;
    dateOfIssue: string;
    dateOfExpiry: string;
    issuingAuthority: string;
    mrz: {
        line1: string;
        line2: string;
        valid: boolean;
        checkDigitsValid: boolean;
    };
}
/**
 * Driver restriction code meanings
 */
export declare const DRIVER_RESTRICTION_CODES: Record<string, string>;
/**
 * Vehicle restriction code meanings
 */
export declare const VEHICLE_RESTRICTION_CODES: Record<string, string>;
/**
 * Licence class descriptions
 */
export declare const LICENCE_CLASS_DESCRIPTIONS: Record<string, string>;
//# sourceMappingURL=types.d.ts.map