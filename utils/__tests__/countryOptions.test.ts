import {
  getCountryFilterOptions,
  getCountryLabel,
  getSelectableCountries,
} from '@/utils/countryOptions';

describe('countryOptions', () => {
  describe('getCountryLabel', () => {
    it('localizes known countries, case-insensitively', () => {
      expect(getCountryLabel('belgium', 'nl')).toBe('België');
      expect(getCountryLabel('Netherlands', 'fr')).toBe('Pays-Bas');
    });

    it('names a stored French event in every language, gate or not', () => {
      expect(getCountryLabel('france', 'nl')).toBe('Frankrijk');
      expect(getCountryLabel('France', 'en')).toBe('France');
    });

    it('falls back to English, then the raw value', () => {
      expect(getCountryLabel('belgium', 'de')).toBe('Belgium');
      expect(getCountryLabel('atlantis', 'fr')).toBe('atlantis');
    });
  });

  describe('getCountryFilterOptions', () => {
    it('lists Belgium, the Netherlands and Luxembourg in order while France is off', () => {
      expect(getCountryFilterOptions('nl', { franceEnabled: false })).toEqual([
        { value: 'belgium', label: 'België' },
        { value: 'netherlands', label: 'Nederland' },
        { value: 'luxembourg', label: 'Luxemburg' },
      ]);
    });

    it('adds France last once the backend serves it', () => {
      expect(getCountryFilterOptions('nl', { franceEnabled: true })).toEqual([
        { value: 'belgium', label: 'België' },
        { value: 'netherlands', label: 'Nederland' },
        { value: 'luxembourg', label: 'Luxemburg' },
        { value: 'france', label: 'Frankrijk' },
      ]);
    });
  });

  describe('getSelectableCountries', () => {
    it('hides France until the backend serves it', () => {
      const values = (franceEnabled: boolean) =>
        getSelectableCountries({ franceEnabled }).map((country) => country.value);
      expect(values(false)).toEqual(['belgium', 'netherlands', 'luxembourg']);
      expect(values(true)).toEqual(['belgium', 'netherlands', 'luxembourg', 'france']);
    });
  });
});
