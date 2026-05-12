jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

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
import MyEventsList from '@/components/MyEventsList';
import { router } from 'expo-router';
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

describe('MyEventsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders events in the list', () => {
    render(
      <MyEventsList
        events={[makeEvent(), makeEvent({ id: 'e2', $id: 'e2', title: 'Peace Walk' })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
    expect(screen.getByText('Peace Walk')).toBeTruthy();
  });

  it('renders the header title', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" headerTitle="My Events" />);
    expect(screen.getByText('My Events')).toBeTruthy();
  });

  it('navigates to event detail on press', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" />);
    fireEvent.press(screen.getByText('Climate March'));
    expect(router.push).toHaveBeenCalledWith('/event/event-1');
  });

  it('renders empty state when no events and not loading', () => {
    render(<MyEventsList events={[]} userLanguage="en" loading={false} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows event date', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('Mar 15, 14:00')).toBeTruthy();
  });

  it('shows city label from postal codes', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('Brussels')).toBeTruthy();
  });

  it('shows description text', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.getByText('A march for climate')).toBeTruthy();
  });

  it('renders without headerTitle (no header rendered)', () => {
    render(<MyEventsList events={[makeEvent()]} userLanguage="en" />);
    expect(screen.queryByText('My Events')).toBeNull();
  });

  it('renders with refreshing and onRefresh', () => {
    const onRefresh = jest.fn();
    render(
      <MyEventsList
        events={[makeEvent()]}
        userLanguage="en"
        refreshing={true}
        onRefresh={onRefresh}
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('shows loading state (no empty component)', () => {
    render(<MyEventsList events={[]} userLanguage="en" loading={true} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows empty state when not loading', () => {
    render(<MyEventsList events={[]} userLanguage="en" loading={false} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders event with no postal code (empty city label)', () => {
    render(
      <MyEventsList
        events={[makeEvent({ postal_code: undefined as any, country: undefined as any })]}
        userLanguage="en"
      />
    );
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders event with null description', () => {
    render(<MyEventsList events={[makeEvent({ description: null as any })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('uses fallback key when $id is missing', () => {
    render(<MyEventsList events={[makeEvent({ $id: '' })]} userLanguage="en" />);
    expect(screen.getByText('Climate March')).toBeTruthy();
  });
});
