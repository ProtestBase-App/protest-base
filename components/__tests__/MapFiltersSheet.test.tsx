jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { Switch } from 'react-native';
import { renderWithProviders, fireEvent, createMockEvent } from '@/test-utils/render';
import { MapFiltersSheet } from '@/components/MapFiltersSheet';
import { DEFAULT_MAP_FILTERS } from '@/utils/mapTabUtils';

const CATEGORY_KEYS = [
  'categories.protest',
  'categories.act',
  'categories.learn',
  'categories.support',
  'categories.strike',
];

describe('MapFiltersSheet', () => {
  const defaultProps = {
    visible: true,
    initialFilters: DEFAULT_MAP_FILTERS,
    events: [],
    userLanguage: 'en',
    onApply: jest.fn(),
    onClose: jest.fn(),
    countMatches: jest.fn().mockReturnValue(4),
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
        <MapFiltersSheet {...defaultProps} visible={false} />
      );

      expect(queryByText('filters.title')).toBeNull();
    });

    it('renders the sheet title and section labels when visible', () => {
      const { getByText } = renderWithProviders(<MapFiltersSheet {...defaultProps} />);

      expect(getByText('filters.title')).toBeTruthy();
      expect(getByText('maps.actionType')).toBeTruthy();
      expect(getByText('maps.country')).toBeTruthy();
      expect(getByText('maps.postalCode')).toBeTruthy();
      expect(getByText('maps.countryAll')).toBeTruthy();
    });
  });

  describe('Category chips (multi-select)', () => {
    it('renders a chip for each of the five categories', () => {
      const { getByText } = renderWithProviders(<MapFiltersSheet {...defaultProps} />);

      CATEGORY_KEYS.forEach((key) => {
        expect(getByText(key)).toBeTruthy();
      });
    });

    it('marks a chip as selected after toggling it', () => {
      const { getByLabelText } = renderWithProviders(<MapFiltersSheet {...defaultProps} />);

      const chip = getByLabelText('categories.protest');
      expect(chip.props.accessibilityState.selected).toBe(false);

      fireEvent.press(chip);

      expect(getByLabelText('categories.protest').props.accessibilityState.selected).toBe(true);
    });

    it('accumulates multiple categories and applies them, then closes', () => {
      const onApply = jest.fn();
      const onClose = jest.fn();
      const { getByText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} onClose={onClose} />
      );

      fireEvent.press(getByText('categories.protest'));
      fireEvent.press(getByText('categories.strike'));
      fireEvent.press(getByText('maps.filterApplyCount'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ categories: ['Protest', 'Strike'] })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Apply button label', () => {
    it('shows the count label when countMatches returns matches', () => {
      const countMatches = jest.fn().mockReturnValue(4);
      const { getByText, queryByText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} countMatches={countMatches} />
      );

      expect(getByText('maps.filterApplyCount')).toBeTruthy();
      expect(queryByText('maps.filterApplyNone')).toBeNull();
      expect(countMatches).toHaveBeenCalledWith(DEFAULT_MAP_FILTERS);
    });

    it('shows the no-matches label when countMatches returns 0', () => {
      const countMatches = jest.fn().mockReturnValue(0);
      const { getByText, queryByText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} countMatches={countMatches} />
      );

      expect(getByText('maps.filterApplyNone')).toBeTruthy();
      expect(queryByText('maps.filterApplyCount')).toBeNull();
    });
  });

  describe('Reset button', () => {
    it('is disabled while the draft matches the defaults', () => {
      const { getByLabelText } = renderWithProviders(<MapFiltersSheet {...defaultProps} />);

      expect(getByLabelText('common.reset').props.accessibilityState.disabled).toBe(true);
    });

    it('becomes enabled after a change and restores defaults when pressed', () => {
      const onApply = jest.fn();
      const { getByText, getByLabelText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} />
      );

      fireEvent.press(getByText('categories.strike'));
      const resetButton = getByLabelText('common.reset');
      expect(resetButton.props.accessibilityState.disabled).toBe(false);

      fireEvent.press(resetButton);
      fireEvent.press(getByText('maps.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(DEFAULT_MAP_FILTERS);
    });
  });

  describe('Toggle switches', () => {
    it('includes savedOnly in the applied filters after toggling the first switch', () => {
      const onApply = jest.fn();
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} />
      );

      const [savedOnlySwitch] = UNSAFE_getAllByType(Switch);
      fireEvent(savedOnlySwitch, 'valueChange', true);
      fireEvent.press(getByText('maps.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ savedOnly: true, helpNeeded: false })
      );
    });

    it('includes helpNeeded in the applied filters after toggling the second switch', () => {
      const onApply = jest.fn();
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} />
      );

      const switches = UNSAFE_getAllByType(Switch);
      expect(switches).toHaveLength(2);
      fireEvent(switches[1], 'valueChange', true);
      fireEvent.press(getByText('maps.filterApplyCount'));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ savedOnly: false, helpNeeded: true })
      );
    });
  });

  describe('Country selection scopes postal codes', () => {
    it('prunes out-of-country postal tokens and sets country when a country chip is tapped', () => {
      // Arrange — one Belgian event and one Dutch event so buildCountryOptions yields two chips.
      const belgianEvent = createMockEvent({
        country: 'belgium',
        postal_code: 1000,
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      const dutchEvent = createMockEvent({
        country: 'netherlands',
        postal_code: 1234,
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Token format: `${country.toLowerCase()}:${postal_code}` (countryOfPostalToken / postalTokenForEvent)
      const belgiumToken = 'belgium:1000';
      const netherlandsToken = 'netherlands:1234';

      const initialFilters = {
        ...DEFAULT_MAP_FILTERS,
        postalCodes: [belgiumToken, netherlandsToken],
      };

      const onApply = jest.fn();

      const { getByLabelText, getByText } = renderWithProviders(
        <MapFiltersSheet
          {...defaultProps}
          events={[belgianEvent, dutchEvent]}
          initialFilters={initialFilters}
          onApply={onApply}
        />
      );

      // Act — tap the Belgium country chip (label comes from countries.ts en label, not an i18n key)
      fireEvent.press(getByLabelText('Belgium'));

      // Apply the draft
      fireEvent.press(getByText('maps.filterApplyCount'));

      // Assert — only the belgium token survives; netherlands token was pruned
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'belgium',
          postalCodes: [belgiumToken],
        })
      );
      expect(onApply).not.toHaveBeenCalledWith(
        expect.objectContaining({ postalCodes: expect.arrayContaining([netherlandsToken]) })
      );
    });
  });

  describe('Closing without applying', () => {
    it('calls onClose (and not onApply) when the close button is pressed', () => {
      const onApply = jest.fn();
      const onClose = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} onClose={onClose} />
      );

      fireEvent.press(getByLabelText('common.close'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('discards draft changes made before closing — reopening resets to the initial filters', () => {
      const onApply = jest.fn();
      const { getByText, rerender } = renderWithProviders(
        <MapFiltersSheet {...defaultProps} onApply={onApply} />
      );

      // Edit the draft, then close without applying.
      fireEvent.press(getByText('categories.protest'));
      rerender(<MapFiltersSheet {...defaultProps} visible={false} onApply={onApply} />);

      // Reopen and apply immediately — the draft must be back to the defaults.
      rerender(<MapFiltersSheet {...defaultProps} visible={true} onApply={onApply} />);
      fireEvent.press(getByText('maps.filterApplyCount'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }));
    });
  });
});
