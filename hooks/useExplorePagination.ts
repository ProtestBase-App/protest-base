import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getEventsBackend, EventFilterParams } from '@/services/event.service';
import { formatEventForList, FormattedEventListItem } from '@/utils/eventFormatters';
import { useGlobalContext } from '@/context/GlobalProvider';
import { isNetworkError } from '@/utils/networkError';
import { logger } from '@/utils/logger';

export interface ExploreFilters {
  /** Date filter preset: 'today', 'tomorrow', 'thisWeek', 'thisWeekend' or null for all dates */
  dateFilter: string | null;
  /** Array of postal codes to filter by */
  postalCodes: string[];
  /** Array of organization IDs to filter by */
  organizers: string[];
  /** Category filter or null for all categories */
  category: string | null;
  /** Search query string */
  search: string;
}

interface UseExplorePaginationOptions {
  /** Number of items to fetch per page (default: 20) */
  pageSize?: number;
  /** Server-side filter options */
  filters: ExploreFilters;
}

interface UseExplorePaginationReturn {
  /** Array of formatted events for display */
  events: FormattedEventListItem[];
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
  /** Total number of events matching the current filters */
  total: number;
  /** Function to trigger pull-to-refresh */
  handleRefresh: () => void;
  /** Function to handle infinite scroll (load more) */
  handleEndReached: () => void;
}

export function useExplorePagination({
  pageSize = 20,
  filters,
}: UseExplorePaginationOptions): UseExplorePaginationReturn {
  const { userLanguage } = useGlobalContext();

  const [events, setEvents] = useState<FormattedEventListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  const loadingRef = useRef<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);
  // Monotonic request id; lets in-flight handlers detect when their result is stale.
  const requestIdRef = useRef<number>(0);

  const userLanguageRef = useRef(userLanguage);
  userLanguageRef.current = userLanguage;

  // Stabilize array filter values by content rather than reference so changes
  // to the array's identity (but not its contents) don't refetch.
  const postalCodesKey = useMemo(() => filters.postalCodes.join(','), [filters.postalCodes]);
  const organizersKey = useMemo(() => filters.organizers.join(','), [filters.organizers]);

  const buildFilterParams = useCallback(
    (currentOffset: number): EventFilterParams => {
      const params: EventFilterParams = {
        limit: pageSize,
        offset: currentOffset,
        includeEnded: false,
      };

      if (filters.dateFilter && filters.dateFilter !== 'allDates') {
        params.dateFilter = filters.dateFilter as EventFilterParams['dateFilter'];
      }

      if (filters.postalCodes && filters.postalCodes.length > 0) {
        params.postalCodes = filters.postalCodes;
      }

      if (filters.organizers && filters.organizers.length > 0) {
        params.organizers = filters.organizers;
      }

      if (filters.category && filters.category !== 'allCategories') {
        params.category = filters.category;
      }

      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }

      return params;
    },
    [pageSize, filters.dateFilter, filters.category, filters.search, postalCodesKey, organizersKey]
  );

  // Fetch events (initial load or refresh). Uses requestId to discard stale
  // responses. Intentionally does NOT use the loadingRef guard — rapid filter
  // changes must always dispatch a new request so the requestIdRef can discard
  // the stale in-flight response.
  const fetchEvents = useCallback(
    async (isRefresh: boolean = false) => {
      const currentRequestId = ++requestIdRef.current;

      try {
        loadingRef.current = true;
        if (isRefresh) {
          setRefreshing(true);
        } else if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }
        setError(null);

        const params = buildFilterParams(0);

        logger.debug('[useExplorePagination] Fetching events', { isRefresh, params });

        const response = await getEventsBackend(params);

        // Discard if a newer request was issued while this one was in flight.
        if (currentRequestId !== requestIdRef.current) return;

        const formattedEvents = response.events.map((event) =>
          formatEventForList(event, userLanguageRef.current)
        );

        setEvents(formattedEvents);
        setTotal(response.total);
        setOffset(pageSize);
        setHasMore(response.total > pageSize);
        hasLoadedOnceRef.current = true;
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        const logAtLevel = isNetworkError(err) ? logger.warn : logger.error;
        logAtLevel('[useExplorePagination] Error fetching events:', { error: err });
        setError(err.message || 'Failed to fetch events');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          loadingRef.current = false;
        }
      }
    },
    [buildFilterParams, pageSize]
  );

  // Load more for infinite scroll. Uses loadingRef to coalesce duplicate
  // pagination calls; safe here because loadMore doesn't need to supersede
  // previous requests like fetchEvents does.
  const loadMoreEvents = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    const currentRequestId = requestIdRef.current;

    try {
      loadingRef.current = true;
      setLoadingMore(true);

      const params = buildFilterParams(offset);

      const response = await getEventsBackend(params);

      // Discard if a filter-change fetch happened while paginating.
      if (currentRequestId !== requestIdRef.current) return;

      const formattedEvents = response.events.map((event) =>
        formatEventForList(event, userLanguageRef.current)
      );

      setEvents((prev) => [...prev, ...formattedEvents]);
      const newOffset = offset + pageSize;
      setOffset(newOffset);
      setHasMore(newOffset < response.total);
    } catch (err: any) {
      const logAtLevel = isNetworkError(err) ? logger.warn : logger.error;
      logAtLevel('[useExplorePagination] Error loading more events:', { error: err });
    } finally {
      // Always reset loadingMore: if this request was superseded by a
      // filter-change fetch, the stale pagination state must still be cleared
      // so future pagination works.
      setLoadingMore(false);
      if (currentRequestId === requestIdRef.current) {
        loadingRef.current = false;
      }
    }
  }, [buildFilterParams, offset, hasMore, pageSize]);

  // Fetch on mount and whenever filters change. Resets to page 1.
  useEffect(() => {
    setOffset(0);
    setHasMore(true);

    if (!hasLoadedOnceRef.current) {
      setEvents([]);
    }

    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFilter, filters.category, filters.search, postalCodesKey, organizersKey]);

  const handleRefresh = useCallback(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadMoreEvents();
    }
  }, [loadMoreEvents, loadingMore, hasMore, loading]);

  return {
    events,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    total,
    handleRefresh,
    handleEndReached,
  };
}
