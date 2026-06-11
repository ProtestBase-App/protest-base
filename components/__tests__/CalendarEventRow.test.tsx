jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { renderWithProviders, fireEvent, createMockEvent } from '@/test-utils/render';
import CalendarEventRow from '@/components/CalendarEventRow';
import { Event } from '@/types/event.types';
import { CalendarDayEntry } from '@/utils/calendarTabUtils';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return createMockEvent({
    $id: 'event-row-1',
    title: 'Climate March',
    // 11:00 UTC = 13:00 in Europe/Brussels (CEST) on the pinned day.
    start_time: '2026-05-12T11:00:00Z',
    city: 'Brussels',
    categories: ['Protest'],
    participant_count: 0,
    help_needed: false,
    ...overrides,
  });
}

function singleDayEntry(event: Event): CalendarDayEntry {
  return { event, dayIndex: 1, totalDays: 1 };
}

describe('CalendarEventRow', () => {
  const defaultProps = {
    // Matches the fake system time pinned in beforeEach (Belgium day).
    todayKey: '2026-05-12',
    isSaved: false,
    onPress: jest.fn(),
    onToggleSave: jest.fn(),
    userLanguage: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the event title', () => {
      const event = buildEvent();
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(getByText('Climate March')).toBeTruthy();
    });

    it('renders the city in the secondary line', () => {
      const event = buildEvent();
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(getByText(/Brussels/)).toBeTruthy();
    });

    it('prefers the resolved cityLabel over event.city', () => {
      const event = buildEvent();
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} cityLabel="Ixelles" />
      );

      expect(getByText(/Ixelles/)).toBeTruthy();
      expect(queryByText(/Brussels/)).toBeNull();
    });
  });

  describe('Row press', () => {
    it('calls onPress with the event id when the row is pressed', () => {
      const onPress = jest.fn();
      const event = buildEvent();
      const { getByLabelText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} onPress={onPress} />
      );

      fireEvent.press(getByLabelText('Climate March'));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith('event-row-1');
    });
  });

  describe('Bookmark toggle', () => {
    it('labels the bookmark "Save event" when not saved', () => {
      const event = buildEvent();
      const { getByLabelText, queryByLabelText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} isSaved={false} />
      );

      expect(getByLabelText('Save event')).toBeTruthy();
      expect(queryByLabelText('Remove from saved')).toBeNull();
    });

    it('labels the bookmark "Remove from saved" and sets selected state when saved', () => {
      const event = buildEvent();
      const { getByLabelText, queryByLabelText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} isSaved={true} />
      );

      const bookmark = getByLabelText('Remove from saved');
      expect(bookmark).toBeTruthy();
      expect(bookmark.props.accessibilityState.selected).toBe(true);
      expect(queryByLabelText('Save event')).toBeNull();
    });

    it('calls onToggleSave(event, false) when saving and does not trigger the row press', () => {
      const onPress = jest.fn();
      const onToggleSave = jest.fn();
      const event = buildEvent();
      const { getByLabelText } = renderWithProviders(
        <CalendarEventRow
          {...defaultProps}
          entry={singleDayEntry(event)}
          isSaved={false}
          onPress={onPress}
          onToggleSave={onToggleSave}
        />
      );

      fireEvent.press(getByLabelText('Save event'), { stopPropagation: jest.fn() });

      expect(onToggleSave).toHaveBeenCalledTimes(1);
      expect(onToggleSave).toHaveBeenCalledWith(event, false);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('calls onToggleSave(event, true) when removing a saved event', () => {
      const onToggleSave = jest.fn();
      const event = buildEvent();
      const { getByLabelText } = renderWithProviders(
        <CalendarEventRow
          {...defaultProps}
          entry={singleDayEntry(event)}
          isSaved={true}
          onToggleSave={onToggleSave}
        />
      );

      fireEvent.press(getByLabelText('Remove from saved'), { stopPropagation: jest.fn() });

      expect(onToggleSave).toHaveBeenCalledWith(event, true);
    });
  });

  describe('Secondary line', () => {
    it('shows the start time for single-day events', () => {
      const event = buildEvent();
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      // 11:00 UTC renders as 1:00 PM Belgium time in English.
      expect(getByText(/1:00/)).toBeTruthy();
      expect(queryByText(/home\.dayProgress/)).toBeNull();
    });

    it('shows the day-progress label instead of a time for multi-day entries', () => {
      const event = buildEvent({ end_time: '2026-05-15T16:00:00Z' });
      const entry: CalendarDayEntry = { event, dayIndex: 2, totalDays: 4 };
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={entry} />
      );

      expect(getByText(/home\.dayProgress/)).toBeTruthy();
      expect(queryByText(/1:00/)).toBeNull();
    });
  });

  describe('Badges', () => {
    it('renders the help-needed badge when event.help_needed is true', () => {
      const event = buildEvent({ help_needed: true });
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(getByText('createEvent.helpNeeded')).toBeTruthy();
    });

    it('does not render the help-needed badge when help is not needed', () => {
      const event = buildEvent({ help_needed: false });
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(queryByText('createEvent.helpNeeded')).toBeNull();
    });

    it('renders the first category badge by default', () => {
      const event = buildEvent({ categories: ['Protest', 'Strike'] });
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(getByText('categories.protest')).toBeTruthy();
      expect(queryByText('categories.strike')).toBeNull();
    });

    it('renders the displayCategory badge instead of the primary one when provided', () => {
      const event = buildEvent({ categories: ['Strike', 'Learn'] });
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} displayCategory="Learn" />
      );

      expect(getByText('categories.learn')).toBeTruthy();
      expect(queryByText('categories.strike')).toBeNull();
    });

    it('shows the in-progress badge for a multi-day event spanning today', () => {
      const event = buildEvent({
        start_time: '2026-05-10T11:00:00Z',
        end_time: '2026-05-14T16:00:00Z',
      });
      const entry: CalendarDayEntry = { event, dayIndex: 3, totalDays: 5 };
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={entry} />
      );

      expect(getByText('home.inProgressBadge')).toBeTruthy();
    });

    it('shows the in-progress badge on the same event rendered under a future day', () => {
      // The badge states a fact about NOW, not about the displayed day.
      const event = buildEvent({
        start_time: '2026-05-10T11:00:00Z',
        end_time: '2026-05-14T16:00:00Z',
      });
      const entry: CalendarDayEntry = { event, dayIndex: 5, totalDays: 5 };
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={entry} />
      );

      expect(getByText('home.inProgressBadge')).toBeTruthy();
    });

    it('does not show the in-progress badge for a single-day event today', () => {
      const event = buildEvent(); // starts 2026-05-12 — today
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(queryByText('home.inProgressBadge')).toBeNull();
    });

    it('does not show the in-progress badge for a multi-day event starting today', () => {
      const event = buildEvent({ end_time: '2026-05-15T16:00:00Z' });
      const entry: CalendarDayEntry = { event, dayIndex: 1, totalDays: 4 };
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={entry} />
      );

      expect(queryByText('home.inProgressBadge')).toBeNull();
    });

    it('renders the multi-day badge only for multi-day entries', () => {
      const event = buildEvent({ end_time: '2026-05-15T16:00:00Z' });
      const multiDayEntry: CalendarDayEntry = { event, dayIndex: 1, totalDays: 4 };
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={multiDayEntry} />
      );

      expect(getByText('home.multiDayBadge')).toBeTruthy();
    });

    it('does not render the multi-day badge for single-day entries', () => {
      const event = buildEvent();
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(queryByText('home.multiDayBadge')).toBeNull();
    });
  });

  describe('Attendee count', () => {
    it('renders the compact attendee count when participant_count > 0', () => {
      const event = buildEvent({ participant_count: 1234 });
      const { getByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(getByText('1.2k')).toBeTruthy();
      expect(getByText(/home\.going/)).toBeTruthy();
    });

    it('hides the attendee count when participant_count is 0', () => {
      const event = buildEvent({ participant_count: 0 });
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} />
      );

      expect(queryByText(/home\.going/)).toBeNull();
    });

    it('hides the attendee count when showAttendees is false', () => {
      const event = buildEvent({ participant_count: 1234 });
      const { queryByText } = renderWithProviders(
        <CalendarEventRow {...defaultProps} entry={singleDayEntry(event)} showAttendees={false} />
      );

      expect(queryByText(/home\.going/)).toBeNull();
    });
  });
});
