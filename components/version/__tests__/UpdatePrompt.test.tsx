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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UpdatePrompt } from '@/components/version/UpdatePrompt';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('UpdatePrompt', () => {
  const defaultProps = {
    visible: true,
    message: null as string | null,
    onUpdate: jest.fn(),
    onDismiss: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the update prompt title when visible', () => {
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.title')).toBeTruthy();
  });

  it('shows default message when message is null', () => {
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.message')).toBeTruthy();
  });

  it('shows custom message when provided', () => {
    render(<UpdatePrompt {...defaultProps} message="Update to v2.0" />);
    expect(screen.getByText('Update to v2.0')).toBeTruthy();
  });

  it('renders the update button', () => {
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.updateButton')).toBeTruthy();
  });

  it('renders the later button', () => {
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.laterButton')).toBeTruthy();
  });

  it('calls onUpdate when update button is pressed', () => {
    const onUpdate = jest.fn();
    render(<UpdatePrompt {...defaultProps} onUpdate={onUpdate} />);
    fireEvent.press(screen.getByText('version.updatePrompt.updateButton'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when later button is pressed', () => {
    const onDismiss = jest.fn();
    render(<UpdatePrompt {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByText('version.updatePrompt.laterButton'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('is not visible when visible is false', () => {
    render(<UpdatePrompt {...defaultProps} visible={false} />);
    // Modal is hidden — content should not be in the tree
    expect(screen.queryByText('version.updatePrompt.title')).toBeNull();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.title')).toBeTruthy();
  });

  it('renders in light mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(<UpdatePrompt {...defaultProps} />);
    expect(screen.getByText('version.updatePrompt.title')).toBeTruthy();
  });
});
