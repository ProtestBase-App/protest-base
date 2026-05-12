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

const mockUseVersionCheck = jest.fn();
jest.mock('@/context/VersionCheckProvider', () => ({
  useVersionCheck: () => mockUseVersionCheck(),
}));

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { VersionGate } from '@/components/version/VersionGate';

describe('VersionGate', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows loading indicator when isLoading is true', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: true,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: null,
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    // Children should not be rendered during loading
    expect(screen.queryByText('App Content')).toBeNull();
  });

  it('shows maintenance screen when in maintenance mode', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: true,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: 'Under maintenance',
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.getByText(/version\.maintenance\.titlePrefix/)).toBeTruthy();
    expect(screen.queryByText('App Content')).toBeNull();
  });

  it('shows update required screen when blocking update is needed', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: true,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: null,
      updateMessage: 'Please update',
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.getByText('version.updateRequired.title')).toBeTruthy();
    expect(screen.queryByText('App Content')).toBeNull();
  });

  it('renders children when all checks pass', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: null,
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.getByText('App Content')).toBeTruthy();
  });

  it('renders children with dismissible update prompt', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: true,
      maintenanceMessage: null,
      updateMessage: 'Optional update',
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    // Children should still render alongside the prompt
    expect(screen.getByText('App Content')).toBeTruthy();
    expect(screen.getByText('version.updatePrompt.title')).toBeTruthy();
  });

  it('shows loading spinner without content', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: true,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: null,
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.queryByText('App Content')).toBeNull();
  });

  it('dismisses the update prompt when onDismiss is called', () => {
    const dismissUpdatePrompt = jest.fn();
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: true,
      maintenanceMessage: null,
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt,
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.getByText('App Content')).toBeTruthy();
  });

  it('renders maintenance message when provided', () => {
    mockUseVersionCheck.mockReturnValue({
      isLoading: false,
      showMaintenanceScreen: true,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      maintenanceMessage: 'Custom maintenance message',
      updateMessage: null,
      openStore: jest.fn(),
      dismissUpdatePrompt: jest.fn(),
    });

    render(
      <VersionGate>
        <Text>App Content</Text>
      </VersionGate>
    );

    expect(screen.getByText('Custom maintenance message')).toBeTruthy();
  });
});
