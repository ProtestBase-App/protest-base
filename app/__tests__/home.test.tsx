jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

// useHomeViewPreference is a module-level mock, so per-test re-mocking is not
// possible. Instead the factory reads a mutable variable at hook-call time —
// tests flip `mockViewMode` before rendering to switch month/agenda views.
let mockViewMode: 'month' | 'agenda' = 'month';
const mockSetViewMode = jest.fn();
jest.mock('@/hooks/useHomeViewPreference', () => ({
  useHomeViewPreference: () => ({
    viewMode: mockViewMode,
    setViewMode: mockSetViewMode,
    ready: true,
  }),
}));

jest.mock('@/services/event.service', () => ({
  getEventByIdBackend: jest.fn(),
  EventNotFoundError: class extends Error {
    code = 'EVENT_NOT_FOUND' as const;
  },
}));

import React from 'react';
import { renderWithProviders, createMockEvent, fireEvent, act } from '@/test-utils/render';
import HomeTab from '@/app/(tabs)/home';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

/** ISO timestamp N hours from the pinned "now". */
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();

/** Day-cell accessibility labels start with `Date.toDateString()` output. */
const DAY_CELL_LABEL = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /;

describe('Home Screen (calendar tab)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewMode = 'month';
    // Pin Date.now() to mid-morning UTC so events at `now + 1h` always land on
    // the same Belgium-TZ (Europe/Brussels) calendar day as "today". Pinned
    // date: Tuesday 2026-05-12, 12:00 in Brussels (CEST).
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Loading States', () => {
    it('shows the splash loader on first events load (loading + empty cache)', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: {}, eventsLoading: true },
        },
      });

      expect(UNSAFE_getByType(BrandLoader)).toBeTruthy();
    });

    it('shows the splash loader when saved events are loading', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          savedEventsContext: { loading: true },
        },
      });

      expect(UNSAFE_getByType(BrandLoader)).toBeTruthy();
    });

    it('shows the splash loader when postal codes are loading', () => {
      const { UNSAFE_getByType } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          postalCodeContext: { loading: true },
        },
      });

      expect(UNSAFE_getByType(BrandLoader)).toBeTruthy();
    });

    it('keeps the calendar visible during a warm refetch (loading + non-empty cache)', () => {
      const cachedEvent = createMockEvent({
        $id: 'cached-event',
        title: 'Cached Event',
        start_time: hoursFromNow(1),
      });

      const { UNSAFE_queryByType, getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: {
            eventsCache: { 'cached-event': cachedEvent },
            eventsLoading: true,
          },
        },
      });

      expect(UNSAFE_queryByType(BrandLoader)).toBeNull();
      expect(getByText('Cached Event')).toBeTruthy();
    });
  });

  describe('Calendar Header', () => {
    it('renders the month picker button', () => {
      const { getByLabelText } = renderWithProviders(<HomeTab />);

      expect(getByLabelText(/open month picker/)).toBeTruthy();
    });

    it('does not show the "Go to today" chip initially (selection starts on today)', () => {
      const { queryByLabelText } = renderWithProviders(<HomeTab />);

      expect(queryByLabelText('Go to today')).toBeNull();
    });

    it('renders the month grid day-cell buttons', () => {
      const { getAllByRole, getAllByLabelText } = renderWithProviders(<HomeTab />);

      expect(getAllByRole('button').length).toBeGreaterThan(0);
      // 6-week grid → at least 28 day cells regardless of month layout.
      expect(getAllByLabelText(DAY_CELL_LABEL).length).toBeGreaterThanOrEqual(28);
    });

    it('renders the filter button', () => {
      const { getByLabelText } = renderWithProviders(<HomeTab />);

      expect(getByLabelText('home.openFilters')).toBeTruthy();
    });
  });

  describe('All-Events Browsing', () => {
    it('shows an unsaved cache event on today immediately (not saved-only anymore)', () => {
      const todayEvent = createMockEvent({
        $id: 'event-today',
        title: 'Today Event',
        start_time: hoursFromNow(1),
      });

      const { getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-today': todayEvent } },
          // Explicitly no saved events — the redesigned tab browses ALL events.
          savedEventsContext: { savedEventIds: [] },
        },
      });

      expect(getByText('Today Event')).toBeTruthy();
    });
  });

  describe('Ended Events (time-granular cutoff)', () => {
    // Pinned "now" is 2026-05-12T10:00:00Z = 12:00 in Belgium (CEST).
    it('hides a today event whose end time has already passed', () => {
      const endedToday = createMockEvent({
        $id: 'event-ended',
        title: 'Ended Morning Event',
        start_time: '2026-05-12T06:00:00Z', // 08:00 Belgium
        end_time: '2026-05-12T07:00:00Z', // 09:00 Belgium — over by noon
      });

      const { queryByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-ended': endedToday } },
        },
      });

      expect(queryByText('Ended Morning Event')).toBeNull();
    });

    it('keeps a today event that is still running', () => {
      const runningEvent = createMockEvent({
        $id: 'event-running',
        title: 'Running Event',
        start_time: '2026-05-12T08:00:00Z', // 10:00 Belgium
        end_time: '2026-05-12T11:00:00Z', // 13:00 Belgium — spans noon
      });

      const { getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-running': runningEvent } },
        },
      });

      expect(getByText('Running Event')).toBeTruthy();
    });
  });

  describe('Day Markers', () => {
    it('marks days with events in the day-cell accessibility labels', () => {
      const todayEvent = createMockEvent({
        $id: 'event-today',
        title: 'Today Event',
        start_time: hoursFromNow(1),
      });

      const { getAllByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-today': todayEvent } },
        },
      });

      expect(getAllByLabelText(/, has events/).length).toBeGreaterThan(0);
    });
  });

  describe('Empty Day', () => {
    it('shows the empty-day state and the next-event pill when the only event is days away', () => {
      const futureEvent = createMockEvent({
        $id: 'event-future',
        title: 'Future Day Event',
        start_time: hoursFromNow(3 * 24),
      });

      const { queryByText, getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-future': futureEvent } },
        },
      });

      // Today (default selection) has no events.
      expect(queryByText('Future Day Event')).toBeNull();
      expect(queryByText('home.emptyDayTitle')).toBeTruthy();
      // t() is mocked to return keys, so the pill renders its raw key.
      expect(getByText(/home.nextEventPill/)).toBeTruthy();
    });
  });

  describe('Multi-Day Expansion', () => {
    it('shows a multi-day event on an in-between day (started yesterday, ends tomorrow)', () => {
      const multiDayEvent = createMockEvent({
        $id: 'event-multi',
        title: 'Multi Day Event',
        start_time: '2026-05-11T10:00:00Z', // yesterday (Belgium TZ)
        end_time: '2026-05-13T18:00:00Z', // tomorrow (Belgium TZ)
      });

      const { getByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-multi': multiDayEvent } },
        },
      });

      // Today is day 2/3 of the span — the row must appear on today's list.
      expect(getByText('Multi Day Event')).toBeTruthy();
    });
  });

  describe('Past Days Selectable', () => {
    it('renders no disabled day-cell buttons (past days are selectable)', () => {
      const { getAllByLabelText } = renderWithProviders(<HomeTab />);

      const dayCells = getAllByLabelText(DAY_CELL_LABEL);
      expect(dayCells.length).toBeGreaterThan(0);
      const disabledCells = dayCells.filter(
        (cell) => cell.props.accessibilityState?.disabled === true
      );
      expect(disabledCells).toHaveLength(0);
    });
  });

  describe('Agenda View', () => {
    it('renders all month events grouped by day with agenda day labels', () => {
      mockViewMode = 'agenda';

      const eventA = createMockEvent({
        $id: 'event-a',
        title: 'Agenda Event A',
        start_time: '2026-05-14T10:00:00Z',
      });
      const eventB = createMockEvent({
        $id: 'event-b',
        title: 'Agenda Event B',
        start_time: '2026-05-20T10:00:00Z',
      });

      const { getByText, queryByText, getAllByText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-a': eventA, 'event-b': eventB } },
        },
      });

      // Both future days of the displayed month render chronologically.
      expect(getByText('Agenda Event A')).toBeTruthy();
      expect(getByText('Agenda Event B')).toBeTruthy();
      expect(queryByText('home.emptyDayTitle')).toBeNull();
      // Uppercased day-group labels like "THU, MAY 14".
      expect(getAllByText(/MAY \d+/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Saved Toggle', () => {
    it('calls saveEvent when pressing the bookmark on an unsaved event row', async () => {
      const saveEvent = jest.fn().mockResolvedValue(1);
      const todayEvent = createMockEvent({
        $id: 'event-today',
        title: 'Today Event',
        start_time: hoursFromNow(1),
      });

      const { getByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-today': todayEvent } },
          savedEventsContext: { saveEvent, isSaved: jest.fn().mockReturnValue(false) },
        },
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Save event'), { stopPropagation: jest.fn() });
      });

      expect(saveEvent).toHaveBeenCalledWith('event-today', expect.any(Number));
    });

    it('calls unsaveEvent when pressing the bookmark on a saved event row', async () => {
      const unsaveEvent = jest.fn().mockResolvedValue(1);
      const todayEvent = createMockEvent({
        $id: 'event-today',
        title: 'Today Event',
        start_time: hoursFromNow(1),
      });

      const { getByLabelText } = renderWithProviders(<HomeTab />, {
        providerOverrides: {
          globalContext: { eventsCache: { 'event-today': todayEvent } },
          savedEventsContext: {
            savedEventIds: ['event-today'],
            unsaveEvent,
            isSaved: jest.fn().mockReturnValue(true),
          },
        },
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Remove from saved'), { stopPropagation: jest.fn() });
      });

      expect(unsaveEvent).toHaveBeenCalledWith('event-today');
    });
  });
});
