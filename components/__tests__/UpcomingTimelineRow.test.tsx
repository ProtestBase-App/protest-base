jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';
import { router } from 'expo-router';

import UpcomingTimelineRow from '@/components/UpcomingTimelineRow';
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
    $id: 'upcoming-1',
    title: 'Weekly vigil',
    organization_id: 'org-1',
    start_time: '2026-11-03T18:00:00.000Z',
    city: 'Brussels',
    categories: ['Protest'],
    ...overrides,
  });

const renderRow = (event: Event, providerOverrides = FLAG_ON) =>
  renderWithProviders(
    <UpcomingTimelineRow event={event} ongoing={false} todayKey="2026-11-02" userLanguage="en" />,
    { providerOverrides }
  );

describe('UpcomingTimelineRow series badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks a date of a series while the feature is on', () => {
    const { getByTestId, getByText } = renderRow(buildEvent({ series_id: 'series-1' }));

    expect(getByTestId('upcoming-series-upcoming-1')).toBeTruthy();
    expect(getByText('series.badge.generic')).toBeTruthy();
  });

  it('shows nothing while the feature is off', () => {
    const { queryByTestId, queryByText } = renderRow(
      buildEvent({ series_id: 'series-1' }),
      FLAG_OFF
    );

    expect(queryByTestId('upcoming-series-upcoming-1')).toBeNull();
    expect(queryByText('series.badge.generic')).toBeNull();
  });

  it('shows nothing to a guest or to a member of another organization', () => {
    for (const viewer of [GUEST, OTHER_ORG]) {
      const { queryByTestId, unmount } = renderRow(buildEvent({ series_id: 'series-1' }), viewer);

      expect(queryByTestId('upcoming-series-upcoming-1')).toBeNull();
      unmount();
    }
  });

  it('shows nothing for an event that is not in a series', () => {
    expect(
      renderRow(buildEvent({ series_id: null })).queryByTestId('upcoming-series-upcoming-1')
    ).toBeNull();
    expect(
      renderRow(buildEvent({ series_id: undefined })).queryByTestId('upcoming-series-upcoming-1')
    ).toBeNull();
  });

  it('opens the series when the badge is pressed, and the event when the row is', () => {
    const { getByTestId, getByLabelText } = renderRow(buildEvent({ series_id: 'series-1' }));

    fireEvent.press(getByTestId('upcoming-series-upcoming-1'), { stopPropagation: jest.fn() });
    expect(router.push).toHaveBeenLastCalledWith(DynamicRoutes.series('series-1'));

    fireEvent.press(getByLabelText('Weekly vigil'));
    expect(router.push).toHaveBeenLastCalledWith(DynamicRoutes.event('upcoming-1'));
  });
});
