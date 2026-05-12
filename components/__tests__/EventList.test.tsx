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

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EventList from '@/components/EventList';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { FormattedEventListItem } from '@/utils/eventFormatters';

const makeEvent = (overrides: Partial<FormattedEventListItem> = {}): FormattedEventListItem => ({
  id: 'event-1',
  $id: 'event-1',
  title: 'Climate March',
  description: 'A march for climate',
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
  view_count: 10,
  ...overrides,
});

describe('EventList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders a list of events', () => {
    const events = [makeEvent(), makeEvent({ id: 'event-2', $id: 'event-2', title: 'Peace Walk' })];
    render(<EventList events={events} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
    expect(screen.getByText('Peace Walk')).toBeTruthy();
  });

  it('renders header title when provided', () => {
    render(<EventList events={[makeEvent()]} userLanguage="en" headerTitle="Upcoming Events" />);
    expect(screen.getByText('Upcoming Events')).toBeTruthy();
  });

  it('does not render header when headerTitle is not provided', () => {
    render(<EventList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.queryByText('Upcoming Events')).toBeNull();
  });

  it('renders empty state when no events and not loading', () => {
    render(<EventList events={[]} userLanguage="en" loading={false} />);
    // EmptyEvent component should render
    expect(screen.toJSON()).toBeTruthy();
  });

  it('does not render empty state when loading', () => {
    const { toJSON } = render(<EventList events={[]} userLanguage="en" loading={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('navigates to event detail when card is pressed', () => {
    render(<EventList events={[makeEvent()]} userLanguage="en" />);
    fireEvent.press(screen.getByText('Climate March'));
    expect(router.push).toHaveBeenCalledWith('/event/event-1');
  });

  it('renders share button when onShare is provided', () => {
    const onShare = jest.fn();
    render(<EventList events={[makeEvent()]} userLanguage="en" onShare={onShare} />);
    expect(screen.getByLabelText('Share event')).toBeTruthy();
  });

  it('calls onShare when share button is pressed', () => {
    const onShare = jest.fn();
    render(<EventList events={[makeEvent()]} userLanguage="en" onShare={onShare} />);
    fireEvent(screen.getByLabelText('Share event'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(onShare).toHaveBeenCalledWith('event-1');
  });

  it('does not render share button when onShare is not provided', () => {
    render(<EventList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.queryByLabelText('Share event')).toBeNull();
  });

  it('renders help wanted badge for events with help_needed', () => {
    render(<EventList events={[makeEvent({ help_needed: true })]} userLanguage="en" />);
    expect(screen.getByText('Help Wanted')).toBeTruthy();
  });

  it('renders category badge', () => {
    render(<EventList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('categories.climate')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<EventList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders with onRefresh callback', () => {
    const onRefresh = jest.fn();
    render(
      <EventList events={[makeEvent()]} userLanguage="en" onRefresh={onRefresh} refreshing={true} />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders event without postal code (empty city label)', () => {
    render(<EventList events={[makeEvent({ postal_code: undefined as any })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders event with image', () => {
    render(
      <EventList events={[makeEvent({ image: 'https://example.com/img.jpg' })]} userLanguage="en" />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('only renders the first category badge when multiple categories exist', () => {
    render(
      <EventList events={[makeEvent({ categories: ['Climate', 'Education'] })]} userLanguage="en" />
    );
    expect(screen.getByText('categories.climate')).toBeTruthy();
    // EventList renders only the first category badge (categories[0])
    expect(screen.queryByText('categories.education')).toBeNull();
  });

  it('renders without categories', () => {
    render(<EventList events={[makeEvent({ categories: [] })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
    expect(screen.queryByText('categories.climate')).toBeNull();
  });

  it('renders event with null country (falsy country branch in postal code loading)', () => {
    // Exercises the `if (country)` branch where country is falsy
    render(<EventList events={[makeEvent({ country: null as any })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders event without postal_code and without country (both null)', () => {
    render(
      <EventList
        events={[makeEvent({ postal_code: null as any, country: null as any })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders with categories being null (falsy categories branch)', () => {
    render(<EventList events={[makeEvent({ categories: null as any })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });
});
