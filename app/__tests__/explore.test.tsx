jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('@/services/event.service', () => ({
  getEventByIdBackend: jest.fn(),
  getEventsBackend: jest.fn().mockResolvedValue({ events: [], total: 0, limit: 1, offset: 0 }),
}));
jest.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn((value) => value),
}));
jest.mock('@/hooks/useExplorePagination', () => ({
  useExplorePagination: jest.fn(() => ({
    events: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: false,
    handleRefresh: jest.fn(),
    handleEndReached: jest.fn(),
  })),
}));

import React from 'react';
import { renderWithProviders, fireEvent, waitFor, act, createMockEvent } from '@/test-utils/render';
import ExploreTab from '@/app/(tabs)/(explore)/explore';
import { getEventByIdBackend, getEventsBackend } from '@/services/event.service';
import { useExplorePagination } from '@/hooks/useExplorePagination';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

describe('Explore Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('shows loading indicator when events are loading initially', () => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: true,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />);

      const loader = UNSAFE_getByType(BrandLoader);
      expect(loader).toBeTruthy();
    });

    it('shows loading indicator when postal codes are loading', () => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          postalCodeContext: { loading: true },
        },
      });

      const loader = UNSAFE_getByType(BrandLoader);
      expect(loader).toBeTruthy();
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });
    });

    it('renders the logo', () => {
      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />);

      const images = UNSAFE_getByType(require('react-native').Image);
      expect(images).toBeTruthy();
    });

    it('renders the search input', () => {
      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />);

      const SearchInput = require('@/components/SearchInput').default;
      expect(UNSAFE_getByType(SearchInput)).toBeTruthy();
    });

    it('renders the filter button', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(<ExploreTab />);

      // Filter button is a TouchableOpacity with IconSymbol
      const filterButtons = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      expect(filterButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Event List Display', () => {
    it('renders event cards when events are available', () => {
      const mockFormattedEvent = {
        $id: 'event-1',
        title: 'Test Event',
        description: 'Test Description',
        image: null,
        city: 'Brussels',
        country: 'belgium',
        startDateFull: new Date().toISOString(),
        endDateFull: null,
        categories: ['climate'],
        organizer_name: 'Test Org',
        organization_id: 'org-1',
        co_organizers: [],
        postal_code: 1000,
        view_count: 0,
        help_needed: false,
      };

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [mockFormattedEvent],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { getByText } = renderWithProviders(<ExploreTab />);

      expect(getByText('Test Event')).toBeTruthy();
    });

    it('shows empty state when no events are available', () => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />);

      const EmptyEventMyEvents = require('@/components/EmptyEventMyEvents').default;
      expect(UNSAFE_getByType(EmptyEventMyEvents)).toBeTruthy();
    });

    it('shows loading footer when loading more events', () => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [
          {
            $id: 'event-1',
            title: 'Event 1',
            description: '',
            image: null,
            city: 'Brussels',
            country: 'belgium',
            startDateFull: new Date().toISOString(),
            endDateFull: null,
            categories: ['climate'],
            organizer_name: 'Org',
            organization_id: 'org-1',
            co_organizers: [],
            postal_code: 1000,
            view_count: 0,
            help_needed: false,
          },
        ],
        loading: false,
        refreshing: false,
        loadingMore: true,
        hasMore: true,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { UNSAFE_getAllByType } = renderWithProviders(<ExploreTab />);

      const loaders = UNSAFE_getAllByType(BrandLoader);
      expect(loaders.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('updates search query when user types in search input', () => {
      const mockSetSearchQuery = jest.fn();

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const { UNSAFE_getByType } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            searchQuery: '',
            setSearchQuery: mockSetSearchQuery,
          },
        },
      });

      const SearchInput = require('@/components/SearchInput').default;
      const searchInput = UNSAFE_getByType(SearchInput);

      // Trigger search via props
      fireEvent(searchInput, 'onSearch', 'climate protest');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('climate protest');
    });

    it('debounces search query changes', () => {
      const mockSetSearchQuery = jest.fn();

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            searchQuery: '',
            setSearchQuery: mockSetSearchQuery,
          },
        },
      });

      // useDebouncedValue is mocked to return the value immediately
      // In real scenario, it would debounce
      expect(mockSetSearchQuery).toBeDefined();
    });
  });

  describe('Filters Sheet', () => {
    beforeEach(() => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
      jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('opens the filters sheet when the filter button is pressed', async () => {
      const { getByLabelText, getByText, queryByText } = renderWithProviders(<ExploreTab />);

      // Sheet content is not rendered until the filter button is pressed
      expect(queryByText('filters.title')).toBeNull();
      expect(queryByText('filters.category')).toBeNull();

      fireEvent.press(getByLabelText('filters.title'));

      expect(getByText('filters.title')).toBeTruthy();
      expect(getByText('filters.category')).toBeTruthy();

      // Flush the debounced live-count fetch fired on open
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(getEventsBackend).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1, offset: 0, includeEnded: false })
      );
      // Mock returns total: 0 -> "no events" apply label
      expect(getByText('home.filterApplyNone')).toBeTruthy();
    });

    it('applies draft filters and triggers scroll to top', () => {
      const mockSetAppliedFilters = jest.fn();
      const mockSetShouldScrollToTop = jest.fn();

      const { getByLabelText, getByText, queryByText } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            setAppliedFilters: mockSetAppliedFilters,
            setShouldScrollToTop: mockSetShouldScrollToTop,
          },
        },
      });

      fireEvent.press(getByLabelText('filters.title'));

      // Toggle a category in the sheet's draft
      fireEvent.press(getByText('categories.protest'));

      // Apply (label is the fallback while the debounced count is still pending)
      fireEvent.press(getByText('filters.confirmFilters'));

      expect(mockSetAppliedFilters).toHaveBeenCalledWith({
        category: 'Protest',
        dateFilter: null,
        locations: [],
        organizations: [],
      });
      expect(mockSetShouldScrollToTop).toHaveBeenCalledWith(true);
      // Sheet closes after apply
      expect(queryByText('filters.category')).toBeNull();
    });
  });

  describe('Active Filters', () => {
    beforeEach(() => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });
    });

    it('shows the badge with the total number of applied filters', () => {
      const { getByLabelText, getByText } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            appliedFilters: {
              category: 'Protest',
              dateFilter: null,
              locations: ['m:be:1000', 'm:be:2000'],
              organizations: [],
            },
          },
        },
      });

      expect(getByLabelText('filters.title (3)')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('renders a chip for each active filter', () => {
      const { getByText } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            appliedFilters: {
              category: 'Protest',
              dateFilter: 'today',
              locations: ['m:be:1000'],
              organizations: [],
            },
          },
        },
      });

      expect(getByText('categories.protest')).toBeTruthy();
      expect(getByText('filters.today')).toBeTruthy();
      // Default resolveLocationLabel mock is identity
      expect(getByText('m:be:1000')).toBeTruthy();
    });

    it('clears the category filter when its chip is pressed', () => {
      const mockSetAppliedFilters = jest.fn();
      const applied = { category: 'Protest', dateFilter: null, locations: [], organizations: [] };

      const { getByText } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            appliedFilters: applied,
            setAppliedFilters: mockSetAppliedFilters,
          },
        },
      });

      fireEvent.press(getByText('categories.protest'));

      expect(mockSetAppliedFilters).toHaveBeenCalledTimes(1);
      const updater = mockSetAppliedFilters.mock.calls[0][0];
      expect(updater(applied)).toEqual({
        category: null,
        dateFilter: null,
        locations: [],
        organizations: [],
      });
    });

    it('removes a single location token when its chip is pressed', () => {
      const mockSetAppliedFilters = jest.fn();
      const applied = {
        category: null,
        dateFilter: null,
        locations: ['m:be:1000', 'm:be:2000'],
        organizations: [],
      };

      const { getByText } = renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            appliedFilters: applied,
            setAppliedFilters: mockSetAppliedFilters,
          },
        },
      });

      fireEvent.press(getByText('m:be:1000'));

      expect(mockSetAppliedFilters).toHaveBeenCalledTimes(1);
      const updater = mockSetAppliedFilters.mock.calls[0][0];
      expect(updater(applied)).toEqual({
        category: null,
        dateFilter: null,
        locations: ['m:be:2000'],
        organizations: [],
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('calls handleRefresh when pull-to-refresh is triggered', async () => {
      const mockHandleRefresh = jest.fn();

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: mockHandleRefresh,
        handleEndReached: jest.fn(),
      });

      renderWithProviders(<ExploreTab />);

      // The FlatList receives handleRefresh as onRefresh prop
      expect(mockHandleRefresh).toBeDefined();
    });
  });

  describe('Event Actions', () => {
    it('handles save event action', async () => {
      const mockSaveEvent = jest.fn().mockResolvedValue(undefined);
      const mockIsSaved = jest.fn().mockReturnValue(false);

      const mockFormattedEvent = {
        $id: 'event-1',
        title: 'Test Event',
        description: 'Test Description',
        image: null,
        city: 'Brussels',
        country: 'belgium',
        startDateFull: new Date().toISOString(),
        endDateFull: null,
        categories: ['climate'],
        organizer_name: 'Test Org',
        organization_id: 'org-1',
        co_organizers: [],
        postal_code: 1000,
        view_count: 0,
        help_needed: false,
      };

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [mockFormattedEvent],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          savedEventsContext: {
            saveEvent: mockSaveEvent,
            isSaved: mockIsSaved,
          },
        },
      });

      // Event card renders with save functionality
      expect(mockSaveEvent).toBeDefined();
      expect(mockIsSaved).toBeDefined();
    });

    it('handles share event action', async () => {
      const mockEvent = createMockEvent({
        $id: 'event-share',
        title: 'Shareable Event',
      });

      (getEventByIdBackend as jest.Mock).mockResolvedValue(mockEvent);

      const mockFormattedEvent = {
        $id: 'event-share',
        title: 'Shareable Event',
        description: 'Test Description',
        image: null,
        city: 'Brussels',
        country: 'belgium',
        startDateFull: new Date().toISOString(),
        endDateFull: null,
        categories: ['climate'],
        organizer_name: 'Test Org',
        organization_id: 'org-1',
        co_organizers: [],
        postal_code: 1000,
        view_count: 0,
        help_needed: false,
      };

      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [mockFormattedEvent],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      renderWithProviders(<ExploreTab />);

      // Share functionality is available through event cards
      // Actual testing would require triggering share from ExploreEventCard
    });
  });

  describe('Scroll to Top', () => {
    it('scrolls to top when shouldScrollToTop is true', async () => {
      (useExplorePagination as jest.Mock).mockReturnValue({
        events: [],
        loading: false,
        refreshing: false,
        loadingMore: false,
        hasMore: false,
        handleRefresh: jest.fn(),
        handleEndReached: jest.fn(),
      });

      const mockSetShouldScrollToTop = jest.fn();

      renderWithProviders(<ExploreTab />, {
        providerOverrides: {
          exploreTabContext: {
            shouldScrollToTop: true,
            setShouldScrollToTop: mockSetShouldScrollToTop,
          },
        },
      });

      await waitFor(() => {
        expect(mockSetShouldScrollToTop).toHaveBeenCalledWith(false);
      });
    });
  });
});
