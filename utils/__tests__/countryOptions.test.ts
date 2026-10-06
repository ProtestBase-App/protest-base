import { getCountryFilterOptions, getCountryLabel } from '@/utils/countryOptions';

describe('countryOptions', () => {
  beforeEach(() => {});

  describe('getCountryLabel', () => {
    it('localizes known countries, case-insensitively', () => {
      expect(getCountryLabel('belgium', 'nl')).toBe('België');
      expect(getCountryLabel('Netherlands', 'fr')).toBe('Pays-Bas');
    });

    it('falls back to English, then the raw value', () => {
      expect(getCountryLabel('belgium', 'de')).toBe('Belgium');
      expect(getCountryLabel('atlantis', 'fr')).toBe('atlantis');
    });
  });

  describe('getCountryFilterOptions', () => {
    it('lists every country in order, localized', () => {
      expect(getCountryFilterOptions('nl')).toEqual([
        { value: 'belgium', label: 'België' },
        { value: 'netherlands', label: 'Nederland' },
        { value: 'luxembourg', label: 'Luxemburg' },
      ]);
    });
  });
});
