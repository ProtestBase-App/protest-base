/**
 * Tests for hooks/useExplorePagination.ts
 *
 * This hook handles server-side paginated event fetching with filtering,
 * infinite scroll, and pull-to-refresh.
 */

// ============================================
// Mocks (must be hoisted before imports)
// ============================================

const mockGetEventsBackend = jest.fn();

jest.mock('@/services/event.service', () => ({
  getEventsBackend: (...args: any[]) => mockGetEventsBackend(...args),
}));

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

// ============================================
// Helpers
// ============================================

const defaultFilters: ExploreFilters = {
  dateFilter: null,
  postalCodes: [],
  organizers: [],
  category: null,
  search: '',
};

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
      mockGetEventsBackend.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('sets events, total, and turns off loading after successful fetch', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(3, 3));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toHaveLength(3);
      expect(result.current.total).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('sets hasMore=true when total exceeds pageSize', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(20, 50));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);
      expect(result.current.total).toBe(50);
    });

    it('sets hasMore=false when total equals pageSize', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(20, 20));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('sets hasMore=false when total is less than pageSize', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('sets error when fetch fails', async () => {
      mockGetEventsBackend.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Network failure');
      expect(result.current.events).toEqual([]);
    });

    it('uses fallback error message when error has no message property', async () => {
      mockGetEventsBackend.mockRejectedValue({});

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Failed to fetch events');
    });

    it('formats events using formatEventForList with userLanguage', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
    it('sends dateFilter when set to a non-allDates value', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        dateFilter: 'today',
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ dateFilter: 'today' })
      );
    });

    it('does not send dateFilter when value is "allDates"', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        dateFilter: 'allDates',
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.not.objectContaining({ dateFilter: 'allDates' })
      );
    });

    it('does not send dateFilter when value is null', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsBackend.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('dateFilter');
    });

    it('sends postalCodes when provided', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        postalCodes: ['1000', '9000'],
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ postalCodes: ['1000', '9000'] })
      );
    });

    it('does not send postalCodes when array is empty', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsBackend.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('postalCodes');
    });

    it('sends organizers when provided', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        organizers: ['org-1', 'org-2'],
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ organizers: ['org-1', 'org-2'] })
      );
    });

    it('sends category when not "allCategories"', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        category: 'Climate',
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Climate' })
      );
    });

    it('does not send category when value is "allCategories"', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        category: 'allCategories',
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsBackend.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('category');
    });

    it('sends trimmed search when not empty', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const filters: ExploreFilters = {
        ...defaultFilters,
        search: '  climate  ',
      };

      const { result } = renderHook(() => useExplorePagination({ filters, pageSize: 20 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'climate' })
      );
    });

    it('does not send search when string is empty', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const callArgs = mockGetEventsBackend.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('search');
    });

    it('always sends includeEnded: false', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ includeEnded: false })
      );
    });
  });

  describe('filter changes trigger re-fetch', () => {
    it('re-fetches when dateFilter changes', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));

      let filters: ExploreFilters = { ...defaultFilters };

      const { result, rerender } = renderHook(() =>
        useExplorePagination({ filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(1);

      // Change filter
      filters = { ...filters, dateFilter: 'today' };
      rerender({});

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(2);
    });

    it('replaces events when filters change', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(3, 3));

      let filters: ExploreFilters = { ...defaultFilters };
      const { result, rerender } = renderHook(() =>
        useExplorePagination({ filters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(3);

      // Change filter — new fetch replaces events
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(1, 1));
      filters = { ...filters, category: 'Climate' };
      rerender({});

      await waitFor(() => expect(result.current.events).toHaveLength(1));
    });
  });

  describe('handleRefresh', () => {
    it('sets refreshing=true during refresh', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Set up a promise we can control
      let resolveRefresh!: (value: any) => void;
      mockGetEventsBackend.mockReturnValue(
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
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));
      await act(async () => {
        result.current.handleRefresh();
      });

      await waitFor(() => expect(result.current.refreshing).toBe(false));

      // The refresh call should have offset: 0
      const lastCall =
        mockGetEventsBackend.mock.calls[mockGetEventsBackend.mock.calls.length - 1][0];
      expect(lastCall.offset).toBe(0);
    });
  });

  describe('handleEndReached (load more)', () => {
    it('does nothing when hasMore is false', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(false);

      const callCountBefore = mockGetEventsBackend.mock.calls.length;

      act(() => {
        result.current.handleEndReached();
      });

      expect(mockGetEventsBackend).toHaveBeenCalledTimes(callCountBefore);
    });

    it('does nothing when loading is true', async () => {
      // Never resolves so loading stays true
      mockGetEventsBackend.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      expect(result.current.loading).toBe(true);

      const callCountBefore = mockGetEventsBackend.mock.calls.length;

      act(() => {
        result.current.handleEndReached();
      });

      // No additional call beyond the initial one
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(callCountBefore);
    });

    it('loads more events and appends them when hasMore is true', async () => {
      // First call: 20 events, total 40 → hasMore=true
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 1));
      // Second call: 20 more events
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 21));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let resolveLoadMore!: (v: any) => void;
      mockGetEventsBackend.mockReturnValue(
        new Promise((resolve) => {
          resolveLoadMore = resolve;
        })
      );

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(2);
    });

    it('handles load more error gracefully without setting error state', async () => {
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 1));
      mockGetEventsBackend.mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(5, 5));

      const { result } = renderHook(() => useExplorePagination({ filters: defaultFilters }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetEventsBackend).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    });
  });

  describe('returned interface', () => {
    it('exposes all required fields', async () => {
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(0, 0));

      const { result } = renderHook(() => useExplorePagination({ filters: defaultFilters }));

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
      mockGetEventsBackend.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitial = resolve;
        })
      );

      const { unmount } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      mockGetEventsBackend.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectInitial = reject;
        })
      );

      const { unmount } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      unmount();

      await act(async () => {
        rejectInitial(new Error('Fetch failed after unmount'));
      });

      // No crash expected
    });

    it('does not update state after unmount during load more', async () => {
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let resolveLoadMore!: (v: any) => void;
      mockGetEventsBackend.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLoadMore = resolve;
        })
      );

      const { result, unmount } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      mockGetEventsBackend.mockResolvedValueOnce(makeApiResponse(20, 40, 1));

      let rejectLoadMore!: (reason: any) => void;
      mockGetEventsBackend.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectLoadMore = reject;
        })
      );

      const { result, unmount } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
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
      mockGetEventsBackend.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      );
      mockGetEventsBackend.mockResolvedValue(makeApiResponse(2, 2));

      const { result } = renderHook(() =>
        useExplorePagination({ filters: defaultFilters, pageSize: 20 })
      );

      // First call is in flight; loading is true
      expect(result.current.loading).toBe(true);

      // Calling handleRefresh triggers a new fetch (requestId increments)
      act(() => {
        result.current.handleRefresh();
      });

      // Two API calls were made: the initial and the refresh
      expect(mockGetEventsBackend).toHaveBeenCalledTimes(2);

      // Resolve the stale first call — its result should be discarded
      await act(async () => {
        resolveFirst(makeApiResponse(5, 5));
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should have the refresh result (2 events), not the stale first result (5 events)
      expect(result.current.events).toHaveLength(2);
    });
  });
});
