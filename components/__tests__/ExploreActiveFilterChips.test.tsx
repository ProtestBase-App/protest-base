jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { ScrollView } from 'react-native';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { ExploreActiveFilterChips } from '@/components/ExploreActiveFilterChips';
import { DEFAULT_EXPLORE_FILTERS, ExploreAppliedFilters } from '@/context/ExploreTabProvider';

const ACTIVE_FILTERS: ExploreAppliedFilters = {
  category: 'Protest',
  dateFilter: 'today',
  locations: ['province:vlaams-brabant'],
  organizations: ['org-1'],
};

function makeProps(overrides: Partial<React.ComponentProps<typeof ExploreActiveFilterChips>> = {}) {
  return {
    filters: ACTIVE_FILTERS,
    resolveLocationLabel: jest.fn().mockReturnValue('Vlaams-Brabant'),
    resolveOrganizationLabel: jest.fn().mockReturnValue('Amnesty International'),
    onRemoveCategory: jest.fn(),
    onRemoveDate: jest.fn(),
    onRemoveLocation: jest.fn(),
    onRemoveOrganization: jest.fn(),
    ...overrides,
  };
}

describe('ExploreActiveFilterChips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when all filters are empty', () => {
    const { UNSAFE_queryByType, queryByText } = renderWithProviders(
      <ExploreActiveFilterChips {...makeProps({ filters: DEFAULT_EXPLORE_FILTERS })} />
    );

    expect(UNSAFE_queryByType(ScrollView)).toBeNull();
    expect(queryByText('categories.protest')).toBeNull();
    expect(queryByText('filters.today')).toBeNull();
  });

  it('renders a chip for each active filter, resolving location and organization labels', () => {
    const props = makeProps();
    const { getByText } = renderWithProviders(<ExploreActiveFilterChips {...props} />);

    expect(getByText('categories.protest')).toBeTruthy();
    expect(getByText('filters.today')).toBeTruthy();
    expect(getByText('Vlaams-Brabant')).toBeTruthy();
    expect(getByText('Amnesty International')).toBeTruthy();

    expect(props.resolveLocationLabel).toHaveBeenCalledWith('province:vlaams-brabant');
    expect(props.resolveOrganizationLabel).toHaveBeenCalledWith('org-1');
  });

  it('calls onRemoveCategory when the category chip is tapped', () => {
    const props = makeProps();
    const { getByText } = renderWithProviders(<ExploreActiveFilterChips {...props} />);

    fireEvent.press(getByText('categories.protest'));

    expect(props.onRemoveCategory).toHaveBeenCalledTimes(1);
    expect(props.onRemoveDate).not.toHaveBeenCalled();
    expect(props.onRemoveLocation).not.toHaveBeenCalled();
    expect(props.onRemoveOrganization).not.toHaveBeenCalled();
  });

  it('calls onRemoveDate when the date chip is tapped', () => {
    const props = makeProps();
    const { getByText } = renderWithProviders(<ExploreActiveFilterChips {...props} />);

    fireEvent.press(getByText('filters.today'));

    expect(props.onRemoveDate).toHaveBeenCalledTimes(1);
    expect(props.onRemoveCategory).not.toHaveBeenCalled();
  });

  it('calls onRemoveLocation with the location token when a location chip is tapped', () => {
    const props = makeProps();
    const { getByText } = renderWithProviders(<ExploreActiveFilterChips {...props} />);

    fireEvent.press(getByText('Vlaams-Brabant'));

    expect(props.onRemoveLocation).toHaveBeenCalledTimes(1);
    expect(props.onRemoveLocation).toHaveBeenCalledWith('province:vlaams-brabant');
  });

  it('calls onRemoveOrganization with the organization id when an organization chip is tapped', () => {
    const props = makeProps();
    const { getByText } = renderWithProviders(<ExploreActiveFilterChips {...props} />);

    fireEvent.press(getByText('Amnesty International'));

    expect(props.onRemoveOrganization).toHaveBeenCalledTimes(1);
    expect(props.onRemoveOrganization).toHaveBeenCalledWith('org-1');
  });
});
