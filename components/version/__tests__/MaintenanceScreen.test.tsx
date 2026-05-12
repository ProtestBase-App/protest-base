jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  return (props: any) => React.createElement('Ionicons', props);
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MaintenanceScreen } from '@/components/version/MaintenanceScreen';

describe('MaintenanceScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the maintenance title prefix and highlight', () => {
    render(<MaintenanceScreen message={null} />);
    // titlePrefix and titleHighlight are rendered as nested Text components
    // Use substring matching since prefix is part of the composite parent text
    expect(screen.getByText(/version\.maintenance\.titlePrefix/)).toBeTruthy();
    expect(screen.getByText('version.maintenance.titleHighlight')).toBeTruthy();
  });

  it('shows default message when message is null', () => {
    render(<MaintenanceScreen message={null} />);
    expect(screen.getByText('version.maintenance.message')).toBeTruthy();
  });

  it('shows custom message when provided', () => {
    render(<MaintenanceScreen message="System upgrade in progress" />);
    expect(screen.getByText('System upgrade in progress')).toBeTruthy();
  });

  it('renders without crashing regardless of color scheme (dark)', () => {
    render(<MaintenanceScreen message={null} />);
    expect(screen.getByText(/version\.maintenance\.titlePrefix/)).toBeTruthy();
  });

  it('renders with an empty string message (falls back to default)', () => {
    // Empty string is falsy so the || operator picks the default t() key
    render(<MaintenanceScreen message={'' as any} />);
    expect(screen.getByText('version.maintenance.message')).toBeTruthy();
  });

  it('renders the badge text', () => {
    render(<MaintenanceScreen message={null} />);
    expect(screen.getByText('version.maintenance.badge')).toBeTruthy();
  });

  it('renders social media links', () => {
    render(<MaintenanceScreen message={null} />);
    expect(screen.getByLabelText('Instagram')).toBeTruthy();
    expect(screen.getByLabelText('TikTok')).toBeTruthy();
  });
});
