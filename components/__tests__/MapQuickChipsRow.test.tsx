import React from 'react';

import { MapQuickChipsRow } from '@/components/MapQuickChipsRow';
import { eventCategories } from '@/constants/EventCategories';
import { fireEvent, renderWithProviders } from '@/test-utils/render';

const firstCategory = eventCategories[0].value;

function renderRow(overrides: Partial<React.ComponentProps<typeof MapQuickChipsRow>> = {}) {
  const props = {
    timeFilter: 'all' as const,
    onTimeFilterChange: jest.fn(),
    selectedCategories: [],
    onToggleCategory: jest.fn(),
    ...overrides,
  };
  return { props, ...renderWithProviders(<MapQuickChipsRow {...props} />) };
}

describe('MapQuickChipsRow', () => {
  it('marks only the current time window as selected', () => {
    const { getByTestId } = renderRow({ timeFilter: 'week' });

    expect(getByTestId('map-chip-time-week').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByTestId('map-chip-time-all').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('reports the time window that was pressed', () => {
    const { getByTestId, props } = renderRow();

    fireEvent.press(getByTestId('map-chip-time-today'));

    expect(props.onTimeFilterChange).toHaveBeenCalledWith('today');
  });

  it('shows a chip per category and toggles the pressed one', () => {
    const { getByTestId, props } = renderRow({ selectedCategories: [firstCategory] });

    eventCategories.forEach(({ value }) => {
      expect(getByTestId(`map-chip-category-${value}`)).toBeTruthy();
    });
    expect(getByTestId(`map-chip-category-${firstCategory}`).props.accessibilityState).toEqual({
      selected: true,
    });

    fireEvent.press(getByTestId(`map-chip-category-${firstCategory}`));

    expect(props.onToggleCategory).toHaveBeenCalledWith(firstCategory);
  });

  it('hides the near-me chip unless it is enabled with a handler', () => {
    expect(renderRow().queryByTestId('map-chip-near-me')).toBeNull();
    expect(renderRow({ showNearMe: true }).queryByTestId('map-chip-near-me')).toBeNull();
  });

  it('toggles near me when enabled', () => {
    const onToggleNearMe = jest.fn();
    const { getByTestId } = renderRow({ showNearMe: true, nearMeActive: true, onToggleNearMe });

    const chip = getByTestId('map-chip-near-me');
    expect(chip.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(chip);

    expect(onToggleNearMe).toHaveBeenCalledTimes(1);
  });
});
