/**
 * OrganizationsProvider Tests
 *
 * The listing is fetched lazily, not on mount: these cover cache hydration,
 * ensureOrganizations() freshness/staleness behaviour, the hydration-vs-fetch
 * ordering, concurrent-call de-duplication, persistence (including the
 * oversized-payload guard), error state, and the hook guard.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

const mockGetAllOrganizers = jest.fn();

jest.mock('@/services/organizer.service', () => ({
  getAllOrganizers: (...args: any[]) => mockGetAllOrganizers(...args),
  getMyOrganizations: jest.fn(),
}));

// ============================================
// Imports after mocks
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CACHE_EXPIRY_MS,
  OrganizationsProvider,
  useOrganizations,
} from '@/context/OrganizationsProvider';
import type { Organization } from '@/services/organizer.service';
import type { OrganizationDropdownItem } from '@/types/organization.types';

// ============================================
// Helpers
// ============================================

const CACHE_KEY = 'organizationsCache';
const TIMESTAMP_KEY = 'organizationsCacheTimestamp';

function wrapper({ children }: { children: React.ReactNode }) {
  return <OrganizationsProvider>{children}</OrganizationsProvider>;
}

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    $id: 'org-1',
    Name: 'Test Org',
    role: 'admin',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Wire AsyncStorage.getItem to a cached payload written `ageMs` ago. */
function primeCache(payload: { dropdownItems: any[] }, ageMs = 0) {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key === CACHE_KEY) return Promise.resolve(JSON.stringify(payload));
    if (key === TIMESTAMP_KEY) return Promise.resolve(String(Date.now() - ageMs));
    return Promise.resolve(null);
  });
}

// ============================================
// Tests
// ============================================

describe('OrganizationsProvider', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('should throw when useOrganizations is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useOrganizations());
    }).toThrow('useOrganizations must be used within an OrganizationsProvider');
    consoleSpy.mockRestore();
  });

  describe('lazy start-up', () => {
    it('should not fetch on mount and should not start in a loading state', async () => {
      mockGetAllOrganizers.mockResolvedValue({ organizations: [], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      expect(result.current.loading).toBe(false);
      // Let mount effects (cache hydration) settle before asserting no fetch.
      await act(async () => {});
      expect(mockGetAllOrganizers).not.toHaveBeenCalled();
      expect(result.current.organizations).toEqual([]);
    });

    it('should hydrate the picker items from cache without hitting the backend', async () => {
      primeCache({ dropdownItems: [{ label: 'Cached Org', value: 'org-9' }] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await waitFor(() => expect(result.current.dropdownItems).toHaveLength(1));
      expect(result.current.dropdownItems).toEqual([{ label: 'Cached Org', value: 'org-9' }]);
      // Only the picker payload is cached; the full objects stay network-only.
      expect(result.current.organizations).toEqual([]);
      expect(mockGetAllOrganizers).not.toHaveBeenCalled();
    });

    it('should ignore a malformed cache entry', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === CACHE_KEY) return Promise.resolve('{not json');
        if (key === TIMESTAMP_KEY) return Promise.resolve(String(Date.now()));
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {});
      expect(result.current.organizations).toEqual([]);
    });

    it('should ignore a cache entry with a non-array payload or unreadable timestamp', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === CACHE_KEY) return Promise.resolve(JSON.stringify({ dropdownItems: null }));
        if (key === TIMESTAMP_KEY) return Promise.resolve('not-a-number');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {});
      expect(result.current.dropdownItems).toEqual([]);
    });
  });

  describe('ensureOrganizations()', () => {
    it('should fetch when there is no cache', async () => {
      const org = makeOrg({ $id: 'org-1', Name: 'Greenpeace' });
      const dropdownItems: OrganizationDropdownItem[] = [{ label: 'Greenpeace', value: 'org-1' }];
      mockGetAllOrganizers.mockResolvedValue({ organizations: [org], dropdownItems });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(mockGetAllOrganizers).toHaveBeenCalledTimes(1);
      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.dropdownItems).toEqual(dropdownItems);
      expect(result.current.error).toBeNull();
    });

    it('should skip the fetch when the cached listing is still fresh', async () => {
      primeCache({ dropdownItems: [{ label: 'Cached Org', value: 'org-9' }] }, CACHE_EXPIRY_MS / 2);

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(mockGetAllOrganizers).not.toHaveBeenCalled();
    });

    it('should serve a stale cache immediately and revalidate', async () => {
      primeCache({ dropdownItems: [{ label: 'Stale Org', value: 'old' }] }, CACHE_EXPIRY_MS + 1000);
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [makeOrg({ $id: 'new', Name: 'Fresh Org' })],
        dropdownItems: [{ label: 'Fresh Org', value: 'new' }],
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await waitFor(() => expect(result.current.dropdownItems[0]?.label).toBe('Stale Org'));

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(mockGetAllOrganizers).toHaveBeenCalledTimes(1);
      expect(result.current.dropdownItems[0].label).toBe('Fresh Org');
      // A stale list stays on screen while revalidating — no spinner.
      expect(result.current.loading).toBe(false);
    });

    it('should wait for cache hydration before deciding to fetch', async () => {
      // Hydration is slower than the caller: ensure() must still see the cached
      // timestamp rather than treating the empty initial state as "no data".
      let releaseCache: () => void = () => {};
      const cacheGate = new Promise<void>((resolve) => {
        releaseCache = resolve;
      });
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        await cacheGate;
        if (key === CACHE_KEY) {
          return JSON.stringify({ dropdownItems: [{ label: 'Old Cached', value: 'old' }] });
        }
        if (key === TIMESTAMP_KEY) return String(Date.now() - CACHE_EXPIRY_MS - 1000);
        return null;
      });
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [makeOrg({ Name: 'From Network' })],
        dropdownItems: [{ label: 'From Network', value: 'net' }],
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        const pending = result.current.ensureOrganizations();
        releaseCache();
        await pending;
      });

      expect(result.current.organizations[0].Name).toBe('From Network');
    });

    it('should not let a late hydration overwrite a completed fetch', async () => {
      // refreshOrganizations() does not await hydration, so the disk read can
      // land after the network result — the older snapshot must not win.
      let releaseCache: () => void = () => {};
      const cacheGate = new Promise<void>((resolve) => {
        releaseCache = resolve;
      });
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        await cacheGate;
        if (key === CACHE_KEY) {
          return JSON.stringify({ dropdownItems: [{ label: 'Old Cached', value: 'old' }] });
        }
        if (key === TIMESTAMP_KEY) return String(Date.now());
        return null;
      });
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [makeOrg({ Name: 'From Network' })],
        dropdownItems: [{ label: 'From Network', value: 'net' }],
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.refreshOrganizations();
        releaseCache();
      });
      // Let the late disk read resolve — it must find hasData already set and bail.
      await act(async () => {});

      expect(result.current.organizations[0].Name).toBe('From Network');
      expect(result.current.dropdownItems).toEqual([{ label: 'From Network', value: 'net' }]);
    });

    it('should de-duplicate concurrent calls into one fetch', async () => {
      mockGetAllOrganizers.mockResolvedValue({ organizations: [], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await Promise.all([
          result.current.ensureOrganizations(),
          result.current.ensureOrganizations(),
          result.current.ensureOrganizations(),
        ]);
      });

      expect(mockGetAllOrganizers).toHaveBeenCalledTimes(1);
    });

    it('should keep a stable identity across fetches so consumer effects do not refire', async () => {
      mockGetAllOrganizers.mockResolvedValue({ organizations: [makeOrg()], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });
      const before = result.current.ensureOrganizations;

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.ensureOrganizations).toBe(before);
    });

    it('should show a spinner only while there is nothing to display', async () => {
      let resolveFetch: (v: any) => void = () => {};
      mockGetAllOrganizers.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        result.current.ensureOrganizations();
      });
      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveFetch({ organizations: [], dropdownItems: [] });
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should write the listing and a timestamp after a successful fetch', async () => {
      const org = makeOrg({ $id: 'org-1', Name: 'Greenpeace' });
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [org],
        dropdownItems: [{ label: 'Greenpeace', value: 'org-1' }],
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      const written = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const payloadCall = written.find(([key]) => key === CACHE_KEY);
      expect(payloadCall).toBeDefined();
      const persisted = JSON.parse(payloadCall![1]);
      expect(persisted.dropdownItems[0].label).toBe('Greenpeace');
      // The heavyweight objects are not written — only what the pickers render.
      expect(persisted.organizations).toBeUndefined();
      expect(written.some(([key]) => key === TIMESTAMP_KEY)).toBe(true);
    });

    it('should skip persisting an oversized listing', async () => {
      // Android's AsyncStorage rejects multi-MB entries; the guard drops the
      // write instead of throwing on every launch.
      const bulky = Array.from({ length: 400 }, (_, i) => ({
        label: 'x'.repeat(3000),
        value: `org-${i}`,
      }));
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [makeOrg()],
        dropdownItems: bulky,
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      // The in-memory listing is still served.
      expect(result.current.dropdownItems).toHaveLength(400);
    });

    it('should keep serving the listing when persisting fails', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'));
      mockGetAllOrganizers.mockResolvedValue({ organizations: [makeOrg()], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should survive an unreadable cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('read failed'));
      mockGetAllOrganizers.mockResolvedValue({ organizations: [makeOrg()], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.organizations).toHaveLength(1);
    });

    it('should survive storage failures that are not Error instances', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue('read blew up');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue('write blew up');
      mockGetAllOrganizers.mockResolvedValue({ organizations: [makeOrg()], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe('errors and refresh', () => {
    it('should expose the error message when the fetch fails', async () => {
      mockGetAllOrganizers.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.organizations).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should expose a generic error when the failure has no message', async () => {
      mockGetAllOrganizers.mockRejectedValue({});

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });

      expect(result.current.error).toBe('Failed to fetch organizations');
    });

    it('should refetch through refreshOrganizations() even when the cache is fresh', async () => {
      primeCache({ dropdownItems: [{ label: 'Cached Org', value: 'org-1' }] });
      mockGetAllOrganizers.mockResolvedValue({
        organizations: [makeOrg({ Name: 'Refreshed Org' })],
        dropdownItems: [{ label: 'Refreshed Org', value: 'org-2' }],
      });

      const { result } = renderHook(() => useOrganizations(), { wrapper });
      await waitFor(() => expect(result.current.dropdownItems).toHaveLength(1));

      await act(async () => {
        await result.current.refreshOrganizations();
      });

      expect(mockGetAllOrganizers).toHaveBeenCalledTimes(1);
      expect(result.current.organizations[0].Name).toBe('Refreshed Org');
    });

    it('should clear a previous error on a successful refresh', async () => {
      mockGetAllOrganizers
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({ organizations: [], dropdownItems: [] });

      const { result } = renderHook(() => useOrganizations(), { wrapper });

      await act(async () => {
        await result.current.ensureOrganizations();
      });
      expect(result.current.error).toBe('Initial error');

      await act(async () => {
        await result.current.refreshOrganizations();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
