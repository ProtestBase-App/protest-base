import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, getCurrentUserSessions } from '@/services/auth.service';
import { getEventsBackend, fetchEventCounts, EventCounts } from '@/services/event.service';
import { loadPersistedEvents, persistEvents } from '@/services/eventsCacheStorage';
import * as SecureStore from 'expo-secure-store';
import { setTokenExpirationCallback } from '@/services/api';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';
import { User } from '@/types/auth.types';
import { Event } from '@/types/event.types';
import { API_LIMITS } from '@/constants/ApiConfig';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { t } from '@/utils/i18n';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/StorageConfig';
import { isNetworkError } from '@/utils/networkError';
import { clearAllUserData } from '@/services/localStorageService';
import { parseAsUTC } from '@/utils/eventFormatters';

/**
 * Timeout for the one-shot cache fetch: it downloads up to EVENTS_MAX events in
 * a single response, so it needs a bigger budget than the axios instance's 10s
 * default, which is sized for small paginated requests.
 */
const CACHE_FETCH_TIMEOUT_MS = 30000;

/** Where the current eventsCache contents came from — see cacheSourceRef. */
type EventsCacheSource = 'empty' | 'hydrated' | 'fresh';

/** Key an events array by $id for O(1) cache lookups. */
function toEventsMap(events: Event[]): Record<string, Event> {
  const map: Record<string, Event> = {};
  events.forEach((event) => {
    map[event.$id] = event;
  });
  return map;
}

interface CacheableEventsFetch {
  events: Event[];
  /** ISO start of the fetched window — entries older than this are outside it. */
  lookbackDate: string;
  /** True when the backend reported more events than the ceiling returned. */
  truncated: boolean;
}

/**
 * Fetch the full browse window (lookback + all upcoming events) in a single
 * request. The calendar and maps tabs browse ALL events from this cache, so we
 * pull up to the backend's documented ceiling (API_LIMITS.EVENTS_MAX) in one
 * round-trip instead of walking pages — one request keeps cold-start latency and
 * the per-request integrity/attestation overhead to a single hit.
 */
async function fetchAllCacheableEvents(): Promise<CacheableEventsFetch> {
  // Look back to include events that started recently but may still be ongoing.
  // This ensures multi-day events and events without end_time are included.
  const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();

  // includeEnded: true so the cache can serve saved events whose end_time is in
  // the past but still within the saved-event retention window (kept by
  // SavedEventsProvider).
  const result = await getEventsBackend(
    {
      startDate: lookbackDate,
      limit: API_LIMITS.EVENTS_MAX,
      offset: 0,
      includeEnded: true,
    },
    { timeout: CACHE_FETCH_TIMEOUT_MS }
  );

  const truncated = result.total > result.events.length;
  if (truncated) {
    logger.warn('[GlobalProvider] Events cache truncated at fetch ceiling', {
      fetched: result.events.length,
      total: result.total,
    });
  }

  return { events: result.events, lookbackDate, truncated };
}

/**
 * Wholesale-apply a fresh fetch while preserving screen-upserted entries the
 * fetch window cannot see: events older than the lookback (deep links to past
 * events) and — when the fetch hit its ceiling — events starting beyond the last
 * fetched one. Entries inside the window are replaced authoritatively, so
 * backend-deleted events still drop out.
 */
function applyFreshEvents(
  prev: Record<string, Event>,
  fetched: Event[],
  lookbackDate: string,
  truncated: boolean
): Record<string, Event> {
  const next = toEventsMap(fetched);
  const lookbackMs = parseAsUTC(lookbackDate).getTime();
  const horizonMs =
    truncated && fetched.length > 0
      ? Math.max(...fetched.map((event) => parseAsUTC(event.start_time).getTime()))
      : Number.POSITIVE_INFINITY;

  for (const [id, event] of Object.entries(prev)) {
    if (id in next) continue;
    const startMs = parseAsUTC(event.start_time).getTime();
    if (startMs < lookbackMs || startMs > horizonMs) {
      next[id] = event;
    }
  }
  return next;
}

export interface GlobalContextValue {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;

  userLanguage: string;

  eventsCache: Record<string, Event>;
  eventsLoading: boolean;
  refetchEvents: () => Promise<void>;
  /**
   * Insert or replace an event in the cache. Used by screens that already have
   * a full Event object (event detail, post-create, hydration of saved-event
   * misses) so the home calendar can display it without a full refetch.
   */
  upsertEventInCache: (event: Event) => void;
  /** Remove an event from the cache by id. Used to clean up dangling references. */
  removeEventFromCache: (eventId: string) => void;

  userEventCounts: EventCounts | null;
  userEventCountsLoading: boolean;
  refreshUserEventCounts: (organizationIds?: string[]) => Promise<void>;

  clearAuthState: () => Promise<void>;

  connectionError: boolean;
  retryConnection: () => Promise<void>;
}

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalContext = createContext<GlobalContextValue | undefined>(undefined);

const USER_EVENT_COUNTS_KEY = STORAGE_KEYS.USER_EVENT_COUNTS;

export const useGlobalContext = (): GlobalContextValue => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Connection error: backend unreachable at startup
  const [connectionError, setConnectionError] = useState<boolean>(false);

  const [eventsCache, setEventsCache] = useState<Record<string, Event>>({});
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);

  // Provenance of the current eventsCache contents. Hydrated-from-disk data must
  // never be re-persisted (restamping would reset the snapshot's age and let
  // stale data outlive the hydration window) and must never overwrite data from
  // a fresh fetch (retryConnection re-entry).
  const cacheSourceRef = useRef<EventsCacheSource>('empty');

  // null means counts have never been loaded (show splash for logged-in users)
  const [userEventCounts, setUserEventCounts] = useState<EventCounts | null>(null);
  const [userEventCountsLoading, setUserEventCountsLoading] = useState<boolean>(false);

  const supportedLanguages = ['en', 'fr', 'nl'];
  const localeCode = getLocales()[0]?.languageCode;
  const userLanguage = localeCode && supportedLanguages.includes(localeCode) ? localeCode : 'en';

  const clearAuthState = useCallback(async (): Promise<void> => {
    // Wipe storage BEFORE flipping auth state so consumers reacting to
    // isLogged (e.g. SavedEventsProvider's logout reload) observe the
    // post-wipe contents, never the pre-logout data.
    try {
      await clearAllUserData();
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
    } catch (error) {
      logger.error('Failed to clear user data from storage:', { error });
    }
    setIsLogged(false);
    setUser(null);
    setUserEventCounts(null);
  }, []);

  const refreshUserEventCounts = useCallback(async (organizationIds?: string[]): Promise<void> => {
    // If no organizations, set counts to zero (not null) to exit loading state
    if (!organizationIds || organizationIds.length === 0) {
      const zeroCounts: EventCounts = { upcoming: 0, past: 0, draft: 0 };
      setUserEventCounts(zeroCounts);
      await AsyncStorage.setItem(USER_EVENT_COUNTS_KEY, JSON.stringify(zeroCounts));
      return;
    }

    try {
      setUserEventCountsLoading(true);
      const counts = await fetchEventCounts(organizationIds);
      setUserEventCounts(counts);

      await AsyncStorage.setItem(USER_EVENT_COUNTS_KEY, JSON.stringify(counts));
    } catch (error) {
      logger.error('Failed to refresh user event counts:', { error });
      // Don't clear existing counts on error - keep stale data
    } finally {
      setUserEventCountsLoading(false);
    }
  }, []);

  // Extracted as useCallback so retryConnection can re-invoke it
  const validateUserSession = useCallback(async (): Promise<void> => {
    logger.debug('[GlobalProvider] Validating user session...');
    try {
      const accessToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        await clearAuthState();
        return;
      }

      const storedSessionId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SESSION_ID);
      if (!storedSessionId) {
        await clearAuthState();
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await clearAuthState();
        return;
      }

      const sessions = await getCurrentUserSessions();
      if (!sessions?.session) {
        await clearAuthState();
        return;
      }

      const isValidSession = sessions.session.some(
        (session) => session.userId === currentUser.$id && session.$id === storedSessionId
      );

      if (isValidSession) {
        setIsLogged(true);
        setUser(currentUser);
        logger.info('[GlobalProvider] User logged in', { userId: currentUser.$id });

        try {
          const cachedCounts = await AsyncStorage.getItem(USER_EVENT_COUNTS_KEY);
          if (cachedCounts) {
            setUserEventCounts(JSON.parse(cachedCounts) as EventCounts);
          }
        } catch (error) {
          logger.error('Failed to load cached event counts:', { error });
        }

        // Event counts are refreshed by UserOrganizationsProvider once the user's
        // organizations are loaded.
      } else {
        await clearAuthState();
      }
    } catch (error) {
      logger.error('[GlobalProvider] Session validation failed', { error });
      if (isNetworkError(error)) {
        setConnectionError(true);
      } else {
        await clearAuthState();
      }
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  // Extracted as useCallback so retryConnection can re-invoke it
  const fetchInitialEvents = useCallback(async (): Promise<void> => {
    try {
      setEventsLoading(true);

      // Start the network fetch first and hydrate from disk while it's in
      // flight — the two are independent, so serializing them would delay the
      // fresh data by the disk read. The no-op catch stops a pre-await
      // rejection from surfacing as unhandled; the await below still throws
      // into this try/catch.
      const fetchPromise = fetchAllCacheableEvents();
      fetchPromise.catch(() => {});

      // Stale-while-revalidate: paint the persisted snapshot instantly, merged
      // UNDER anything screens already upserted (those entries are fresher).
      // The Home/Maps tabs stop showing their splash as soon as the cache is
      // non-empty, so a cold start renders cached events without a network
      // wait. Skipped once a fresh fetch has landed this session
      // (retryConnection re-entry) so stale entries can't resurface.
      const persisted = cacheSourceRef.current !== 'fresh' ? await loadPersistedEvents() : null;
      // Re-check after the await — a concurrent invocation (retryConnection)
      // may have landed a fresh fetch while the disk read was in flight.
      if (persisted && cacheSourceRef.current !== 'fresh') {
        cacheSourceRef.current = 'hydrated';
        setEventsCache((prev) => ({ ...toEventsMap(persisted), ...prev }));
      }

      const { events, lookbackDate, truncated } = await fetchPromise;

      cacheSourceRef.current = 'fresh';
      setEventsCache((prev) => applyFreshEvents(prev, events, lookbackDate, truncated));
      logger.info('[GlobalProvider] Events cache initialized', { count: events.length });
    } catch (error) {
      logger.error('Failed to fetch events cache:', { error });
      if (isNetworkError(error)) {
        setConnectionError(true);
      }
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<void> => {
    setConnectionError(false);
    setLoading(true);
    setEventsLoading(true);
    await validateUserSession();
    await fetchInitialEvents();
  }, [validateUserSession, fetchInitialEvents]);

  useEffect(() => {
    validateUserSession();

    const handleTokenExpiration = async (reason?: string): Promise<void> => {
      await clearAuthState();

      const navigateToSignIn = () => router.replace('/(auth)/sign-in');

      if (reason === 'token_reuse') {
        Alert.alert(t('session.securityAlert'), t('session.securityAlertMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      } else if (reason === 'session_replaced') {
        Alert.alert(t('session.signedInElsewhere'), t('session.signedInElsewhereMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      } else {
        Alert.alert(t('session.expired'), t('session.expiredMessage'), [
          { text: t('session.signInAgain'), onPress: navigateToSignIn },
        ]);
      }
    };

    setTokenExpirationCallback(handleTokenExpiration);

    return () => {};
  }, [validateUserSession, clearAuthState]);

  useEffect(() => {
    fetchInitialEvents();
  }, [fetchInitialEvents]);

  const upsertEventInCache = useCallback((event: Event): void => {
    setEventsCache((prev) => ({ ...prev, [event.$id]: event }));
  }, []);

  const removeEventFromCache = useCallback((eventId: string): void => {
    setEventsCache((prev) => {
      if (!(eventId in prev)) return prev;
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const refetchEvents = useCallback(async (): Promise<void> => {
    try {
      setEventsLoading(true);

      const { events, lookbackDate, truncated } = await fetchAllCacheableEvents();

      cacheSourceRef.current = 'fresh';
      setEventsCache((prev) => applyFreshEvents(prev, events, lookbackDate, truncated));
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Mirror every fresh-data cache change (bulk fetches, screen upserts/removes)
  // into the cold-start snapshot, so events created or hydrated mid-session
  // survive a restart. Hydrated-only states are deliberately not re-persisted —
  // see cacheSourceRef. An empty cache never clobbers an existing snapshot.
  useEffect(() => {
    if (cacheSourceRef.current !== 'fresh') return;
    const events = Object.values(eventsCache);
    if (events.length === 0) return;
    void persistEvents(events);
  }, [eventsCache]);

  const contextValue = useMemo(
    () => ({
      isLogged,
      setIsLogged,
      user,
      setUser,
      loading,
      setLoading,
      userLanguage,
      eventsCache,
      eventsLoading,
      refetchEvents,
      upsertEventInCache,
      removeEventFromCache,
      userEventCounts,
      userEventCountsLoading,
      refreshUserEventCounts,
      clearAuthState,
      connectionError,
      retryConnection,
    }),
    [
      isLogged,
      user,
      loading,
      userLanguage,
      eventsCache,
      eventsLoading,
      refetchEvents,
      upsertEventInCache,
      removeEventFromCache,
      userEventCounts,
      userEventCountsLoading,
      refreshUserEventCounts,
      clearAuthState,
      connectionError,
      retryConnection,
    ]
  );

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export default GlobalProvider;
