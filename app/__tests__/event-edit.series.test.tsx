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
    updateEvent: jest.fn(),
    editSeries: jest.fn(),
    EventSeriesError,
  };
});

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

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DynamicRoutes } from '@/constants/Routes';
import { createMockEvent, createMockUser, renderWithProviders } from '@/test-utils/render';
import type { Event } from '@/types/event.types';
import EditEvent from '@/app/event-edit/[id]';

const { router, useLocalSearchParams } = require('expo-router');
const {
  getEventByIdBackend,
  updateEvent,
  editSeries,
  EventSeriesError,
} = require('@/services/event.service');

// A Tuesday evening in winter: 19:00 to 21:00 in Brussels.
const START = '2026-12-01T18:00:00.000Z';
const END = '2026-12-01T20:00:00.000Z';

const FLAG_ON = { features: { recurringEvents: true } };
const FLAG_OFF = { features: { recurringEvents: false } };

const seriesEvent = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    $id: 'event-1',
    title: 'Weekly vigil',
    description: 'Every Tuesday evening',
    organization_id: 'org-1',
    start_time: START,
    end_time: END,
    series_id: 'series-1',
    categories: ['Protest'],
    ...overrides,
  });

describe('EditEvent recurring events', () => {
  const mockUser = createMockUser();
  let alertSpy: jest.SpyInstance;
  let refetchEvents: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'event-1' });
    getEventByIdBackend.mockResolvedValue(seriesEvent());
    updateEvent.mockResolvedValue({});
    editSeries.mockResolvedValue({ updated: 4, series: {} });
    refetchEvents = jest.fn().mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const renderEdit = async (flag: { features: { recurringEvents: boolean } } = FLAG_ON) => {
    const utils = renderWithProviders(<EditEvent />, {
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
        versionCheckContext: flag,
      },
    });
    await utils.findByTestId('button-save');
    // The form is filled from the loaded event by an effect of its own, a beat after the
    // Save button is there; a press before that would validate an empty form.
    await utils.findByDisplayValue('Every Tuesday evening');
    return utils;
  };

  const save = async (getByTestId: (id: string) => any) => {
    await act(async () => {
      fireEvent.press(getByTestId('button-save'));
    });
  };

  const changeField = (getByTestId: (id: string) => any, testID: string, value: string) => {
    act(() => {
      fireEvent.changeText(getByTestId(testID), value);
    });
  };

  const confirmScope = async (getByTestId: (id: string) => any, scope?: 'following') => {
    if (scope) fireEvent.press(getByTestId('series-edit-scope-following'));
    await act(async () => {
      fireEvent.press(getByTestId('series-edit-scope-confirm'));
    });
  };

  const scopeState = (getByTestId: (id: string) => any, option: 'only' | 'following') =>
    getByTestId(`series-edit-scope-${option}`).props.accessibilityState;

  describe('a date of a series, with the feature on', () => {
    // The schedule of a series cannot change, so no edit form offers a rule.
    it('offers no Repeat control: the form keeps the date fields of the one event', async () => {
      const { getByTestId, queryByTestId } = await renderEdit();

      for (const chip of ['once', 'weekly', 'every_2_weeks', 'monthly']) {
        expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
      }
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
    });

    it('asks which events to change instead of saving, and says it is part of a series', async () => {
      const { getByTestId, queryByTestId, getByText } = await renderEdit();
      expect(queryByTestId('series-edit-scope-confirm')).toBeNull();

      await save(getByTestId);

      expect(getByTestId('series-edit-scope-confirm')).toBeTruthy();
      expect(getByTestId('series-edit-scope-only')).toBeTruthy();
      expect(getByTestId('series-edit-scope-following')).toBeTruthy();
      expect(getByText('series.edit.scopeTitle')).toBeTruthy();
      expect(updateEvent).not.toHaveBeenCalled();
      expect(editSeries).not.toHaveBeenCalled();
      expect(getByText('series.edit.partOfSeries series.edit.onlyNote')).toBeTruthy();
    });

    it('starts on only this event', async () => {
      const { getByTestId } = await renderEdit();
      await save(getByTestId);

      expect(scopeState(getByTestId, 'only')).toMatchObject({ selected: true });
      expect(scopeState(getByTestId, 'following')).toMatchObject({
        selected: false,
        disabled: false,
      });
    });

    it('does not ask when the form is not valid to save', async () => {
      getEventByIdBackend.mockResolvedValue(seriesEvent({ title: '' }));
      const { getByTestId, queryByTestId } = await renderEdit();

      await save(getByTestId);

      expect(queryByTestId('series-edit-scope-confirm')).toBeNull();
      expect(getByTestId('form-issue-title')).toBeTruthy();
    });

    describe('only this event', () => {
      it('updates the one event with its start time, and never edits the series', async () => {
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId);

        expect(updateEvent).toHaveBeenCalledTimes(1);
        const [eventId, payload] = updateEvent.mock.calls[0];
        expect(eventId).toBe('event-1');
        expect(payload).toMatchObject({
          title: 'Weekly vigil',
          description: 'Every Tuesday evening',
          start_time: START,
          end_time: END,
        });
        expect(editSeries).not.toHaveBeenCalled();
      });

      it('saves a moved date as a change to this event alone', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-start-time', '2026-12-02T18:00:00.000Z');
        changeField(getByTestId, 'input-event-end-time', '2026-12-02T20:00:00.000Z');
        await save(getByTestId);

        await confirmScope(getByTestId);

        expect(updateEvent.mock.calls[0][1]).toMatchObject({
          start_time: '2026-12-02T18:00:00.000Z',
          end_time: '2026-12-02T20:00:00.000Z',
        });
        expect(editSeries).not.toHaveBeenCalled();
      });

      it('refreshes the events and shows the one-event message', async () => {
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId);

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.success', 'eventEdit.successMessage')
        );
        expect(refetchEvents).toHaveBeenCalled();
        expect(router.replace).toHaveBeenCalledWith(
          DynamicRoutes.event('event-1', { isCreated: false })
        );
      });

      it('closes the question', async () => {
        const { getByTestId, queryByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId);

        expect(queryByTestId('series-edit-scope-confirm')).toBeNull();
      });
    });

    describe('this and all following events', () => {
      it('edits the series from this date, with the times of the day and none of the schedule', async () => {
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        expect(editSeries).toHaveBeenCalledTimes(1);
        const [seriesId, payload, options] = editSeries.mock.calls[0];
        expect(seriesId).toBe('series-1');
        expect(options).toEqual({ fromEventId: 'event-1' });
        expect(payload).toMatchObject({
          title: 'Weekly vigil',
          description: 'Every Tuesday evening',
          start_local: '19:00',
          end_local: '21:00',
        });
        expect(payload).not.toHaveProperty('start_time');
        expect(payload).not.toHaveProperty('end_time');
        expect(payload).not.toHaveProperty('all_day');
        expect(updateEvent).not.toHaveBeenCalled();
      });

      it('says how many dates were updated, and refreshes', async () => {
        editSeries.mockResolvedValue({ updated: 4, series: {} });
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'common.success',
            'series.messages.updated:{"count":4}'
          )
        );
        expect(refetchEvents).toHaveBeenCalled();
        expect(router.replace).toHaveBeenCalledWith(
          DynamicRoutes.event('event-1', { isCreated: false })
        );
      });

      it('sends the new clock time when only the time of day changed', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-start-time', '2026-12-01T18:30:00.000Z');
        await save(getByTestId);

        expect(scopeState(getByTestId, 'following')).toMatchObject({ disabled: false });
        await confirmScope(getByTestId, 'following');

        expect(editSeries.mock.calls[0][1]).toMatchObject({
          start_local: '19:30',
          end_local: '21:00',
        });
      });

      it('clears the end time of the series when the end was emptied', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-end-time', '');
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        const payload = editSeries.mock.calls[0][1];
        expect(payload.start_local).toBe('19:00');
        expect(payload.end_local).toBeNull();
      });

      it('reads the times in Brussels summer time too', async () => {
        getEventByIdBackend.mockResolvedValue(
          seriesEvent({
            start_time: '2026-07-14T17:00:00.000Z',
            end_time: '2026-07-14T19:00:00.000Z',
          })
        );
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        expect(editSeries.mock.calls[0][1]).toMatchObject({
          start_local: '19:00',
          end_local: '21:00',
        });
      });

      it('sends no times for an all-day series, which has none', async () => {
        // Midnight in Brussels: the shape of a date-only event.
        getEventByIdBackend.mockResolvedValue(
          seriesEvent({
            start_time: '2026-12-01T23:00:00.000Z',
            end_time: '2026-12-02T22:59:59.999Z',
            all_day: true,
          })
        );
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        const payload = editSeries.mock.calls[0][1];
        expect(payload).not.toHaveProperty('start_local');
        expect(payload).not.toHaveProperty('end_local');
        expect(payload).not.toHaveProperty('start_time');
        expect(payload).not.toHaveProperty('all_day');
      });

      it('shows the copy of the code when the series refuses the edit, and stays on the form', async () => {
        editSeries.mockRejectedValue(
          new EventSeriesError('SERIES_SCHEDULE_IMMUTABLE', 'The schedule cannot be changed')
        );
        const { getByTestId } = await renderEdit();
        await save(getByTestId);

        await confirmScope(getByTestId, 'following');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.scheduleImmutable')
        );
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    describe('a date that moved', () => {
      const MOVED = '2026-12-02T18:00:00.000Z';

      it('greys out "this and all following events", with the reason', async () => {
        const { getByTestId, getByText } = await renderEdit();
        changeField(getByTestId, 'input-event-start-time', MOVED);
        await save(getByTestId);

        expect(scopeState(getByTestId, 'following')).toMatchObject({
          selected: false,
          disabled: true,
        });
        expect(scopeState(getByTestId, 'only')).toMatchObject({ selected: true });
        expect(getByText('series.edit.dateLocked')).toBeTruthy();
      });

      it('cannot be widened: a press on it does nothing and confirming saves this event only', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-start-time', MOVED);
        changeField(getByTestId, 'input-event-end-time', '2026-12-02T20:00:00.000Z');
        await save(getByTestId);

        fireEvent.press(getByTestId('series-edit-scope-following'), {
          stopPropagation: jest.fn(),
        });
        await confirmScope(getByTestId);

        expect(editSeries).not.toHaveBeenCalled();
        expect(updateEvent).toHaveBeenCalledTimes(1);
        expect(updateEvent.mock.calls[0][1]).toMatchObject({ start_time: MOVED });
      });

      it('is also what an event made to last several days is', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-end-time', '2026-12-03T20:00:00.000Z');
        await save(getByTestId);

        expect(scopeState(getByTestId, 'following')).toMatchObject({ disabled: true });
      });

      it('is also what an end at the same clock time as the start is', async () => {
        const { getByTestId } = await renderEdit();
        changeField(getByTestId, 'input-event-end-time', START);
        await save(getByTestId);

        expect(scopeState(getByTestId, 'following')).toMatchObject({ disabled: true });
      });
    });
  });

  describe('every upcoming date of a series (allUpcoming)', () => {
    beforeEach(() => {
      useLocalSearchParams.mockReturnValue({ id: 'event-1', allUpcoming: 'true' });
    });

    it('saves at once, with no question, for every upcoming date', async () => {
      const { getByTestId, queryByTestId } = await renderEdit();

      await save(getByTestId);

      expect(queryByTestId('series-edit-scope-confirm')).toBeNull();
      expect(editSeries).toHaveBeenCalledTimes(1);
      const [seriesId, payload, options] = editSeries.mock.calls[0];
      expect(seriesId).toBe('series-1');
      // No `fromEventId`: the scope is every upcoming date, not this one onwards.
      expect(options).toBeUndefined();
      expect(payload).toMatchObject({ start_local: '19:00', end_local: '21:00' });
      expect(payload).not.toHaveProperty('start_time');
      expect(payload).not.toHaveProperty('end_time');
      expect(payload).not.toHaveProperty('all_day');
      expect(updateEvent).not.toHaveBeenCalled();
    });

    it('says the changes apply to every upcoming date', async () => {
      const { getByText } = await renderEdit();

      expect(getByText('series.edit.allNote')).toBeTruthy();
    });

    it('says how many dates were updated', async () => {
      editSeries.mockResolvedValue({ updated: 9, series: {} });
      const { getByTestId } = await renderEdit();

      await save(getByTestId);

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.updated:{"count":9}'
        )
      );
    });

    it('refuses a moved date, which a series cannot take, and sends nothing', async () => {
      const { getByTestId } = await renderEdit();
      changeField(getByTestId, 'input-event-start-time', '2026-12-02T18:00:00.000Z');

      await save(getByTestId);

      expect(editSeries).not.toHaveBeenCalled();
      expect(updateEvent).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.edit.dateLocked');
    });
  });

  describe('with the feature off', () => {
    it('saves a date of a series like a single event, with no question', async () => {
      const { getByTestId, queryByTestId, queryByText } = await renderEdit(FLAG_OFF);
      expect(queryByText('series.edit.partOfSeries series.edit.onlyNote')).toBeNull();

      await save(getByTestId);

      expect(queryByTestId('series-edit-scope-confirm')).toBeNull();
      expect(updateEvent).toHaveBeenCalledTimes(1);
      expect(updateEvent.mock.calls[0][1]).toMatchObject({ start_time: START, end_time: END });
      expect(editSeries).not.toHaveBeenCalled();
    });

    it('does not edit the series even when it was opened for every upcoming date', async () => {
      useLocalSearchParams.mockReturnValue({ id: 'event-1', allUpcoming: 'true' });
      const { getByTestId, queryByText } = await renderEdit(FLAG_OFF);
      expect(queryByText('series.edit.allNote')).toBeNull();

      await save(getByTestId);

      expect(updateEvent).toHaveBeenCalledTimes(1);
      expect(editSeries).not.toHaveBeenCalled();
    });

    it('lets a moved date through, as a single event can', async () => {
      const { getByTestId } = await renderEdit(FLAG_OFF);
      changeField(getByTestId, 'input-event-start-time', '2026-12-02T18:00:00.000Z');

      await save(getByTestId);

      expect(updateEvent.mock.calls[0][1]).toMatchObject({
        start_time: '2026-12-02T18:00:00.000Z',
      });
      expect(alertSpy).not.toHaveBeenCalledWith('common.error', 'series.edit.dateLocked');
    });
  });

  describe('an event that is not in a series', () => {
    it.each([
      ['null', null],
      ['missing', undefined],
    ])('saves at once, with no question, when its series_id is %s', async (_label, seriesId) => {
      getEventByIdBackend.mockResolvedValue(seriesEvent({ series_id: seriesId as string | null }));
      const { getByTestId, queryByTestId, queryByText } = await renderEdit(FLAG_ON);
      expect(queryByText('series.edit.partOfSeries series.edit.onlyNote')).toBeNull();

      await save(getByTestId);

      expect(queryByTestId('series-edit-scope-confirm')).toBeNull();
      expect(updateEvent).toHaveBeenCalledTimes(1);
      expect(updateEvent.mock.calls[0][1]).toMatchObject({ start_time: START, end_time: END });
      expect(editSeries).not.toHaveBeenCalled();
    });

    it('ignores allUpcoming, which only means something on a series', async () => {
      useLocalSearchParams.mockReturnValue({ id: 'event-1', allUpcoming: 'true' });
      getEventByIdBackend.mockResolvedValue(seriesEvent({ series_id: null }));
      const { getByTestId } = await renderEdit(FLAG_ON);

      await save(getByTestId);

      expect(updateEvent).toHaveBeenCalledTimes(1);
      expect(editSeries).not.toHaveBeenCalled();
    });
  });
});
