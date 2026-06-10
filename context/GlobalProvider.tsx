import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, getCurrentUserSessions } from '@/services/auth.service';
import { getEventsBackend, fetchEventCounts, EventCounts } from '@/services/event.service';
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

// Safety ceiling for the paginated cache fill (pages × EVENTS_DEFAULT events).
const MAX_EVENT_PAGES = 5;

/**
 * Fetch the full browse window (lookback + all upcoming events), paging until
 * the server's `total` is exhausted or the safety ceiling is hit. The calendar
 * tab browses ALL events from this cache, so a single page (100 events) is not
 * enough once the backend holds more.
 */
async function fetchAllCacheableEvents(): Promise<Event[]> {
  // Look back to include events that started recently but may still be ongoing.
  // This ensures multi-day events and events without end_time are included.
  const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();

  const events: Event[] = [];
  let total = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_EVENT_PAGES && events.length < total; page++) {
    // includeEnded: true so the cache can serve saved events whose end_time is
    // in the past but still within the saved-event retention window (kept by
    // SavedEventsProvider).
    const result = await getEventsBackend({
      startDate: lookbackDate,
      limit: API_LIMITS.EVENTS_DEFAULT,
      offset: events.length,
      includeEnded: true,
    });
    events.push(...result.events);
    total = result.total;
    if (result.events.length === 0) break;
  }

  if (events.length < total) {
    logger.warn('[GlobalProvider] Events cache truncated at page ceiling', {
      fetched: events.length,
      total,
    });
  }

  return events;
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

  // null means counts have never been loaded (show splash for logged-in users)
  const [userEventCounts, setUserEventCounts] = useState<EventCounts | null>(null);
  const [userEventCountsLoading, setUserEventCountsLoading] = useState<boolean>(false);

  const supportedLanguages = ['en', 'fr', 'nl'];
  const localeCode = getLocales()[0]?.languageCode;
  const userLanguage = localeCode && supportedLanguages.includes(localeCode) ? localeCode : 'en';

  const clearAuthState = useCallback(async (): Promise<void> => {
    setIsLogged(false);
    setUser(null);
    setUserEventCounts(null);
    try {
      await clearAllUserData();
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.SESSION_ID);
    } catch (error) {
      logger.error('Failed to clear user data from storage:', { error });
    }
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

      const events = await fetchAllCacheableEvents();

      const eventsMap: Record<string, Event> = {};
      events.forEach((event) => {
        eventsMap[event.$id] = event;
      });

      setEventsCache(eventsMap);
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

      const events = await fetchAllCacheableEvents();

      const eventsMap: Record<string, Event> = {};
      events.forEach((event) => {
        eventsMap[event.$id] = event;
      });

      setEventsCache(eventsMap);
    } finally {
      setEventsLoading(false);
    }
  }, []);

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
