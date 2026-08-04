import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllOrganizers, Organization } from '@/services/organizer.service';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { OrganizationDropdownItem } from '@/types/organization.types';
import { logger } from '@/utils/logger';

const CACHE_KEY = STORAGE_KEYS.ORGANIZATIONS_CACHE;
const TIMESTAMP_KEY = STORAGE_KEYS.ORGANIZATIONS_CACHE_TIMESTAMP;

/**
 * How long a cached listing is served without revalidating. Organizations change
 * rarely and stale-while-revalidate means the list is at most one open behind.
 * Exported so tests (and manual QA) can reason about the freshness window.
 */
export const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Oversized AsyncStorage entries fail on Android (SQLite cursor limit ~2 MB).
 * Real datasets stay far below this; seeded dev backends with thousands of
 * organizations do not, so skip the write rather than throw on every launch.
 */
const MAX_PERSISTED_CHARS = 1_000_000;

/**
 * Only the picker payload is cached. `dropdownItems` is what the filter sheets
 * and the co-organizer picker render, and it is ~5x smaller than the full
 * organization objects (82 vs 394 chars each), which keeps the snapshot well
 * inside AsyncStorage limits even for datasets in the thousands.
 *
 * Consequence: after a cache hydrate, `organizations` stays empty until a real
 * fetch happens. Only `EventDetailed` and `app/organizer/[id].tsx` read it, both
 * as an opportunistic shortcut with their own fallbacks (the event's
 * `organizer_name` and the organization detail endpoint). Any new consumer that
 * needs the full objects must not assume they are present.
 */
interface CachedOrganizations {
  dropdownItems: OrganizationDropdownItem[];
}

interface OrganizationsContextType {
  organizations: Organization[];
  dropdownItems: OrganizationDropdownItem[];
  loading: boolean;
  error: string | null;
  /**
   * Load the listing if it isn't already available and fresh. Call this from
   * consumers that actually need the full list (filter sheets, event form);
   * screens that only look up a single organization should not — they have
   * their own fallbacks and would pay for a full walk they don't need.
   */
  ensureOrganizations: () => Promise<void>;
  /** Force a refetch, ignoring cache freshness. */
  refreshOrganizations: () => Promise<void>;
}

const OrganizationsContext = createContext<OrganizationsContextType | undefined>(undefined);

interface OrganizationsProviderProps {
  children: ReactNode;
}

/**
 * Supplies the full organization listing used by the filter sheets and the
 * event form's co-organizer picker.
 *
 * The listing is fetched lazily, not at app start: `getAllOrganizers()` walks
 * every page at 100 per request (the backend rejects a larger limit), so an
 * eager fetch cost one serial round-trip per 100 organizations on every launch
 * for a dropdown most sessions never open. Instead the provider hydrates from
 * an AsyncStorage snapshot and only hits the network when a consumer calls
 * `ensureOrganizations()` and the snapshot is missing or stale.
 */
export function OrganizationsProvider({ children }: OrganizationsProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [dropdownItems, setDropdownItems] = useState<OrganizationDropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The callbacks below are stable (`useCallback(..., [])`) because consumers
  // put them in effect dependency arrays — an identity that changed on every
  // fetch would refire the very request the freshness check exists to skip.
  // They read current values through this ref instead of closing over state.
  const stateRef = useRef<{ hasData: boolean; lastFetchTime: number | null }>({
    hasData: false,
    lastFetchTime: null,
  });
  const inFlightRef = useRef<Promise<void> | null>(null);
  const hydrationRef = useRef<Promise<void> | null>(null);

  const persist = useCallback(async (payload: CachedOrganizations, timestamp: number) => {
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length > MAX_PERSISTED_CHARS) {
        logger.warn('[OrganizationsProvider] Listing too large to cache — skipping write', {
          count: payload.dropdownItems.length,
          chars: serialized.length,
        });
        return;
      }
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY, serialized),
        AsyncStorage.setItem(TIMESTAMP_KEY, timestamp.toString()),
      ]);
    } catch (err) {
      logger.warn('[OrganizationsProvider] Failed to persist cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const hydrate = useCallback(async () => {
    try {
      const [cached, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(TIMESTAMP_KEY),
      ]);

      // A network fetch that resolved while we were reading disk always wins —
      // otherwise the older snapshot would overwrite fresher data.
      if (stateRef.current.hasData || !cached || !cachedTimestamp) return;

      const parsed = JSON.parse(cached) as CachedOrganizations;
      const timestamp = parseInt(cachedTimestamp, 10);
      if (!Array.isArray(parsed?.dropdownItems) || Number.isNaN(timestamp)) return;

      stateRef.current = { hasData: true, lastFetchTime: timestamp };
      setDropdownItems(parsed.dropdownItems);
    } catch (err) {
      logger.warn('[OrganizationsProvider] Failed to read cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Child effects run before the provider's, so `ensureOrganizations` may need
  // hydration before the mount effect below has started it. Whoever gets there
  // first starts it; everyone else awaits the same promise.
  const startHydration = useCallback((): Promise<void> => {
    if (!hydrationRef.current) {
      hydrationRef.current = hydrate();
    }
    return hydrationRef.current;
  }, [hydrate]);

  const fetchOrganizations = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const request = (async () => {
      // Only show a spinner when there is nothing to display; a stale list keeps
      // rendering while it revalidates.
      if (!stateRef.current.hasData) setLoading(true);
      setError(null);

      try {
        const result = await getAllOrganizers();
        const timestamp = Date.now();
        stateRef.current = { hasData: true, lastFetchTime: timestamp };
        setOrganizations(result.organizations);
        setDropdownItems(result.dropdownItems);
        logger.info('Organizations loaded', { count: result.organizations.length });
        await persist({ dropdownItems: result.dropdownItems }, timestamp);
      } catch (err: any) {
        logger.error('Failed to fetch organizations:', { error: err });
        setError(err.message || 'Failed to fetch organizations');
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [persist]);

  const ensureOrganizations = useCallback(async () => {
    await startHydration();

    const { hasData, lastFetchTime } = stateRef.current;
    const isFresh =
      hasData && lastFetchTime !== null && Date.now() - lastFetchTime < CACHE_EXPIRY_MS;
    if (isFresh) return;

    await fetchOrganizations();
  }, [startHydration, fetchOrganizations]);

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    startHydration();
  }, [startHydration]);

  const value: OrganizationsContextType = useMemo(
    () => ({
      organizations,
      dropdownItems,
      loading,
      error,
      ensureOrganizations,
      refreshOrganizations,
    }),
    [organizations, dropdownItems, loading, error, ensureOrganizations, refreshOrganizations]
  );

  return <OrganizationsContext.Provider value={value}>{children}</OrganizationsContext.Provider>;
}

export function useOrganizations(): OrganizationsContextType {
  const context = useContext(OrganizationsContext);
  if (context === undefined) {
    throw new Error('useOrganizations must be used within an OrganizationsProvider');
  }
  return context;
}
