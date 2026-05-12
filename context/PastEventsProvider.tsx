import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from './GlobalProvider';
import { useUserOrganizations } from './UserOrganizationsProvider';
import { getOrganizationPastEvents } from '@/services/event.service';
import { Event } from '@/types/event.types';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/StorageConfig';

const PAST_EVENTS_CACHE_KEY = STORAGE_KEYS.PAST_EVENTS_CACHE;
const PAST_EVENTS_TIMESTAMP_KEY = STORAGE_KEYS.PAST_EVENTS_CACHE_TIMESTAMP;
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

interface PastEventsCache {
  events: Event[];
  total: number;
}

interface PastEventsContextType {
  pastEvents: Event[];
  pastEventsTotal: number;
  loading: boolean;
  error: string | null;
  refreshPastEvents: () => Promise<void>;
  isStale: () => boolean;
  lastFetchTime: number | null;
}

const PastEventsContext = createContext<PastEventsContextType | undefined>(undefined);

export function PastEventsProvider({ children }: { children: ReactNode }) {
  const { user, isLogged } = useGlobalContext();
  const { userOrganizations, loading: orgsLoading } = useUserOrganizations();
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [pastEventsTotal, setPastEventsTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Memoized to avoid recreating the array each render — without this,
  // useCallback dependencies churn and trigger refetch loops.
  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  const fetchedForUserRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const isStale = useCallback((): boolean => {
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > CACHE_EXPIRY_MS;
  }, [lastFetchTime]);

  const loadCachedData = useCallback(async (): Promise<{
    cache: PastEventsCache | null;
    timestamp: number | null;
  }> => {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(PAST_EVENTS_CACHE_KEY),
        AsyncStorage.getItem(PAST_EVENTS_TIMESTAMP_KEY),
      ]);

      if (cachedData && cachedTimestamp) {
        const cache = JSON.parse(cachedData) as PastEventsCache;
        const timestamp = parseInt(cachedTimestamp, 10);
        return { cache, timestamp };
      }
    } catch (err) {
      logger.error('Failed to load past events cache:', { error: err });
    }
    return { cache: null, timestamp: null };
  }, []);

  const saveCacheData = useCallback(async (events: Event[], total: number) => {
    try {
      const cache: PastEventsCache = { events, total };
      await Promise.all([
        AsyncStorage.setItem(PAST_EVENTS_CACHE_KEY, JSON.stringify(cache)),
        AsyncStorage.setItem(PAST_EVENTS_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (err) {
      logger.error('Failed to save past events cache:', { error: err });
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(PAST_EVENTS_CACHE_KEY),
        AsyncStorage.removeItem(PAST_EVENTS_TIMESTAMP_KEY),
      ]);
      setPastEvents([]);
      setPastEventsTotal(0);
      setLastFetchTime(null);
      fetchedForUserRef.current = null;
    } catch (err) {
      logger.error('Failed to clear past events cache:', { error: err });
    }
  }, []);

  const fetchFromBackend = useCallback(
    async (orgIds: string[]): Promise<{ events: Event[]; total: number }> => {
      if (orgIds.length === 0) {
        return { events: [], total: 0 };
      }

      const response = await getOrganizationPastEvents(orgIds[0], { limit: 100 });

      return { events: response.events, total: response.total };
    },
    []
  );

  const refreshPastEvents = useCallback(async () => {
    if (!user?.$id || !isLogged || organizationIds.length === 0) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setError(null);

    try {
      const { events, total } = await fetchFromBackend(organizationIds);

      const sortedEvents = events.sort((a, b) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });

      setPastEvents(sortedEvents);
      setPastEventsTotal(total);
      setLastFetchTime(Date.now());
      fetchedForUserRef.current = user.$id;

      await saveCacheData(sortedEvents, total);
    } catch (err: any) {
      logger.error('Failed to fetch past events:', { error: err });
      setError(err.message || 'Failed to fetch past events');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.$id, isLogged, organizationIds, fetchFromBackend, saveCacheData]);

  // Load cached data first for instant UI, then fetch fresh if stale.
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!isLogged || !user?.$id) {
        await clearCache();
        setLoading(false);
        return;
      }

      if (orgsLoading) {
        return;
      }

      if (organizationIds.length === 0) {
        await clearCache();
        setLoading(false);
        return;
      }

      if (fetchedForUserRef.current === user.$id) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { cache, timestamp } = await loadCachedData();

        if (cache && timestamp && isMounted) {
          setPastEvents(cache.events);
          setPastEventsTotal(cache.total);
          setLastFetchTime(timestamp);

          const isCacheFresh = Date.now() - timestamp < CACHE_EXPIRY_MS;

          if (isCacheFresh) {
            fetchedForUserRef.current = user.$id;
            setLoading(false);
            return;
          }
        }

        if (isMounted && !isFetchingRef.current) {
          isFetchingRef.current = true;

          try {
            const { events, total } = await fetchFromBackend(organizationIds);

            if (isMounted) {
              const sortedEvents = events.sort((a, b) => {
                return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
              });

              setPastEvents(sortedEvents);
              setPastEventsTotal(total);
              setLastFetchTime(Date.now());
              fetchedForUserRef.current = user.$id;

              await saveCacheData(sortedEvents, total);
            }
          } catch (err: any) {
            if (isMounted) {
              logger.error('Failed to fetch past events:', { error: err });
              setError(err.message || 'Failed to fetch past events');
            }
          } finally {
            isFetchingRef.current = false;
          }
        }
      } catch (err: any) {
        if (isMounted) {
          logger.error('Failed to initialize past events:', { error: err });
          setError(err.message || 'Failed to initialize past events');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [
    user?.$id,
    isLogged,
    orgsLoading,
    organizationIds,
    loadCachedData,
    fetchFromBackend,
    saveCacheData,
    clearCache,
  ]);

  return (
    <PastEventsContext.Provider
      value={{
        pastEvents,
        pastEventsTotal,
        loading,
        error,
        refreshPastEvents,
        isStale,
        lastFetchTime,
      }}
    >
      {children}
    </PastEventsContext.Provider>
  );
}

export function usePastEvents(): PastEventsContextType {
  const context = useContext(PastEventsContext);
  if (context === undefined) {
    throw new Error('usePastEvents must be used within a PastEventsProvider');
  }
  return context;
}
