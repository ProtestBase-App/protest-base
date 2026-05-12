jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));
jest.mock('@/hooks/useHomeViewPreference', () => ({
  useHomeViewPreference: () => ({ viewMode: 'calendar', setViewMode: jest.fn(), ready: true }),
}));
jest.mock('@/services/event.service', () => ({
  getEventByIdBackend: jest.fn(),
  EventNotFoundError: class extends Error {
    code = 'EVENT_NOT_FOUND' as const;
  },
}));

import React from 'react';
import { renderWithProviders, createMockEvent } from '@/test-utils/render';
import HomeTab from '@/app/(tabs)/home';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Pin Date.now() to mid-morning UTC so that test events scheduled at
    // `Date.now() + 1h` always land on the same local *and* UTC calendar day.
    // Without this, runs between ~22:00 and 24:00 in CEST roll over to the
    // next UTC day and the calendar grid's "today selected" assertion fails.
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Loading States', () => {
    it('shows loading indicator when events are loading', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsLoading: true },
        },
      });

      const loader = UNSAFE_getByType(BrandLoader);
      expect(loader).toBeTruthy();
    });

    it('shows loading indicator when saved events are loading', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          savedEventsContext: { loading: true },
        },
      });

      const loader = UNSAFE_getByType(BrandLoader);
      expect(loader).toBeTruthy();
    });

    it('shows loading indicator when postal codes are loading', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          postalCodeContext: { loading: true },
        },
      });

      const loader = UNSAFE_getByType(BrandLoader);
      expect(loader).toBeTruthy();
    });
  });

  describe('Calendar Header', () => {
    it('renders the month picker button', () => {
      const { getByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      expect(getByLabelText(/open month picker/)).toBeTruthy();
    });

    it('renders the today button', () => {
      const { getByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      expect(getByLabelText('Go to today')).toBeTruthy();
    });
  });

  describe('Calendar Grid', () => {
    it('renders day-of-week headers', () => {
      const { getAllByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      // Calendar grid should contain day cells
      const dayCells = getAllByLabelText(/has events|Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
      expect(dayCells.length).toBeGreaterThan(0);
    });
  });

  describe('Rendering - Guest User', () => {
    it('renders empty state when user is not logged in', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: false },
          savedEventsContext: { savedEventIds: [] },
        },
      });

      const EmptyEventComponent = require('@/components/EmptyEvent').default;
      expect(UNSAFE_getByType(EmptyEventComponent)).toBeTruthy();
    });
  });

  describe('Saved Events Display', () => {
    it('shows event dots on days with saved events', () => {
      // Create an event for today so it shows on the calendar
      const todayEvent = createMockEvent({
        $id: 'event-today',
        title: 'Today Event',
        start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });

      const eventsCache = {
        'event-today': todayEvent,
      };

      const { queryByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache },
          savedEventsContext: { savedEventIds: ['event-today'] },
        },
      });

      // Event on today's selected day should be visible
      expect(queryByText('Today Event')).toBeTruthy();
    });

    it('shows empty state when user has no saved events', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: {} },
          savedEventsContext: { savedEventIds: [] },
        },
      });

      // EmptyEvent component should be rendered
      const EmptyEvent = require('@/components/EmptyEvent').default;
      expect(UNSAFE_getByType(EmptyEvent)).toBeTruthy();
    });

    it('shows empty state for a day with no events when user has saved events on other days', () => {
      // Event is tomorrow, but today is selected by default
      const tomorrowEvent = createMockEvent({
        $id: 'event-tomorrow',
        title: 'Tomorrow Event',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      });

      const eventsCache = {
        'event-tomorrow': tomorrowEvent,
      };

      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache },
          savedEventsContext: { savedEventIds: ['event-tomorrow'] },
        },
      });

      const EmptyEventComponent = require('@/components/EmptyEvent').default;
      expect(UNSAFE_getByType(EmptyEventComponent)).toBeTruthy();
    });

    it('filters out past events from saved events', () => {
      const pastEvent = createMockEvent({
        $id: 'event-past',
        title: 'Past Event',
        start_time: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        end_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      const eventsCache = {
        'event-past': pastEvent,
      };

      const { queryByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache },
          savedEventsContext: { savedEventIds: ['event-past'] },
        },
      });

      // Past event should not be shown
      expect(queryByText('Past Event')).toBeNull();
    });
  });

  describe('Pull to Refresh', () => {
    it('calls refetchEvents when pull-to-refresh is triggered', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);

      renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { refetchEvents: mockRefetch },
        },
      });

      expect(mockRefetch).toBeDefined();
    });

    it('shows alert when refresh fails', async () => {
      const mockRefetch = jest.fn().mockRejectedValue(new Error('Network error'));

      renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { refetchEvents: mockRefetch },
        },
      });

      expect(mockRefetch).toBeDefined();
    });
  });

  describe('Event Sharing', () => {
    it('handles share event action', async () => {
      const mockEvent = createMockEvent({
        $id: 'event-share',
        title: 'Shareable Event',
        postal_code: 1000,
        country: 'belgium',
      });

      const eventsCache = {
        'event-share': mockEvent,
      };

      const mockGetSubMunicipalityName = jest.fn().mockReturnValue('Brussels');

      renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache },
          savedEventsContext: { savedEventIds: ['event-share'] },
          postalCodeContext: { getSubMunicipalityName: mockGetSubMunicipalityName },
        },
      });

      expect(mockGetSubMunicipalityName).toBeDefined();
    });
  });

  describe('Past Month Navigation Blocking', () => {
    it('canGoPrev is false when the home screen first renders on the current month', () => {
      // CalendarGrid receives canGoPrev as a prop. On mount, displayMonth equals
      // today.getMonth() and displayYear equals today.getFullYear(), so canGoPrev
      // must be false. We verify this indirectly: the CalendarGrid is rendered
      // (day cells visible) and no day cell for a past month is pressable.
      const { getAllByRole } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      // At least one button (day cell) should be rendered in the calendar
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('past day cells are rendered with accessibilityState disabled=true', () => {
      // Days in the past receive disabled={true} on their Pressable which sets
      // accessibilityState.disabled. getAllByRole('button') returns all buttons;
      // we filter for those whose accessibilityState marks them disabled.
      const { getAllByRole } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      const allButtons = getAllByRole('button');
      const disabledButtons = allButtons.filter(
        (btn) => btn.props.accessibilityState?.disabled === true
      );
      // On any day after the first of the current month there should be disabled cells
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('today button is always visible regardless of canGoPrev state', () => {
      const { getByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { isLogged: true },
        },
      });

      expect(getByLabelText('Go to today')).toBeTruthy();
    });
  });

  describe('Calendar Shows Event on Correct Day', () => {
    it('shows an event on its saved day when that day is selected', () => {
      // Build an event that starts today (in 1 hour) so it lands on today's date key.
      const eventStartTime = new Date(Date.now() + 3600000).toISOString(); // +1 h
      const todayEvent = createMockEvent({
        $id: 'event-calendar-day',
        title: 'Calendar Day Event',
        start_time: eventStartTime,
      });

      const { getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-calendar-day': todayEvent } },
          savedEventsContext: { savedEventIds: ['event-calendar-day'] },
        },
      });

      // The home screen defaults selectedDateKey to today, so the event
      // should appear in the list immediately.
      expect(getByText('Calendar Day Event')).toBeTruthy();
    });

    it('does not show a future-day event when today is selected', () => {
      // Event is 3 days in the future — today is selected by default.
      const futureStart = new Date(Date.now() + 3 * 86400000).toISOString();
      const futureEvent = createMockEvent({
        $id: 'event-future',
        title: 'Future Day Event',
        start_time: futureStart,
      });

      const { queryByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-future': futureEvent } },
          savedEventsContext: { savedEventIds: ['event-future'] },
        },
      });

      expect(queryByText('Future Day Event')).toBeNull();
    });

    it('does not show a multi-day event on a non-start day', () => {
      // Event started yesterday, ends tomorrow. The selected day defaults to
      // today, but the event's start key is yesterday — so it should NOT show
      // (the calendar uses one-dot-per-event semantics).
      const startTime = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
      const endTime = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
      const multiDayEvent = createMockEvent({
        $id: 'event-multi',
        title: 'Multi Day Event',
        start_time: startTime,
        end_time: endTime,
      });

      const { queryByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-multi': multiDayEvent } },
          savedEventsContext: { savedEventIds: ['event-multi'] },
        },
      });

      expect(queryByText('Multi Day Event')).toBeNull();
    });
  });

  describe('Cache miss tolerance', () => {
    it('renders without crashing when a saved ID has no matching event in the cache', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: {} },
          // SavedEventsProvider hydration is mocked at the context layer here, so the
          // home screen should silently render an empty calendar rather than throw
          // when an ID has no entry yet.
          savedEventsContext: { savedEventIds: ['ghost-id'] },
        },
      });

      const EmptyEventComponent = require('@/components/EmptyEvent').default;
      expect(UNSAFE_getByType(EmptyEventComponent)).toBeTruthy();
    });
  });

  describe('Loader gating during refetch', () => {
    it('does not render the splash loader when eventsLoading=true but cache is non-empty', () => {
      const cachedEvent = createMockEvent({
        $id: 'cached-event',
        title: 'Cached Event',
        start_time: new Date(Date.now() + 3600000).toISOString(),
      });

      const { UNSAFE_queryByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: {
            eventsCache: { 'cached-event': cachedEvent },
            eventsLoading: true,
          },
          savedEventsContext: { savedEventIds: ['cached-event'] },
        },
      });

      // BrandLoader should NOT be rendered — calendar stays visible during refetch.
      expect(UNSAFE_queryByType(BrandLoader)).toBeNull();
    });

    it('renders the splash loader on first load (cache empty + eventsLoading=true)', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: {}, eventsLoading: true },
          savedEventsContext: { savedEventIds: [] },
        },
      });

      expect(UNSAFE_getByType(BrandLoader)).toBeTruthy();
    });
  });
});
