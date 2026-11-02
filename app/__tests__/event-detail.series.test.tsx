// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key
  ),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/event.service', () => {
  class EventNotFoundError extends Error {}
  class EventNetworkError extends Error {}
  class EventAlreadyCancelledError extends Error {}
  class EventSeriesError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'EventSeriesError';
      this.code = code;
    }
  }
  return {
    getEventByIdBackend: jest.fn(),
    cancelEvent: jest.fn(),
    cancelSeries: jest.fn(),
    getSeries: jest.fn(),
    EventNotFoundError,
    EventNetworkError,
    EventAlreadyCancelledError,
    EventSeriesError,
  };
});

jest.mock('@/services/eventView.service', () => ({
  trackEventView: jest.fn(),
}));

jest.mock('@/hooks/useEventWeather', () => ({
  useEventWeather: jest.fn(() => ({ weather: null, refresh: jest.fn() })),
}));

jest.mock('@/utils/eventPermissions', () => ({
  canUserEditEvent: jest.fn(() => true),
  canUserDeleteEvent: jest.fn(),
}));

jest.mock('@/utils/shareHelpers', () => ({
  shareEventWithAlert: jest.fn(),
}));

jest.mock('@/utils/mapHelpers', () => ({ openMap: jest.fn() }));

jest.mock('@/components/ui/loaders/BrandLoader', () => ({
  BrandLoader: () => null,
}));

// The presentational component is EventDetailed's own tests; what the screen decides
// is the badge it hands over, which this stand-in puts on screen.
jest.mock('@/components/EventDetailed', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ event, seriesBadge }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, event.title),
        React.createElement(View, { testID: 'badge-slot' }, seriesBadge)
      ),
  };
});

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DynamicRoutes } from '@/constants/Routes';
import { createMockEvent, createMockUser, renderWithProviders } from '@/test-utils/render';
import type { Event } from '@/types/event.types';
import type { EventSeries } from '@/types/eventSeries.types';
import EventDetails from '@/app/event/[id]';

const { router, useLocalSearchParams } = require('expo-router');
const {
  getEventByIdBackend,
  cancelEvent,
  cancelSeries,
  getSeries,
  EventSeriesError,
} = require('@/services/event.service');

const FLAG_ON = { features: { recurringEvents: true } };
const FLAG_OFF = { features: { recurringEvents: false } };

const series = (overrides: Partial<EventSeries> = {}): EventSeries => ({
  id: 'series-1',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: null,
  starts_on: '2026-11-03',
  until_date: '2026-11-17',
  window_end: '2027-02-03',
  max_occurrences: 14,
  occurrences: [
    { $id: 'event-1', start_time: '2026-11-03T18:00:00.000Z', end_time: null, status: 'active' },
    { $id: 'event-2', start_time: '2026-11-10T18:00:00.000Z', end_time: null, status: 'active' },
    { $id: 'event-3', start_time: '2026-11-17T18:00:00.000Z', end_time: null, status: 'active' },
  ],
  can_add_dates: false,
  ...overrides,
});

const seriesDate = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    $id: 'event-1',
    title: 'Weekly vigil',
    organization_id: 'org-1',
    series_id: 'series-1',
    ...overrides,
  });

describe('EventDetails recurring events', () => {
  const mockUser = createMockUser();
  let alertSpy: jest.SpyInstance;
  let refetchEvents: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'event-1' });
    getEventByIdBackend.mockResolvedValue(seriesDate());
    getSeries.mockResolvedValue(series());
    cancelEvent.mockResolvedValue({ cancelled_at: '2026-11-01T10:00:00.000Z' });
    cancelSeries.mockResolvedValue({ cancelled: 3, deleted: 0, series: series() });
    refetchEvents = jest.fn().mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const renderDetails = async (flag: { features: { recurringEvents: boolean } } = FLAG_ON) => {
    const utils = renderWithProviders(<EventDetails />, {
      providerOverrides: {
        globalContext: {
          user: mockUser,
          isLogged: true,
          loading: false,
          userLanguage: 'en',
          eventsCache: {},
          refetchEvents,
          refreshUserEventCounts: jest.fn(),
        },
        userOrganizationsContext: { userOrganizations: [{ $id: 'org-1', name: 'Org' }] },
        postalCodeContext: { loading: false, getSubMunicipalityName: jest.fn(() => '') },
        versionCheckContext: flag,
      },
    });
    await utils.findByText('Weekly vigil');
    return utils;
  };

  const openCancelDialog = async (utils: Awaited<ReturnType<typeof renderDetails>>) => {
    fireEvent.press(await utils.findByTestId('event-sticky-manage'));
    fireEvent.press(utils.getByTestId('creator-action-cancel'));
    return utils;
  };

  const confirmCancel = async (
    utils: Awaited<ReturnType<typeof renderDetails>>,
    scope?: 'following'
  ) => {
    if (scope) fireEvent.press(utils.getByTestId('cancel-event-dialog-following'));
    await act(async () => {
      fireEvent.press(utils.getByTestId('cancel-event-dialog-confirm'));
    });
  };

  describe('the badge', () => {
    it('says what the series is once it has loaded, for a date of a series', async () => {
      const { findByTestId } = await renderDetails();

      const badge = await findByTestId('event-series-badge');
      await waitFor(() =>
        expect(badge.props.accessibilityLabel).toBe(
          'series.badge.weekly:{"locale":"en"} · series.badge.count:{"locale":"en","count":3}'
        )
      );
      expect(getSeries).toHaveBeenCalledTimes(1);
      expect(getSeries).toHaveBeenCalledWith('series-1');
    });

    it('says "Recurring event" until the series has loaded', async () => {
      getSeries.mockImplementation(() => new Promise(() => {}));
      const { findByTestId } = await renderDetails();

      const badge = await findByTestId('event-series-badge');

      expect(badge.props.accessibilityLabel).toBe('series.badge.generic');
    });

    it('says "Recurring event" when the series cannot be loaded, and still shows', async () => {
      getSeries.mockRejectedValue(new Error('Network Error'));
      const { findByTestId } = await renderDetails();

      const badge = await findByTestId('event-series-badge');
      await waitFor(() => expect(getSeries).toHaveBeenCalled());

      expect(badge.props.accessibilityLabel).toBe('series.badge.generic');
    });

    it('opens the series screen when pressed', async () => {
      const { findByTestId } = await renderDetails();

      fireEvent.press(await findByTestId('event-series-badge'), { stopPropagation: jest.fn() });

      expect(router.push).toHaveBeenCalledWith(DynamicRoutes.series('series-1'));
    });

    it.each([
      ['a guest', [], false],
      ['a member of another organization', [{ $id: 'org-2', name: 'Other' }], true],
    ])('is not shown, and the series is not read, for %s', async (_who, orgs, isLogged) => {
      const utils = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: isLogged ? mockUser : null,
            isLogged,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents,
            refreshUserEventCounts: jest.fn(),
          },
          userOrganizationsContext: { userOrganizations: orgs as any },
          postalCodeContext: { loading: false, getSubMunicipalityName: jest.fn(() => '') },
          versionCheckContext: FLAG_ON,
        },
      });
      await utils.findByText('Weekly vigil');

      expect(utils.queryByTestId('event-series-badge')).toBeNull();
      expect(getSeries).not.toHaveBeenCalled();
    });

    it('is not shown, and the series is not read, while the feature is off', async () => {
      const { queryByTestId } = await renderDetails(FLAG_OFF);

      expect(queryByTestId('event-series-badge')).toBeNull();
      expect(getSeries).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['missing', undefined],
    ])('is not shown, and nothing is read, when the series_id is %s', async (_label, seriesId) => {
      getEventByIdBackend.mockResolvedValue(seriesDate({ series_id: seriesId as string | null }));
      const { queryByTestId } = await renderDetails(FLAG_ON);

      expect(queryByTestId('event-series-badge')).toBeNull();
      expect(getSeries).not.toHaveBeenCalled();
    });
  });

  describe('cancelling a date of a series', () => {
    it('offers only this event or this and all following events', async () => {
      const utils = await openCancelDialog(await renderDetails());

      expect(utils.getByTestId('cancel-event-dialog-only')).toBeTruthy();
      expect(utils.getByTestId('cancel-event-dialog-following')).toBeTruthy();
      expect(utils.getByText('series.scope.only')).toBeTruthy();
      expect(utils.getByText('series.scope.following')).toBeTruthy();
      expect(utils.getByText('series.dialogs.cancelFollowingHint')).toBeTruthy();
      expect(utils.getByTestId('cancel-event-dialog-only').props.accessibilityState).toMatchObject({
        selected: true,
      });
    });

    it('cancels this event only, by default, and never the series', async () => {
      const utils = await openCancelDialog(await renderDetails());

      await confirmCancel(utils);

      expect(cancelEvent).toHaveBeenCalledTimes(1);
      expect(cancelEvent).toHaveBeenCalledWith('event-1');
      expect(cancelSeries).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.success', 'events.cancelSuccess')
      );
    });

    it('cancels this date and every later one with the id of this event, and no reason', async () => {
      const utils = await openCancelDialog(await renderDetails());

      await confirmCancel(utils, 'following');

      expect(cancelSeries).toHaveBeenCalledTimes(1);
      expect(cancelSeries).toHaveBeenCalledWith('series-1', { fromEventId: 'event-1' });
      expect(cancelSeries.mock.calls[0]).toHaveLength(2);
      expect(cancelEvent).not.toHaveBeenCalled();
    });

    it('says how many dates were cancelled, and refreshes what it shows', async () => {
      cancelSeries.mockResolvedValue({ cancelled: 3, deleted: 0, series: series() });
      const utils = await openCancelDialog(await renderDetails());
      await waitFor(() => expect(getSeries).toHaveBeenCalledTimes(1));

      await confirmCancel(utils, 'following');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.cancelled:{"count":3}'
        )
      );
      expect(refetchEvents).toHaveBeenCalled();
      // The badge's label counts the dates, so the series is read again.
      await waitFor(() => expect(getSeries).toHaveBeenCalledTimes(2));
      expect(utils.queryByTestId('cancel-event-dialog-confirm')).toBeNull();
    });

    it('shows the copy of the code when the series refuses, and closes the dialog', async () => {
      cancelSeries.mockRejectedValue(
        new EventSeriesError('SERIES_NOTHING_UPCOMING', 'Nothing upcoming')
      );
      const utils = await openCancelDialog(await renderDetails());

      await confirmCancel(utils, 'following');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.nothingUpcoming')
      );
      expect(utils.queryByTestId('cancel-event-dialog-confirm')).toBeNull();
    });

    it('does not cancel the series when offline', async () => {
      const utils = renderWithProviders(<EventDetails />, {
        providerOverrides: {
          globalContext: {
            user: mockUser,
            isLogged: true,
            loading: false,
            userLanguage: 'en',
            eventsCache: {},
            refetchEvents,
            refreshUserEventCounts: jest.fn(),
          },
          userOrganizationsContext: { userOrganizations: [{ $id: 'org-1', name: 'Org' }] },
          postalCodeContext: { loading: false, getSubMunicipalityName: jest.fn(() => '') },
          connectivityContext: { isOffline: true },
          versionCheckContext: FLAG_ON,
        },
      });
      await utils.findByText('Weekly vigil');
      await openCancelDialog(utils as any);

      await confirmCancel(utils as any, 'following');

      expect(cancelSeries).not.toHaveBeenCalled();
      expect(cancelEvent).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'connectivity.actionUnavailableOffline'
      );
    });
  });

  describe('cancelling an event that is not offered as a series', () => {
    it('keeps the plain dialog for a single event', async () => {
      getEventByIdBackend.mockResolvedValue(seriesDate({ series_id: null }));
      const utils = await openCancelDialog(await renderDetails(FLAG_ON));

      expect(utils.getByTestId('cancel-event-dialog-confirm')).toBeTruthy();
      expect(utils.queryByTestId('cancel-event-dialog-only')).toBeNull();
      expect(utils.queryByTestId('cancel-event-dialog-following')).toBeNull();
      expect(utils.queryByText('series.scope.following')).toBeNull();

      await confirmCancel(utils);

      expect(cancelEvent).toHaveBeenCalledWith('event-1');
      expect(cancelSeries).not.toHaveBeenCalled();
    });

    it('keeps the plain dialog for a date of a series while the feature is off', async () => {
      const utils = await openCancelDialog(await renderDetails(FLAG_OFF));

      expect(utils.queryByTestId('cancel-event-dialog-following')).toBeNull();
      expect(utils.queryByText('series.scope.following')).toBeNull();

      await confirmCancel(utils);

      expect(cancelEvent).toHaveBeenCalledWith('event-1');
      expect(cancelSeries).not.toHaveBeenCalled();
      expect(getSeries).not.toHaveBeenCalled();
    });
  });
});
