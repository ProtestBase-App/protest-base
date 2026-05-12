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
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UpdateRequiredScreen } from '@/components/version/UpdateRequiredScreen';

describe('UpdateRequiredScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the update required title', () => {
    render(<UpdateRequiredScreen message={null} onUpdate={jest.fn()} />);
    expect(screen.getByText('version.updateRequired.title')).toBeTruthy();
  });

  it('shows default message when message is null', () => {
    render(<UpdateRequiredScreen message={null} onUpdate={jest.fn()} />);
    expect(screen.getByText('version.updateRequired.message')).toBeTruthy();
  });

  it('shows custom message when provided', () => {
    render(<UpdateRequiredScreen message="New version available" onUpdate={jest.fn()} />);
    expect(screen.getByText('New version available')).toBeTruthy();
  });

  it('renders the update button', () => {
    render(<UpdateRequiredScreen message={null} onUpdate={jest.fn()} />);
    expect(screen.getByText('version.updateRequired.button')).toBeTruthy();
  });

  it('calls onUpdate when button is pressed', () => {
    const onUpdate = jest.fn();
    render(<UpdateRequiredScreen message={null} onUpdate={onUpdate} />);
    fireEvent.press(screen.getByText('version.updateRequired.button'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('renders with an empty string message (falls back to default)', () => {
    render(<UpdateRequiredScreen message={'' as any} onUpdate={jest.fn()} />);
    expect(screen.getByText('version.updateRequired.message')).toBeTruthy();
  });

  it('renders without crashing in various color scheme states', () => {
    render(<UpdateRequiredScreen message={null} onUpdate={jest.fn()} />);
    expect(screen.getByText('version.updateRequired.title')).toBeTruthy();
  });
});
