jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { CalendarEmptyState } from '@/components/CalendarEmptyState';

describe('CalendarEmptyState', () => {
  const defaultProps = {
    filtered: false,
    nextDateKey: null,
    onJumpToDate: jest.fn(),
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

  describe('Title copy', () => {
    it('shows the empty-day title when no filters are active', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEmptyState {...defaultProps} filtered={false} />
      );

      expect(getByText('home.emptyDayTitle')).toBeTruthy();
      expect(queryByText('home.emptyFilteredTitle')).toBeNull();
    });

    it('shows the filtered title when filters are active', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CalendarEmptyState {...defaultProps} filtered={true} />
      );

      expect(getByText('home.emptyFilteredTitle')).toBeTruthy();
      expect(queryByText('home.emptyDayTitle')).toBeNull();
    });
  });

  describe('Next-event pill', () => {
    it('renders the pill when a next date key is provided', () => {
      const { getByText } = renderWithProviders(
        <CalendarEmptyState {...defaultProps} nextDateKey="2026-05-20" />
      );

      expect(getByText('home.nextEventPill')).toBeTruthy();
    });

    it('calls onJumpToDate with the date key when the pill is pressed', () => {
      const onJumpToDate = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <CalendarEmptyState
          {...defaultProps}
          nextDateKey="2026-05-20"
          onJumpToDate={onJumpToDate}
        />
      );

      fireEvent.press(getByLabelText('home.nextEventPill'));

      expect(onJumpToDate).toHaveBeenCalledTimes(1);
      expect(onJumpToDate).toHaveBeenCalledWith('2026-05-20');
    });

    it('exposes the pill as an accessible button', () => {
      const { getByRole } = renderWithProviders(
        <CalendarEmptyState {...defaultProps} nextDateKey="2026-05-20" />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('does not render the pill when nextDateKey is null', () => {
      const { queryByText, queryByRole } = renderWithProviders(
        <CalendarEmptyState {...defaultProps} nextDateKey={null} />
      );

      expect(queryByText('home.nextEventPill')).toBeNull();
      expect(queryByRole('button')).toBeNull();
    });
  });
});
