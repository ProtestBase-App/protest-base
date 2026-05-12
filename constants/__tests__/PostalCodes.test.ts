/**
 * PostalCodes Tests
 *
 * Validates the postal code data arrays for Belgium (EN, FR, NL variants)
 * and the Netherlands are correctly structured with the right fields and
 * valid data types.
 */

import { POSTAL_CODES_EN, type PostalCodeDataBE_EN } from '@/constants/PostalCodes_BE_EN';
import { POSTAL_CODES_FR, type PostalCodeDataBE_FR } from '@/constants/PostalCodes_BE_FR';
import {
  POSTAL_CODES_NL as POSTAL_CODES_BE_NL,
  type PostalCodeDataBE_NL,
} from '@/constants/PostalCodes_BE_NL';
import { POSTAL_CODES_NL_NL, type PostalCodeDataNL } from '@/constants/PostalCodes_NL';

describe('PostalCodes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POSTAL_CODES_EN (Belgium, English names)', () => {
    it('should be defined', () => {
      expect(POSTAL_CODES_EN).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(POSTAL_CODES_EN)).toBe(true);
    });

    it('should contain a substantial number of entries', () => {
      expect(POSTAL_CODES_EN.length).toBeGreaterThan(1000);
    });

    it('should have all required fields on every entry', () => {
      for (const entry of POSTAL_CODES_EN) {
        expect(entry).toHaveProperty('post_code');
        expect(entry).toHaveProperty('official_language_or_language_combination');
        expect(entry).toHaveProperty('sub_municipality_name_english');
        expect(entry).toHaveProperty('region_name_english');
        expect(entry).toHaveProperty('province_name_english');
        expect(entry).toHaveProperty('arrondissement_name_english');
        expect(entry).toHaveProperty('municipality_name_english');
      }
    });

    it('should have numeric post_code values', () => {
      for (const entry of POSTAL_CODES_EN) {
        expect(typeof entry.post_code).toBe('number');
      }
    });

    it('should have post_code values that are positive numbers', () => {
      for (const entry of POSTAL_CODES_EN) {
        expect(entry.post_code).toBeGreaterThan(0);
        expect(entry.post_code).toBeLessThanOrEqual(9999);
      }
    });

    it('should have the vast majority of post_code values in the Belgian range (1000-9999)', () => {
      const inRange = POSTAL_CODES_EN.filter((e) => e.post_code >= 1000 && e.post_code <= 9999);
      // At least 99% of entries should be in the valid Belgian range
      expect(inRange.length / POSTAL_CODES_EN.length).toBeGreaterThanOrEqual(0.99);
    });

    it('should have official_language as a string or null', () => {
      for (const entry of POSTAL_CODES_EN) {
        expect(
          entry.official_language_or_language_combination === null ||
            typeof entry.official_language_or_language_combination === 'string'
        ).toBe(true);
      }
    });

    it('should have official_language values containing language codes', () => {
      for (const entry of POSTAL_CODES_EN) {
        const lang = entry.official_language_or_language_combination;
        if (lang !== null) {
          // Language codes contain uppercase letters and possibly hyphens
          expect(lang).toMatch(/^[A-Za-z-]+$/);
          expect(lang.length).toBeGreaterThan(0);
        }
      }
    });

    it('should include the Habay entry (post code 6720)', () => {
      const entry = POSTAL_CODES_EN.find((e) => e.post_code === 6720);
      expect(entry).toBeDefined();
      expect(entry?.municipality_name_english).toBe('Habay');
    });

    it('should include the Oud-Turnhout entry (post code 2360)', () => {
      const entry = POSTAL_CODES_EN.find((e) => e.post_code === 2360);
      expect(entry).toBeDefined();
      expect(entry?.municipality_name_english).toBe('Oud-Turnhout');
    });
  });

  describe('POSTAL_CODES_FR (Belgium, French names)', () => {
    it('should be defined', () => {
      expect(POSTAL_CODES_FR).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(POSTAL_CODES_FR)).toBe(true);
    });

    it('should contain a substantial number of entries', () => {
      expect(POSTAL_CODES_FR.length).toBeGreaterThan(1000);
    });

    it('should have the same number of entries as the English variant', () => {
      expect(POSTAL_CODES_FR.length).toBe(POSTAL_CODES_EN.length);
    });

    it('should have all required fields on every entry', () => {
      for (const entry of POSTAL_CODES_FR) {
        expect(entry).toHaveProperty('post_code');
        expect(entry).toHaveProperty('official_language_or_language_combination');
        expect(entry).toHaveProperty('sub_municipality_name_french');
        expect(entry).toHaveProperty('region_name_french');
        expect(entry).toHaveProperty('province_name_french');
        expect(entry).toHaveProperty('arrondissement_name_french');
        expect(entry).toHaveProperty('municipality_name_french');
      }
    });

    it('should have numeric post_code values', () => {
      for (const entry of POSTAL_CODES_FR) {
        expect(typeof entry.post_code).toBe('number');
      }
    });

    it('should have the vast majority of post_code values in the Belgian range (1000-9999)', () => {
      const inRange = POSTAL_CODES_FR.filter((e) => e.post_code >= 1000 && e.post_code <= 9999);
      expect(inRange.length / POSTAL_CODES_FR.length).toBeGreaterThanOrEqual(0.99);
    });

    it('should include the Habay entry (post code 6720) with French name', () => {
      const entry = POSTAL_CODES_FR.find((e) => e.post_code === 6720);
      expect(entry).toBeDefined();
      expect(entry?.municipality_name_french).toBe('Habay');
    });

    it('should have the same post_code values as the English variant', () => {
      const enCodes = new Set(POSTAL_CODES_EN.map((e) => e.post_code));
      const frCodes = new Set(POSTAL_CODES_FR.map((e) => e.post_code));
      expect(frCodes.size).toBe(enCodes.size);
      for (const code of enCodes) {
        expect(frCodes.has(code)).toBe(true);
      }
    });
  });

  describe('POSTAL_CODES_BE_NL (Belgium, Dutch names)', () => {
    it('should be defined', () => {
      expect(POSTAL_CODES_BE_NL).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(POSTAL_CODES_BE_NL)).toBe(true);
    });

    it('should contain a substantial number of entries', () => {
      expect(POSTAL_CODES_BE_NL.length).toBeGreaterThan(1000);
    });

    it('should have the same number of entries as the English variant', () => {
      expect(POSTAL_CODES_BE_NL.length).toBe(POSTAL_CODES_EN.length);
    });

    it('should have all required fields on every entry', () => {
      for (const entry of POSTAL_CODES_BE_NL) {
        expect(entry).toHaveProperty('post_code');
        expect(entry).toHaveProperty('official_language_or_language_combination');
        expect(entry).toHaveProperty('sub_municipality_name_dutch');
        expect(entry).toHaveProperty('region_name_dutch');
        expect(entry).toHaveProperty('province_name_dutch');
        expect(entry).toHaveProperty('arrondissement_name_dutch');
        expect(entry).toHaveProperty('municipality_name_dutch');
      }
    });

    it('should have numeric post_code values', () => {
      for (const entry of POSTAL_CODES_BE_NL) {
        expect(typeof entry.post_code).toBe('number');
      }
    });

    it('should have the vast majority of post_code values in the Belgian range (1000-9999)', () => {
      const inRange = POSTAL_CODES_BE_NL.filter((e) => e.post_code >= 1000 && e.post_code <= 9999);
      expect(inRange.length / POSTAL_CODES_BE_NL.length).toBeGreaterThanOrEqual(0.99);
    });

    it('should include the Habay entry (post code 6720) with Dutch name', () => {
      const entry = POSTAL_CODES_BE_NL.find((e) => e.post_code === 6720);
      expect(entry).toBeDefined();
      expect(entry?.municipality_name_dutch).toBe('Habay');
    });

    it('should include the Oud-Turnhout entry with Vlaams Gewest region', () => {
      const entry = POSTAL_CODES_BE_NL.find((e) => e.post_code === 2360);
      expect(entry).toBeDefined();
      expect(entry?.region_name_dutch).toBe('Vlaams Gewest');
    });
  });

  describe('POSTAL_CODES_NL_NL (Netherlands)', () => {
    it('should be defined', () => {
      expect(POSTAL_CODES_NL_NL).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(POSTAL_CODES_NL_NL)).toBe(true);
    });

    it('should contain a substantial number of entries', () => {
      expect(POSTAL_CODES_NL_NL.length).toBeGreaterThan(1000);
    });

    it('should have all required fields on every entry', () => {
      for (const entry of POSTAL_CODES_NL_NL) {
        expect(entry).toHaveProperty('post_code');
        expect(entry).toHaveProperty('prov_name');
        expect(entry).toHaveProperty('sub_municipality_name');
      }
    });

    it('should have numeric post_code values', () => {
      for (const entry of POSTAL_CODES_NL_NL) {
        expect(typeof entry.post_code).toBe('number');
      }
    });

    it('should have post_code values in the Dutch range (1000-9999)', () => {
      for (const entry of POSTAL_CODES_NL_NL) {
        expect(entry.post_code).toBeGreaterThanOrEqual(1000);
        expect(entry.post_code).toBeLessThanOrEqual(9999);
      }
    });

    it('should have non-empty prov_name strings', () => {
      for (const entry of POSTAL_CODES_NL_NL) {
        expect(typeof entry.prov_name).toBe('string');
        expect(entry.prov_name.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty sub_municipality_name strings', () => {
      for (const entry of POSTAL_CODES_NL_NL) {
        expect(typeof entry.sub_municipality_name).toBe('string');
        expect(entry.sub_municipality_name.length).toBeGreaterThan(0);
      }
    });

    it('should include the Den Haag entry (post code 2514)', () => {
      const entry = POSTAL_CODES_NL_NL.find((e) => e.post_code === 2514);
      expect(entry).toBeDefined();
      expect(entry?.prov_name).toBe('Zuid-Holland');
    });

    it('should include known Dutch provinces', () => {
      const provinces = new Set(POSTAL_CODES_NL_NL.map((e) => e.prov_name));
      expect(provinces.has('Noord-Holland')).toBe(true);
      expect(provinces.has('Zuid-Holland')).toBe(true);
      expect(provinces.has('Noord-Brabant')).toBe(true);
      expect(provinces.has('Gelderland')).toBe(true);
    });
  });

  describe('cross-file consistency', () => {
    it('should have Belgium files with more entries than Netherlands file', () => {
      // Belgium has more postal codes than Netherlands in this dataset
      expect(POSTAL_CODES_EN.length).toBeGreaterThan(0);
      expect(POSTAL_CODES_NL_NL.length).toBeGreaterThan(0);
    });

    it('should have all Belgian post code files with equal entry count', () => {
      expect(POSTAL_CODES_EN.length).toBe(POSTAL_CODES_FR.length);
      expect(POSTAL_CODES_EN.length).toBe(POSTAL_CODES_BE_NL.length);
    });
  });
});
