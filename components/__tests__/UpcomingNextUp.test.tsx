jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';

import UpcomingNextUp from '@/components/UpcomingNextUp';
import { createMockEvent, renderWithProviders } from '@/test-utils/render';
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

const NOW = new Date('2026-11-02T10:00:00.000Z');

const buildEvent = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    $id: 'next-1',
    title: 'Weekly vigil',
    organization_id: 'org-1',
    start_time: '2026-11-03T18:00:00.000Z',
    city: 'Brussels',
    categories: ['Protest'],
    ...overrides,
  });

const renderNextUp = (events: Event[], providerOverrides = FLAG_ON) =>
  renderWithProviders(<UpcomingNextUp events={events} now={NOW} userLanguage="en" />, {
    providerOverrides,
  });

describe('UpcomingNextUp series badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks the next date of a series while the feature is on', () => {
    const { getByTestId } = renderNextUp([buildEvent({ series_id: 'series-1' })]);

    expect(getByTestId('next-up-series-next-1')).toBeTruthy();
  });

  it('shows nothing while the feature is off', () => {
    const { queryByTestId } = renderNextUp([buildEvent({ series_id: 'series-1' })], FLAG_OFF);

    expect(queryByTestId('next-up-series-next-1')).toBeNull();
  });

  it('shows nothing to a guest or to a member of another organization', () => {
    for (const viewer of [GUEST, OTHER_ORG]) {
      const { queryByTestId, unmount } = renderNextUp(
        [buildEvent({ series_id: 'series-1' })],
        viewer
      );

      expect(queryByTestId('next-up-series-next-1')).toBeNull();
      unmount();
    }
  });

  it('shows nothing for an event that is not in a series', () => {
    expect(
      renderNextUp([buildEvent({ series_id: null })]).queryByTestId('next-up-series-next-1')
    ).toBeNull();
  });
});
