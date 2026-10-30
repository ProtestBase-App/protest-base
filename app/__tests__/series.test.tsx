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
  class EventIncompleteError extends Error {
    fields: string[];
    constructor(fields: string[] = []) {
      super('incomplete');
      this.fields = fields;
    }
  }
  class DuplicateEventError extends Error {
    code = 'DUPLICATE_EVENT';
    duplicates: unknown[];
    canOverride: boolean;
    constructor(message = 'duplicate', duplicates: unknown[] = [], canOverride = true) {
      super(message);
      this.duplicates = duplicates;
      this.canOverride = canOverride;
    }
  }
  class EventSeriesError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'EventSeriesError';
      this.code = code;
    }
  }
  return {
    getSeries: jest.fn(),
    addSeriesDates: jest.fn(),
    cancelSeries: jest.fn(),
    deleteSeriesOccurrences: jest.fn(),
    publishSeries: jest.fn(),
    getEventByIdBackend: jest.fn(),
    getDraftEventPreview: jest.fn(),
    EventIncompleteError,
    DuplicateEventError,
    EventSeriesError,
  };
});

jest.mock('@/components/ui/loaders/BrandLoader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    BrandLoader: () => React.createElement(Text, { testID: 'series-loader' }, 'loading'),
  };
});

import React from 'react';
import { Alert, RefreshControl } from 'react-native';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { DynamicRoutes, Routes } from '@/constants/Routes';
import { createMockEvent, createMockUser, renderWithProviders } from '@/test-utils/render';
import type { Event } from '@/types/event.types';
import type { EventSeries, EventSeriesOccurrence } from '@/types/eventSeries.types';
import SeriesScreen from '@/app/series/[id]';

const { router, useLocalSearchParams } = require('expo-router');
const {
  getSeries,
  addSeriesDates,
  cancelSeries,
  deleteSeriesOccurrences,
  publishSeries,
  getEventByIdBackend,
  getDraftEventPreview,
  EventIncompleteError,
  DuplicateEventError,
  EventSeriesError,
} = require('@/services/event.service');
const { logger } = require('@/utils/logger');

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const occurrence = (
  $id: string,
  days: number,
  status: EventSeriesOccurrence['status']
): EventSeriesOccurrence => ({ $id, start_time: inDays(days), end_time: null, status });

const seriesOf = (
  occurrences: EventSeriesOccurrence[],
  overrides: Partial<EventSeries> = {}
): EventSeries => ({
  id: 'series-1',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: '21:00',
  starts_on: '2026-11-03',
  until_date: '2026-12-15',
  window_end: '2027-02-03',
  max_occurrences: 14,
  occurrences,
  can_add_dates: false,
  ...overrides,
});

/** An upcoming published date, an upcoming draft and a cancelled one, and two past ones. */
const mixedSeries = (overrides: Partial<EventSeries> = {}) =>
  seriesOf(
    [
      occurrence('past-2', -7, 'past'),
      occurrence('up-2', 14, 'draft'),
      occurrence('up-1', 7, 'active'),
      occurrence('past-1', -14, 'past'),
      occurrence('up-3', 21, 'cancelled'),
    ],
    overrides
  );

const FLAG_ON = { features: { recurringEvents: true } };
const FLAG_OFF = { features: { recurringEvents: false } };

const representative = (id: string, overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    $id: id,
    title: 'Weekly vigil',
    organization_id: 'org-1',
    series_id: 'series-1',
    ...overrides,
  });

interface RenderOptions {
  flag?: { features: { recurringEvents: boolean } };
  isLogged?: boolean;
  cache?: Record<string, Event>;
  organizations?: { $id: string; name: string }[];
  offline?: boolean;
}

describe('SeriesScreen', () => {
  let alertSpy: jest.SpyInstance;
  let refetchEvents: jest.Mock;
  let refreshUserEventCounts: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'series-1' });
    router.canGoBack.mockReturnValue(true);
    getSeries.mockReset();
    getSeries.mockResolvedValue(mixedSeries());
    getEventByIdBackend.mockReset();
    getDraftEventPreview.mockReset();
    getEventByIdBackend.mockResolvedValue(representative('up-1'));
    getDraftEventPreview.mockResolvedValue(representative('up-2', { status: 'draft' }));
    refetchEvents = jest.fn().mockResolvedValue(undefined);
    refreshUserEventCounts = jest.fn().mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // Not async: awaiting the render would let the series load outside of act.
  const renderSeries = ({
    flag = FLAG_ON,
    isLogged = true,
    cache = { 'up-1': representative('up-1') },
    organizations = [{ $id: 'org-1', name: 'Org One' }],
    offline = false,
  }: RenderOptions = {}) =>
    renderWithProviders(<SeriesScreen />, {
      providerOverrides: {
        globalContext: {
          user: isLogged ? createMockUser() : null,
          isLogged,
          loading: false,
          userLanguage: 'en',
          eventsCache: cache,
          refetchEvents,
          refreshUserEventCounts,
        },
        userOrganizationsContext: { userOrganizations: organizations },
        connectivityContext: { isOffline: offline },
        versionCheckContext: flag,
      },
    });

  /** Renders and waits for the dates to be on screen. */
  const renderLoaded = async (options: RenderOptions = {}) => {
    const utils = renderSeries(options);
    await utils.findByTestId('series-rule');
    return utils;
  };

  type Utils = Awaited<ReturnType<typeof renderLoaded>>;

  const press = async (utils: Utils, testID: string) => {
    await act(async () => {
      fireEvent.press(utils.getByTestId(testID));
    });
  };

  const MANAGE_BUTTONS = [
    'series-publish-all',
    'series-edit-all',
    'series-add-dates',
    'series-cancel-all',
    'series-delete-all',
  ];

  const visibleButtons = (utils: Utils) =>
    MANAGE_BUTTONS.filter((testID) => utils.queryByTestId(testID) !== null);

  describe('the feature switch', () => {
    it('sends a stale link home while the feature is off, and reads nothing', async () => {
      const { getByTestId, queryByTestId } = renderSeries({ flag: FLAG_OFF });

      expect(getByTestId('redirect')).toHaveTextContent(`Redirect to ${Routes.HOME}`);
      expect(getSeries).not.toHaveBeenCalled();
      expect(getEventByIdBackend).not.toHaveBeenCalled();
      expect(queryByTestId('series-rule')).toBeNull();
    });

    it('does not redirect while the feature is on', async () => {
      const { queryByTestId } = await renderLoaded();

      expect(queryByTestId('redirect')).toBeNull();
      expect(getSeries).toHaveBeenCalledWith('series-1');
    });

    it('reads the first id when the route gives a list', async () => {
      useLocalSearchParams.mockReturnValue({ id: ['series-9', 'other'] });

      await renderLoaded();

      expect(getSeries).toHaveBeenCalledWith('series-9');
    });
  });

  describe('loading', () => {
    it('shows the loader until the series arrives, and no dates', async () => {
      let resolve: (series: EventSeries) => void = () => {};
      getSeries.mockReturnValue(new Promise<EventSeries>((res) => (resolve = res)));

      const utils = renderSeries();

      expect(utils.getByTestId('series-loader')).toBeTruthy();
      expect(utils.queryByTestId('series-rule')).toBeNull();
      expect(utils.queryByTestId('series-error')).toBeNull();

      await act(async () => {
        resolve(mixedSeries());
      });

      expect(await utils.findByTestId('series-rule')).toBeTruthy();
      expect(utils.queryByTestId('series-loader')).toBeNull();
    });

    it('says the series does not exist any more when the backend says SERIES_NOT_FOUND', async () => {
      getSeries.mockRejectedValue(new EventSeriesError('SERIES_NOT_FOUND', 'gone'));

      const { findByTestId, queryByTestId } = renderSeries();

      expect(await findByTestId('series-error')).toHaveTextContent('series.page.notFound');
      expect(queryByTestId('series-loader')).toBeNull();
    });

    it('says it could not be loaded, and nothing about it being gone, on any other failure', async () => {
      getSeries.mockRejectedValue(new Error('Network Error'));

      const { findByTestId } = renderSeries();

      const error = await findByTestId('series-error');
      expect(error).toHaveTextContent('series.page.loadError');
      expect(error).not.toHaveTextContent('series.page.notFound');
    });

    it('also says it could not be loaded for a series code that is not "not found"', async () => {
      getSeries.mockRejectedValue(new EventSeriesError('RECURRENCE_DISABLED', 'off'));

      const { findByTestId } = renderSeries();

      expect(await findByTestId('series-error')).toHaveTextContent('series.page.loadError');
    });
  });

  describe('the dates', () => {
    it('describes the rule', async () => {
      const { getByTestId } = await renderLoaded();

      expect(getByTestId('series-rule')).toHaveTextContent(/^series\.rule\.weekly:/);
      expect(getByTestId('series-rule')).toHaveTextContent(/ · 19:00–21:00 · /);
      expect(getByTestId('series-rule')).toHaveTextContent(/series\.rule\.until:.*15 Dec/);
    });

    it('lists the upcoming dates in date order, then the past ones, whatever order the API used', async () => {
      const { getAllByTestId, getByText } = await renderLoaded();

      expect(getAllByTestId(/^series-date-/).map((row) => row.props.testID)).toEqual([
        'series-date-up-1',
        'series-date-up-2',
        'series-date-up-3',
        'series-date-past-2',
        'series-date-past-1',
      ]);
      expect(getByText('series.page.upcoming')).toBeTruthy();
      expect(getByText('series.page.past')).toBeTruthy();
    });

    it('gives each date the status it has', async () => {
      const { getByTestId } = await renderLoaded();
      const statusOf = (id: string, label: string) =>
        expect(within(getByTestId(`series-date-${id}`)).getByText(label)).toBeTruthy();

      statusOf('up-1', 'series.page.status.active');
      statusOf('up-2', 'series.page.status.draft');
      statusOf('up-3', 'series.page.status.cancelled');
      statusOf('past-1', 'series.page.status.past');
      statusOf('past-2', 'series.page.status.past');
    });

    it('says there is nothing upcoming, and has no past section when nothing is past', async () => {
      getSeries.mockResolvedValue(seriesOf([occurrence('past-1', -7, 'past')]));
      const first = await renderLoaded({ cache: {} });
      expect(first.getByText('series.page.noUpcoming')).toBeTruthy();
      expect(first.getByText('series.page.past')).toBeTruthy();
      first.unmount();

      getSeries.mockResolvedValue(seriesOf([occurrence('up-1', 7, 'active')]));
      const second = await renderLoaded();
      expect(second.queryByText('series.page.past')).toBeNull();
      expect(second.queryByText('series.page.noUpcoming')).toBeNull();
    });

    it('opens a published date on the event, and a draft in the draft editor', async () => {
      const { getByTestId } = await renderLoaded();

      fireEvent.press(getByTestId('series-date-up-1'));
      expect(router.push).toHaveBeenLastCalledWith(DynamicRoutes.event('up-1'));

      fireEvent.press(getByTestId('series-date-up-2'));
      expect(router.push).toHaveBeenLastCalledWith(DynamicRoutes.draftEdit('up-2'));

      fireEvent.press(getByTestId('series-date-past-1'));
      expect(router.push).toHaveBeenLastCalledWith(DynamicRoutes.event('past-1'));
    });

    it('reads the series again on a pull to refresh', async () => {
      const { UNSAFE_getByType } = await renderLoaded();
      expect(getSeries).toHaveBeenCalledTimes(1);

      await act(async () => {
        await UNSAFE_getByType(RefreshControl).props.onRefresh();
      });

      expect(getSeries).toHaveBeenCalledTimes(2);
    });

    it('goes back with the back button, or home when there is nowhere to go back to', async () => {
      const { getByTestId } = await renderLoaded();

      fireEvent.press(getByTestId('series-back'));
      expect(router.back).toHaveBeenCalledTimes(1);

      router.canGoBack.mockReturnValue(false);
      fireEvent.press(getByTestId('series-back'));
      expect(router.push).toHaveBeenLastCalledWith(Routes.HOME);
    });
  });

  describe('the title and the organization come from one date', () => {
    it('is the next published date, from the events cache, with no request', async () => {
      const { getByTestId } = await renderLoaded({
        cache: { 'up-1': representative('up-1', { title: 'Cached vigil' }) },
      });

      expect(getByTestId('series-title')).toHaveTextContent('Cached vigil');
      expect(getEventByIdBackend).not.toHaveBeenCalled();
      expect(getDraftEventPreview).not.toHaveBeenCalled();
    });

    it('is fetched when the cache does not have it', async () => {
      getEventByIdBackend.mockResolvedValue(representative('up-1', { title: 'Fetched vigil' }));

      const { findByText } = await renderLoaded({ cache: {} });

      expect(await findByText('Fetched vigil')).toBeTruthy();
      expect(getEventByIdBackend).toHaveBeenCalledTimes(1);
      expect(getEventByIdBackend).toHaveBeenCalledWith('up-1');
      expect(getDraftEventPreview).not.toHaveBeenCalled();
    });

    it('is the latest published date when none is upcoming and active', async () => {
      getSeries.mockResolvedValue(
        seriesOf([
          occurrence('past-1', -14, 'past'),
          occurrence('past-2', -7, 'past'),
          occurrence('up-1', 7, 'draft'),
        ])
      );
      getEventByIdBackend.mockResolvedValue(representative('past-2', { title: 'Latest vigil' }));

      const { findByText } = await renderLoaded({ cache: {} });

      expect(await findByText('Latest vigil')).toBeTruthy();
      expect(getEventByIdBackend).toHaveBeenCalledWith('past-2');
    });

    it('is a draft, read through the draft preview, when the whole series is drafts', async () => {
      getSeries.mockResolvedValue(
        seriesOf([occurrence('up-2', 14, 'draft'), occurrence('up-1', 7, 'draft')])
      );
      getDraftEventPreview.mockResolvedValue(
        representative('up-1', { title: 'Draft vigil', status: 'draft' })
      );

      const { findByText } = await renderLoaded({ cache: {} });

      expect(await findByText('Draft vigil')).toBeTruthy();
      // The public GET 404s on a draft.
      expect(getDraftEventPreview).toHaveBeenCalledWith('up-1');
      expect(getEventByIdBackend).not.toHaveBeenCalled();
    });

    it('still lists the dates, without a title, when that date cannot be read', async () => {
      getEventByIdBackend.mockRejectedValue(new Error('Network Error'));

      const { getByTestId, queryByTestId } = await renderLoaded({ cache: {} });

      await waitFor(() => expect(logger.warn).toHaveBeenCalled());
      expect(queryByTestId('series-title')).toBeNull();
      expect(getByTestId('series-date-up-1')).toBeTruthy();
      expect(logger.warn).toHaveBeenCalledWith('[Series] Could not load a date of the series', {
        eventId: 'up-1',
        error: 'Network Error',
      });
    });
  });

  describe('who can manage the series', () => {
    it('shows no button to a visitor who is not logged in', async () => {
      const utils = await renderLoaded({ isLogged: false });

      expect(visibleButtons(utils)).toEqual([]);
      expect(utils.queryByText('series.page.manageHeading')).toBeNull();
    });

    it('shows no button to a member of another organization', async () => {
      const utils = await renderLoaded({ organizations: [{ $id: 'org-2', name: 'Org Two' }] });

      expect(visibleButtons(utils)).toEqual([]);
      expect(utils.queryByText('series.page.manageHeading')).toBeNull();
    });

    it('shows no button to a user who belongs to no organization', async () => {
      const utils = await renderLoaded({ organizations: [] });

      expect(visibleButtons(utils)).toEqual([]);
    });

    it('shows no button while the organization of the series is not known', async () => {
      getEventByIdBackend.mockResolvedValue(representative('up-1', { organization_id: undefined }));

      const utils = await renderLoaded({ cache: {} });
      await waitFor(() => expect(getEventByIdBackend).toHaveBeenCalled());

      expect(visibleButtons(utils)).toEqual([]);
    });

    it('shows the manage section to a member of the organization of the series', async () => {
      const utils = await renderLoaded();

      expect(utils.getByText('series.page.manageHeading')).toBeTruthy();
      expect(utils.getByText('series.page.manageNote')).toBeTruthy();
    });

    it('works out membership from a date that has to be fetched, too', async () => {
      const utils = await renderLoaded({ cache: {} });

      await waitFor(() => expect(utils.queryByTestId('series-edit-all')).not.toBeNull());
    });
  });

  describe('which buttons a member gets', () => {
    const scenarios: [string, EventSeriesOccurrence[], boolean, string[]][] = [
      [
        'a published date and a draft coming up',
        [occurrence('up-1', 7, 'active'), occurrence('up-2', 14, 'draft')],
        true,
        ['series-publish-all', 'series-edit-all', 'series-add-dates', 'series-cancel-all'],
      ],
      [
        'only drafts coming up',
        [occurrence('up-1', 7, 'draft'), occurrence('up-2', 14, 'draft')],
        false,
        ['series-publish-all', 'series-edit-all', 'series-delete-all'],
      ],
      [
        'only published dates coming up',
        [occurrence('up-1', 7, 'active'), occurrence('up-2', 14, 'active')],
        false,
        ['series-edit-all', 'series-cancel-all'],
      ],
      [
        'only a cancelled date coming up',
        [occurrence('up-1', 7, 'cancelled'), occurrence('past-1', -7, 'past')],
        false,
        [],
      ],
      [
        'a draft and a cancelled date coming up',
        [occurrence('up-1', 7, 'draft'), occurrence('up-2', 14, 'cancelled')],
        false,
        ['series-publish-all', 'series-edit-all'],
      ],
      [
        'nothing coming up, with room to add dates',
        [occurrence('past-1', -14, 'past'), occurrence('past-2', -7, 'past')],
        true,
        ['series-add-dates'],
      ],
      [
        'a draft coming up and a draft that has passed',
        [occurrence('past-1', -7, 'draft'), occurrence('up-1', 7, 'draft')],
        false,
        ['series-publish-all', 'series-edit-all', 'series-delete-all'],
      ],
    ];

    it.each(scenarios)('with %s', async (_label, occurrences, canAddDates, expected) => {
      getSeries.mockResolvedValue(seriesOf(occurrences, { can_add_dates: canAddDates }));
      // The cache gives whichever date stands in for the series its organization.
      const cache = Object.fromEntries(
        occurrences.map((date) => [date.$id, representative(date.$id)])
      );

      const utils = await renderLoaded({ cache });

      expect(visibleButtons(utils)).toEqual(expected);
    });
  });

  describe('Edit all upcoming', () => {
    it('opens the event editor on the first editable date, for every upcoming date', async () => {
      getSeries.mockResolvedValue(
        seriesOf([occurrence('up-1', 7, 'active'), occurrence('up-2', 14, 'draft')])
      );
      const utils = await renderLoaded();

      fireEvent.press(utils.getByTestId('series-edit-all'));

      expect(router.push).toHaveBeenCalledWith(
        DynamicRoutes.eventEdit('up-1', { allUpcoming: true })
      );
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/event-edit/[id]',
        params: { id: 'up-1', allUpcoming: 'true' },
      });
    });

    it('opens the draft editor when the first editable date is a draft', async () => {
      getSeries.mockResolvedValue(
        seriesOf([occurrence('up-1', 7, 'draft'), occurrence('up-2', 14, 'active')])
      );
      const utils = await renderLoaded({ cache: { 'up-2': representative('up-2') } });

      fireEvent.press(utils.getByTestId('series-edit-all'));

      expect(router.push).toHaveBeenCalledWith(
        DynamicRoutes.draftEdit('up-1', { allUpcoming: true })
      );
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/draft-edit/[id]',
        params: { id: 'up-1', allUpcoming: 'true' },
      });
    });

    it('skips a cancelled date at the head of the series', async () => {
      getSeries.mockResolvedValue(
        seriesOf([occurrence('up-1', 7, 'cancelled'), occurrence('up-2', 14, 'active')])
      );
      const utils = await renderLoaded({ cache: { 'up-2': representative('up-2') } });

      fireEvent.press(utils.getByTestId('series-edit-all'));

      expect(router.push).toHaveBeenCalledWith(
        DynamicRoutes.eventEdit('up-2', { allUpcoming: true })
      );
    });
  });

  describe('Publish all', () => {
    const drafts = () =>
      seriesOf([
        occurrence('up-1', 7, 'active'),
        occurrence('up-2', 14, 'draft'),
        occurrence('up-3', 21, 'draft'),
      ]);

    beforeEach(() => {
      getSeries.mockResolvedValue(drafts());
      publishSeries.mockResolvedValue({ published: 2, series: drafts() });
    });

    it('asks first, counting the drafts it would publish', async () => {
      const utils = await renderLoaded();
      expect(utils.queryByTestId('series-publish-dialog-confirm')).toBeNull();

      await press(utils, 'series-publish-all');

      expect(utils.getByText('series.dialogs.publishAllTitle')).toBeTruthy();
      expect(utils.getByText('series.dialogs.publishAllBody:{"count":2}')).toBeTruthy();
      expect(publishSeries).not.toHaveBeenCalled();
    });

    it('does nothing when the organizer backs out', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-dismiss');

      expect(publishSeries).not.toHaveBeenCalled();
      expect(utils.queryByTestId('series-publish-dialog-confirm')).toBeNull();
    });

    it('publishes, says how many dates went out, and refreshes everything that shows them', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-confirm');

      expect(publishSeries).toHaveBeenCalledTimes(1);
      expect(publishSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({ duplicateOverride: false })
      );
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.published:{"count":2}'
        )
      );
      expect(refetchEvents).toHaveBeenCalled();
      expect(refreshUserEventCounts).toHaveBeenCalledWith(['org-1']);
      expect(getSeries).toHaveBeenCalledTimes(2);
      expect(utils.queryByTestId('series-publish-dialog-confirm')).toBeNull();
    });

    it('says which dates clashed, in a success that carries the warning', async () => {
      publishSeries.mockImplementation(async (_id: string, options: any) => {
        options.report.possibleDuplicates = [
          {
            id: 'dup-1',
            title: 'Existing vigil',
            start_time: inDays(30),
            city: 'Brussels',
            status: 'active',
            organization_id: 'org-1',
            relationship: 'own',
            reason: 'content',
            strength: 'weak',
            occurrence_start_time: '2099-01-06T18:00:00.000Z',
          },
        ];
        return { published: 2, series: drafts() };
      });
      const utils = await renderLoaded();
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-confirm');

      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      const [title, message] = alertSpy.mock.calls.at(-1)!;
      expect(title).toBe('common.success');
      expect(message).toContain('series.messages.published:{"count":2}');
      expect(message).toContain('duplicates.clashingDates:{"dates":"Tue 6 Jan"}');
    });

    describe('when the drafts are not ready', () => {
      it('lists the fields the backend found missing, each message once', async () => {
        publishSeries.mockRejectedValue(
          new EventIncompleteError(['description', 'categories', 'city', 'street_address'])
        );
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');

        await press(utils, 'series-publish-dialog-confirm');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'drafts.publishIssuesTitle',
            ['drafts.issueDescription', 'drafts.issueCategory', 'drafts.issueLocation'].join('\n')
          )
        );
        expect(utils.queryByTestId('series-publish-dialog-confirm')).toBeNull();
      });

      it('falls back to the generic message when the backend names no field', async () => {
        publishSeries.mockRejectedValue(new EventIncompleteError([]));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');

        await press(utils, 'series-publish-dialog-confirm');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'drafts.publishIssuesTitle',
            'drafts.issueIncomplete'
          )
        );
      });
    });

    describe('when the backend calls it a duplicate', () => {
      const duplicate = {
        id: 'dup-1',
        title: 'Existing vigil',
        start_time: '2099-01-06T18:00:00.000Z',
        city: 'Brussels',
        status: 'active',
        organization_id: 'org-1',
        relationship: 'own',
        reason: 'content',
        strength: 'strong',
        occurrence_start_time: '2099-01-06T18:00:00.000Z',
      };

      it('shows the matches, not an error, and publishes nothing yet', async () => {
        publishSeries.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');

        await press(utils, 'series-publish-dialog-confirm');

        expect(await utils.findByText('duplicates.publishTitle')).toBeTruthy();
        expect(utils.getByText('Existing vigil')).toBeTruthy();
        expect(utils.getByText('duplicates.yourDate:{"date":"Tue 6 Jan"}')).toBeTruthy();
        expect(alertSpy).not.toHaveBeenCalledWith('common.error', expect.anything());
        expect(utils.queryByTestId('series-publish-dialog-confirm')).toBeNull();
        expect(publishSeries).toHaveBeenCalledTimes(1);
      });

      it('sends the publish again with the override on "Publish anyway"', async () => {
        publishSeries.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');
        await press(utils, 'series-publish-dialog-confirm');
        await utils.findByText('duplicates.publishTitle');

        await act(async () => {
          fireEvent.press(await utils.findByText('duplicates.publishAnyway'));
        });

        expect(publishSeries).toHaveBeenCalledTimes(2);
        expect(publishSeries.mock.calls[0][1]).toMatchObject({ duplicateOverride: false });
        expect(publishSeries.mock.calls[1][0]).toBe('series-1');
        expect(publishSeries.mock.calls[1][1]).toMatchObject({ duplicateOverride: true });
        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'common.success',
            'series.messages.published:{"count":2}'
          )
        );
      });

      it('publishes nothing more when the organizer goes back', async () => {
        publishSeries.mockRejectedValue(new DuplicateEventError('dup', [duplicate], true));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');
        await press(utils, 'series-publish-dialog-confirm');

        await act(async () => {
          fireEvent.press(await utils.findByText('common.goBack'));
        });

        expect(publishSeries).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(utils.queryByText('duplicates.publishTitle')).toBeNull());
      });

      it('offers no override when the backend says it cannot be overridden', async () => {
        publishSeries.mockRejectedValue(new DuplicateEventError('dup', [duplicate], false));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');
        await press(utils, 'series-publish-dialog-confirm');

        expect(await utils.findByText('duplicates.notOverridable')).toBeTruthy();
        expect(utils.queryByText('duplicates.publishAnyway')).toBeNull();
      });

      it('shows the plain error when the 409 lists no match to show', async () => {
        publishSeries.mockRejectedValue(new DuplicateEventError('Already exists', [], true));
        const utils = await renderLoaded();
        await press(utils, 'series-publish-all');

        await press(utils, 'series-publish-dialog-confirm');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'Already exists')
        );
        expect(utils.queryByText('duplicates.publishTitle')).toBeNull();
      });
    });

    it('shows the copy of the code when the series refuses', async () => {
      publishSeries.mockRejectedValue(
        new EventSeriesError('SERIES_NOTHING_UPCOMING', 'Nothing upcoming')
      );
      const utils = await renderLoaded();
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.nothingUpcoming')
      );
    });

    it('shows the rate-limit copy', async () => {
      publishSeries.mockRejectedValue(
        Object.assign(new Error('Too many requests'), {
          code: 'RATE_LIMIT_EXCEEDED',
          isRateLimited: true,
        })
      );
      const utils = await renderLoaded();
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'errors.rateLimit.message')
      );
    });

    it('sends nothing while offline', async () => {
      const utils = await renderLoaded({ offline: true });
      await press(utils, 'series-publish-all');

      await press(utils, 'series-publish-dialog-confirm');

      expect(publishSeries).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'connectivity.actionUnavailableOffline'
      );
    });
  });

  describe('Add more dates', () => {
    beforeEach(() => {
      getSeries.mockResolvedValue(
        seriesOf([occurrence('up-1', 7, 'active')], { can_add_dates: true })
      );
      addSeriesDates.mockResolvedValue({ created: 1, series: mixedSeries() });
    });

    it('asks how many, starting at 1, and says how far the series can run', async () => {
      const utils = await renderLoaded();

      await press(utils, 'series-add-dates');

      expect(utils.getByText('series.dialogs.addDatesTitle')).toBeTruthy();
      expect(utils.getByText('series.page.windowNote:{"date":"3 Feb"}')).toBeTruthy();
      expect(utils.getByTestId('series-add-count').props.value).toBe('1');
      expect(addSeriesDates).not.toHaveBeenCalled();
    });

    it('adds one date by default', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');

      await press(utils, 'series-add-dates-dialog-confirm');

      expect(addSeriesDates).toHaveBeenCalledTimes(1);
      expect(addSeriesDates).toHaveBeenCalledWith(
        'series-1',
        { add_count: 1 },
        expect.objectContaining({ duplicateOverride: false })
      );
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.datesAdded:{"count":1}'
        )
      );
      expect(refetchEvents).toHaveBeenCalled();
      expect(getSeries).toHaveBeenCalledTimes(2);
    });

    it('adds the number of dates that was typed, in digits only', async () => {
      addSeriesDates.mockResolvedValue({ created: 3, series: mixedSeries() });
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');

      fireEvent.changeText(utils.getByTestId('series-add-count'), '3x');
      await press(utils, 'series-add-dates-dialog-confirm');

      expect(addSeriesDates.mock.calls[0][1]).toEqual({ add_count: 3 });
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.datesAdded:{"count":3}'
        )
      );
    });

    it.each([['0'], [''], ['32'], ['99']])('does not send a count of "%s"', async (count) => {
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');

      fireEvent.changeText(utils.getByTestId('series-add-count'), count);
      await press(utils, 'series-add-dates-dialog-confirm');

      expect(addSeriesDates).not.toHaveBeenCalled();
    });

    it('sends 31, the most a series can have', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');

      fireEvent.changeText(utils.getByTestId('series-add-count'), '31');
      await press(utils, 'series-add-dates-dialog-confirm');

      expect(addSeriesDates.mock.calls[0][1]).toEqual({ add_count: 31 });
    });

    it('starts at 1 again every time the question is opened', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');
      fireEvent.changeText(utils.getByTestId('series-add-count'), '5');
      await press(utils, 'series-add-dates-dialog-dismiss');

      await press(utils, 'series-add-dates');

      expect(utils.getByTestId('series-add-count').props.value).toBe('1');
    });

    it('shows the cap message, with the last possible date, when the window is full', async () => {
      const refusal = Object.assign(
        new EventSeriesError('RECURRENCE_TOO_MANY_OCCURRENCES', 'cap'),
        {
          max: 14,
          windowEnd: '2027-02-03',
        }
      );
      addSeriesDates.mockRejectedValue(refusal);
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');

      await press(utils, 'series-add-dates-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.error',
          'series.errors.tooMany:{"max":14,"date":"3 Feb"}'
        )
      );
    });

    it('sends the same count again with the override on "Create anyway"', async () => {
      const duplicate = {
        id: 'dup-1',
        title: 'Existing vigil',
        start_time: '2099-01-06T18:00:00.000Z',
        city: 'Brussels',
        status: 'active',
        organization_id: 'org-1',
        relationship: 'own',
        reason: 'content',
        strength: 'strong',
        occurrence_start_time: '2099-01-06T18:00:00.000Z',
      };
      addSeriesDates.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));
      const utils = await renderLoaded();
      await press(utils, 'series-add-dates');
      fireEvent.changeText(utils.getByTestId('series-add-count'), '4');
      await press(utils, 'series-add-dates-dialog-confirm');

      // Adding dates is a create, so the prompt speaks of creating.
      expect(await utils.findByText('duplicates.createTitle')).toBeTruthy();
      await act(async () => {
        fireEvent.press(await utils.findByText('duplicates.createAnyway'));
      });

      expect(addSeriesDates).toHaveBeenCalledTimes(2);
      expect(addSeriesDates.mock.calls[1][0]).toBe('series-1');
      expect(addSeriesDates.mock.calls[1][1]).toEqual({ add_count: 4 });
      expect(addSeriesDates.mock.calls[1][2]).toMatchObject({ duplicateOverride: true });
    });
  });

  describe('Cancel all upcoming', () => {
    beforeEach(() => {
      cancelSeries.mockResolvedValue({ cancelled: 2, deleted: 1, series: mixedSeries() });
    });

    it('asks first, counting the dates it would touch', async () => {
      const utils = await renderLoaded();

      await press(utils, 'series-cancel-all');

      expect(utils.getByText('series.dialogs.cancelAllTitle')).toBeTruthy();
      // The published date and the draft; the cancelled one is past saving.
      expect(utils.getByText('series.dialogs.cancelAllBody:{"count":2}')).toBeTruthy();
      expect(cancelSeries).not.toHaveBeenCalled();
    });

    it('cancels every upcoming date, with no scope, says how many, and stays', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-confirm');

      expect(cancelSeries).toHaveBeenCalledTimes(1);
      expect(cancelSeries.mock.calls[0]).toEqual(['series-1']);
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.cancelled:{"count":2}'
        )
      );
      expect(refetchEvents).toHaveBeenCalled();
      expect(refreshUserEventCounts).toHaveBeenCalledWith(['org-1']);
      await waitFor(() => expect(getSeries).toHaveBeenCalledTimes(2));
      expect(router.back).not.toHaveBeenCalled();
    });

    it('says how many drafts were deleted when no published date was cancelled', async () => {
      cancelSeries.mockResolvedValue({ cancelled: 0, deleted: 3, series: mixedSeries() });
      const utils = await renderLoaded();
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.deleted:{"count":3}'
        )
      );
    });

    it('goes back when nothing is left of the series', async () => {
      cancelSeries.mockResolvedValue({ cancelled: 0, deleted: 2, series: null });
      const utils = await renderLoaded();
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-confirm');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      // Nothing to read again: the series is gone.
      expect(getSeries).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the organizer keeps the dates active', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-dismiss');

      expect(cancelSeries).not.toHaveBeenCalled();
      expect(utils.queryByTestId('series-cancel-dialog-confirm')).toBeNull();
    });

    it('shows the copy of the code when the series refuses, and stays', async () => {
      cancelSeries.mockRejectedValue(new EventSeriesError('SERIES_ENDED', 'ended'));
      const utils = await renderLoaded();
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.ended')
      );
      expect(router.back).not.toHaveBeenCalled();
      expect(utils.queryByTestId('series-cancel-dialog-confirm')).toBeNull();
    });

    it('sends nothing while offline', async () => {
      const utils = await renderLoaded({ offline: true });
      await press(utils, 'series-cancel-all');

      await press(utils, 'series-cancel-dialog-confirm');

      expect(cancelSeries).not.toHaveBeenCalled();
    });
  });

  describe('Delete all upcoming', () => {
    const drafts = () =>
      seriesOf([occurrence('up-1', 7, 'draft'), occurrence('up-2', 14, 'draft')]);

    beforeEach(() => {
      getSeries.mockResolvedValue(drafts());
      deleteSeriesOccurrences.mockResolvedValue({ deleted: 2, series: drafts() });
    });

    it('asks first, counting the dates it would delete', async () => {
      const utils = await renderLoaded();

      await press(utils, 'series-delete-all');

      expect(utils.getByText('series.dialogs.deleteAllTitle')).toBeTruthy();
      expect(utils.getByText('series.dialogs.deleteAllBody:{"count":2}')).toBeTruthy();
      expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
    });

    it('deletes every upcoming draft, with no scope, and says how many', async () => {
      const utils = await renderLoaded();
      await press(utils, 'series-delete-all');

      await press(utils, 'series-delete-dialog-confirm');

      expect(deleteSeriesOccurrences).toHaveBeenCalledTimes(1);
      expect(deleteSeriesOccurrences.mock.calls[0]).toEqual(['series-1']);
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.deleted:{"count":2}'
        )
      );
      expect(refreshUserEventCounts).toHaveBeenCalledWith(['org-1']);
      await waitFor(() => expect(getSeries).toHaveBeenCalledTimes(2));
      expect(router.back).not.toHaveBeenCalled();
    });

    it('goes back when nothing is left of the series', async () => {
      deleteSeriesOccurrences.mockResolvedValue({ deleted: 2, series: null });
      const utils = await renderLoaded();
      await press(utils, 'series-delete-all');

      await press(utils, 'series-delete-dialog-confirm');

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(getSeries).toHaveBeenCalledTimes(1);
    });

    it('shows the copy of the code when the series refuses', async () => {
      deleteSeriesOccurrences.mockRejectedValue(
        new EventSeriesError('NOT_ORGANIZATION_MEMBER', 'not a member')
      );
      const utils = await renderLoaded();
      await press(utils, 'series-delete-all');

      await press(utils, 'series-delete-dialog-confirm');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.notMember')
      );
    });
  });
});
