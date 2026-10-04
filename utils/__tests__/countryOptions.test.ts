jest.mock('@/utils/featureFlags', () => ({
  isLuxembourgEnabled: jest.fn().mockReturnValue(false),
}));

import { getCountryFilterOptions, getCountryLabel } from '@/utils/countryOptions';
import { isLuxembourgEnabled } from '@/utils/featureFlags';

const mockIsLuxembourgEnabled = isLuxembourgEnabled as jest.MockedFunction<
  typeof isLuxembourgEnabled
>;

describe('countryOptions', () => {
  beforeEach(() => {
    mockIsLuxembourgEnabled.mockReturnValue(false);
  });

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
    it('lists Belgium and the Netherlands in order while Luxembourg is off', () => {
      expect(getCountryFilterOptions('fr')).toEqual([
        { value: 'belgium', label: 'Belgique' },
        { value: 'netherlands', label: 'Pays-Bas' },
      ]);
    });

    it('adds Luxembourg once it is enabled', () => {
      mockIsLuxembourgEnabled.mockReturnValue(true);

      expect(getCountryFilterOptions('nl')).toEqual([
        { value: 'belgium', label: 'België' },
        { value: 'netherlands', label: 'Nederland' },
        { value: 'luxembourg', label: 'Luxemburg' },
      ]);
    });
  });
});
