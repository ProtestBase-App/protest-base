jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EmptyEventMyEvents from '@/components/EmptyEventMyEvents';

describe('EmptyEventMyEvents', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(<EmptyEventMyEvents />);
    expect(screen.getByText('Nothing Scheduled Yet')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<EmptyEventMyEvents />);
    expect(
      screen.getByText("Organizers haven't created any upcoming events. Check back soon!")
    ).toBeTruthy();
  });
});
