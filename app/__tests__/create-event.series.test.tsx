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
  class DuplicateEventError extends Error {
    code = 'DUPLICATE_EVENT';
    duplicates: unknown[];
    canOverride: boolean;
    constructor(message = 'duplicate', duplicates: unknown[] = [], canOverride = true) {
      super(message);
      this.name = 'DuplicateEventError';
      this.duplicates = duplicates;
      this.canOverride = canOverride;
    }
  }
  class EventSeriesError extends Error {
    code: string;
    max?: number;
    windowEnd?: string;
    constructor(code: string, message: string, cap?: { max?: number; windowEnd?: string }) {
      super(message);
      this.name = 'EventSeriesError';
      this.code = code;
      this.max = cap?.max;
      this.windowEnd = cap?.windowEnd;
    }
  }
  return {
    createEventBackend: jest.fn(),
    createDraftEvent: jest.fn(),
    DuplicateEventError,
    EventSeriesError,
  };
});

jest.mock('@/services/template.service', () => ({
  getTemplate: jest.fn(),
}));

jest.mock('@/services/localStorageService', () => ({
  saveEventDraft: jest.fn(),
  getEventDraft: jest.fn(),
  clearEventDraft: jest.fn(),
}));

// The dates a rule makes are the backend's to give, and RepeatFields' own tests.
jest.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: jest.fn(() => ({ status: 'idle' })),
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { DynamicRoutes, Routes } from '@/constants/Routes';
import { createMockUser, renderWithProviders } from '@/test-utils/render';
import type { RepeatFormState } from '@/types/eventSeries.types';
import CreateEventModal from '@/app/(tabs)/(more)/create-event';

const { router } = require('expo-router');
const { useLocalSearchParams } = require('expo-router');
const {
  createEventBackend,
  createDraftEvent,
  DuplicateEventError,
  EventSeriesError,
} = require('@/services/event.service');
const {
  getEventDraft,
  clearEventDraft,
  saveEventDraft,
} = require('@/services/localStorageService');

// Far enough ahead to stay clear of the clock, and a day the rule never reads as past.
const START_TIME = '2099-01-06T18:00:00.000Z';
const END_TIME = '2099-01-06T20:00:00.000Z';
const STARTS_ON = '2099-01-06';

const singleEventForm = {
  organization_id: 'org-1',
  title: 'Weekly vigil',
  description: 'Every Tuesday evening',
  images: [],
  street_address: 'Rue de la Loi 1',
  city: 'Brussels',
  region: '',
  country: 'belgium',
  start_time: START_TIME,
  end_time: END_TIME,
  organizer_name: 'Test Org',
  website_url: '',
  categories: 'Protest',
  disclaimer: '',
  postal_code: '1000',
  co_organizers: [],
  help_needed: false,
  help_description: '',
  geocod_lat: null,
  geocod_lng: null,
};

const weeklyRule = (overrides: Partial<RepeatFormState> = {}): RepeatFormState => ({
  frequency: 'weekly',
  weekday: 'tuesday',
  weekOfMonth: 1,
  startLocal: '19:00',
  endLocal: '21:00',
  startsOn: STARTS_ON,
  endMode: 'count',
  until: '',
  count: '3',
  ...overrides,
});

const WIRE_RULE = {
  frequency: 'weekly',
  weekday: 'tuesday',
  start_local: '19:00',
  end_local: '21:00',
  starts_on: STARTS_ON,
  count: 3,
};

const seriesSummary = (count = 3) => ({ occurrence_count: count });

const FLAG_ON = { features: { recurringEvents: true } };
const FLAG_OFF = { features: { recurringEvents: false } };

describe('CreateEventModal recurring events', () => {
  const mockUser = createMockUser();
  let alertSpy: jest.SpyInstance;
  let refetchEvents: jest.Mock;
  let upsertEventInCache: jest.Mock;
  let refreshUserEventCounts: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
    getEventDraft.mockResolvedValue(null);
    clearEventDraft.mockResolvedValue(undefined);
    saveEventDraft.mockResolvedValue({ success: true });
    createEventBackend.mockReset();
    createDraftEvent.mockReset();
    refetchEvents = jest.fn().mockResolvedValue(undefined);
    upsertEventInCache = jest.fn();
    refreshUserEventCounts = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy?.mockRestore();
  });

  /**
   * Renders the screen with a complete form by resuming the local autosave: the same
   * FormState the submit handlers read, with no field-by-field driving. This is also
   * the only way a rule can sit in the form while the feature is off.
   */
  const renderWithForm = async (
    formData: Record<string, unknown>,
    flag: { features: { recurringEvents: boolean } } = FLAG_ON
  ) => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getEventDraft.mockResolvedValue({ formData });

    const utils = renderWithProviders(<CreateEventModal />, {
      providerOverrides: {
        globalContext: {
          user: mockUser,
          isLogged: true,
          loading: false,
          userLanguage: 'en',
          eventsCache: {},
          refetchEvents,
          refreshUserEventCounts,
          upsertEventInCache,
        },
        userOrganizationsContext: {
          hasOrganizations: true,
          selectedOrganizationId: 'org-1',
          userOrganizations: [{ $id: 'org-1', name: 'Test Org' }],
          loading: false,
        },
        versionCheckContext: flag,
      },
    });

    await waitFor(() =>
      expect(alertSpy.mock.calls.some((call) => call[0] === 'draft.resumeTitle')).toBe(true)
    );
    const resume = alertSpy.mock.calls.find((call) => call[0] === 'draft.resumeTitle');
    const buttons = (resume?.[2] ?? []) as { text?: string; onPress?: () => void }[];
    await act(async () => {
      buttons.find((button) => button.text === 'draft.resumeDraft')?.onPress?.();
    });
    alertSpy.mockClear();

    return utils;
  };

  const press = async (getByTestId: (id: string) => any, testID: string) => {
    await act(async () => {
      fireEvent.press(getByTestId(testID));
    });
  };

  const alerted = (title: string) => alertSpy.mock.calls.filter((call) => call[0] === title);

  describe('the Repeat control', () => {
    it('is offered while the feature is on', async () => {
      const { getByTestId, queryByTestId } = await renderWithForm(singleEventForm, FLAG_ON);

      for (const chip of ['once', 'weekly', 'every_2_weeks', 'monthly']) {
        expect(getByTestId(`repeat-chip-${chip}`)).toBeTruthy();
      }
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(queryByTestId('repeat-start-time')).toBeNull();
    });

    it('is not offered while the feature is off', async () => {
      const { getByTestId, queryByTestId } = await renderWithForm(singleEventForm, FLAG_OFF);

      for (const chip of ['once', 'weekly', 'every_2_weeks', 'monthly']) {
        expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
      }
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
    });

    it('swaps the date fields for the rule when Weekly is chosen', async () => {
      const { getByTestId, queryByTestId } = await renderWithForm(singleEventForm, FLAG_ON);

      await press(getByTestId, 'repeat-chip-weekly');

      expect(queryByTestId('input-event-start-time')).toBeNull();
      expect(getByTestId('repeat-start-time')).toBeTruthy();
    });
  });

  describe('a single event', () => {
    it('sends its start and end time and no rule while the feature is off', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
      const { getByTestId } = await renderWithForm(singleEventForm, FLAG_OFF);

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      const [payload] = createEventBackend.mock.calls[0];
      expect(payload).toMatchObject({
        organization_id: 'org-1',
        title: 'Weekly vigil',
        start_time: START_TIME,
        end_time: END_TIME,
      });
      expect(payload).not.toHaveProperty('recurrence');
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.success', 'alerts.eventCreated')
      );
      expect(refetchEvents).not.toHaveBeenCalled();
    });

    it('sends its start and end time and no rule while the feature is on but Repeat is untouched', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
      const { getByTestId } = await renderWithForm(singleEventForm, FLAG_ON);

      await press(getByTestId, 'btn-create-event-submit');

      const [payload] = createEventBackend.mock.calls[0];
      expect(payload).toMatchObject({ start_time: START_TIME, end_time: END_TIME });
      expect(payload).not.toHaveProperty('recurrence');
    });

    it('does the same when Repeat was set back to Once', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
      const { getByTestId } = await renderWithForm(
        { ...singleEventForm, repeat: weeklyRule({ frequency: 'once' }) },
        FLAG_ON
      );

      await press(getByTestId, 'btn-create-event-submit');

      const [payload] = createEventBackend.mock.calls[0];
      expect(payload).toMatchObject({ start_time: START_TIME, end_time: END_TIME });
      expect(payload).not.toHaveProperty('recurrence');
    });

    it('shows the plain error message of a failure that is not about a rule', async () => {
      createEventBackend.mockRejectedValue(new Error('Network Error'));
      const { getByTestId } = await renderWithForm(singleEventForm, FLAG_ON);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('common.error', 'Network Error'));
    });
  });

  describe('a rule resumed from a local autosave while the feature is off', () => {
    const withRule = { ...singleEventForm, repeat: weeklyRule() };

    it('submits a single event and never a series', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
      const { getByTestId, queryByTestId } = await renderWithForm(withRule, FLAG_OFF);

      // The form shows the single-event fields, so that is what the organizer sees...
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(queryByTestId('repeat-start-time')).toBeNull();

      await press(getByTestId, 'btn-create-event-submit');

      // ...and what is sent.
      expect(createEventBackend).toHaveBeenCalledTimes(1);
      const [payload] = createEventBackend.mock.calls[0];
      expect(payload).toMatchObject({ start_time: START_TIME, end_time: END_TIME });
      expect(payload).not.toHaveProperty('recurrence');
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.success', 'alerts.eventCreated')
      );
    });

    it('validates the single date, not the hidden rule', async () => {
      const { getByTestId } = await renderWithForm(
        { ...withRule, start_time: '', repeat: weeklyRule({ startLocal: '19:00' }) },
        FLAG_OFF
      );

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).not.toHaveBeenCalled();
      expect(alerted('common.error')[0][1]).toContain('createEvent.startTime');
    });

    it('saves a single draft with its dates and no rule', async () => {
      createDraftEvent.mockResolvedValue({ $id: 'draft-1' });
      const { getByTestId } = await renderWithForm(withRule, FLAG_OFF);

      await press(getByTestId, 'btn-create-event-draft');

      expect(createDraftEvent).toHaveBeenCalledTimes(1);
      const [payload] = createDraftEvent.mock.calls[0];
      expect(payload).toMatchObject({ start_time: START_TIME, end_time: END_TIME });
      expect(payload).not.toHaveProperty('recurrence');
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.success', 'drafts.savedConfirmation')
      );
    });

    it('does not let a rule that would be invalid stop a single event', async () => {
      createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
      const { getByTestId } = await renderWithForm(
        { ...singleEventForm, repeat: weeklyRule({ count: '1', startsOn: '2001-01-01' }) },
        FLAG_OFF
      );

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      expect(alerted('common.error')).toHaveLength(0);
    });
  });

  describe('a weekly series', () => {
    const weekly = { ...singleEventForm, repeat: weeklyRule() };

    const reportSeries = (count = 3) =>
      createEventBackend.mockImplementation(async (_data: unknown, options: any) => {
        options.report.series = seriesSummary(count);
        return { $id: 'evt-1', title: 'Weekly vigil', series_id: 'series-1' };
      });

    it('sends the rule, and neither start_time nor end_time', async () => {
      reportSeries();
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      const [payload, options] = createEventBackend.mock.calls[0];
      expect(payload.recurrence).toEqual(WIRE_RULE);
      expect(payload).not.toHaveProperty('start_time');
      expect(payload).not.toHaveProperty('end_time');
      expect(payload).toMatchObject({
        organization_id: 'org-1',
        title: 'Weekly vigil',
        description: 'Every Tuesday evening',
        categories: 'Protest',
      });
      expect(options).toMatchObject({ duplicateOverride: false });
    });

    it('sends a rule that has no start_time in the single-event fields either', async () => {
      reportSeries();
      const { getByTestId } = await renderWithForm({ ...weekly, start_time: '', end_time: '' });

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      const [payload] = createEventBackend.mock.calls[0];
      expect(payload.recurrence).toEqual(WIRE_RULE);
      expect(payload).not.toHaveProperty('start_time');
    });

    it('does not read the single end time against the single start time', async () => {
      reportSeries();
      const { getByTestId } = await renderWithForm({
        ...weekly,
        start_time: END_TIME,
        end_time: START_TIME,
      });

      await press(getByTestId, 'btn-create-event-submit');

      expect(createEventBackend).toHaveBeenCalledTimes(1);
      expect(alerted('common.error')).toHaveLength(0);
    });

    it('says how many events the backend created', async () => {
      reportSeries(3);
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.created:{"count":3}'
        )
      );
      expect(alertSpy).not.toHaveBeenCalledWith('common.success', 'alerts.eventCreated');
    });

    it('goes by the count in the report, not by the count typed in', async () => {
      reportSeries(2);
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.created:{"count":2}'
        )
      );
    });

    it('refreshes the events, since only the first date is seeded', async () => {
      reportSeries();
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() => expect(refetchEvents).toHaveBeenCalledTimes(1));
      expect(upsertEventInCache).toHaveBeenCalledWith(
        expect.objectContaining({ $id: 'evt-1', series_id: 'series-1' })
      );
      expect(refreshUserEventCounts).toHaveBeenCalledWith(['org-1']);
      expect(clearEventDraft).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith(
        DynamicRoutes.event('evt-1', { isCreated: true })
      );
    });

    it('does not fail the create when the refresh does', async () => {
      reportSeries();
      refetchEvents.mockRejectedValue(new Error('offline'));
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.created:{"count":3}'
        )
      );
      expect(alerted('common.error')).toHaveLength(0);
    });

    it('carries the dates that clashed into the success alert', async () => {
      createEventBackend.mockImplementation(async (_data: unknown, options: any) => {
        options.report.series = seriesSummary(3);
        options.report.possibleDuplicates = [
          {
            id: 'dup-1',
            title: 'Existing vigil',
            start_time: START_TIME,
            city: 'Brussels',
            status: 'active',
            organization_id: 'org-1',
            relationship: 'own',
            reason: 'content',
            strength: 'weak',
            occurrence_start_time: START_TIME,
          },
        ];
        return { $id: 'evt-1', title: 'Weekly vigil' };
      });
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-submit');

      await waitFor(() => expect(alerted('common.success')).toHaveLength(1));
      const message = alerted('common.success')[0][1] as string;
      expect(message).toContain('series.messages.created:{"count":3}');
      expect(message).toContain('duplicates.clashingDates:{"dates":"Tue 6 Jan"}');
    });

    describe('the rule is checked before anything is sent', () => {
      it('is blocked when its start time is missing, however the single date is filled', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ startLocal: '' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(
          'common.error',
          'createEvent.missingFieldsError:{"fields":"createEvent.startTime"}'
        );
      });

      it('is blocked when the title is missing as well, naming both', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          title: '',
          repeat: weeklyRule({ startLocal: '' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alerted('common.error')[0][1]).toBe(
          'createEvent.missingFieldsError:{"fields":"createEvent.title, createEvent.startTime"}'
        );
      });

      it('is blocked, with the field message, for a count of 1', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ count: '1' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.repeat.errors.count');
      });

      it('is blocked when no end was picked', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ count: '' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.repeat.errors.count');
      });

      it('lists every field that is wrong, one per line', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ startsOn: '2001-01-01', endLocal: '19:00', count: '40' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alerted('common.error')[0][1]).toBe(
          [
            'series.repeat.errors.endLocal',
            'series.repeat.errors.startsOn',
            'series.repeat.errors.count',
          ].join('\n')
        );
      });

      it('is blocked when the last date is before the first', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ endMode: 'until', until: '2098-12-01', count: '' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        expect(createEventBackend).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.repeat.errors.until');
      });

      it('sends a rule that ends on a date as `until`, with no count', async () => {
        createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ endMode: 'until', until: '2099-01-20', count: '' }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        const [payload] = createEventBackend.mock.calls[0];
        expect(payload.recurrence).toEqual({
          frequency: 'weekly',
          weekday: 'tuesday',
          start_local: '19:00',
          end_local: '21:00',
          starts_on: STARTS_ON,
          until: '2099-01-20',
        });
      });

      it('sends the ordinal of a monthly rule', async () => {
        createEventBackend.mockResolvedValue({ $id: 'evt-1', title: 'Weekly vigil' });
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule({ frequency: 'monthly', weekOfMonth: -1 }),
        });

        await press(getByTestId, 'btn-create-event-submit');

        const [payload] = createEventBackend.mock.calls[0];
        expect(payload.recurrence).toMatchObject({ frequency: 'monthly', week_of_month: -1 });
      });
    });

    describe('when the backend refuses it', () => {
      it('shows the cap message, with the maximum and the last possible date', async () => {
        createEventBackend.mockRejectedValue(
          new EventSeriesError('RECURRENCE_TOO_MANY_OCCURRENCES', 'Too many occurrences', {
            max: 14,
            windowEnd: '2027-01-27',
          })
        );
        const { getByTestId } = await renderWithForm(weekly);

        await press(getByTestId, 'btn-create-event-submit');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith(
            'common.error',
            'series.errors.tooMany:{"max":14,"date":"27 Jan"}'
          )
        );
        expect(router.replace).not.toHaveBeenCalled();
      });

      it('shows the copy of the code, not the English message of the backend', async () => {
        createEventBackend.mockRejectedValue(
          new EventSeriesError('RECURRENCE_TOO_FEW_OCCURRENCES', 'At least 2 occurrences')
        );
        const { getByTestId } = await renderWithForm(weekly);

        await press(getByTestId, 'btn-create-event-submit');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.tooFew')
        );
      });

      it('says nothing was created when the server did not confirm the series', async () => {
        createEventBackend.mockRejectedValue(
          new EventSeriesError('SERIES_NOT_CONFIRMED', 'The server did not confirm the series')
        );
        const { getByTestId } = await renderWithForm(weekly);

        await press(getByTestId, 'btn-create-event-submit');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'series.errors.notConfirmed')
        );
        expect(alertSpy).not.toHaveBeenCalledWith('common.success', expect.anything());
      });

      it('shows the rate-limit copy', async () => {
        createEventBackend.mockRejectedValue(
          Object.assign(new Error('Too many requests'), {
            code: 'RATE_LIMIT_EXCEEDED',
            isRateLimited: true,
          })
        );
        const { getByTestId } = await renderWithForm(weekly);

        await press(getByTestId, 'btn-create-event-submit');

        await waitFor(() =>
          expect(alertSpy).toHaveBeenCalledWith('common.error', 'errors.rateLimit.message')
        );
      });
    });

    describe('when the backend calls it a duplicate', () => {
      const duplicate = {
        id: 'dup-1',
        title: 'Existing vigil',
        start_time: START_TIME,
        city: 'Brussels',
        status: 'active',
        organization_id: 'org-1',
        relationship: 'own',
        reason: 'content',
        strength: 'strong',
        occurrence_start_time: START_TIME,
      };

      it('shows the matches, then sends the same rule again with the override', async () => {
        createEventBackend.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));
        const { getByTestId, findByText } = await renderWithForm(weekly);

        await press(getByTestId, 'btn-create-event-submit');
        expect(await findByText('duplicates.createTitle')).toBeTruthy();
        expect(await findByText('duplicates.yourDate:{"date":"Tue 6 Jan"}')).toBeTruthy();

        createEventBackend.mockImplementationOnce(async (_data: unknown, options: any) => {
          options.report.series = seriesSummary(3);
          return { $id: 'evt-1', title: 'Weekly vigil' };
        });
        await act(async () => {
          fireEvent.press(await findByText('duplicates.createAnyway'));
        });

        expect(createEventBackend).toHaveBeenCalledTimes(2);
        const [first, firstOptions] = createEventBackend.mock.calls[0];
        const [second, secondOptions] = createEventBackend.mock.calls[1];
        expect(firstOptions).toMatchObject({ duplicateOverride: false });
        expect(secondOptions).toMatchObject({ duplicateOverride: true });
        expect(second.recurrence).toEqual(WIRE_RULE);
        expect(second).toEqual(first);
        expect(second).not.toHaveProperty('start_time');
      });
    });
  });

  describe('a series saved as drafts', () => {
    const weekly = { ...singleEventForm, repeat: weeklyRule() };

    it('sends the rule, and neither start_time nor end_time', async () => {
      createDraftEvent.mockImplementation(async (_data: unknown, options: any) => {
        options.report.series = seriesSummary(3);
        return { $id: 'draft-1', series_id: 'series-1' };
      });
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-draft');

      expect(createDraftEvent).toHaveBeenCalledTimes(1);
      const [payload] = createDraftEvent.mock.calls[0];
      expect(payload.recurrence).toEqual(WIRE_RULE);
      expect(payload).not.toHaveProperty('start_time');
      expect(payload).not.toHaveProperty('end_time');
      expect(createEventBackend).not.toHaveBeenCalled();
    });

    it('says how many drafts were saved, and goes to the drafts', async () => {
      createDraftEvent.mockImplementation(async (_data: unknown, options: any) => {
        options.report.series = seriesSummary(4);
        return { $id: 'draft-1' };
      });
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-draft');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.success',
          'series.messages.draftsCreated:{"count":4}'
        )
      );
      expect(router.replace).toHaveBeenCalledWith(Routes.DRAFT_EVENTS);
      expect(refreshUserEventCounts).toHaveBeenCalledWith(['org-1']);
      // Drafts are not in the events cache.
      expect(refetchEvents).not.toHaveBeenCalled();
    });

    it('needs only a title and an organization, as any draft does', async () => {
      createDraftEvent.mockResolvedValue({ $id: 'draft-1' });
      const { getByTestId } = await renderWithForm({
        ...weekly,
        description: '',
        categories: '',
        start_time: '',
        end_time: '',
      });

      await press(getByTestId, 'btn-create-event-draft');

      expect(createDraftEvent).toHaveBeenCalledTimes(1);
      expect(createDraftEvent.mock.calls[0][0].recurrence).toEqual(WIRE_RULE);
    });

    describe('an invalid rule never falls back to a single draft', () => {
      it.each([
        ['a count of 1', { count: '1' }, 'series.repeat.errors.count'],
        ['no end picked', { count: '' }, 'series.repeat.errors.count'],
        ['no start time', { startLocal: '' }, 'series.repeat.errors.startLocal'],
        ['a start in the past', { startsOn: '2001-01-01' }, 'series.repeat.errors.startsOn'],
      ])('with %s', async (_label, overrides, message) => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          repeat: weeklyRule(overrides as Partial<RepeatFormState>),
        });

        await press(getByTestId, 'btn-create-event-draft');

        expect(createDraftEvent).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('common.error', message);
        expect(router.replace).not.toHaveBeenCalled();
      });

      it('even though the single date is filled in and would make a fine draft', async () => {
        const { getByTestId } = await renderWithForm({
          ...weekly,
          start_time: START_TIME,
          repeat: weeklyRule({ count: '1' }),
        });

        await press(getByTestId, 'btn-create-event-draft');

        expect(createDraftEvent).not.toHaveBeenCalled();
      });
    });

    it('shows the localized cap message when the backend refuses the rule', async () => {
      createDraftEvent.mockRejectedValue(
        new EventSeriesError('RECURRENCE_TOO_MANY_OCCURRENCES', 'Too many', {
          max: 14,
          windowEnd: '2027-01-27',
        })
      );
      const { getByTestId } = await renderWithForm(weekly);

      await press(getByTestId, 'btn-create-event-draft');

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.error',
          'series.errors.tooMany:{"max":14,"date":"27 Jan"}'
        )
      );
    });

    it('sends the same rule again, through the draft create, on "Create anyway"', async () => {
      const duplicate = {
        id: 'dup-1',
        title: 'Existing vigil',
        start_time: START_TIME,
        city: 'Brussels',
        status: 'draft',
        organization_id: 'org-1',
        relationship: 'own',
        reason: 'content',
        strength: 'strong',
      };
      createDraftEvent.mockRejectedValueOnce(new DuplicateEventError('dup', [duplicate], true));
      const { getByTestId, findByText } = await renderWithForm(weekly);
      await press(getByTestId, 'btn-create-event-draft');
      expect(await findByText('duplicates.createTitle')).toBeTruthy();

      createDraftEvent.mockResolvedValueOnce({ $id: 'draft-1' });
      await act(async () => {
        fireEvent.press(await findByText('duplicates.createAnyway'));
      });

      expect(createDraftEvent).toHaveBeenCalledTimes(2);
      expect(createDraftEvent.mock.calls[1][1]).toMatchObject({ duplicateOverride: true });
      expect(createDraftEvent.mock.calls[1][0].recurrence).toEqual(WIRE_RULE);
      expect(createEventBackend).not.toHaveBeenCalled();
    });
  });
});
