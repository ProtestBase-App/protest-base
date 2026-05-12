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
import PastEventSummaryCard from '@/components/PastEventSummaryCard';
import { router } from 'expo-router';
import type { PastEventSummaryItem } from '@/components/PastEventSummaryCard';

describe('PastEventSummaryCard', () => {
  const mockEvent: PastEventSummaryItem = {
    id: 'event-123',
    title: 'Climate March 2025',
    startDateNoFormat: '2025-03-15',
    view_count: 42,
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the event title', () => {
    render(<PastEventSummaryCard event={mockEvent} />);
    expect(screen.getByText('Climate March 2025')).toBeTruthy();
  });

  it('renders the formatted date', () => {
    render(<PastEventSummaryCard event={mockEvent} />);
    expect(screen.getByText('2025-03-15')).toBeTruthy();
  });

  it('renders the view count', () => {
    render(<PastEventSummaryCard event={mockEvent} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('navigates to event detail on press', () => {
    render(<PastEventSummaryCard event={mockEvent} />);
    fireEvent.press(screen.getByText('Climate March 2025'));
    expect(router.push).toHaveBeenCalledWith('/event/event-123');
  });
});
