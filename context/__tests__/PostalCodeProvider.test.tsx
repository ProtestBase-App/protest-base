/**
 * PostalCodeProvider Tests
 *
 * Tests control-flow branches in PostalCodeProvider:
 * - Hook returns valid context object
 * - Starts in loading=true
 * - getSubMunicipalityName returns '' for invalid country
 * - getSubMunicipalityName returns '' for empty postal code
 * - getSubMunicipalityName returns '' for non-numeric postal code
 * - getSubMunicipalityName returns '' when cache is empty (country not loaded)
 * - getPostalCodeData returns [] for invalid country
 * - getPostalCodeData returns [] when country not in cache
 * - loadPostalCodesForCountry ignores invalid country
 * - loadPostalCodesForCountry is idempotent (no-op if already loaded)
 * - default context function stubs return correct empty values
 * - context is accessible with default values outside the provider
 *
 * Note: The dynamic import() calls in loadPostalCodesForCountry cannot be
 * intercepted by jest.mock() in this Jest configuration (Babel CommonJS transform
 * does not convert import() to require()). Those branches (lines 67-88, 109,
 * 128-139, 148) require --experimental-vm-modules and are acknowledged as
 * untestable in this environment. Line 169 (throw guard) is unreachable dead
 * code because PostalCodeContext is created with a non-null default value.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
}));

jest.mock('@/services/auth.service', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
  getCurrentUserSessions: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/services/event.service', () => ({
  getEventsBackend: jest.fn().mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 }),
  fetchEventCounts: jest.fn().mockResolvedValue({ upcoming: 0, past: 0 }),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {},
  setTokenExpirationCallback: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({ alert: jest.fn() }));

// ============================================
// Imports after mocks
// ============================================

import GlobalProvider from '@/context/GlobalProvider';
import { PostalCodeProvider, usePostalCodes } from '@/context/PostalCodeProvider';

// ============================================
// Helpers
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GlobalProvider>
      <PostalCodeProvider>{children}</PostalCodeProvider>
    </GlobalProvider>
  );
}

// ============================================
// Tests
// ============================================

describe('PostalCodeProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('should provide a valid context object when used inside the provider', () => {
    const { result } = renderHook(() => usePostalCodes(), { wrapper });
    expect(result.current).toBeDefined();
    expect(typeof result.current.getSubMunicipalityName).toBe('function');
    expect(typeof result.current.getPostalCodeData).toBe('function');
    expect(typeof result.current.loadPostalCodesForCountry).toBe('function');
    expect(typeof result.current.cacheVersion).toBe('number');
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should start with loading=true', () => {
    const { result } = renderHook(() => usePostalCodes(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('should set loading=false after async initialization', async () => {
    const { result } = renderHook(() => usePostalCodes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
  });

  it('should expose numeric cacheVersion (starts at 0)', () => {
    const { result } = renderHook(() => usePostalCodes(), { wrapper });
    expect(result.current.cacheVersion).toBe(0);
  });

  describe('getSubMunicipalityName - invalid input guards', () => {
    it('should return empty string for invalid country', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('1000', 'france')).toBe('');
    });

    it('should return empty string for empty country string', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('1000', '')).toBe('');
    });

    it('should return empty string for empty postal code', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('', 'belgium')).toBe('');
    });

    it('should return empty string for non-numeric postal code', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('ABC', 'belgium')).toBe('');
    });

    it('should return empty string for unknown postal code (valid country, not in data)', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // 99999 doesn't exist in Belgian postal codes
      expect(result.current.getSubMunicipalityName('99999', 'belgium')).toBe('');
    });

    it('should return empty string when country data not in cache yet', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      // Don't wait for load — cache is empty
      expect(result.current.getSubMunicipalityName('1000', 'belgium')).toBe('');
    });
  });

  describe('getPostalCodeData - invalid input guards', () => {
    it('should return empty array for invalid country', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getPostalCodeData('germany')).toEqual([]);
    });

    it('should return empty array for empty country string', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getPostalCodeData('')).toEqual([]);
    });
  });

  describe('loadPostalCodesForCountry', () => {
    it('should not throw for invalid country', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.loadPostalCodesForCountry('germany');
        })
      ).resolves.not.toThrow();
    });

    it('should not change cacheVersion for invalid country', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      const versionBefore = result.current.cacheVersion;

      await act(async () => {
        await result.current.loadPostalCodesForCountry('germany');
      });

      expect(result.current.cacheVersion).toBe(versionBefore);
    });

    it('should not change cacheVersion when country is already in cache (idempotent)', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // After preload on mount, belgium is already in loadedCountriesRef
      const versionBefore = result.current.cacheVersion;

      await act(async () => {
        await result.current.loadPostalCodesForCountry('belgium');
      });

      // No additional cache version increment since country was already loaded
      expect(result.current.cacheVersion).toBe(versionBefore);
    });
  });

  describe('default context values (outside provider)', () => {
    it('should return default context without throwing when used outside provider', () => {
      // PostalCodeContext has a non-null default value, so usePostalCodes() does not
      // throw outside the provider (unlike contexts created with undefined default).
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let ctx: ReturnType<typeof usePostalCodes> | undefined;
      expect(() => {
        const { result } = renderHook(() => usePostalCodes());
        ctx = result.current;
      }).not.toThrow();
      consoleSpy.mockRestore();

      expect(ctx).toBeDefined();
      expect(ctx!.loading).toBe(false);
      expect(ctx!.cacheVersion).toBe(0);
    });

    it('should invoke the default getSubMunicipalityName stub and return empty string', () => {
      // Exercises the inline arrow function at lines 29-30 of the default context value
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => usePostalCodes());
      consoleSpy.mockRestore();

      expect(result.current.getSubMunicipalityName('1000', 'belgium')).toBe('');
    });

    it('should invoke the default getPostalCodeData stub and return empty array', () => {
      // Exercises the inline arrow function at line 33 of the default context value
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => usePostalCodes());
      consoleSpy.mockRestore();

      expect(result.current.getPostalCodeData('belgium')).toEqual([]);
    });

    it('should invoke the default loadPostalCodesForCountry stub without throwing', async () => {
      // Exercises the inline async function at line 31-32 of the default context value
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => usePostalCodes());
      consoleSpy.mockRestore();

      await expect(
        act(async () => {
          await result.current.loadPostalCodesForCountry('belgium');
        })
      ).resolves.not.toThrow();
    });
  });
});
