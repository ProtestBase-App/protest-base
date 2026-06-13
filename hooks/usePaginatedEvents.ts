import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { logger } from '@/utils/logger';

interface PaginationResponse<T> {
  events: T[];
  total: number;
  limit: number;
  offset: number;
}

type FetchFunction<TApiData> = (
  pageSize: number,
  offset: number,
  organizationIds: string[]
) => Promise<PaginationResponse<TApiData>>;

type FormatFunction<TApiData, TFormatted> = (events: TApiData[]) => TFormatted[];

interface UsePaginatedEventsOptions<TApiData, TFormatted> {
  /**
   * Function to fetch events from the API
   * Should accept pageSize, offset, and organizationIds parameters
   */
  fetchFn: FetchFunction<TApiData>;

  /**
   * Function to format/transform the fetched events
   * Receives array of API data and returns array of formatted items
   */
  formatFn: FormatFunction<TApiData, TFormatted>;

  /**
   * Number of items to fetch per page
   * @default 10
   */
  pageSize?: number;
}

interface UsePaginatedEventsReturn<T> {
  /** Array of formatted events */
  events: T[];
  /** True during initial load */
  loading: boolean;
  /** True during pull-to-refresh */
  refreshing: boolean;
  /** True when loading more items (pagination) */
  loadingMore: boolean;
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  /** True if more items are available to load */
  hasMore: boolean;
  /** Server-reported total number of matching events (0 until first fetch) */
  total: number;
  /** Function to trigger pull-to-refresh */
  handleRefresh: () => void;
  /** Function to handle infinite scroll (load more) */
  handleEndReached: () => void;
}

/**
 * Custom hook for paginated event lists with pull-to-refresh and infinite scroll
 *
 * This hook encapsulates the common pagination logic used across event list screens.
 * It handles:
 * - Initial data fetch with user authentication check
 * - Pull-to-refresh functionality
 * - Infinite scroll / load more functionality
 * - Loading states (initial, refresh, pagination)
 * - Error handling
 * - Automatic cleanup of stale pagination state
 *
 * @template TApiData - The raw event data type from the API
 * @template TFormatted - The formatted event type for display
 *
 * @example
 * ```typescript
 * const { events, loading, refreshing, loadingMore, error, hasMore, handleRefresh, handleEndReached } =
 *   usePaginatedEvents({
 *     fetchFn: async (pageSize, offset, organizationIds) => {
 *       const today = new Date().toISOString();
 *       // Fetch events for the first organization (or handle multiple orgs)
 *       return await getEventsBackend(today, pageSize, offset, undefined, organizationIds[0]);
 *     },
 *     formatFn: (events) => events.map(event => formatEventForList(event)),
 *     pageSize: 10,
 *   });
 * ```
 */
export function usePaginatedEvents<TApiData, TFormatted>({
  fetchFn,
  formatFn,
  pageSize = 10,
}: UsePaginatedEventsOptions<TApiData, TFormatted>): UsePaginatedEventsReturn<TFormatted> {
  const { user, isLogged } = useGlobalContext();
  const { userOrganizations, loading: orgsLoading } = useUserOrganizations();

  const [events, setEvents] = useState<TFormatted[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  const loadingRef = useRef<boolean>(false);

  const hasFetchedRef = useRef<boolean>(false);

  // Refs for the callback props so callers can pass inline functions without
  // forcing fetchEvents/handleRefresh to be recreated each render (which would
  // re-fire useFocusEffect in callers and cause an infinite loop).
  const fetchFnRef = useRef(fetchFn);
  const formatFnRef = useRef(formatFn);
  useLayoutEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);
  useLayoutEffect(() => {
    formatFnRef.current = formatFn;
  }, [formatFn]);

  // Offset is mirrored to a ref so loadMoreEvents always reads the latest
  // value without `offset` in its dependency array.
  const offsetRef = useRef(offset);
  useLayoutEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Memoized to avoid recreating the array each render — without this,
  // useCallback dependencies churn and trigger refetch loops.
  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  /** Initial load and refresh both fetch from offset 0. */
  const fetchEvents = useCallback(
    async (isRefresh: boolean = false) => {
      if (!user?.$id || organizationIds.length === 0) {
        logger.debug('[usePaginatedEvents] Skipping fetch, user not logged in or no organizations');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        logger.debug(`[usePaginatedEvents] Fetching events`, {
          isRefresh,
          pageSize,
          organizationIds,
        });
        setError(null);

        const response = await fetchFnRef.current(pageSize, 0, organizationIds);

        const formattedEvents = formatFnRef.current(response.events);

        setEvents(formattedEvents);
        setTotal(response.total);
        setOffset(pageSize);

        logger.debug(`[usePaginatedEvents] Fetch success`, {
          count: formattedEvents.length,
          total: response.total,
        });

        setHasMore(response.total > pageSize);
      } catch (err: any) {
        logger.error('Error fetching events:', { error: err });
        setError(err.message || 'Failed to fetch events');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.$id, pageSize, organizationIds]
  );

  /** Load more events for infinite scroll — appends to the existing list. */
  const loadMoreEvents = useCallback(async () => {
    if (!user?.$id || organizationIds.length === 0 || loadingRef.current || !hasMore) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoadingMore(true);

      const currentOffset = offsetRef.current;

      const response = await fetchFnRef.current(pageSize, currentOffset, organizationIds);

      const formattedEvents = formatFnRef.current(response.events);

      logger.debug(`[usePaginatedEvents] Load more success`, {
        count: formattedEvents.length,
        offset: currentOffset,
      });

      setEvents((prev) => [...prev, ...formattedEvents]);
      setTotal(response.total);
      setOffset((prev) => prev + pageSize);

      setHasMore(currentOffset + pageSize < response.total);
    } catch (err: any) {
      logger.error('Error loading more events:', { error: err });
      // Pagination errors don't surface to UI — just keep the existing list.
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [user?.$id, hasMore, pageSize, organizationIds]);

  // Initial fetch once user and organizations are available.
  useEffect(() => {
    if (
      isLogged &&
      user?.$id &&
      !orgsLoading &&
      organizationIds.length > 0 &&
      !hasFetchedRef.current
    ) {
      hasFetchedRef.current = true;
      fetchEvents();
    } else if (!isLogged || (!orgsLoading && organizationIds.length === 0)) {
      setLoading(false);
    }
  }, [fetchEvents, isLogged, user?.$id, orgsLoading, organizationIds.length]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    fetchEvents(true);
  }, [fetchEvents]);

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMoreEvents();
    }
  }, [loadMoreEvents, loadingMore, hasMore]);

  return {
    events,
    loading: loading || orgsLoading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    total,
    handleRefresh,
    handleEndReached,
  };
}
