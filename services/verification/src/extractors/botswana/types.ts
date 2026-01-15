/**
 * Botswana-specific document field types
 */

import { NationalIdFields, DriversLicenceFields, PassportFields } from '../types';

/**
 * Botswana Omang (National Identity Card) fields
 * Based on actual Omang card layout - January 2026
 */
export interface BotswanaOmangFields extends NationalIdFields {
  // Front side
  surname: string;
  forenames: string;
  idNumber: string; // 9-digit Omang number
  dateOfBirth: string;
  placeOfBirth?: string;

  // Back side
  nationality?: string; // MOTSWANA
  sex: 'M' | 'F';
  colourOfEyes?: string;
  dateOfExpiry: string;
  placeOfApplication?: string;

  // Address (optional)
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
  omangNumber: string; // Links to Omang (ID: Omang field)
  gender: 'M' | 'F';
  dateOfBirth: string;

  licenceNumber: string;
  licenceClass: string; // A, A1, B, C1, C, EB, EC1, EC
  validityStart: string; // e.g., "Oct 2024"
  validityEnd: string; // e.g., "Oct 2029"
  firstIssue?: string;

  // Restriction codes
  driverRestriction?: string; // 0=None, 1=Glasses, 2=Artificial limb
  vehicleRestriction?: string; // 0=None, 1=Auto, 2=Electric, 3=Disabled, 4=Bus>16000kg
  endorsement?: string; // Yes/No
}

/**
 * Botswana Passport fields
 * Based on actual Botswana passport layout - January 2026
 * Follows ICAO 9303 standard with bilingual labels (English/French)
 */
export interface BotswanaPassportFields extends PassportFields {
  // Header
  type: string; // P
  countryCode: string; // BWA

  // Personal info
  surname: string;
  forenames: string; // Given names/Prénoms
  nationality: string; // MOTSWANA
  dateOfBirth: string; // Format: DD MMM/MMM YY (e.g., "25 AUG/AOUT 94")
  sex: 'M' | 'F';
  placeOfBirth: string;

  // Document info
  passportNumber: string; // e.g., BN0221546
  personalNumber: string; // Omang number - links to national ID
  dateOfIssue: string;
  dateOfExpiry: string;
  issuingAuthority: string; // e.g., "MLHA - DIC"

  // MRZ (Machine Readable Zone) - 2 lines for TD3 passport
  mrz: {
    line1: string; // P<BWAMOEPSWA<<MOTLOTLEGI<EDMOND<POLOKO<<<<<<
    line2: string; // BN02215460BWA9408252M2201041059016012<<<<84
    valid: boolean;
    checkDigitsValid: boolean;
  };
}

/**
 * Driver restriction code meanings
 */
export const DRIVER_RESTRICTION_CODES: Record<string, string> = {
  '0': 'None',
  '1': 'Glasses/contact lenses required',
  '2': 'Artificial limb',
};

/**
 * Vehicle restriction code meanings
 */
export const VEHICLE_RESTRICTION_CODES: Record<string, string> = {
  '0': 'None',
  '1': 'Automatic transmission only',
  '2': 'Electrically powered vehicles only',
  '3': 'Physically disabled adaptations',
  '4': 'Bus >16,000kg (GVM) permitted',
};

/**
 * Licence class descriptions
 */
export const LICENCE_CLASS_DESCRIPTIONS: Record<string, string> = {
  'A': 'Motorcycle >125cc',
  'A1': 'Motorcycle ≤125cc',
  'B': 'Light vehicle ≤3500kg, GVM ≤750kg',
  'C1': 'Medium vehicle, GVM ≤16,000kg',
  'C': 'Heavy vehicle, GVM >16,000kg',
  'EB': 'Light vehicle with trailer',
  'EC1': 'Medium vehicle with trailer',
  'EC': 'Heavy vehicle with trailer',
};
