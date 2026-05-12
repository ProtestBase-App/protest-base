jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('react-native-element-dropdown', () => {
  const React = require('react');
  return {
    Dropdown: ({ placeholder, ...rest }: any) =>
      React.createElement('View', {
        testID: 'dropdown',
        accessibilityLabel: rest.accessibilityLabel || placeholder,
      }),
  };
});

jest.mock('@/context/UserOrganizationsProvider', () => ({
  useUserOrganizations: jest.fn(() => ({
    dropdownItems: [
      { label: 'Org A', value: 'org-a' },
      { label: 'Org B', value: 'org-b' },
    ],
    hasSingleOrganization: false,
    hasMultipleOrganizations: true,
    loading: false,
  })),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrganizationPicker } from '@/components/OrganizationPicker';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';

describe('OrganizationPicker', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders dropdown for multi-org users', () => {
    render(<OrganizationPicker onValueChange={jest.fn()} />);
    // t('createEvent.organization') translates to "Organization"
    expect(screen.getByText(/Organization/)).toBeTruthy();
  });

  it('renders nothing for single-org users', () => {
    (useUserOrganizations as jest.Mock).mockReturnValue({
      dropdownItems: [{ label: 'Org A', value: 'org-a' }],
      hasSingleOrganization: true,
      hasMultipleOrganizations: false,
      loading: false,
    });
    const { toJSON } = render(<OrganizationPicker onValueChange={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when no organizations', () => {
    (useUserOrganizations as jest.Mock).mockReturnValue({
      dropdownItems: [],
      hasSingleOrganization: false,
      hasMultipleOrganizations: false,
      loading: false,
    });
    const { toJSON } = render(<OrganizationPicker onValueChange={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('passes error props to dropdown', () => {
    (useUserOrganizations as jest.Mock).mockReturnValue({
      dropdownItems: [
        { label: 'Org A', value: 'org-a' },
        { label: 'Org B', value: 'org-b' },
      ],
      hasSingleOrganization: false,
      hasMultipleOrganizations: true,
      loading: false,
    });
    render(<OrganizationPicker onValueChange={jest.fn()} error={true} errorMessage="Required" />);
    expect(screen.getByText(/Organization/)).toBeTruthy();
  });
});
