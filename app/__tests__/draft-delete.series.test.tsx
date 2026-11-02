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
  class EventNotDraftError extends Error {
    code = 'EVENT_NOT_DRAFT';
  }
  class DuplicateEventError extends Error {
    code = 'DUPLICATE_EVENT';
    duplicates: unknown[] = [];
    canOverride = true;
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
    getDraftEventPreview: jest.fn(),
    getDraftEventsForOrganizations: jest.fn(),
    patchEvent: jest.fn(),
    publishDraft: jest.fn(),
    deleteEvent: jest.fn(),
    deleteSeriesOccurrences: jest.fn(),
    editSeries: jest.fn(),
    getSeries: jest.fn(),
    EventIncompleteError,
    EventNotDraftError,
    DuplicateEventError,
    EventSeriesError,
  };
});

jest.mock('@/components/ui/loaders/BrandLoader', () => ({
  BrandLoader: () => null,
}));

// A field the test can type an instant into, to move a date without a picker.
jest.mock('@/components/FormDateField', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: ({ testID, value, handleChangeText, placeholder }: any) =>
      React.createElement(TextInput, {
        testID,
        value,
        placeholder,
        onChangeText: handleChangeText,
      }),
  };
});

// ReanimatedSwipeable throws under react-test-renderer; the row itself stays real.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
  };
});

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { Routes } from '@/constants/Routes';
import { createMockEvent, createMockUser, renderWithProviders } from '@/test-utils/render';
import type { Event } from '@/types/event.types';
import type { EventSeries, EventSeriesOccurrence } from '@/types/eventSeries.types';
import DraftEdit from '@/app/draft-edit/[id]';
import DraftEventsScreen from '@/app/(tabs)/(more)/draft-events';

const { router, useLocalSearchParams } = require('expo-router');
const {
  getDraftEventPreview,
  getDraftEventsForOrganizations,
  patchEvent,
  deleteEvent,
  deleteSeriesOccurrences,
  editSeries,
  getSeries,
  EventSeriesError,
} = require('@/services/event.service');

const FLAG_ON = { features: { recurringEvents: true } };
const FLAG_OFF = { features: { recurringEvents: false } };

// Tuesday evenings in winter, 19:00 to 21:00 in Brussels, far ahead of the clock.
const START = '2099-01-13T18:00:00.000Z';
const END = '2099-01-13T20:00:00.000Z';

const week = (n: number) => `2099-01-${String(6 + 7 * n).padStart(2, '0')}T18:00:00.000Z`;

const occurrence = (
  $id: string,
  start_time: string,
  status: EventSeriesOccurrence['status'] = 'draft'
): EventSeriesOccurrence => ({ $id, start_time, end_time: null, status });

/** draft-0 is the week before the draft being worked on, draft-2 the week after. */
const seriesOf = (occurrences: EventSeriesOccurrence[]): EventSeries => ({
  id: 'series-1',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: '21:00',
  starts_on: '2099-01-06',
  until_date: '2099-01-27',
  window_end: '2099-04-06',
  max_occurrences: 14,
  occurrences,
  can_add_dates: true,
});

const allDrafts = () =>
  seriesOf([
    occurrence('draft-0', week(0)),
    occurrence('draft-1', week(1)),
    occurrence('draft-2', week(2)),
  ]);

const loggedIn = (extra: Record<string, unknown> = {}) => ({
  user: createMockUser(),
  isLogged: true,
  loading: false,
  userLanguage: 'en',
  eventsCache: {},
  refetchEvents: jest.fn().mockResolvedValue(undefined),
  refreshUserEventCounts: jest.fn().mockResolvedValue(undefined),
  ...extra,
});

const organizations = {
  userOrganizations: [{ $id: 'org-1', name: 'Org One' }],
  hasOrganizations: true,
  hasSingleOrganization: true,
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });

describe('recurring drafts', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getDraftEventPreview.mockReset();
    getDraftEventsForOrganizations.mockReset();
    getSeries.mockReset();
    getSeries.mockResolvedValue(allDrafts());
    patchEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue(undefined);
    deleteSeriesOccurrences.mockResolvedValue({ deleted: 2, series: allDrafts() });
    editSeries.mockResolvedValue({ updated: 3, series: allDrafts() });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('draft editor', () => {
    const draftDate = (overrides: Partial<Event> = {}): Event =>
      createMockEvent({
        $id: 'draft-1',
        title: 'Weekly vigil',
        description: 'Every Tuesday evening',
        organization_id: 'org-1',
        status: 'draft',
        series_id: 'series-1',
        start_time: START,
        end_time: END,
        categories: ['Protest'],
        city: 'Brussels',
        street_address: 'Rue de la Loi 1',
        ...overrides,
      });

    beforeEach(() => {
      useLocalSearchParams.mockReturnValue({ id: 'draft-1' });
      getDraftEventPreview.mockResolvedValue(draftDate());
    });

    const renderEditor = async (flag: { features: { recurringEvents: boolean } } = FLAG_ON) => {
      const utils = renderWithProviders(<DraftEdit />, {
        providerOverrides: {
          globalContext: loggedIn(),
          userOrganizationsContext: organizations,
          versionCheckContext: flag,
        },
      });
      await utils.findByTestId('btn-draft-save');
      await settle();
      return utils;
    };

    type Utils = Awaited<ReturnType<typeof renderEditor>>;

    const scopeState = (utils: Utils, prefix: string, option: 'only' | 'following') =>
      utils.getByTestId(`${prefix}-${option}`).props.accessibilityState;

    const press = async (utils: Utils, testID: string) => {
      await act(async () => {
        fireEvent.press(utils.getByTestId(testID));
      });
    };

    const moveToNextDay = async (utils: Utils) => {
      await press(utils, 'row-event-when');
      await press(utils, 'calendar-day-2099-01-14');
      await press(utils, 'btn-when-done');
    };

    describe('saving a date of a series', () => {
      // The schedule of a series cannot change, so no edit form offers a rule.
      it('offers no Repeat control: the form keeps the date fields of the one draft', async () => {
        const utils = await renderEditor();

        for (const chip of ['once', 'weekly', 'every_2_weeks', 'monthly']) {
          expect(utils.queryByTestId(`repeat-chip-${chip}`)).toBeNull();
        }
        await press(utils, 'row-event-when');
        expect(utils.getByTestId('input-event-start-time')).toBeTruthy();
        expect(utils.getByTestId('input-event-end-time')).toBeTruthy();
        expect(utils.queryByTestId('row-event-repeat')).toBeNull();
      });

      it('asks which drafts to change, and says it is part of a series', async () => {
        const utils = await renderEditor();
        expect(utils.queryByTestId('series-edit-scope-confirm')).toBeNull();

        await press(utils, 'btn-draft-save');

        expect(utils.getByTestId('series-edit-scope-only')).toBeTruthy();
        expect(utils.getByTestId('series-edit-scope-following')).toBeTruthy();
        expect(scopeState(utils, 'series-edit-scope', 'only')).toMatchObject({ selected: true });
        expect(patchEvent).not.toHaveBeenCalled();
        expect(editSeries).not.toHaveBeenCalled();
        expect(utils.getByText('series.edit.partOfSeries series.edit.onlyNote')).toBeTruthy();
      });

      it('saves this draft only, with its dates, by default', async () => {
        const utils = await renderEditor();
        await press(utils, 'btn-draft-save');

        await press(utils, 'series-edit-scope-confirm');

        expect(patchEvent).toHaveBeenCalledTimes(1);
        expect(patchEvent.mock.calls[0][0]).toBe('draft-1');
        expect(patchEvent.mock.calls[0][1]).toMatchObject({
          title: 'Weekly vigil',
          start_time: START,
          end_time: END,
        });
        expect(editSeries).not.toHaveBeenCalled();
        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.success', 'drafts.savedConfirmation')
        );
        expect(router.back).toHaveBeenCalled();
      });

      it('saves this and all following drafts with the times of the day and none of the schedule', async () => {
        const utils = await renderEditor();
        await press(utils, 'btn-draft-save');

        fireEvent.press(utils.getByTestId('series-edit-scope-following'));
        await press(utils, 'series-edit-scope-confirm');

        expect(editSeries).toHaveBeenCalledTimes(1);
        const [seriesId, payload, options] = editSeries.mock.calls[0];
        expect(seriesId).toBe('series-1');
        expect(options).toEqual({ fromEventId: 'draft-1' });
        expect(payload).toMatchObject({
          title: 'Weekly vigil',
          description: 'Every Tuesday evening',
          start_local: '19:00',
          end_local: '21:00',
        });
        expect(payload).not.toHaveProperty('start_time');
        expect(payload).not.toHaveProperty('end_time');
        expect(payload).not.toHaveProperty('all_day');
        expect(patchEvent).not.toHaveBeenCalled();
        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'common.success',
            'series.messages.updated:{"count":3}'
          )
        );
        expect(router.back).toHaveBeenCalled();
      });

      it('cannot widen a date that moved: the option is greyed out and confirming saves one draft', async () => {
        const utils = await renderEditor();
        await moveToNextDay(utils);
        await press(utils, 'btn-draft-save');

        expect(scopeState(utils, 'series-edit-scope', 'following')).toMatchObject({
          selected: false,
          disabled: true,
        });
        expect(utils.getByText('series.edit.dateLocked')).toBeTruthy();

        fireEvent.press(utils.getByTestId('series-edit-scope-following'), {
          stopPropagation: jest.fn(),
        });
        await press(utils, 'series-edit-scope-confirm');

        expect(editSeries).not.toHaveBeenCalled();
        expect(patchEvent.mock.calls[0][1]).toMatchObject({
          start_time: '2099-01-14T18:00:00.000Z',
        });
      });

      it('shows the copy of the code when the series refuses, and keeps the draft', async () => {
        editSeries.mockRejectedValue(
          new EventSeriesError('SERIES_SCHEDULE_IMMUTABLE', 'immutable')
        );
        const utils = await renderEditor();
        await press(utils, 'btn-draft-save');
        fireEvent.press(utils.getByTestId('series-edit-scope-following'));

        await press(utils, 'series-edit-scope-confirm');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.scheduleImmutable')
        );
        expect(router.back).not.toHaveBeenCalled();
      });

      it('saves at once, for every upcoming date, when opened from the series screen', async () => {
        useLocalSearchParams.mockReturnValue({ id: 'draft-1', allUpcoming: 'true' });
        const utils = await renderEditor();

        await press(utils, 'btn-draft-save');

        expect(utils.queryByTestId('series-edit-scope-confirm')).toBeNull();
        expect(editSeries).toHaveBeenCalledTimes(1);
        expect(editSeries.mock.calls[0][0]).toBe('series-1');
        // No `fromEventId`: every upcoming date, not this one onwards.
        expect(editSeries.mock.calls[0][2]).toBeUndefined();
        expect(patchEvent).not.toHaveBeenCalled();
      });

      it('leaves publishing and deleting to the series screen when editing every upcoming date', async () => {
        useLocalSearchParams.mockReturnValue({ id: 'draft-1', allUpcoming: 'true' });
        const utils = await renderEditor();

        expect(utils.queryByTestId('btn-draft-publish')).toBeNull();
        expect(utils.queryByTestId('btn-draft-delete')).toBeNull();
        expect(utils.getByText('series.edit.allNote')).toBeTruthy();
      });

      it('refuses a moved date when editing every upcoming date, and sends nothing', async () => {
        useLocalSearchParams.mockReturnValue({ id: 'draft-1', allUpcoming: 'true' });
        const utils = await renderEditor();
        await moveToNextDay(utils);

        await press(utils, 'btn-draft-save');

        expect(editSeries).not.toHaveBeenCalled();
        expect(patchEvent).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.edit.dateLocked');
      });

      it('saves like any draft, with no question, while the feature is off', async () => {
        const utils = await renderEditor(FLAG_OFF);

        await press(utils, 'btn-draft-save');

        expect(utils.queryByTestId('series-edit-scope-confirm')).toBeNull();
        expect(patchEvent).toHaveBeenCalledTimes(1);
        expect(editSeries).not.toHaveBeenCalled();
        expect(getSeries).not.toHaveBeenCalled();
      });

      it('saves like any draft, with no question, for a draft that is not in a series', async () => {
        getDraftEventPreview.mockResolvedValue(draftDate({ series_id: null }));
        const utils = await renderEditor(FLAG_ON);

        await press(utils, 'btn-draft-save');

        expect(utils.queryByTestId('series-edit-scope-confirm')).toBeNull();
        expect(patchEvent).toHaveBeenCalledTimes(1);
        expect(editSeries).not.toHaveBeenCalled();
      });
    });

    describe('deleting a date of a series', () => {
      it('asks which drafts to delete, instead of the one-draft confirmation', async () => {
        const utils = await renderEditor();

        await press(utils, 'btn-draft-delete');

        expect(utils.getByTestId('series-delete-scope-only')).toBeTruthy();
        expect(utils.getByTestId('series-delete-scope-following')).toBeTruthy();
        expect(utils.getByText('series.dialogs.deleteScopeTitle')).toBeTruthy();
        expect(utils.getByText('series.dialogs.deleteScopeBody')).toBeTruthy();
        expect(alertSpy).not.toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          expect.anything(),
          expect.anything()
        );
        expect(deleteEvent).not.toHaveBeenCalled();
      });

      it('deletes this draft only, by default', async () => {
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        await press(utils, 'series-delete-scope-confirm');

        expect(deleteEvent).toHaveBeenCalledTimes(1);
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.success', 'drafts.deleted')
        );
        expect(router.replace).toHaveBeenCalledWith(Routes.DRAFT_EVENTS, { withAnchor: true });
      });

      it('deletes this and all following drafts when every later date is a draft', async () => {
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        expect(scopeState(utils, 'series-delete-scope', 'following')).toMatchObject({
          disabled: false,
        });
        fireEvent.press(utils.getByTestId('series-delete-scope-following'));
        await press(utils, 'series-delete-scope-confirm');

        expect(deleteSeriesOccurrences).toHaveBeenCalledTimes(1);
        expect(deleteSeriesOccurrences).toHaveBeenCalledWith('series-1', {
          fromEventId: 'draft-1',
        });
        expect(deleteEvent).not.toHaveBeenCalled();
        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'common.success',
            'series.messages.deleted:{"count":2}'
          )
        );
        expect(router.replace).toHaveBeenCalledWith(Routes.DRAFT_EVENTS, { withAnchor: true });
      });

      it('is not blocked by a published date that comes before this draft', async () => {
        getSeries.mockResolvedValue(
          seriesOf([
            occurrence('draft-0', '2001-01-02T18:00:00.000Z', 'past'),
            occurrence('draft-1', week(1)),
            occurrence('draft-2', week(2)),
          ])
        );
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        expect(scopeState(utils, 'series-delete-scope', 'following')).toMatchObject({
          disabled: false,
        });
      });

      it.each([
        ['published', 'active'],
        ['cancelled', 'cancelled'],
      ])('cannot delete the following dates when a later one is %s', async (_label, status) => {
        getSeries.mockResolvedValue(
          seriesOf([
            occurrence('draft-0', week(0)),
            occurrence('draft-1', week(1)),
            occurrence('draft-2', week(2), status as EventSeriesOccurrence['status']),
          ])
        );
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        expect(scopeState(utils, 'series-delete-scope', 'following')).toMatchObject({
          selected: false,
          disabled: true,
        });
        expect(utils.getByText('series.dialogs.deleteFollowingLocked')).toBeTruthy();

        fireEvent.press(utils.getByTestId('series-delete-scope-following'), {
          stopPropagation: jest.fn(),
        });
        await press(utils, 'series-delete-scope-confirm');

        // Whatever was chosen, only this draft goes.
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
      });

      it('cannot delete the following dates when the series could not be read', async () => {
        getSeries.mockRejectedValue(new Error('Network Error'));
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        expect(scopeState(utils, 'series-delete-scope', 'following')).toMatchObject({
          disabled: true,
        });
        expect(utils.getByText('series.dialogs.deleteFollowingLocked')).toBeTruthy();

        await press(utils, 'series-delete-scope-confirm');

        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
      });

      it('cannot delete the following dates of a draft whose own date has passed', async () => {
        getSeries.mockResolvedValue(
          seriesOf([
            occurrence('draft-0', '2001-01-02T18:00:00.000Z'),
            occurrence('draft-1', '2001-01-09T18:00:00.000Z'),
            occurrence('draft-2', week(2)),
          ])
        );
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        expect(scopeState(utils, 'series-delete-scope', 'following')).toMatchObject({
          disabled: true,
        });
      });

      it('shows the copy of the code when the series refuses the delete', async () => {
        deleteSeriesOccurrences.mockRejectedValue(
          new EventSeriesError('SERIES_NOTHING_UPCOMING', 'Nothing upcoming')
        );
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');
        fireEvent.press(utils.getByTestId('series-delete-scope-following'));

        await press(utils, 'series-delete-scope-confirm');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.nothingUpcoming')
        );
        expect(router.replace).not.toHaveBeenCalled();
      });

      it('shows the plain message when deleting this draft only fails', async () => {
        deleteEvent.mockRejectedValue(new Error('Network Error'));
        const utils = await renderEditor();
        await press(utils, 'btn-draft-delete');

        await press(utils, 'series-delete-scope-confirm');

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('common.error', 'Network Error'));
      });

      it('asks the one-draft question, and never reads the series, while the feature is off', async () => {
        const utils = await renderEditor(FLAG_OFF);

        await press(utils, 'btn-draft-delete');

        expect(utils.queryByTestId('series-delete-scope-confirm')).toBeNull();
        expect(alertSpy).toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          'drafts.deleteConfirmMessage',
          expect.any(Array)
        );
        expect(getSeries).not.toHaveBeenCalled();

        const buttons = alertSpy.mock.calls.find(
          (call) => call[0] === 'drafts.deleteConfirmTitle'
        )![2];
        await act(async () => {
          await buttons
            .find((button: { style?: string }) => button.style === 'destructive')
            .onPress();
        });
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
      });

      it('asks the one-draft question for a draft that is not in a series', async () => {
        getDraftEventPreview.mockResolvedValue(draftDate({ series_id: null }));
        const utils = await renderEditor(FLAG_ON);

        await press(utils, 'btn-draft-delete');

        expect(utils.queryByTestId('series-delete-scope-confirm')).toBeNull();
        expect(alertSpy).toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          'drafts.deleteConfirmMessage',
          expect.any(Array)
        );
      });
    });
  });

  describe('draft list', () => {
    const listDraft = (id: string, overrides: Partial<Event> = {}): Event =>
      createMockEvent({
        $id: id,
        title: `Draft ${id}`,
        description: 'Something to say',
        categories: ['Strike'],
        start_time: '2099-02-03T10:00:00.000Z',
        series_id: 'series-1',
        ...overrides,
      });

    const withRows = (events: Event[]) =>
      getDraftEventsForOrganizations.mockResolvedValue({ events, total: events.length });

    const renderList = async (flag: { features: { recurringEvents: boolean } } = FLAG_ON) => {
      const utils = renderWithProviders(<DraftEventsScreen />, {
        providerOverrides: {
          globalContext: loggedIn(),
          userOrganizationsContext: organizations,
          versionCheckContext: flag,
        },
      });
      await utils.findByTestId('draft-row-draft-1');
      return utils;
    };

    type ListUtils = Awaited<ReturnType<typeof renderList>>;

    const deleteRow = async (utils: ListUtils, id = 'draft-1') => {
      const row = utils.getByTestId(`draft-row-${id}`);
      await act(async () => {
        row.props.onAccessibilityAction({ nativeEvent: { actionName: 'delete' } });
      });
    };

    const followingState = (utils: ListUtils) =>
      utils.getByTestId('series-delete-scope-following').props.accessibilityState;

    beforeEach(() => {
      withRows([listDraft('draft-0'), listDraft('draft-1'), listDraft('draft-2')]);
    });

    describe('deleting a date of a series', () => {
      it('reads the series, then asks which drafts to delete', async () => {
        const utils = await renderList();

        await deleteRow(utils);

        expect(getSeries).toHaveBeenCalledWith('series-1');
        expect(await utils.findByTestId('series-delete-scope-confirm')).toBeTruthy();
        expect(utils.getByText('series.dialogs.deleteScopeTitle')).toBeTruthy();
        expect(alertSpy).not.toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          expect.anything(),
          expect.anything()
        );
        expect(deleteEvent).not.toHaveBeenCalled();
      });

      it('deletes only this draft, and only its row goes', async () => {
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        expect(deleteEvent).toHaveBeenCalledTimes(1);
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(await utils.findByText('drafts.deleted')).toBeTruthy();
        await waitFor(() => expect(utils.queryByTestId('draft-row-draft-1')).toBeNull());
        expect(utils.getByTestId('draft-row-draft-0')).toBeTruthy();
        expect(utils.getByTestId('draft-row-draft-2')).toBeTruthy();
      });

      it('deletes this and all following drafts, and every one of those rows goes, not the earlier one', async () => {
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        expect(followingState(utils)).toMatchObject({ disabled: false });
        fireEvent.press(utils.getByTestId('series-delete-scope-following'));
        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        expect(deleteSeriesOccurrences).toHaveBeenCalledTimes(1);
        expect(deleteSeriesOccurrences).toHaveBeenCalledWith('series-1', {
          fromEventId: 'draft-1',
        });
        expect(deleteEvent).not.toHaveBeenCalled();
        expect(await utils.findByText('series.messages.deleted:{"count":2}')).toBeTruthy();
        await waitFor(() => expect(utils.queryByTestId('draft-row-draft-1')).toBeNull());
        expect(utils.queryByTestId('draft-row-draft-2')).toBeNull();
        expect(utils.getByTestId('draft-row-draft-0')).toBeTruthy();
      });

      it('lists the drafts again after the delete, and the removed ones stay gone', async () => {
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');
        fireEvent.press(utils.getByTestId('series-delete-scope-following'));

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        // The refetch still returns all three (the mock does not forget them).
        await waitFor(() => expect(getDraftEventsForOrganizations).toHaveBeenCalledTimes(2));
        await settle();
        expect(utils.queryByTestId('draft-row-draft-1')).toBeNull();
        expect(utils.queryByTestId('draft-row-draft-2')).toBeNull();
        expect(utils.getByTestId('draft-row-draft-0')).toBeTruthy();
      });

      it.each([
        [
          'a later date is published',
          [
            occurrence('draft-0', week(0)),
            occurrence('draft-1', week(1)),
            occurrence('draft-2', week(2), 'active'),
          ],
        ],
        [
          'a later date is cancelled',
          [
            occurrence('draft-0', week(0)),
            occurrence('draft-1', week(1)),
            occurrence('draft-2', week(2), 'cancelled'),
          ],
        ],
      ])('offers only this draft when %s', async (_label, occurrences) => {
        getSeries.mockResolvedValue(seriesOf(occurrences));
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        expect(followingState(utils)).toMatchObject({ selected: false, disabled: true });
        expect(utils.getByText('series.dialogs.deleteFollowingLocked')).toBeTruthy();

        fireEvent.press(utils.getByTestId('series-delete-scope-following'), {
          stopPropagation: jest.fn(),
        });
        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        await waitFor(() => expect(utils.queryByTestId('draft-row-draft-1')).toBeNull());
        expect(utils.getByTestId('draft-row-draft-2')).toBeTruthy();
      });

      it('offers only this draft when the series cannot be read, and still lets it be deleted', async () => {
        getSeries.mockRejectedValue(new Error('Network Error'));
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        expect(followingState(utils)).toMatchObject({ disabled: true });
        expect(utils.getByText('series.dialogs.deleteFollowingLocked')).toBeTruthy();

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        await waitFor(() => expect(utils.queryByTestId('draft-row-draft-1')).toBeNull());
        expect(utils.getByTestId('draft-row-draft-2')).toBeTruthy();
      });

      it('deletes nothing when the organizer backs out, and asks again next time', async () => {
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-dismiss'));
        });

        expect(deleteEvent).not.toHaveBeenCalled();
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        expect(utils.queryByTestId('series-delete-scope-confirm')).toBeNull();

        await deleteRow(utils);
        expect(await utils.findByTestId('series-delete-scope-confirm')).toBeTruthy();
        expect(getSeries).toHaveBeenCalledTimes(2);
      });

      it('shows the copy of the code when the series refuses, and keeps every row', async () => {
        deleteSeriesOccurrences.mockRejectedValue(
          new EventSeriesError('SERIES_NOTHING_UPCOMING', 'Nothing upcoming')
        );
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');
        fireEvent.press(utils.getByTestId('series-delete-scope-following'));

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.nothingUpcoming')
        );
        expect(utils.getByTestId('draft-row-draft-1')).toBeTruthy();
        expect(utils.getByTestId('draft-row-draft-2')).toBeTruthy();
      });

      it('shows the message of a failed one-draft delete as it was before', async () => {
        deleteEvent.mockRejectedValue(new Error('Network Error'));
        const utils = await renderList();
        await deleteRow(utils);
        await utils.findByTestId('series-delete-scope-confirm');

        await act(async () => {
          fireEvent.press(utils.getByTestId('series-delete-scope-confirm'));
        });

        await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('common.error', 'Network Error'));
        expect(utils.getByTestId('draft-row-draft-1')).toBeTruthy();
      });
    });

    describe('deleting a draft that is not a date of a series', () => {
      it('keeps the one-draft confirmation while the feature is off, and reads no series', async () => {
        const utils = await renderList(FLAG_OFF);

        await deleteRow(utils);

        expect(utils.queryByTestId('series-delete-scope-confirm')).toBeNull();
        expect(getSeries).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          'drafts.deleteConfirmMessage',
          expect.any(Array),
          expect.anything()
        );

        const buttons = alertSpy.mock.calls.find(
          (call) => call[0] === 'drafts.deleteConfirmTitle'
        )![2];
        await act(async () => {
          await buttons
            .find((button: { style?: string }) => button.style === 'destructive')
            .onPress();
        });
        expect(deleteEvent).toHaveBeenCalledWith('draft-1');
        expect(deleteSeriesOccurrences).not.toHaveBeenCalled();
        await waitFor(() => expect(utils.queryByTestId('draft-row-draft-1')).toBeNull());
        expect(utils.getByTestId('draft-row-draft-2')).toBeTruthy();
      });

      it('keeps the one-draft confirmation for a draft with no series_id', async () => {
        withRows([listDraft('draft-1', { series_id: null })]);
        const utils = await renderList(FLAG_ON);

        await deleteRow(utils);

        expect(utils.queryByTestId('series-delete-scope-confirm')).toBeNull();
        expect(getSeries).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'drafts.deleteConfirmTitle',
          'drafts.deleteConfirmMessage',
          expect.any(Array),
          expect.anything()
        );
      });
    });
  });
});
