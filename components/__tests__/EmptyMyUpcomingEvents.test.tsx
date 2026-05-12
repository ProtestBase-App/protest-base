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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EmptyMyUpcomingEvents from '@/components/EmptyMyUpcomingEvents';
import { router } from 'expo-router';

describe('EmptyMyUpcomingEvents', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(<EmptyMyUpcomingEvents />);
    expect(screen.getByText('No upcoming events')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<EmptyMyUpcomingEvents />);
    expect(screen.getByText(/Ready to organize your next event/)).toBeTruthy();
  });

  it('renders the CTA button', () => {
    render(<EmptyMyUpcomingEvents />);
    expect(screen.getByText('Create your next event')).toBeTruthy();
  });

  it('navigates to create-event on CTA press', () => {
    render(<EmptyMyUpcomingEvents />);
    fireEvent.press(screen.getByText('Create your next event'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/(more)/create-event');
  });
});
