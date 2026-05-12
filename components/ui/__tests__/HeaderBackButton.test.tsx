jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';

describe('HeaderBackButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with default accessibility label', () => {
    render(<HeaderBackButton />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('has button accessibility role', () => {
    render(<HeaderBackButton />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has default accessibility hint', () => {
    render(<HeaderBackButton />);
    expect(screen.getByA11yHint('Navigates to the previous screen')).toBeTruthy();
  });

  it('calls router.back() when pressed without onPress', () => {
    render(<HeaderBackButton />);
    fireEvent.press(screen.getByRole('button'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('calls custom onPress handler instead of router.back', () => {
    const customPress = jest.fn();
    render(<HeaderBackButton onPress={customPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(customPress).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('uses custom accessibility label', () => {
    render(<HeaderBackButton accessibilityLabel="Navigate back" />);
    expect(screen.getByLabelText('Navigate back')).toBeTruthy();
  });

  it('uses custom accessibility hint', () => {
    render(<HeaderBackButton accessibilityHint="Goes to previous page" />);
    expect(screen.getByA11yHint('Goes to previous page')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<HeaderBackButton />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('uses custom color when provided', () => {
    render(<HeaderBackButton color="#FF0000" />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('applies container styles', () => {
    render(<HeaderBackButton containerStyles={{ marginLeft: 10 }} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
