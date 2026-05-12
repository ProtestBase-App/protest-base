/**
 * Countries Tests
 *
 * Validates the countries constant is correctly structured with
 * multilingual labels and unique values for each country.
 */

import { countries } from '@/constants/Countries';

describe('Countries', () => {
  afterEach(() => jest.clearAllMocks());

  describe('countries array', () => {
    it('should be defined', () => {
      expect(countries).toBeDefined();
    });

    it('should be an array', () => {
      expect(Array.isArray(countries)).toBe(true);
    });

    it('should contain 2 countries', () => {
      expect(countries).toHaveLength(2);
    });
  });

  describe('Belgium entry', () => {
    const belgium = countries.find((c) => c.value === 'belgium');

    it('should exist', () => {
      expect(belgium).toBeDefined();
    });

    it('should have value "belgium"', () => {
      expect(belgium?.value).toBe('belgium');
    });

    it('should have English label "Belgium"', () => {
      expect(belgium?.label.en).toBe('Belgium');
    });

    it('should have French label "Belgique"', () => {
      expect(belgium?.label.fr).toBe('Belgique');
    });

    it('should have Dutch label "België"', () => {
      expect(belgium?.label.nl).toBe('België');
    });
  });

  describe('Netherlands entry', () => {
    const netherlands = countries.find((c) => c.value === 'netherlands');

    it('should exist', () => {
      expect(netherlands).toBeDefined();
    });

    it('should have value "netherlands"', () => {
      expect(netherlands?.value).toBe('netherlands');
    });

    it('should have English label "Netherlands"', () => {
      expect(netherlands?.label.en).toBe('Netherlands');
    });

    it('should have French label "Pays-Bas"', () => {
      expect(netherlands?.label.fr).toBe('Pays-Bas');
    });

    it('should have Dutch label "Nederland"', () => {
      expect(netherlands?.label.nl).toBe('Nederland');
    });
  });

  describe('data integrity', () => {
    it('should have unique values for each country', () => {
      const values = countries.map((c) => c.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have label object with en, fr, nl for every country', () => {
      for (const country of countries) {
        expect(country.label).toHaveProperty('en');
        expect(country.label).toHaveProperty('fr');
        expect(country.label).toHaveProperty('nl');
      }
    });

    it('should have non-empty string labels for every language and country', () => {
      for (const country of countries) {
        expect(typeof country.label.en).toBe('string');
        expect(country.label.en.length).toBeGreaterThan(0);
        expect(typeof country.label.fr).toBe('string');
        expect(country.label.fr.length).toBeGreaterThan(0);
        expect(typeof country.label.nl).toBe('string');
        expect(country.label.nl.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty string values for every country', () => {
      for (const country of countries) {
        expect(typeof country.value).toBe('string');
        expect(country.value.length).toBeGreaterThan(0);
      }
    });
  });
});
