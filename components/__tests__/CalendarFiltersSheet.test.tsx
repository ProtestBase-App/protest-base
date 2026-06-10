jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Switch } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { CalendarFiltersSheet } from '@/components/CalendarFiltersSheet';
import { DEFAULT_CALENDAR_FILTERS } from '@/utils/calendarTabUtils';

const CATEGORY_KEYS = [
  'categories.protest',
  'categories.act',
  'categories.learn',
  'categories.support',
  'categories.strike',
];

describe('CalendarFiltersSheet', () => {
  const defaultProps = {
    visible: true,
    initialFilters: DEFAULT_CALENDAR_FILTERS,
    onApply: jest.fn(),
    onClose: jest.fn(),
    countMatches: jest.fn().mockReturnValue(3),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(new Date('2026-05-12T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('renders nothing when not visible', () => {
      const { queryByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} visible={false} />
      );

      expect(queryByText('filters.title')).toBeNull();
    });

    it('renders the sheet title when visible', () => {
      const { getByText } = renderWithProviders(<CalendarFiltersSheet {...defaultProps} />);

      expect(getByText('filters.title')).toBeTruthy();
    });
  });

  describe('Category chips', () => {
    it('renders a chip for each of the five categories', () => {
      const { getByText } = renderWithProviders(<CalendarFiltersSheet {...defaultProps} />);

      CATEGORY_KEYS.forEach((key) => {
        expect(getByText(key)).toBeTruthy();
      });
    });

    it('marks a chip as selected after toggling it', () => {
      const { getByLabelText } = renderWithProviders(<CalendarFiltersSheet {...defaultProps} />);

      const chip = getByLabelText('categories.protest');
      expect(chip.props.accessibilityState.selected).toBe(false);

      fireEvent.press(chip);

      expect(getByLabelText('categories.protest').props.accessibilityState.selected).toBe(true);
    });

    it('applies toggled categories and closes the sheet', () => {
      const onApply = jest.fn();
      const onClose = jest.fn();
      const { getByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} onClose={onClose} />
      );

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('home.filterApplyCount'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ categories: ['Protest'] }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Apply button label', () => {
    it('shows the count label when countMatches returns matches', () => {
      const countMatches = jest.fn().mockReturnValue(3);
      const { getByText, queryByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} countMatches={countMatches} />
      );

      expect(getByText('home.filterApplyCount')).toBeTruthy();
      expect(queryByText('home.filterApplyNone')).toBeNull();
      expect(countMatches).toHaveBeenCalledWith(DEFAULT_CALENDAR_FILTERS);
    });

    it('shows the no-matches label when countMatches returns 0', () => {
      const countMatches = jest.fn().mockReturnValue(0);
      const { getByText, queryByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} countMatches={countMatches} />
      );

      expect(getByText('home.filterApplyNone')).toBeTruthy();
      expect(queryByText('home.filterApplyCount')).toBeNull();
    });
  });

  describe('Reset button', () => {
    it('is disabled while the draft matches the defaults', () => {
      const { getByLabelText } = renderWithProviders(<CalendarFiltersSheet {...defaultProps} />);

      expect(getByLabelText('common.reset').props.accessibilityState.disabled).toBe(true);
    });

    it('becomes enabled after a change and restores defaults when pressed', () => {
      const onApply = jest.fn();
      const { getByText, getByLabelText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('categories.strike'));
      const resetButton = getByLabelText('common.reset');
      expect(resetButton.props.accessibilityState.disabled).toBe(false);

      fireEvent.press(resetButton);
      fireEvent.press(getByText('home.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(DEFAULT_CALENDAR_FILTERS);
    });
  });

  describe('Toggle switches', () => {
    it('includes savedOnly in the applied filters after toggling the first switch', () => {
      const onApply = jest.fn();
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} />
      );

      const [savedOnlySwitch] = UNSAFE_getAllByType(Switch);
      fireEvent(savedOnlySwitch, 'valueChange', true);
      fireEvent.press(getByText('home.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ savedOnly: true, helpNeeded: false })
      );
    });

    it('includes helpNeeded in the applied filters after toggling the second switch', () => {
      const onApply = jest.fn();
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} />
      );

      const switches = UNSAFE_getAllByType(Switch);
      expect(switches).toHaveLength(2);
      fireEvent(switches[1], 'valueChange', true);
      fireEvent.press(getByText('home.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ savedOnly: false, helpNeeded: true })
      );
    });
  });

  describe('Closing without applying', () => {
    it('calls onClose (and not onApply) when the close button is pressed', () => {
      const onApply = jest.fn();
      const onClose = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} onClose={onClose} />
      );

      fireEvent.press(getByLabelText('common.close'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('discards draft changes made before closing — reopening resets to the initial filters', () => {
      const onApply = jest.fn();
      const { getByText, rerender } = renderWithProviders(
        <CalendarFiltersSheet {...defaultProps} onApply={onApply} />
      );

      // Edit the draft, then close without applying.
      fireEvent.press(getByText('categories.protest'));
      rerender(<CalendarFiltersSheet {...defaultProps} visible={false} onApply={onApply} />);

      // Reopen and apply immediately — the draft must be back to the defaults.
      rerender(<CalendarFiltersSheet {...defaultProps} visible={true} onApply={onApply} />);
      fireEvent.press(getByText('home.filterApplyCount'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }));
    });
  });
});
