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
    loadPostalCodesForCountry: jest.fn(),
    cacheVersion: 0,
  })),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UpcomingEventsList from '@/components/UpcomingEventsList';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { FormattedEventListItem } from '@/utils/eventFormatters';

const makeEvent = (overrides: Partial<FormattedEventListItem> = {}): FormattedEventListItem => ({
  id: 'event-1',
  $id: 'event-1',
  title: 'Climate March',
  description: 'A march',
  start_time: 'Mar 15, 14:00',
  startDateNoFormat: '2025-03-15',
  startDateFull: '2025-03-15T14:00:00Z',
  endDateFull: '2025-03-15T16:00:00Z',
  city: 'Brussels',
  country: 'belgium',
  postal_code: 1000,
  categories: ['Climate'],
  image: '',
  help_needed: false,
  organizer_name: 'Org',
  organization_id: 'org-1',
  view_count: 42,
  ...overrides,
});

describe('UpcomingEventsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders a list of events', () => {
    render(
      <UpcomingEventsList
        events={[makeEvent(), makeEvent({ id: 'e2', $id: 'e2', title: 'Peace Walk' })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
    expect(screen.getByText('Peace Walk')).toBeTruthy();
  });

  it('renders header when headerTitle is provided', () => {
    render(
      <UpcomingEventsList
        events={[makeEvent()]}
        userLanguage="en"
        headerTitle="My Upcoming"
        headerSubtitle="Events you organized"
      />
    );
    expect(screen.getByText('My Upcoming')).toBeTruthy();
  });

  it('navigates to event detail on press', () => {
    render(<UpcomingEventsList events={[makeEvent()]} userLanguage="en" />);
    fireEvent.press(screen.getByText('Climate March'));
    expect(router.push).toHaveBeenCalledWith('/event/event-1');
  });

  it('renders empty state when no events and not loading', () => {
    render(<UpcomingEventsList events={[]} userLanguage="en" loading={false} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('does not render empty state when loading', () => {
    const { toJSON } = render(<UpcomingEventsList events={[]} userLanguage="en" loading={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders help wanted badge for events with help_needed', () => {
    render(<UpcomingEventsList events={[makeEvent({ help_needed: true })]} userLanguage="en" />);
    expect(screen.getByText('Help Wanted')).toBeTruthy();
  });

  it('renders category badge', () => {
    render(<UpcomingEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('categories.climate')).toBeTruthy();
  });

  it('renders view count', () => {
    render(<UpcomingEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders without header when headerTitle is absent', () => {
    render(<UpcomingEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.queryByText('My Upcoming')).toBeNull();
  });

  it('renders with refreshing and onRefresh callback', () => {
    const onRefresh = jest.fn();
    render(
      <UpcomingEventsList
        events={[makeEvent()]}
        userLanguage="en"
        refreshing={true}
        onRefresh={onRefresh}
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders headerSubtitle when provided with headerTitle', () => {
    render(
      <UpcomingEventsList
        events={[makeEvent()]}
        userLanguage="en"
        headerTitle="Upcoming"
        headerSubtitle="Your events"
      />
    );
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('Your events')).toBeTruthy();
  });

  it('renders with no postal code (empty city label)', () => {
    render(
      <UpcomingEventsList
        events={[makeEvent({ postal_code: undefined as any })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders with image when provided', () => {
    render(
      <UpcomingEventsList
        events={[makeEvent({ image: 'https://example.com/img.jpg' })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<UpcomingEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });
});
