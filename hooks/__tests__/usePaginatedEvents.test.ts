/**
 * Tests for hooks/usePaginatedEvents.ts
 *
 * Generic paginated event hook used by My Events screens.
 * Depends on GlobalProvider (user, isLogged) and UserOrganizationsProvider.
 */

// ============================================
// Mocks (hoisted before imports)
// ============================================

let mockUser: { $id: string } | null = { $id: 'user-1' };
let mockIsLogged = true;

jest.mock('@/context/GlobalProvider', () => ({
  useGlobalContext: () => ({
    user: mockUser,
    isLogged: mockIsLogged,
    loading: false,
    eventsCache: {},
    eventsLoading: false,
    refetchEvents: jest.fn(),
    userLanguage: 'en',
  }),
}));

let mockUserOrganizations: Array<{ $id: string; name: string }> = [
  { $id: 'org-1', name: 'Org One' },
];
let mockOrgsLoading = false;

jest.mock('@/context/UserOrganizationsProvider', () => ({
  useUserOrganizations: () => ({
    userOrganizations: mockUserOrganizations,
    dropdownItems: [],
    selectedOrganizationId: null,
    setSelectedOrganizationId: jest.fn(),
    hasOrganizations: mockUserOrganizations.length > 0,
    hasSingleOrganization: mockUserOrganizations.length === 1,
    hasMultipleOrganizations: mockUserOrganizations.length > 1,
    loading: mockOrgsLoading,
    error: null,
    refreshOrganizations: jest.fn(),
  }),
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
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';

// ============================================
// Helpers
// ============================================

interface RawEvent {
  $id: string;
  title: string;
}

interface FormattedEvent {
  id: string;
  title: string;
}

function makeResponse(count: number, total: number, startId = 1) {
  return {
    events: Array.from(
      { length: count },
      (_, i): RawEvent => ({
        $id: String(startId + i),
        title: `Event ${startId + i}`,
      })
    ),
    total,
    limit: count,
    offset: startId - 1,
  };
}

const formatFn = (events: RawEvent[]): FormattedEvent[] =>
  events.map((e) => ({ id: e.$id, title: e.title }));

// ============================================
// Tests
// ============================================

describe('usePaginatedEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { $id: 'user-1' };
    mockIsLogged = true;
    mockUserOrganizations = [{ $id: 'org-1', name: 'Org One' }];
    mockOrgsLoading = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state while loading', () => {
    it('starts with loading=true when orgsLoading is false and user is logged in', async () => {
      const fetchFn = jest.fn().mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      // loading starts true before data arrives
      expect(result.current.loading).toBe(true);
    });

    it('starts with empty events array', () => {
      const fetchFn = jest.fn().mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      expect(result.current.events).toEqual([]);
    });

    it('starts with no error', () => {
      const fetchFn = jest.fn().mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      expect(result.current.error).toBeNull();
    });
  });

  describe('when user is not logged in', () => {
    it('sets loading=false immediately when isLogged is false', async () => {
      mockIsLogged = false;
      mockUser = null;

      const fetchFn = jest.fn();

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('when user has no organizations', () => {
    it('sets loading=false immediately when organizations are empty', async () => {
      mockUserOrganizations = [];

      const fetchFn = jest.fn();

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('when orgs are still loading', () => {
    it('does not call fetchFn while orgsLoading is true', async () => {
      mockOrgsLoading = true;

      const fetchFn = jest.fn().mockResolvedValue(makeResponse(3, 3));

      renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      // Wait a tick to let effects run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('successful fetch', () => {
    it('populates events after a successful fetch', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(3, 3));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.events).toHaveLength(3);
      expect(result.current.events[0]).toEqual({ id: '1', title: 'Event 1' });
    });

    it('calls fetchFn with correct arguments (pageSize, offset=0, organizationIds)', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(2, 2));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).toHaveBeenCalledWith(10, 0, ['org-1']);
    });

    it('sets hasMore=true when total exceeds pageSize', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(10, 25));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(true);
    });

    it('sets hasMore=false when all events fit in one page', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(5, 5));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('applies formatFn to transform raw events', async () => {
      const customFormat = jest.fn((events: RawEvent[]) =>
        events.map((e) => ({ id: e.$id, title: e.title.toUpperCase() }))
      );
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(2, 2));

      const { result } = renderHook(() =>
        usePaginatedEvents({ fetchFn, formatFn: customFormat, pageSize: 10 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.events[0].title).toBe('EVENT 1');
    });

    it('only fetches once even if hook re-renders (hasFetchedRef deduplication)', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(2, 2));

      const { result, rerender } = renderHook(() =>
        usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      rerender({});
      rerender({});

      // Still only 1 fetch call
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('sets error message when fetchFn rejects', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('API down'));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('API down');
      expect(result.current.events).toEqual([]);
    });

    it('uses fallback error message when error has no message', async () => {
      const fetchFn = jest.fn().mockRejectedValue({});

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Failed to fetch events');
    });
  });

  describe('handleRefresh', () => {
    it('sets refreshing=true then false', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(3, 3));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      let resolveRefresh!: (v: any) => void;
      fetchFn.mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.refreshing).toBe(true);

      await act(async () => {
        resolveRefresh(makeResponse(3, 3));
      });

      expect(result.current.refreshing).toBe(false);
    });

    it('re-fetches events from offset 0 and replaces list', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(makeResponse(3, 3))
        .mockResolvedValueOnce(makeResponse(2, 2));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(3);

      await act(async () => {
        result.current.handleRefresh();
      });

      await waitFor(() => expect(result.current.refreshing).toBe(false));

      expect(result.current.events).toHaveLength(2);

      // Refresh call should pass offset 0
      expect(fetchFn).toHaveBeenLastCalledWith(10, 0, ['org-1']);
    });
  });

  describe('handleEndReached (load more)', () => {
    it('does nothing when hasMore is false', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(5, 5));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(false);

      const callCountBefore = fetchFn.mock.calls.length;

      act(() => {
        result.current.handleEndReached();
      });

      expect(fetchFn).toHaveBeenCalledTimes(callCountBefore);
    });

    it('does nothing when loadingMore is true', async () => {
      const fetchFn = jest.fn().mockResolvedValueOnce(makeResponse(10, 20));

      let resolveLoadMore!: (v: any) => void;
      fetchFn.mockReturnValue(
        new Promise((resolve) => {
          resolveLoadMore = resolve;
        })
      );

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);

      // First handleEndReached starts loading more
      act(() => {
        result.current.handleEndReached();
      });

      expect(result.current.loadingMore).toBe(true);

      const callCountMid = fetchFn.mock.calls.length;

      // Second call while loadingMore=true should be ignored
      act(() => {
        result.current.handleEndReached();
      });

      expect(fetchFn).toHaveBeenCalledTimes(callCountMid);

      // Clean up
      await act(async () => {
        resolveLoadMore(makeResponse(10, 20, 11));
      });
    });

    it('appends more events to the list', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(makeResponse(10, 25, 1))
        .mockResolvedValueOnce(makeResponse(10, 25, 11));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(10);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      expect(result.current.events).toHaveLength(20);
      // The new items should be appended at the end
      expect(result.current.events[10]).toEqual({ id: '11', title: 'Event 11' });
    });

    it('passes the correct offset for the load more call', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(makeResponse(10, 25, 1))
        .mockResolvedValueOnce(makeResponse(10, 25, 11));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      // Second call (load more) should use offset=10 (pageSize after initial load)
      expect(fetchFn).toHaveBeenNthCalledWith(2, 10, 10, ['org-1']);
    });

    it('handles load more error gracefully without setting error state', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(makeResponse(10, 20, 1))
        .mockRejectedValueOnce(new Error('Load more failed'));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      // Error state should remain null for load more failures
      expect(result.current.error).toBeNull();
      // Existing events should remain
      expect(result.current.events).toHaveLength(10);
    });

    it('updates hasMore based on the new total after load more', async () => {
      // First page: 10 events, total 20 → hasMore = true
      // Second page: 10 events, total 20 → offset 10 + 10 >= 20 → hasMore = false
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(makeResponse(10, 20, 1))
        .mockResolvedValueOnce(makeResponse(10, 20, 11));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        result.current.handleEndReached();
      });

      await waitFor(() => expect(result.current.loadingMore).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('multiple organizations', () => {
    it('passes all organization IDs to fetchFn', async () => {
      mockUserOrganizations = [
        { $id: 'org-1', name: 'Org One' },
        { $id: 'org-2', name: 'Org Two' },
      ];

      const fetchFn = jest.fn().mockResolvedValue(makeResponse(2, 2));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).toHaveBeenCalledWith(10, 0, ['org-1', 'org-2']);
    });
  });

  describe('returned interface', () => {
    it('exposes all required fields', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(0, 0));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('events');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('refreshing');
      expect(result.current).toHaveProperty('loadingMore');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('handleRefresh');
      expect(result.current).toHaveProperty('handleEndReached');
    });

    it('uses default pageSize of 10 when not provided', async () => {
      const fetchFn = jest.fn().mockResolvedValue(makeResponse(5, 5));

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).toHaveBeenCalledWith(10, 0, ['org-1']);
    });
  });

  describe('fetchEvents early return: no user at render time', () => {
    it('does not call fetchFn when user is null from the start', async () => {
      // Render the hook with no user — the effect condition is not met
      mockUser = null;
      mockIsLogged = false;

      const fetchFn = jest.fn();

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('handleRefresh calls fetchEvents which short-circuits when user is null', async () => {
      // Render without a user so the initial fetch is skipped
      mockUser = null;
      mockIsLogged = false;

      const fetchFn = jest.fn();

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // handleRefresh calls fetchEvents; user is null → early return, loading/refreshing set false
      await act(async () => {
        result.current.handleRefresh();
      });

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result.current.refreshing).toBe(false);
    });

    it('loadMoreEvents short-circuits when user is null at render time', async () => {
      // No user — hasMore defaults to true but loadMoreEvents guards with !user?.$id
      mockUser = null;
      mockIsLogged = false;

      const fetchFn = jest.fn();

      const { result } = renderHook(() => usePaginatedEvents({ fetchFn, formatFn, pageSize: 10 }));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleEndReached();
      });

      expect(fetchFn).not.toHaveBeenCalled();
    });
  });
});
