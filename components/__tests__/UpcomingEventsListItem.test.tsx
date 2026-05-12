jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: jest.fn(() => ({
    getSubMunicipalityName: jest.fn(() => 'Brussels'),
  })),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UpcomingEventsListItem from '@/components/UpcomingEventsListItem';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import type { FormattedEventListItem } from '@/utils/eventFormatters';

const mockEvent: FormattedEventListItem = {
  id: 'event-1',
  $id: 'event-1',
  title: 'Education Rally',
  description: 'Rally for education',
  start_time: 'Mar 15, 14:00',
  startDateNoFormat: '2025-03-15',
  startDateFull: '2025-03-15T14:00:00Z',
  endDateFull: '2025-03-15T16:00:00Z',
  city: 'Brussels',
  country: 'belgium',
  postal_code: 1000,
  categories: ['Education'],
  image: 'https://example.com/image.jpg',
  help_needed: false,
  organizer_name: 'Org',
  organization_id: 'org-1',
  view_count: 42,
};

describe('UpcomingEventsListItem', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the event title', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
  });

  it('renders the start time', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText('Mar 15, 14:00')).toBeTruthy();
  });

  it('renders the city label from postal code', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText('Brussels')).toBeTruthy();
  });

  it('renders the view count badge', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it('navigates to event detail on press', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    fireEvent.press(screen.getByText('Education Rally'));
    expect(router.push).toHaveBeenCalledWith('/event/event-1');
  });

  it('renders help wanted badge when help_needed is true', () => {
    const helpEvent = { ...mockEvent, help_needed: true };
    render(<UpcomingEventsListItem event={helpEvent} />);
    expect(screen.getByText('Help Wanted')).toBeTruthy();
  });

  it('does not render help badge when help_needed is false', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.queryByText('Help Wanted')).toBeNull();
  });

  it('renders category badge', () => {
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText('categories.education')).toBeTruthy();
  });

  it('does not show city when postal code is missing', () => {
    const noCityEvent = { ...mockEvent, postal_code: undefined as any, country: undefined as any };
    (usePostalCodes as jest.Mock).mockReturnValue({
      getSubMunicipalityName: jest.fn(() => ''),
    });
    render(<UpcomingEventsListItem event={noCityEvent} />);
    // The city label row should not appear
    expect(screen.queryByText('Brussels')).toBeNull();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<UpcomingEventsListItem event={mockEvent} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
  });
});
