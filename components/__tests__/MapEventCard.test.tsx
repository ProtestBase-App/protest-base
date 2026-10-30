jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';
import { router } from 'expo-router';

import MapEventCard from '@/components/MapEventCard';
import { DynamicRoutes } from '@/constants/Routes';
import { createMockEvent, fireEvent, renderWithProviders } from '@/test-utils/render';
import type { Event } from '@/types/event.types';

const FLAG_ON = {
  versionCheckContext: { features: { recurringEvents: true } },
  userOrganizationsContext: { userOrganizations: [{ $id: 'org-1' }] },
};
const FLAG_OFF = { ...FLAG_ON, versionCheckContext: { features: { recurringEvents: false } } };
const OTHER_ORG = {
  ...FLAG_ON,
  userOrganizationsContext: { userOrganizations: [{ $id: 'org-2' }] },
};
const GUEST = { ...FLAG_ON, userOrganizationsContext: { userOrganizations: [] } };

const buildEvent = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    organization_id: 'org-1',
    $id: 'map-event-1',
    title: 'Climate March',
    start_time: '2026-11-03T18:00:00.000Z',
    city: 'Brussels',
    categories: ['Protest'],
    ...overrides,
  });

const renderCard = (event: Event, providerOverrides = FLAG_ON, onPress = jest.fn()) =>
  renderWithProviders(
    <MapEventCard
      event={event}
      active
      saved={false}
      userLanguage="en"
      todayKey="2026-11-02"
      onPress={onPress}
      onToggleSave={jest.fn()}
      testID="map-card"
    />,
    { providerOverrides }
  );

describe('MapEventCard series badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks a date of a series while the feature is on', () => {
    const { getByTestId, getByText } = renderCard(buildEvent({ series_id: 'series-1' }));

    expect(getByTestId('map-card-series')).toBeTruthy();
    expect(getByText('series.badge.generic')).toBeTruthy();
  });

  it('shows nothing while the feature is off', () => {
    const { queryByTestId, queryByText } = renderCard(
      buildEvent({ series_id: 'series-1' }),
      FLAG_OFF
    );

    expect(queryByTestId('map-card-series')).toBeNull();
    expect(queryByText('series.badge.generic')).toBeNull();
  });

  it('shows nothing to a guest or to a member of another organization', () => {
    for (const viewer of [GUEST, OTHER_ORG]) {
      const { queryByTestId, unmount } = renderCard(buildEvent({ series_id: 'series-1' }), viewer);

      expect(queryByTestId('map-card-series')).toBeNull();
      unmount();
    }
  });

  it('shows nothing for an event that is not in a series', () => {
    expect(renderCard(buildEvent({ series_id: null })).queryByTestId('map-card-series')).toBeNull();
    expect(
      renderCard(buildEvent({ series_id: undefined })).queryByTestId('map-card-series')
    ).toBeNull();
  });

  it('still shows the badge on an event with no category', () => {
    const { getByTestId } = renderCard(buildEvent({ series_id: 'series-1', categories: [] }));

    expect(getByTestId('map-card-series')).toBeTruthy();
  });

  it('leaves the rest of the card alone', () => {
    const { getByText } = renderCard(buildEvent({ series_id: 'series-1' }));

    expect(getByText('Climate March')).toBeTruthy();
  });

  it('opens the series, not the event, when it is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderCard(buildEvent({ series_id: 'series-1' }), FLAG_ON, onPress);

    fireEvent.press(getByTestId('map-card-series'), { stopPropagation: jest.fn() });

    expect(router.push).toHaveBeenCalledWith(DynamicRoutes.series('series-1'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
