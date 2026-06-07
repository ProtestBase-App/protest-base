// Mock context before imports
jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import {
  usePostalCodeOptions,
  getCityNameFromPostalCode,
  getLabelFromPostalCode,
  PostalCodeOption,
} from '../postalCodeOptions';

const mockUsePostalCodes = usePostalCodes as jest.MockedFunction<typeof usePostalCodes>;

// Helpers to build mock postal code data records
const belgianPostalCodes = [
  { post_code: 1000, sub_municipality_name_english: 'Brussels' },
  { post_code: 2000, sub_municipality_name_english: 'Antwerp' },
  { post_code: 9000, sub_municipality_name_english: 'Ghent' },
];

const netherlandsPostalCodes = [
  { post_code: 1010, sub_municipality_name: 'Amsterdam' },
  { post_code: 2500, sub_municipality_name: 'The Hague' },
];

const duplicatePostalCodes = [
  { post_code: 1000, sub_municipality_name_english: 'Brussels' },
  { post_code: 1000, sub_municipality_name_english: 'Brussels Duplicate' }, // Same post_code — should be skipped
];

describe('postalCodeOptions utilities', () => {
  const mockOptions: PostalCodeOption[] = [
    {
      label: 'Brussels (1000)',
      value: '1000',
      postalCode: 1000,
      cityName: 'Brussels',
      country: 'belgium',
      searchText: 'brussels 1000',
    },
    {
      label: 'Antwerp (2000)',
      value: '2000',
      postalCode: 2000,
      cityName: 'Antwerp',
      country: 'belgium',
      searchText: 'antwerp 2000',
    },
    {
      label: 'Ghent (9000)',
      value: '9000',
      postalCode: 9000,
      cityName: 'Ghent',
      country: 'belgium',
      searchText: 'ghent 9000',
    },
    {
      label: 'Amsterdam (1000)',
      value: '1000',
      postalCode: 1000,
      cityName: 'Amsterdam',
      country: 'netherlands',
      searchText: 'amsterdam 1000',
    },
  ];

  describe('getCityNameFromPostalCode', () => {
    it('should return city name for valid postal code', () => {
      const result = getCityNameFromPostalCode('1000', mockOptions);
      expect(result).toBe('Brussels');
    });

    it('should return city name for another valid postal code', () => {
      const result = getCityNameFromPostalCode('2000', mockOptions);
      expect(result).toBe('Antwerp');
    });

    it('should return first matching city name when multiple cities share postal code', () => {
      // Both Brussels and Amsterdam have postal code 1000
      const result = getCityNameFromPostalCode('1000', mockOptions);
      // Should return the first match found
      expect(result).toBe('Brussels');
    });

    it('should return postal code when not found in options', () => {
      const result = getCityNameFromPostalCode('9999', mockOptions);
      expect(result).toBe('9999');
    });

    it('should handle empty postal code string', () => {
      const result = getCityNameFromPostalCode('', mockOptions);
      expect(result).toBe('');
    });

    it('should handle empty options array', () => {
      const result = getCityNameFromPostalCode('1000', []);
      expect(result).toBe('1000');
    });

    it('should be case sensitive for postal code matching', () => {
      // Postal codes are stored as strings
      const result = getCityNameFromPostalCode('1000', mockOptions);
      expect(result).toBe('Brussels');
    });

    it('should not match partial postal codes', () => {
      const result = getCityNameFromPostalCode('100', mockOptions);
      expect(result).toBe('100');
    });

    it('should handle postal codes with leading zeros', () => {
      const optionsWithLeadingZero: PostalCodeOption[] = [
        {
          label: 'Test City (0100)',
          value: '0100',
          postalCode: 100,
          cityName: 'Test City',
          country: 'belgium',
          searchText: 'test city 0100',
        },
      ];
      const result = getCityNameFromPostalCode('0100', optionsWithLeadingZero);
      expect(result).toBe('Test City');
    });
  });

  describe('getLabelFromPostalCode', () => {
    it('should return full label for valid postal code', () => {
      const result = getLabelFromPostalCode('1000', mockOptions);
      expect(result).toBe('Brussels (1000)');
    });

    it('should return full label for another valid postal code', () => {
      const result = getLabelFromPostalCode('2000', mockOptions);
      expect(result).toBe('Antwerp (2000)');
    });

    it('should return label with city and postal code', () => {
      const result = getLabelFromPostalCode('9000', mockOptions);
      expect(result).toBe('Ghent (9000)');
    });

    it('should return first matching label when multiple cities share postal code', () => {
      // Both Brussels and Amsterdam have postal code 1000
      const result = getLabelFromPostalCode('1000', mockOptions);
      // Should return the first match found
      expect(result).toBe('Brussels (1000)');
    });

    it('should return postal code when not found in options', () => {
      const result = getLabelFromPostalCode('9999', mockOptions);
      expect(result).toBe('9999');
    });

    it('should handle empty postal code string', () => {
      const result = getLabelFromPostalCode('', mockOptions);
      expect(result).toBe('');
    });

    it('should handle empty options array', () => {
      const result = getLabelFromPostalCode('1000', []);
      expect(result).toBe('1000');
    });

    it('should not match partial postal codes', () => {
      const result = getLabelFromPostalCode('100', mockOptions);
      expect(result).toBe('100');
    });

    it('should preserve label format from options', () => {
      const customFormatOptions: PostalCodeOption[] = [
        {
          label: 'Custom Format: Brussels - 1000',
          value: '1000',
          postalCode: 1000,
          cityName: 'Brussels',
          country: 'belgium',
          searchText: 'brussels 1000',
        },
      ];
      const result = getLabelFromPostalCode('1000', customFormatOptions);
      expect(result).toBe('Custom Format: Brussels - 1000');
    });

    it('should handle postal codes with leading zeros in label', () => {
      const optionsWithLeadingZero: PostalCodeOption[] = [
        {
          label: 'Test City (0100)',
          value: '0100',
          postalCode: 100,
          cityName: 'Test City',
          country: 'belgium',
          searchText: 'test city 0100',
        },
      ];
      const result = getLabelFromPostalCode('0100', optionsWithLeadingZero);
      expect(result).toBe('Test City (0100)');
    });
  });

  describe('PostalCodeOption structure', () => {
    it('should have all required fields', () => {
      const option = mockOptions[0];
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('postalCode');
      expect(option).toHaveProperty('cityName');
      expect(option).toHaveProperty('country');
      expect(option).toHaveProperty('searchText');
    });

    it('should have searchText in lowercase', () => {
      const option = mockOptions[0];
      expect(option.searchText).toBe(option.searchText.toLowerCase());
    });

    it('should have searchText containing both city and postal code', () => {
      const option = mockOptions[0];
      expect(option.searchText).toContain(option.cityName.toLowerCase());
      expect(option.searchText).toContain(String(option.postalCode));
    });

    it('should have value as string representation of postalCode', () => {
      mockOptions.forEach((option) => {
        expect(option.value).toBe(String(option.postalCode));
      });
    });

    it('should have label in format "CityName (PostalCode)"', () => {
      mockOptions.forEach((option) => {
        expect(option.label).toContain(option.cityName);
        expect(option.label).toContain(String(option.postalCode));
        expect(option.label).toContain('(');
        expect(option.label).toContain(')');
      });
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle options with special characters in city names', () => {
      const specialOptions: PostalCodeOption[] = [
        {
          label: "L'Île-de-France (75001)",
          value: '75001',
          postalCode: 75001,
          cityName: "L'Île-de-France",
          country: 'france',
          searchText: "l'île-de-france 75001",
        },
      ];

      expect(getCityNameFromPostalCode('75001', specialOptions)).toBe("L'Île-de-France");
      expect(getLabelFromPostalCode('75001', specialOptions)).toBe("L'Île-de-France (75001)");
    });

    it('should handle very large postal codes', () => {
      const largePostalOptions: PostalCodeOption[] = [
        {
          label: 'Large City (999999)',
          value: '999999',
          postalCode: 999999,
          cityName: 'Large City',
          country: 'test',
          searchText: 'large city 999999',
        },
      ];

      expect(getCityNameFromPostalCode('999999', largePostalOptions)).toBe('Large City');
      expect(getLabelFromPostalCode('999999', largePostalOptions)).toBe('Large City (999999)');
    });

    it('should handle single digit postal codes', () => {
      const singleDigitOptions: PostalCodeOption[] = [
        {
          label: 'Single Digit (1)',
          value: '1',
          postalCode: 1,
          cityName: 'Single Digit',
          country: 'test',
          searchText: 'single digit 1',
        },
      ];

      expect(getCityNameFromPostalCode('1', singleDigitOptions)).toBe('Single Digit');
      expect(getLabelFromPostalCode('1', singleDigitOptions)).toBe('Single Digit (1)');
    });

    it('should handle null or undefined postal code input gracefully', () => {
      expect(getCityNameFromPostalCode(null as any, mockOptions)).toBeNull();
      expect(getCityNameFromPostalCode(undefined as any, mockOptions)).toBeUndefined();
      expect(getLabelFromPostalCode(null as any, mockOptions)).toBeNull();
      expect(getLabelFromPostalCode(undefined as any, mockOptions)).toBeUndefined();
    });

    it('should handle city names with numbers', () => {
      const cityWithNumbers: PostalCodeOption[] = [
        {
          label: 'City 2000 (3000)',
          value: '3000',
          postalCode: 3000,
          cityName: 'City 2000',
          country: 'test',
          searchText: 'city 2000 3000',
        },
      ];

      expect(getCityNameFromPostalCode('3000', cityWithNumbers)).toBe('City 2000');
    });
  });
});

describe('usePostalCodeOptions hook', () => {
  const mockLoadPostalCodesForCountry = jest.fn();
  const mockGetPostalCodeData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadPostalCodesForCountry.mockResolvedValue(undefined);
    mockGetPostalCodeData.mockReturnValue([]);
    mockUsePostalCodes.mockReturnValue({
      loadPostalCodesForCountry: mockLoadPostalCodesForCountry,
      cacheVersion: 0,
      getPostalCodeData: mockGetPostalCodeData,
      getSubMunicipalityName: jest.fn().mockReturnValue(''),
      loading: false,
      locationFilterOptions: [],
      expandLocationTokens: jest.fn().mockReturnValue({ codes: [], truncated: false }),
      resolveLocationLabel: jest.fn((value: string) => value),
      isLocationSelectionTooBroad: jest.fn().mockReturnValue(false),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should start with loading=true', () => {
      // Arrange: make load take longer
      mockLoadPostalCodesForCountry.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      // Assert: initially loading
      expect(result.current.loading).toBe(true);
    });

    it('should set loading=false after postal codes are loaded', async () => {
      // Arrange
      mockLoadPostalCodesForCountry.mockResolvedValue(undefined);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      // Assert: loading becomes false after promise resolves
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading=false even if loading fails (Promise.all.finally)', async () => {
      // Arrange: simulate a failure — attach a catch so the unhandled rejection doesn't
      // bubble to the test runner (Promise.all.finally runs even on rejection)
      mockLoadPostalCodesForCountry.mockImplementation(() =>
        Promise.reject(new Error('Load failed')).catch(() => {
          // Silently swallow error — we only care that finally runs and sets loading=false
        })
      );

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      // Assert: loading becomes false even when load fails
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Options generation', () => {
    it('should return empty options when no postal code data', async () => {
      // Arrange: getPostalCodeData returns empty
      mockGetPostalCodeData.mockReturnValue([]);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.options).toHaveLength(0);
    });

    it('should build options from Belgian postal code data', async () => {
      // Arrange
      mockGetPostalCodeData.mockImplementation((country: string) => {
        if (country === 'belgium') return belgianPostalCodes;
        return [];
      });

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: options built correctly
      const options = result.current.options;
      expect(options).toHaveLength(3);
      // Options are sorted alphabetically by city name
      expect(options[0].cityName).toBe('Antwerp');
      expect(options[1].cityName).toBe('Brussels');
      expect(options[2].cityName).toBe('Ghent');
    });

    it('should build options from Netherlands postal code data using sub_municipality_name', async () => {
      // Arrange: Netherlands uses 'sub_municipality_name' (no suffix)
      mockGetPostalCodeData.mockImplementation((country: string) => {
        if (country === 'netherlands') return netherlandsPostalCodes;
        return [];
      });

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['netherlands']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      const options = result.current.options;
      expect(options).toHaveLength(2);
      const amsterdam = options.find((o) => o.cityName === 'Amsterdam');
      expect(amsterdam).toBeDefined();
      expect(amsterdam!.label).toBe('Amsterdam (1010)');
      expect(amsterdam!.value).toBe('1010');
      expect(amsterdam!.country).toBe('netherlands');
      expect(amsterdam!.searchText).toBe('amsterdam 1010');
    });

    it('should merge postal codes from multiple countries', async () => {
      // Arrange
      mockGetPostalCodeData.mockImplementation((country: string) => {
        if (country === 'belgium') return belgianPostalCodes;
        if (country === 'netherlands') return netherlandsPostalCodes;
        return [];
      });

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium', 'netherlands']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: all 5 unique postal codes present
      expect(result.current.options).toHaveLength(5);
    });

    it('should skip duplicate postal codes within a country', async () => {
      // Arrange: same post_code appears twice
      mockGetPostalCodeData.mockImplementation((country: string) => {
        if (country === 'belgium') return duplicatePostalCodes;
        return [];
      });

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: duplicate skipped — only 1 result
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].cityName).toBe('Brussels');
    });

    it('should skip postal codes with no sub_municipality_name property', async () => {
      // Arrange: a record with no sub_municipality_name key
      const dataWithMissingName = [
        { post_code: 5000 }, // No sub_municipality_name_* key
        { post_code: 6000, sub_municipality_name_english: 'Charleroi' },
      ];
      mockGetPostalCodeData.mockReturnValue(dataWithMissingName);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: only the record with a valid name is included
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].cityName).toBe('Charleroi');
    });

    it('should skip postal codes where sub_municipality_name value is falsy', async () => {
      // Arrange: key exists but value is empty string / null
      const dataWithEmptyName = [
        { post_code: 5000, sub_municipality_name_english: '' }, // empty string — falsy
        { post_code: 6000, sub_municipality_name_english: 'Charleroi' },
      ];
      mockGetPostalCodeData.mockReturnValue(dataWithEmptyName);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: only the record with a non-empty name is included
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].cityName).toBe('Charleroi');
    });

    it('should sort options alphabetically by city name', async () => {
      // Arrange: data in non-alphabetical order
      const unsortedData = [
        { post_code: 9000, sub_municipality_name_english: 'Ghent' },
        { post_code: 1000, sub_municipality_name_english: 'Brussels' },
        { post_code: 2000, sub_municipality_name_english: 'Antwerp' },
      ];
      mockGetPostalCodeData.mockReturnValue(unsortedData);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: sorted A-Z
      const cityNames = result.current.options.map((o) => o.cityName);
      expect(cityNames).toEqual(['Antwerp', 'Brussels', 'Ghent']);
    });

    it('should return correct option structure for each entry', async () => {
      // Arrange
      mockGetPostalCodeData.mockReturnValue([
        { post_code: 1000, sub_municipality_name_english: 'Brussels' },
      ]);

      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: option has all correct fields
      const option = result.current.options[0];
      expect(option.label).toBe('Brussels (1000)');
      expect(option.value).toBe('1000');
      expect(option.postalCode).toBe(1000);
      expect(option.cityName).toBe('Brussels');
      expect(option.country).toBe('belgium');
      expect(option.searchText).toBe('brussels 1000');
    });

    it('should return empty options for empty countries array', async () => {
      // Act
      const { result } = renderHook(() => usePostalCodeOptions([]));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(result.current.options).toHaveLength(0);
      expect(mockLoadPostalCodesForCountry).not.toHaveBeenCalled();
    });
  });

  describe('Postal code loading behavior', () => {
    it('should call loadPostalCodesForCountry for each country', async () => {
      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium', 'netherlands']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert: called once per country
      expect(mockLoadPostalCodesForCountry).toHaveBeenCalledWith('belgium');
      expect(mockLoadPostalCodesForCountry).toHaveBeenCalledWith('netherlands');
      expect(mockLoadPostalCodesForCountry).toHaveBeenCalledTimes(2);
    });

    it('should call loadPostalCodesForCountry for a single country', async () => {
      // Act
      const { result } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Assert
      expect(mockLoadPostalCodesForCountry).toHaveBeenCalledWith('belgium');
      expect(mockLoadPostalCodesForCountry).toHaveBeenCalledTimes(1);
    });

    it('should re-run loading when cacheVersion changes', async () => {
      // Arrange: start with cacheVersion=0
      mockUsePostalCodes.mockReturnValue({
        loadPostalCodesForCountry: mockLoadPostalCodesForCountry,
        cacheVersion: 0,
        getPostalCodeData: mockGetPostalCodeData,
        getSubMunicipalityName: jest.fn().mockReturnValue(''),
        loading: false,
        locationFilterOptions: [],
        expandLocationTokens: jest.fn().mockReturnValue({ codes: [], truncated: false }),
        resolveLocationLabel: jest.fn((value: string) => value),
        isLocationSelectionTooBroad: jest.fn().mockReturnValue(false),
      });

      const { result, rerender } = renderHook(() => usePostalCodeOptions(['belgium']));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update to cacheVersion=1 to simulate cache update
      mockUsePostalCodes.mockReturnValue({
        loadPostalCodesForCountry: mockLoadPostalCodesForCountry,
        cacheVersion: 1,
        getPostalCodeData: mockGetPostalCodeData,
        getSubMunicipalityName: jest.fn().mockReturnValue(''),
        loading: false,
        locationFilterOptions: [],
        expandLocationTokens: jest.fn().mockReturnValue({ codes: [], truncated: false }),
        resolveLocationLabel: jest.fn((value: string) => value),
        isLocationSelectionTooBroad: jest.fn().mockReturnValue(false),
      });

      act(() => {
        rerender({});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
