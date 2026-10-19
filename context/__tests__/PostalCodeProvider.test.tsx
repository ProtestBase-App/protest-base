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
  // Production today: a backend without France.
  probeFranceSupport: jest.fn().mockResolvedValue('unavailable'),
}));

let mockIsOffline = false;
jest.mock('@/context/ConnectivityProvider', () => ({
  useConnectivity: () => ({
    isOffline: mockIsOffline,
    isConnected: true,
    isInternetReachable: true,
  }),
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

import { AppState } from 'react-native';
import GlobalProvider from '@/context/GlobalProvider';
import { PostalCodeProvider, usePostalCodes } from '@/context/PostalCodeProvider';
import { probeFranceSupport } from '@/services/event.service';

const mockProbeFranceSupport = probeFranceSupport as jest.Mock;

/** Fires the AppState listeners the provider registered. */
function emitAppState(state: string) {
  const spy = AppState.addEventListener as unknown as jest.Mock;
  spy.mock.calls.forEach(([event, handler]: [string, (s: string) => void]) => {
    if (event === 'change') handler(state);
  });
}

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

  describe('getSubMunicipalityName - fallbackCity', () => {
    it('returns the fallback city for an invalid country', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('1000', 'france', 'Paris')).toBe('Paris');
    });

    it('returns the fallback city for an unknown postal code not in the bundled set', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // 99999 doesn't exist in the dataset — e.g. an NL/edge OSM code from a suggestion.
      expect(result.current.getSubMunicipalityName('99999', 'belgium', 'Mystery Town')).toBe(
        'Mystery Town'
      );
    });

    it('trims the fallback city', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('99999', 'belgium', '  Spaced  ')).toBe(
        'Spaced'
      );
    });

    it('still returns empty string when not found and no fallback is given', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('99999', 'belgium')).toBe('');
    });

    it('prefers the bundled municipality name over the fallback when the code is known', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // 1000 is a real Belgian code; the dataset name must win over the fallback.
      const name = result.current.getSubMunicipalityName('1000', 'belgium', 'WRONG_FALLBACK');
      expect(name).not.toBe('WRONG_FALLBACK');
      expect(name.length).toBeGreaterThan(0);
    });

    it('returns the stored city for a French event (no French dataset lookup)', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.getSubMunicipalityName('01000', 'france', 'Bourg-en-Bresse')).toBe(
        'Bourg-en-Bresse'
      );
    });
  });

  describe('resolveLocationLabel - raw postal codes', () => {
    it('names a 4-digit raw code from the BE/NL data', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() =>
        expect(result.current.getSubMunicipalityName('1000', 'belgium')).not.toBe('')
      );

      expect(result.current.resolveLocationLabel('1000')).toMatch(/ \(1000\)$/);
    });

    it('never reads a 5-digit French code as a Belgian one (01000 is not Brussels)', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() =>
        expect(result.current.getSubMunicipalityName('1000', 'belgium')).not.toBe('')
      );

      expect(result.current.resolveLocationLabel('01000')).toBe('01000');
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
      expect(ctx!.franceEnabled).toBe(false);
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

  describe('Luxembourg', () => {
    afterEach(() => jest.restoreAllMocks());

    const isLuxembourgToken = (value: string) => /^[cpm]:lu(:|$)/.test(value);

    it('offers the Luxembourg areas', async () => {
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() =>
        expect(result.current.locationFilterOptions.some((o) => o.value === 'c:lu')).toBe(true)
      );
      const communes = result.current.locationFilterOptions.filter((o) =>
        o.value.startsWith('m:lu:')
      );
      expect(communes).toHaveLength(100);
    });
  });

  // France is offered only once GET /events?country=france answers 200.
  describe('France gate', () => {
    const isFrenchToken = (value: string) => /^[cpr]:fr(:|$)/.test(value);

    beforeEach(() => {
      mockIsOffline = false;
      mockProbeFranceSupport.mockReset();
    });

    it('stays off, with no French area, while the backend answers 400', async () => {
      mockProbeFranceSupport.mockResolvedValue('unavailable');
      const { result } = renderHook(() => usePostalCodes(), { wrapper });

      await waitFor(() => expect(result.current.franceLoading).toBe(false));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.franceEnabled).toBe(false);
      expect(result.current.locationFilterOptions.some((o) => isFrenchToken(o.value))).toBe(false);
      expect(result.current.locationFilterOptions.some((o) => o.value === 'c:lu')).toBe(true);
    });

    it('offers the French areas once the backend answers 200', async () => {
      mockProbeFranceSupport.mockResolvedValue('available');
      const { result } = renderHook(() => usePostalCodes(), { wrapper });

      await waitFor(() => expect(result.current.franceEnabled).toBe(true));

      const french = result.current.locationFilterOptions.filter((o) => isFrenchToken(o.value));
      expect(french).toHaveLength(110);
      expect(result.current.franceLoading).toBe(false);
      expect(result.current.resolveLocationLabel('p:fr:75')).toBe('Paris (75)');
    });

    it('keeps France hidden while the answer is pending, never holding the shared loading flag', async () => {
      let answer!: (support: string) => void;
      mockProbeFranceSupport.mockImplementation(
        () =>
          new Promise((resolve) => {
            answer = resolve;
          })
      );
      const { result } = renderHook(() => usePostalCodes(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.franceLoading).toBe(true);
      expect(result.current.franceEnabled).toBe(false);

      await act(async () => {
        answer('available');
      });
      await waitFor(() => expect(result.current.franceEnabled).toBe(true));
      expect(result.current.loading).toBe(false);
    });

    it('stays off after a failed request, and asks again back in the foreground', async () => {
      mockProbeFranceSupport.mockResolvedValueOnce('unknown').mockResolvedValueOnce('available');
      const { result } = renderHook(() => usePostalCodes(), { wrapper });

      await waitFor(() => expect(result.current.franceLoading).toBe(false));
      expect(result.current.franceEnabled).toBe(false);

      await act(async () => {
        emitAppState('active');
      });

      await waitFor(() => expect(result.current.franceEnabled).toBe(true));
      expect(mockProbeFranceSupport).toHaveBeenCalledTimes(2);
    });

    it('asks again after a failed request once the connection is back', async () => {
      mockProbeFranceSupport.mockResolvedValueOnce('unknown').mockResolvedValueOnce('available');
      const { result, rerender } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.franceLoading).toBe(false));

      mockIsOffline = true;
      rerender({});
      expect(mockProbeFranceSupport).toHaveBeenCalledTimes(1);
      mockIsOffline = false;
      rerender({});

      await waitFor(() => expect(result.current.franceEnabled).toBe(true));
      expect(mockProbeFranceSupport).toHaveBeenCalledTimes(2);
    });

    it('does not ask again once the backend said no', async () => {
      mockProbeFranceSupport.mockResolvedValue('unavailable');
      const { result } = renderHook(() => usePostalCodes(), { wrapper });
      await waitFor(() => expect(result.current.franceLoading).toBe(false));

      await act(async () => {
        emitAppState('active');
      });

      expect(mockProbeFranceSupport).toHaveBeenCalledTimes(1);
      expect(result.current.franceEnabled).toBe(false);
    });
  });
});
