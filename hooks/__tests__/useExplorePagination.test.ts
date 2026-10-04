/**
 * Tests for hooks/useExplorePagination.ts
 *
 * This hook handles server-side paginated event fetching with filtering,
 * infinite scroll, and pull-to-refresh.
 */

// ============================================
// Mocks (must be hoisted before imports)
// ============================================

const mockGetEventsForLocations = jest.fn();

jest.mock('@/services/event.service', () => {
  class LocationSelectionTooBroadError extends Error {}
  return {
    getEventsForLocations: (...args: any[]) => mockGetEventsForLocations(...args),
    LocationSelectionTooBroadError,
  };
});

const mockUserLanguage = 'en';

jest.mock('@/context/GlobalProvider', () => ({
  useGlobalContext: () => ({
    userLanguage: mockUserLanguage,
    isLogged: true,
    user: { $id: 'user-1' },
    loading: false,
    eventsCache: {},
    eventsLoading: false,
    refetchEvents: jest.fn(),
  }),
}));

const mockFormatEventForList = jest.fn((event: any, _lang: string) => ({
  id: event.$id || event.id,
  title: event.title,
  formattedDate: '2025-12-01',
}));

jest.mock('@/utils/eventFormatters', () => ({
  formatEventForList: (...args: [any, string]) => mockFormatEventForList(...args),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useExplorePagination, ExploreFilters } from '@/hooks/useExplorePagination';
import { t } from '@/utils/i18n';

// ============================================
// Helpers
// ============================================

const defaultFilters: ExploreFilters = {
  dateFilter: null,
  locations: [],
  organizers: [],
  category: null,
  search: '',
};

const mockExpand = jest.fn((values: string[]) => ({ codes: values, truncated: false }));

function makeApiResponse(count: number, total: number, startId = 1) {
  return {
    events: Array.from({ length: count }, (_, i) => ({
      $id: String(startId + i),
      id: String(startId + i),
      title: `Event ${startId + i}`,
    })),
    total,
  };
}

// ============================================
// Tests
// ============================================

describe('useExplorePagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatEventForList.mockImplementation((event: any, _lang: string) => ({
      id: event.$id || event.id,
      title: event.title,
      formattedDate: '2025-12-01',
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial load', () => {
    it('starts with loading=true, empty events, no error', () => {
      mockGetEventsForLocations.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('sets events, total, and turns off loading after successful fetch', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(3, 3));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toHaveLength(3);
      expect(result.current.total).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('sets hasMore=true when total exceeds pageSize', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(20, 50));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);
      expect(result.current.total).toBe(50);
    });

    it('sets hasMore=false when total equals pageSize', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(20, 20));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('sets hasMore=false when total is less than pageSize', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('sets error when fetch fails', async () => {
      mockGetEventsForLocations.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Network failure');
      expect(result.current.events).toEqual([]);
    });

    it('uses fallback error message when error has no message property', async () => {
      mockGetEventsForLocations.mockRejectedValue({});

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Failed to fetch events');
    });

    it('formats events using formatEventForList with userLanguage', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFormatEventForList).toHaveBeenCalledTimes(2);
      expect(mockFormatEventForList).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Event 1' }),
        'en'
      );
    });
  });

  describe('filter params sent to API', () => {
    it('sends dateFilter when set', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        dateFilter: 'today',
      };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ dateFilter: 'today' }),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('does not send dateFilter when value is null', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsForLocations.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('dateFilter');
    });

    it('passes the location selection to the area-aware fetch', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        locations: ['r:be:brussels', 'm:be:9000'],
      };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const [params, locations] = mockGetEventsForLocations.mock.calls[0];
      expect(locations).toEqual(['r:be:brussels', 'm:be:9000']);
      // The service decides between `areas` and `postalCodes`; the hook sends neither.
      expect(params).not.toHaveProperty('areas');
      expect(params).not.toHaveProperty('postalCodes');
    });

    it('passes an empty selection when no location filter is set', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations.mock.calls[0][1]).toEqual([]);
    });

    it('shows the too-broad message when the selection cannot be sent', async () => {
      const { LocationSelectionTooBroadError } = jest.requireMock('@/services/event.service');
      mockGetEventsForLocations.mockRejectedValue(new LocationSelectionTooBroadError());

      const filters: ExploreFilters = { ...defaultFilters, locations: ['1000', '9000'] };
      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe(t('filters.selectionTooBroad'));
    });

    it('does not refetch when only the expander changes (postal data loading)', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));
      const filters: ExploreFilters = { ...defaultFilters, locations: ['r:be:brussels'] };

      const { result, rerender } = renderHook(
        ({ expand }: { expand: typeof mockExpand }) =>
          useExplorePagination({ expandLocations: expand, filters, pageSize: 20 }),
        { initialProps: { expand: mockExpand } }
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      rerender({ expand: jest.fn((values: string[]) => ({ codes: values, truncated: false })) });

      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(1);
    });

    it('keeps the same selection when loading more pages', async () => {
      mockGetEventsForLocations
        .mockResolvedValueOnce(makeApiResponse(20, 40))
        .mockResolvedValueOnce(makeApiResponse(20, 40, 21));
      const filters: ExploreFilters = { ...defaultFilters, locations: ['p:nl:fryslan'] };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(mockGetEventsForLocations).toHaveBeenCalledTimes(2));
      expect(mockGetEventsForLocations.mock.calls[1][1]).toEqual(['p:nl:fryslan']);
      expect(mockGetEventsForLocations.mock.calls[1][0]).toEqual(
        expect.objectContaining({ offset: 20 })
      );
    });

    it('sends organizers when provided', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        organizers: ['org-1', 'org-2'],
      };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ organizers: ['org-1', 'org-2'] }),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('sends category when set', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        category: 'Climate',
      };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Climate' }),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('sends trimmed search when not empty', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        search: '  climate  ',
      };

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'climate' }),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('does not send search when string is empty', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsForLocations.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('search');
    });

    it('always sends includeEnded: false', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ includeEnded: false }),
        expect.any(Array),
        expect.any(Function)
      );
    });
  });

  describe('filter changes trigger re-fetch', () => {
    it('re-fetches when dateFilter changes', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));

      let filters: ExploreFilters = { ...defaultFilters };

      const { result, rerender } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(1);

      // Change filter
      filters = { ...filters, dateFilter: 'today' };
      rerender({});

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(2);
    });

    it('replaces events when filters change', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(3, 3));

      let filters: ExploreFilters = { ...defaultFilters };
      const { result, rerender } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(3);

      // Change filter — new fetch replaces events
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(1, 1));
      filters = { ...filters, category: 'Climate' };
      rerender({});

      await waitFor(() => expect(result.current.events).toHaveLength(1));
    });
  });

  describe('handleRefresh', () => {
    it('sets refreshing=true during refresh', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Set up a promise we can control
      let resolveRefresh!: (value: any) => void;
      mockGetEventsForLocations.mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.refreshing).toBe(true);

      await act(async () => {
        resolveRefresh(makeApiResponse(2, 2));
      });

      expect(result.current.refreshing).toBe(false);
    });

    it('re-fetches events from offset 0 on refresh', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));
      await act(async () => {
        result.current.handleRefresh();
      });

      await waitFor(() => expect(result.current.refreshing).toBe(false));

      // The refresh call should have offset: 0
      const lastCall =
        mockGetEventsForLocations.mock.calls[mockGetEventsForLocations.mock.calls.length - 1][0];
      expect(lastCall.offset).toBe(0);
    });
  });

  describe('handleEndReached (load more)', () => {
    it('does nothing when hasMore is false', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(false);

      const callCountBefore = mockGetEventsForLocations.mock.calls.length;

      act(() => {
        result.current.handleEndReached();
      });

      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(callCountBefore);
    });

    it('does nothing when loading is true', async () => {
      // Never resolves so loading stays true
      mockGetEventsForLocations.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      expect(result.current.loading).toBe(true);

      const callCountBefore = mockGetEventsForLocations.mock.calls.length;

      act(() => {
        result.current.handleEndReached();
      });

      // No additional call beyond the initial one
      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(callCountBefore);
    });

    it('loads more events and appends them when hasMore is true', async () => {
      // First call: 20 events, total 40 → hasMore=true
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 1));
      // Second call: 20 more events
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 21));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(20);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      expect(result.current.events).toHaveLength(40);
    });

    it('does not duplicate load more calls (deduplication via loadingRef)', async () => {
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let resolveLoadMore!: (v: any) => void;
      mockGetEventsForLocations.mockReturnValue(
        new Promise((resolve) => {
          resolveLoadMore = resolve;
        })
      );

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger multiple times while first load is in progress
      act(() => {
        result.current.handleEndReached();
        result.current.handleEndReached();
        result.current.handleEndReached();
      });

      await act(async () => {
        resolveLoadMore(makeApiResponse(20, 40, 21));
      });

      // Only 2 calls total: 1 initial + 1 load more (no duplicates)
      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(2);
    });

    it('handles load more error gracefully without setting error state', async () => {
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 1));
      mockGetEventsForLocations.mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      // Error state should NOT be set for load more failures
      expect(result.current.error).toBeNull();
      // Existing events should remain
      expect(result.current.events).toHaveLength(20);
    });
  });

  describe('default pageSize', () => {
    it('uses pageSize 20 by default when not provided', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
        expect.any(Array),
        expect.any(Function)
      );
    });
  });

  describe('returned interface', () => {
    it('exposes all required fields', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('events');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('refreshing');
      expect(result.current).toHaveProperty('loadingMore');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('total');
      expect(result.current).toHaveProperty('handleRefresh');
      expect(result.current).toHaveProperty('handleEndReached');
    });
  });

  describe('unmount during fetch (isMountedRef guards)', () => {
    it('does not update state after unmount during initial fetch', async () => {
      // The isMountedRef guards prevent setState calls on unmounted components.
      // We verify no errors are thrown when unmounting mid-fetch.
      let resolveInitial!: (v: any) => void;
      mockGetEventsForLocations.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitial = resolve;
        })
      );

      const { unmount } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      // Unmount while fetch is still in flight
      unmount();

      // Resolve after unmount — should not cause errors or state updates
      await act(async () => {
        resolveInitial(makeApiResponse(2, 2));
      });

      // No assertions on state — just verifying no crash
    });

    it('does not update state after unmount during fetch error', async () => {
      let rejectInitial!: (reason: any) => void;
      mockGetEventsForLocations.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectInitial = reject;
        })
      );

      const { unmount } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      unmount();

      await act(async () => {
        rejectInitial(new Error('Fetch failed after unmount'));
      });

      // No crash expected
    });

    it('does not update state after unmount during load more', async () => {
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let resolveLoadMore!: (v: any) => void;
      mockGetEventsForLocations.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLoadMore = resolve;
        })
      );

      const { result, unmount } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);

      // Start load more, then unmount before it resolves
      act(() => {
        result.current.handleEndReached();
      });

      unmount();

      await act(async () => {
        resolveLoadMore(makeApiResponse(20, 40, 21));
      });

      // No crash expected
    });

    it('does not update state after unmount during load more error', async () => {
      mockGetEventsForLocations.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let rejectLoadMore!: (reason: any) => void;
      mockGetEventsForLocations.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectLoadMore = reject;
        })
      );

      const { result, unmount } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.handleEndReached();
      });

      unmount();

      await act(async () => {
        rejectLoadMore(new Error('Load more failed after unmount'));
      });

      // No crash expected
    });
  });

  describe('deduplication: stale response discard (requestIdRef)', () => {
    it('discards stale first response when handleRefresh is called during initial fetch', async () => {
      // The hook uses requestIdRef to discard stale responses.
      // A second fetchEvents call (via handleRefresh) during the first fetch
      // causes the first response to be discarded when it arrives.
      let resolveFirst!: (v: any) => void;
      mockGetEventsForLocations.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      );
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ expandLocations: mockExpand, filters: defaultFilters, pageSize: 20 })
      );

      // First call is in flight; loading is true
      expect(result.current.loading).toBe(true);

      // Calling handleRefresh triggers a new fetch (requestId increments)
      act(() => {
        result.current.handleRefresh();
      });

      // Two API calls were made: the initial and the refresh
      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(2);

      // Resolve the stale first call — its result should be discarded
      await act(async () => {
        resolveFirst(makeApiResponse(5, 5));
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should have the refresh result (2 events), not the stale first result (5 events)
      expect(result.current.events).toHaveLength(2);
    });
  });

  describe('offline behavior (isOffline)', () => {
    it('does not call getEventsBackend on mount when offline, and sets an error', async () => {
      const { result } = renderHook(() =>
        useExplorePagination({
          expandLocations: mockExpand,
          filters: defaultFilters,
          pageSize: 20,
          isOffline: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsForLocations).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
      expect(result.current.events).toEqual([]);
    });

    it('handleEndReached does not fetch when offline', async () => {
      const { result } = renderHook(() =>
        useExplorePagination({
          expandLocations: mockExpand,
          filters: defaultFilters,
          pageSize: 20,
          isOffline: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleEndReached();
      });

      expect(mockGetEventsForLocations).not.toHaveBeenCalled();
    });

    it('keeps already-loaded events when going offline and refreshing', async () => {
      mockGetEventsForLocations.mockResolvedValue(makeApiResponse(3, 3));

      let isOffline = false;
      const { result, rerender } = renderHook(() =>
        useExplorePagination({
          expandLocations: mockExpand,
          filters: defaultFilters,
          pageSize: 20,
          isOffline,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(3);

      // Connectivity drops; a pull-to-refresh must not wipe the loaded pages.
      isOffline = true;
      rerender({});
      const callCountBefore = mockGetEventsForLocations.mock.calls.length;

      await act(async () => {
        result.current.handleRefresh();
      });

      expect(mockGetEventsForLocations).toHaveBeenCalledTimes(callCountBefore);
      expect(result.current.events).toHaveLength(3);
    });
  });
});
