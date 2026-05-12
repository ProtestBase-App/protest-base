jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import EmptyEvent from '@/components/EmptyEvent';
import { router } from 'expo-router';

describe('EmptyEvent', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the empty state title', () => {
    render(<EmptyEvent />);
    expect(screen.getByText('home.emptyTitle')).toBeTruthy();
  });

  it('renders the empty state subtitle', () => {
    render(<EmptyEvent />);
    expect(screen.getByText('home.emptySubtitle')).toBeTruthy();
  });

  it('renders the action button', () => {
    render(<EmptyEvent />);
    expect(screen.getByText('home.emptyButton')).toBeTruthy();
  });

  it('navigates to explore when button is pressed', async () => {
    render(<EmptyEvent />);
    fireEvent.press(screen.getByText('home.emptyButton'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(tabs)/(explore)/explore');
    });
  });
});
