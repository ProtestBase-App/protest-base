import {
  brusselsDateOf,
  brusselsInstant,
  brusselsTimeOf,
  buildRecurrenceRule,
  createRepeatForm,
  describeSeries,
  describeSeriesDay,
  editableOccurrences,
  formatCalendarDate,
  formatLocalTimeRange,
  formatOccurrenceDate,
  isDraftsOnlyScope,
  isRepeating,
  representativeOccurrence,
  seriesBadgeText,
  seriesErrorMessage,
  seriesTimesFromForm,
  upcomingOccurrences,
  weekdayOfDate,
  weekOfMonthOfDate,
} from '@/utils/recurrence';
import type {
  EventSeries,
  EventSeriesOccurrence,
  RepeatFormState,
} from '@/types/eventSeries.types';

const TODAY = '2026-11-02';

const repeat = (overrides: Partial<RepeatFormState> = {}): RepeatFormState => ({
  frequency: 'weekly',
  weekday: 'tuesday',
  weekOfMonth: 1,
  startLocal: '19:00',
  endLocal: '21:00',
  startsOn: '2026-11-03',
  endMode: 'count',
  until: '',
  count: '3',
  ...overrides,
});

const occurrence = (
  $id: string,
  start_time: string,
  status: EventSeriesOccurrence['status'] = 'active'
): EventSeriesOccurrence => ({ $id, start_time, end_time: null, status });

const series = (overrides: Partial<EventSeries> = {}): EventSeries => ({
  id: 'series-1',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: '21:00',
  starts_on: '2026-11-02',
  until_date: '2026-11-17',
  window_end: '2027-02-03',
  max_occurrences: 14,
  occurrences: [],
  can_add_dates: true,
  ...overrides,
});

describe('recurrence', () => {
  describe('the rule is built from Brussels terms', () => {
    it('reads the weekday of a date with no timezone involved', () => {
      expect(weekdayOfDate('2026-11-03')).toBe('tuesday');
      expect(weekdayOfDate('2026-11-01')).toBe('sunday');
      expect(weekdayOfDate('2026-11-02')).toBe('monday');
    });

    it('reads which one of the month a date is, a fifth being the last', () => {
      expect(weekOfMonthOfDate('2026-11-03')).toBe(1);
      expect(weekOfMonthOfDate('2026-11-24')).toBe(4);
      expect(weekOfMonthOfDate('2026-12-29')).toBe(-1);
    });

    it('reads the Brussels clock of an instant in both DST offsets', () => {
      expect(brusselsTimeOf('2026-11-03T18:00:00.000Z')).toBe('19:00');
      expect(brusselsTimeOf('2026-07-14T18:00:00.000Z')).toBe('20:00');
    });

    it('reads the Brussels date of an instant past UTC midnight', () => {
      // 23:30 UTC on the 3rd is already 00:30 on the 4th in Brussels.
      expect(brusselsDateOf('2026-11-03T23:30:00.000Z')).toBe('2026-11-04');
    });

    it('writes midnight as 00:00, never 24:00', () => {
      expect(brusselsTimeOf('2026-11-02T23:00:00.000Z')).toBe('00:00');
    });

    it('seeds a picker with the instant Brussels calls that date and time', () => {
      expect(brusselsInstant('2026-11-03', '19:00')).toBe('2026-11-03T18:00:00.000Z');
      expect(brusselsInstant('2026-07-14', '19:00')).toBe('2026-07-14T17:00:00.000Z');
    });

    it('round-trips through the picker value', () => {
      const instant = brusselsInstant('2026-11-03', '07:05');

      expect(brusselsDateOf(instant)).toBe('2026-11-03');
      expect(brusselsTimeOf(instant)).toBe('07:05');
    });
  });

  describe('isRepeating', () => {
    it('is false for no value and for Once', () => {
      expect(isRepeating(undefined)).toBe(false);
      expect(isRepeating(repeat({ frequency: 'once' }))).toBe(false);
    });

    it('is true for any frequency', () => {
      expect(isRepeating(repeat())).toBe(true);
      expect(isRepeating(repeat({ frequency: 'monthly' }))).toBe(true);
    });
  });

  describe('createRepeatForm', () => {
    it('starts today, on today, with no times and no end', () => {
      expect(createRepeatForm({}, TODAY)).toEqual({
        frequency: 'weekly',
        weekday: 'monday',
        weekOfMonth: 1,
        startLocal: '',
        endLocal: '',
        startsOn: TODAY,
        endMode: 'count',
        until: '',
        count: '',
      });
    });

    it('takes the day and the times from a date already picked', () => {
      const form = createRepeatForm(
        { startTime: '2026-11-24T18:00:00.000Z', endTime: '2026-11-24T20:00:00.000Z' },
        TODAY
      );

      expect(form).toMatchObject({
        weekday: 'tuesday',
        weekOfMonth: 4,
        startLocal: '19:00',
        endLocal: '21:00',
        startsOn: '2026-11-24',
      });
    });

    it('never seeds a start date in the past', () => {
      const form = createRepeatForm({ startTime: '2026-10-01T18:00:00.000Z' }, TODAY);

      expect(form.startsOn).toBe(TODAY);
    });

    it('drops an end time equal to the start, which the backend refuses', () => {
      const form = createRepeatForm(
        { startTime: '2026-11-24T18:00:00.000Z', endTime: '2026-11-24T18:00:00.000Z' },
        TODAY
      );

      expect(form.endLocal).toBe('');
    });
  });

  describe('buildRecurrenceRule', () => {
    it('builds a weekly rule with a count', () => {
      expect(buildRecurrenceRule(repeat(), { today: TODAY })).toEqual({
        rule: {
          frequency: 'weekly',
          weekday: 'tuesday',
          start_local: '19:00',
          end_local: '21:00',
          starts_on: '2026-11-03',
          count: 3,
        },
        errors: [],
      });
    });

    it('sends week_of_month on a monthly rule only', () => {
      const monthly = buildRecurrenceRule(repeat({ frequency: 'monthly', weekOfMonth: -1 }), {
        today: TODAY,
      });
      expect(monthly.rule?.week_of_month).toBe(-1);

      const weekly = buildRecurrenceRule(repeat({ weekOfMonth: 3 }), { today: TODAY });
      expect(weekly.rule).not.toHaveProperty('week_of_month');
    });

    it('leaves out an empty end time rather than sending null', () => {
      const { rule } = buildRecurrenceRule(repeat({ endLocal: '' }), { today: TODAY });

      expect(rule).not.toHaveProperty('end_local');
    });

    it('sends exactly one of until and count', () => {
      const byCount = buildRecurrenceRule(repeat({ until: '2026-12-01' }), { today: TODAY });
      expect(byCount.rule).toHaveProperty('count', 3);
      expect(byCount.rule).not.toHaveProperty('until');

      const byDate = buildRecurrenceRule(
        repeat({ endMode: 'until', until: '2026-12-01', count: '3' }),
        { today: TODAY }
      );
      expect(byDate.rule).toHaveProperty('until', '2026-12-01');
      expect(byDate.rule).not.toHaveProperty('count');
    });

    it('accepts an end time earlier than the start, which ends the next day', () => {
      const { rule } = buildRecurrenceRule(repeat({ startLocal: '22:00', endLocal: '04:00' }), {
        today: TODAY,
      });

      expect(rule?.end_local).toBe('04:00');
    });

    it('flags what the form can see by itself', () => {
      expect(buildRecurrenceRule(repeat({ startLocal: '' }), { today: TODAY }).errors).toEqual([
        'start_local',
      ]);
      expect(
        buildRecurrenceRule(repeat({ startLocal: '19:00', endLocal: '19:00' }), { today: TODAY })
          .errors
      ).toEqual(['end_local']);
      expect(
        buildRecurrenceRule(repeat({ startsOn: '2026-11-01' }), { today: TODAY }).errors
      ).toEqual(['starts_on']);
      expect(buildRecurrenceRule(repeat({ count: '1' }), { today: TODAY }).errors).toEqual([
        'count',
      ]);
      expect(buildRecurrenceRule(repeat({ count: '32' }), { today: TODAY }).errors).toEqual([
        'count',
      ]);
      expect(
        buildRecurrenceRule(repeat({ endMode: 'until', until: '2026-11-01' }), { today: TODAY })
          .errors
      ).toEqual(['until']);
    });

    it('needs an end to submit, and none to preview', () => {
      const open = repeat({ count: '' });

      expect(buildRecurrenceRule(open, { today: TODAY }).errors).toEqual(['count']);

      const preview = buildRecurrenceRule(open, { today: TODAY, requireEnd: false });
      expect(preview.errors).toEqual([]);
      expect(preview.rule).not.toHaveProperty('count');
      expect(preview.rule).not.toHaveProperty('until');
    });

    it('still flags a filled end on the preview', () => {
      expect(
        buildRecurrenceRule(repeat({ count: '99' }), { today: TODAY, requireEnd: false }).errors
      ).toEqual(['count']);
    });

    it('never builds a rule for Once', () => {
      expect(buildRecurrenceRule(repeat({ frequency: 'once' }), { today: TODAY }).rule).toBeNull();
    });
  });

  describe('seriesTimesFromForm', () => {
    const loaded = '2026-11-10T18:00:00.000Z';

    it('gives the Brussels times of the form', () => {
      expect(
        seriesTimesFromForm(
          { start_time: '2026-11-10T19:00:00.000Z', end_time: '2026-11-10T21:00:00.000Z' },
          loaded
        )
      ).toEqual({ start_local: '20:00', end_local: '22:00' });
    });

    it('clears the end time when the form has none', () => {
      expect(
        seriesTimesFromForm({ start_time: '2026-11-10T19:00:00.000Z', end_time: '' }, loaded)
      ).toEqual({ start_local: '20:00', end_local: null });
    });

    it('accepts an end the next day, which the wire format can say', () => {
      expect(
        seriesTimesFromForm(
          { start_time: '2026-11-10T21:00:00.000Z', end_time: '2026-11-11T03:00:00.000Z' },
          loaded
        )
      ).toEqual({ start_local: '22:00', end_local: '04:00' });
    });

    it('refuses a moved date: the schedule of a series cannot change', () => {
      expect(
        seriesTimesFromForm({ start_time: '2026-11-11T18:00:00.000Z', end_time: '' }, loaded)
      ).toBeNull();
    });

    it('refuses an end more than a day out, which the wire format cannot say', () => {
      expect(
        seriesTimesFromForm(
          { start_time: '2026-11-10T18:00:00.000Z', end_time: '2026-11-12T20:00:00.000Z' },
          loaded
        )
      ).toBeNull();
    });

    it('refuses an end at the same clock time, which the backend would refuse', () => {
      expect(
        seriesTimesFromForm(
          { start_time: '2026-11-10T18:00:00.000Z', end_time: '2026-11-11T18:00:00.000Z' },
          loaded
        )
      ).toBeNull();
    });

    it('is safe on an empty form', () => {
      expect(seriesTimesFromForm({ start_time: '', end_time: '' }, loaded)).toBeNull();
      expect(seriesTimesFromForm({ start_time: loaded, end_time: '' }, '')).toBeNull();
    });
  });

  describe('words', () => {
    it('formats a date of a series in Brussels, in the given language', () => {
      expect(formatOccurrenceDate('2026-11-03T18:00:00.000Z', 'en-GB')).toMatch(/Tue/);
      expect(formatOccurrenceDate('2026-11-03T23:30:00.000Z', 'en-GB')).toMatch(/Wed/);
    });

    it("puts the day first in English, as the app's audience writes dates", () => {
      expect(formatOccurrenceDate('2026-11-03T18:00:00.000Z', 'en')).toMatch(/3 Nov/);
      expect(formatCalendarDate('2026-11-17', 'en')).toBe('17 Nov');
    });

    it('formats a calendar date without shifting it', () => {
      expect(formatCalendarDate('2026-11-17', 'en-GB')).toBe('17 Nov');
    });

    it('formats a time range, with or without an end', () => {
      expect(formatLocalTimeRange('19:00', '21:00')).toBe('19:00–21:00');
      expect(formatLocalTimeRange('19:00:00', null)).toBe('19:00');
      expect(formatLocalTimeRange(null, null)).toBe('');
    });

    it('describes each frequency', () => {
      const weekly = describeSeriesDay(series(), 'en');
      const fortnight = describeSeriesDay(series({ frequency: 'every_2_weeks' }), 'en');
      const monthly = describeSeriesDay(series({ frequency: 'monthly', week_of_month: 1 }), 'en');
      const last = describeSeriesDay(series({ frequency: 'monthly', week_of_month: -1 }), 'en');

      expect(weekly).toBe('Every Tuesday');
      expect(fortnight).toBe('Every other Tuesday');
      expect(monthly).toBe('Every 1st Tuesday of the month');
      expect(last).toBe('Every last Tuesday of the month');
    });

    it('describes a series in the three languages', () => {
      const monthly = series({ frequency: 'monthly', week_of_month: 1 });

      expect(describeSeries(monthly, 'en')).toMatch(
        /^Every 1st Tuesday of the month · 19:00–21:00 · until/
      );
      expect(describeSeries(monthly, 'fr')).toMatch(
        /^Le 1er mardi du mois · 19:00–21:00 · jusqu'au/
      );
      expect(describeSeries(monthly, 'nl')).toMatch(
        /^Elke eerste dinsdag van de maand · 19:00–21:00 · tot/
      );
    });

    it('says the badge with the count this viewer can see', () => {
      const three = series({
        occurrences: [
          occurrence('a', '2026-11-03T18:00:00.000Z'),
          occurrence('b', '2026-11-10T18:00:00.000Z'),
          occurrence('c', '2026-11-17T18:00:00.000Z'),
        ],
      });

      expect(seriesBadgeText(three, 'en')).toBe('Repeats weekly · 3 events');
      expect(seriesBadgeText(three, 'fr')).toBe('Chaque semaine · 3 événements');
      expect(seriesBadgeText({ ...three, frequency: 'monthly' }, 'nl')).toBe(
        'Elke maand · 3 evenementen'
      );
    });

    it('uses the singular for one date', () => {
      const one = series({ occurrences: [occurrence('a', '2026-11-03T18:00:00.000Z')] });

      expect(seriesBadgeText(one, 'en')).toBe('Repeats weekly · 1 event');
    });
  });

  describe('seriesErrorMessage', () => {
    it('gives the cap with its max and date', () => {
      const message = seriesErrorMessage(
        { code: 'RECURRENCE_TOO_MANY_OCCURRENCES', max: 14, windowEnd: '2027-02-03' },
        'en-GB'
      );

      expect(message).toBe('A series can have at most 14 dates, the last one on or before 3 Feb.');
    });

    it.each([
      ['RECURRENCE_DISABLED', 'Recurring events are not available right now.'],
      [
        'MISSING_START_TIME',
        'The repeat settings did not reach the server, so nothing was created. Try again.',
      ],
      ['SERIES_NOTHING_UPCOMING', 'There is no upcoming date left to change.'],
      ['NOT_ORGANIZATION_MEMBER', 'Only members of the organization can change this series.'],
    ])('localizes %s by code', (code, expected) => {
      expect(seriesErrorMessage({ code, message: 'English from the server' }, 'en')).toBe(expected);
    });

    it('calls a rate limit what it is', () => {
      expect(
        seriesErrorMessage({ isRateLimited: true, code: 'RATE_LIMIT_EXCEEDED' }, 'en')
      ).not.toBe('Something went wrong. Please try again.');
    });

    it('treats a schema refusal of the rule as a bad rule', () => {
      expect(
        seriesErrorMessage(
          { code: 'VALIDATION_ERROR', message: '/recurrence/count must be <= 31' },
          'en'
        )
      ).toBe('These repeat settings are not valid. Check the day, the times and the dates.');
    });

    it('keeps the message of a validation error about anything else', () => {
      expect(
        seriesErrorMessage({ code: 'VALIDATION_ERROR', message: '/title too long' }, 'en')
      ).toBe('/title too long');
    });

    it('falls back on the message, then on generic copy', () => {
      expect(seriesErrorMessage(new Error('Network Error'), 'en')).toBe('Network Error');
      expect(seriesErrorMessage(undefined, 'en')).toBe('Something went wrong. Please try again.');
    });
  });

  describe('the dates of a series', () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const past = occurrence('past', '2026-11-03T18:00:00.000Z', 'past');
    const draftA = occurrence('draft-a', '2026-11-10T18:00:00.000Z', 'draft');
    const active = occurrence('active', '2026-11-17T18:00:00.000Z', 'active');
    const draftB = occurrence('draft-b', '2026-11-24T18:00:00.000Z', 'draft');
    const cancelled = occurrence('cancelled', '2026-12-01T18:00:00.000Z', 'cancelled');

    it('lists the upcoming ones in date order, whatever order they came in', () => {
      const ids = upcomingOccurrences({ occurrences: [active, past, cancelled, draftA] }, now).map(
        (o) => o.$id
      );

      expect(ids).toEqual(['draft-a', 'active', 'cancelled']);
    });

    it('leaves cancelled dates out of what an edit can write to', () => {
      const ids = editableOccurrences({ occurrences: [past, active, cancelled] }, now).map(
        (o) => o.$id
      );

      expect(ids).toEqual(['active']);
    });

    it('picks the next published date to stand for the series', () => {
      expect(representativeOccurrence({ occurrences: [past, draftA, active] }, now)?.$id).toBe(
        'active'
      );
    });

    it('falls back on the latest published date, then on a draft', () => {
      expect(representativeOccurrence({ occurrences: [past, draftA] }, now)?.$id).toBe('past');
      expect(representativeOccurrence({ occurrences: [draftA, draftB] }, now)?.$id).toBe('draft-a');
      expect(representativeOccurrence({ occurrences: [] }, now)).toBeNull();
    });

    describe('isDraftsOnlyScope', () => {
      it('is true when everything from this date on is a draft', () => {
        const all = { occurrences: [past, draftA, draftB] };

        expect(isDraftsOnlyScope(all, 'draft-a', now)).toBe(true);
        expect(isDraftsOnlyScope(all, undefined, now)).toBe(true);
      });

      it('is false when a published date sits in the scope', () => {
        expect(isDraftsOnlyScope({ occurrences: [draftA, active] }, 'draft-a', now)).toBe(false);
      });

      it('looks only at the scope, not at dates before it', () => {
        expect(isDraftsOnlyScope({ occurrences: [draftA, active, draftB] }, 'draft-b', now)).toBe(
          true
        );
      });

      it('is false for a cancelled date in the scope, which a delete would also take', () => {
        expect(isDraftsOnlyScope({ occurrences: [draftA, cancelled] }, 'draft-a', now)).toBe(false);
      });

      it('is false for a date not upcoming or not found, and for no dates', () => {
        expect(isDraftsOnlyScope({ occurrences: [past, draftA] }, 'past', now)).toBe(false);
        expect(isDraftsOnlyScope({ occurrences: [draftA] }, 'gone', now)).toBe(false);
        expect(isDraftsOnlyScope({ occurrences: [] }, undefined, now)).toBe(false);
      });
    });
  });
});
