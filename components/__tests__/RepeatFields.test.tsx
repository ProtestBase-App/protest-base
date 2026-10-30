jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key
  ),
}));

jest.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: jest.fn(),
}));

// The picker itself is FormDateField's own business (and its own tests). What matters
// here is what RepeatFields hands it and what it does with the instant that comes back.
const mockDateFieldProps: Record<string, any> = {};
jest.mock('@/components/FormDateField', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      mockDateFieldProps[props.testID] = props;
      return React.createElement(TextInput, {
        testID: props.testID,
        value: props.value && props.formatValue ? props.formatValue(props.value) : props.value,
        placeholder: props.placeholder,
        onChangeText: props.handleChangeText,
      });
    },
  };
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import RepeatFields, { RepeatFieldsProps } from '@/components/RepeatFields';
import type { RecurrencePreview, RepeatFormState } from '@/types/eventSeries.types';

const { useRecurrencePreview } = require('@/hooks/useRecurrencePreview');

// Monday 2 November 2026, 11:00 in Brussels.
const NOW = new Date('2026-11-02T10:00:00.000Z');

const repeatForm = (overrides: Partial<RepeatFormState> = {}): RepeatFormState => ({
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

const previewOf = (overrides: Partial<RecurrencePreview> = {}): RecurrencePreview => ({
  occurrences: [
    { start_time: '2026-11-03T18:00:00.000Z', end_time: '2026-11-03T20:00:00.000Z' },
    { start_time: '2026-11-10T18:00:00.000Z', end_time: '2026-11-10T20:00:00.000Z' },
    { start_time: '2026-11-17T18:00:00.000Z', end_time: '2026-11-17T20:00:00.000Z' },
  ],
  count: 3,
  max: 14,
  window_end: '2027-02-03',
  ...overrides,
});

const renderFields = (
  repeat: RepeatFormState | undefined,
  overrides: Partial<RepeatFieldsProps> = {}
) => {
  const onChange = jest.fn();
  const utils = render(
    <RepeatFields
      repeat={repeat}
      onChange={onChange}
      startTime=""
      endTime=""
      userLanguage="en"
      {...overrides}
    />
  );
  return { ...utils, onChange };
};

const selected = (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
  node.props.accessibilityState?.selected;

describe('RepeatFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockDateFieldProps).forEach((key) => delete mockDateFieldProps[key]);
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(NOW);
    useRecurrencePreview.mockReturnValue({ status: 'idle' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the frequency', () => {
    it('offers Once, Weekly, Every 2 weeks and Monthly, on Once until a rule is chosen', () => {
      const { getByTestId } = renderFields(undefined);

      expect(getByTestId('repeat-chip-once')).toBeTruthy();
      expect(getByTestId('repeat-chip-weekly')).toBeTruthy();
      expect(getByTestId('repeat-chip-every_2_weeks')).toBeTruthy();
      expect(getByTestId('repeat-chip-monthly')).toBeTruthy();
      expect(selected(getByTestId('repeat-chip-once'))).toBe(true);
      expect(selected(getByTestId('repeat-chip-weekly'))).toBe(false);
    });

    it('shows no rule field and asks for no preview while it is Once or untouched', () => {
      for (const repeat of [undefined, repeatForm({ frequency: 'once' })]) {
        const { queryByTestId, unmount } = renderFields(repeat);

        expect(queryByTestId('repeat-start-time')).toBeNull();
        expect(queryByTestId('repeat-weekday-monday')).toBeNull();
        expect(queryByTestId('repeat-preview')).toBeNull();
        expect(useRecurrencePreview).toHaveBeenLastCalledWith(null);
        unmount();
      }
    });

    it('seeds the rule from the single-event pickers when Repeat is turned on', () => {
      const { getByTestId, onChange } = renderFields(undefined, {
        // Tuesday 10 November 2026, 19:00 to 21:00 in Brussels.
        startTime: '2026-11-10T18:00:00.000Z',
        endTime: '2026-11-10T20:00:00.000Z',
      });

      fireEvent.press(getByTestId('repeat-chip-weekly'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({
        frequency: 'weekly',
        weekday: 'tuesday',
        weekOfMonth: 2,
        startLocal: '19:00',
        endLocal: '21:00',
        startsOn: '2026-11-10',
        endMode: 'count',
        until: '',
        count: '',
      });
    });

    it('starts today, with no times, when nothing was picked before', () => {
      const { getByTestId, onChange } = renderFields(undefined);

      fireEvent.press(getByTestId('repeat-chip-monthly'));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'monthly',
          startsOn: '2026-11-02',
          weekday: 'monday',
          startLocal: '',
          endLocal: '',
        })
      );
    });

    it('changes only the frequency of a rule that is already being built', () => {
      const repeat = repeatForm({ count: '6', endLocal: '' });
      const { getByTestId, onChange } = renderFields(repeat);

      fireEvent.press(getByTestId('repeat-chip-every_2_weeks'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, frequency: 'every_2_weeks' });

      fireEvent.press(getByTestId('repeat-chip-once'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, frequency: 'once' });
    });

    it('marks the chosen frequency', () => {
      const { getByTestId } = renderFields(repeatForm({ frequency: 'every_2_weeks' }));

      expect(selected(getByTestId('repeat-chip-every_2_weeks'))).toBe(true);
      expect(selected(getByTestId('repeat-chip-weekly'))).toBe(false);
      expect(selected(getByTestId('repeat-chip-once'))).toBe(false);
    });
  });

  describe('the rule fields', () => {
    it('shows the day, the times, the first day and the end of a weekly rule, and no ordinal', () => {
      const { getByTestId, queryByTestId } = renderFields(repeatForm());

      for (const day of [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]) {
        expect(getByTestId(`repeat-weekday-${day}`)).toBeTruthy();
      }
      expect(selected(getByTestId('repeat-weekday-tuesday'))).toBe(true);
      expect(selected(getByTestId('repeat-weekday-monday'))).toBe(false);
      expect(getByTestId('repeat-start-time')).toBeTruthy();
      expect(getByTestId('repeat-end-time')).toBeTruthy();
      expect(getByTestId('repeat-starts-on')).toBeTruthy();
      expect(getByTestId('repeat-end-count')).toBeTruthy();
      expect(getByTestId('repeat-end-until')).toBeTruthy();
      expect(queryByTestId('repeat-ordinal-1')).toBeNull();
    });

    it('shows the ordinals of a monthly rule, with the last one as -1', () => {
      const { getByTestId } = renderFields(repeatForm({ frequency: 'monthly', weekOfMonth: -1 }));

      for (const ordinal of ['1', '2', '3', '4', '-1']) {
        expect(getByTestId(`repeat-ordinal-${ordinal}`)).toBeTruthy();
      }
      expect(selected(getByTestId('repeat-ordinal--1'))).toBe(true);
      expect(selected(getByTestId('repeat-ordinal-1'))).toBe(false);
    });

    it('writes each choice back into the rule', () => {
      const repeat = repeatForm({ frequency: 'monthly' });
      const { getByTestId, onChange } = renderFields(repeat);

      fireEvent.press(getByTestId('repeat-weekday-friday'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, weekday: 'friday' });

      fireEvent.press(getByTestId('repeat-ordinal-3'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, weekOfMonth: 3 });

      fireEvent.press(getByTestId('repeat-ordinal--1'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, weekOfMonth: -1 });

      fireEvent.press(getByTestId('repeat-end-until'));
      expect(onChange).toHaveBeenLastCalledWith({ ...repeat, endMode: 'until' });
    });

    it('asks for a number of times, digits only, when the series ends after a count', () => {
      const repeat = repeatForm({ count: '' });
      const { getByTestId, queryByTestId, onChange } = renderFields(repeat);

      expect(queryByTestId('repeat-until')).toBeNull();
      fireEvent.changeText(getByTestId('repeat-count'), '1x2');

      expect(onChange).toHaveBeenCalledWith({ ...repeat, count: '12' });
    });

    it('asks for a last date, not a count, when the series ends on a date', () => {
      const { getByTestId, queryByTestId } = renderFields(
        repeatForm({ endMode: 'until', until: '2026-11-17' })
      );

      expect(getByTestId('repeat-until')).toBeTruthy();
      expect(queryByTestId('repeat-count')).toBeNull();
      expect(selected(getByTestId('repeat-end-until'))).toBe(true);
      expect(selected(getByTestId('repeat-end-count'))).toBe(false);
    });
  });

  describe('the pickers', () => {
    it('shows the times and dates as Brussels wall-clock parts', () => {
      const { getByTestId } = renderFields(
        repeatForm({ endMode: 'until', until: '2026-11-17', count: '' })
      );

      expect(getByTestId('repeat-start-time').props.value).toBe('19:00');
      expect(getByTestId('repeat-end-time').props.value).toBe('21:00');
      expect(getByTestId('repeat-starts-on').props.value).toBe('3 Nov');
      expect(getByTestId('repeat-until').props.value).toBe('17 Nov');
    });

    it('writes the dates in the language of the user', () => {
      const { getByTestId } = renderFields(repeatForm(), { userLanguage: 'fr' });

      expect(getByTestId('repeat-starts-on').props.value).toBe('3 nov.');
    });

    it('leaves an empty time empty, with its placeholder', () => {
      const { getByTestId } = renderFields(repeatForm({ startLocal: '', endLocal: '' }));

      expect(getByTestId('repeat-start-time').props.value).toBe('');
      expect(getByTestId('repeat-start-time').props.placeholder).toBe('series.repeat.pickTime');
      expect(getByTestId('repeat-end-time').props.value).toBe('');
    });

    it('runs the time pickers in the Brussels zone, and the day pickers too', () => {
      renderFields(repeatForm({ endMode: 'until', until: '2026-11-17', count: '' }));

      expect(mockDateFieldProps['repeat-start-time']).toMatchObject({
        pickerMode: 'time',
        timeZoneName: 'Europe/Brussels',
      });
      expect(mockDateFieldProps['repeat-end-time']).toMatchObject({
        pickerMode: 'time',
        timeZoneName: 'Europe/Brussels',
      });
      expect(mockDateFieldProps['repeat-starts-on']).toMatchObject({
        pickerMode: 'date',
        timeZoneName: 'Europe/Brussels',
      });
      expect(mockDateFieldProps['repeat-until']).toMatchObject({
        pickerMode: 'date',
        timeZoneName: 'Europe/Brussels',
      });
    });

    it('stops the first day from being in the past, and the last day from being before the first', () => {
      renderFields(repeatForm({ endMode: 'until', until: '2026-11-17', count: '' }));

      expect(mockDateFieldProps['repeat-starts-on'].minDate.getTime()).toBe(NOW.getTime());
      // Noon in Brussels: the same calendar day wherever the device is.
      expect(mockDateFieldProps['repeat-until'].minDate.toISOString()).toBe(
        '2026-11-03T11:00:00.000Z'
      );
    });

    it('turns a picked start time back into HH:MM in Brussels, never in the device zone', () => {
      const repeat = repeatForm({ startLocal: '' });
      const { getByTestId, onChange } = renderFields(repeat);

      // 17:00 UTC is 18:00 in Brussels in November.
      fireEvent.changeText(getByTestId('repeat-start-time'), '2026-11-02T17:00:00.000Z');

      expect(onChange).toHaveBeenCalledWith({ ...repeat, startLocal: '18:00' });
    });

    it('does the same in summer time, and for the end time', () => {
      const repeat = repeatForm();
      const { getByTestId, onChange } = renderFields(repeat);

      // 17:00 UTC is 19:00 in Brussels in July.
      fireEvent.changeText(getByTestId('repeat-end-time'), '2026-07-14T17:00:00.000Z');

      expect(onChange).toHaveBeenCalledWith({ ...repeat, endLocal: '19:00' });
    });

    it('turns a picked day into its Brussels date, even when UTC is still the day before', () => {
      const repeat = repeatForm();
      const { getByTestId, onChange } = renderFields(repeat);

      // 23:30 UTC on the 9th is already the 10th in Brussels.
      fireEvent.changeText(getByTestId('repeat-starts-on'), '2026-11-09T23:30:00.000Z');

      expect(onChange).toHaveBeenCalledWith({ ...repeat, startsOn: '2026-11-10' });
    });

    it('turns a picked last day into its Brussels date', () => {
      const repeat = repeatForm({ endMode: 'until', until: '', count: '' });
      const { getByTestId, onChange } = renderFields(repeat);

      fireEvent.changeText(getByTestId('repeat-until'), '2026-12-01T11:00:00.000Z');

      expect(onChange).toHaveBeenCalledWith({ ...repeat, until: '2026-12-01' });
    });

    it('flags the start time only when a submit asked for it and it is empty', () => {
      renderFields(repeatForm({ startLocal: '' }), { hasError: true });
      expect(mockDateFieldProps['repeat-start-time'].hasError).toBe(true);

      renderFields(repeatForm({ startLocal: '' }), { hasError: false });
      expect(mockDateFieldProps['repeat-start-time'].hasError).toBe(false);

      renderFields(repeatForm({ startLocal: '19:00' }), { hasError: true });
      expect(mockDateFieldProps['repeat-start-time'].hasError).toBe(false);
    });
  });

  describe('the rule it asks the backend about', () => {
    it('is the wire rule: Brussels parts, no weekday number, no null', () => {
      renderFields(repeatForm());

      expect(useRecurrencePreview).toHaveBeenLastCalledWith({
        frequency: 'weekly',
        weekday: 'tuesday',
        start_local: '19:00',
        end_local: '21:00',
        starts_on: '2026-11-03',
        count: 3,
      });
    });

    it('carries the ordinal of a monthly rule, and the last date of one that ends on a date', () => {
      renderFields(
        repeatForm({
          frequency: 'monthly',
          weekOfMonth: -1,
          endLocal: '',
          endMode: 'until',
          until: '2027-01-26',
          count: '',
        })
      );

      expect(useRecurrencePreview).toHaveBeenLastCalledWith({
        frequency: 'monthly',
        weekday: 'tuesday',
        week_of_month: -1,
        start_local: '19:00',
        starts_on: '2026-11-03',
        until: '2027-01-26',
      });
    });

    it('has no end yet while the count is empty: that is the "up to N" preview', () => {
      renderFields(repeatForm({ count: '' }));

      const rule = useRecurrencePreview.mock.calls.at(-1)[0];
      expect(rule).not.toBeNull();
      expect(rule).not.toHaveProperty('count');
      expect(rule).not.toHaveProperty('until');
    });

    it('is none while the start time is missing', () => {
      renderFields(repeatForm({ startLocal: '' }));

      expect(useRecurrencePreview).toHaveBeenLastCalledWith(null);
    });
  });

  describe('the preview', () => {
    it('says it is working out the dates', () => {
      useRecurrencePreview.mockReturnValue({ status: 'loading' });

      const { getByText, getByTestId, queryByTestId } = renderFields(repeatForm());

      expect(getByTestId('repeat-preview')).toBeTruthy();
      expect(getByText('series.preview.heading')).toBeTruthy();
      expect(getByText('series.preview.loading')).toBeTruthy();
      expect(queryByTestId('repeat-preview-summary')).toBeNull();
    });

    it('says nothing but its heading while it is idle', () => {
      const { getByText, queryByTestId, queryByText } = renderFields(repeatForm());

      expect(getByText('series.preview.heading')).toBeTruthy();
      expect(queryByTestId('repeat-preview-summary')).toBeNull();
      expect(queryByTestId('repeat-preview-error')).toBeNull();
      expect(queryByText('series.preview.loading')).toBeNull();
      expect(queryByText('series.preview.unavailable')).toBeNull();
    });

    describe('ready', () => {
      it('says what the create makes, from the backend count, and lists the dates', () => {
        useRecurrencePreview.mockReturnValue({ status: 'ready', preview: previewOf() });

        const { getByTestId, queryByText } = renderFields(repeatForm());

        expect(getByTestId('repeat-preview-summary')).toHaveTextContent(
          'series.preview.creates:{"count":3}'
        );
        expect(getByTestId('repeat-preview-dates')).toHaveTextContent(
          'Tue 3 Nov · Tue 10 Nov · Tue 17 Nov'
        );
        expect(queryByText(/series\.preview\.upTo/)).toBeNull();
      });

      it('trusts the count the backend sends over the one typed in', () => {
        // The server drops a date, say one on a day it will not schedule.
        useRecurrencePreview.mockReturnValue({
          status: 'ready',
          preview: previewOf({ occurrences: previewOf().occurrences.slice(0, 2), count: 2 }),
        });

        const { getByTestId } = renderFields(repeatForm({ count: '3' }));

        expect(getByTestId('repeat-preview-summary')).toHaveTextContent(
          'series.preview.creates:{"count":2}'
        );
        expect(getByTestId('repeat-preview-dates')).toHaveTextContent('Tue 3 Nov · Tue 10 Nov');
      });

      it('says what the create makes for a series that ends on a date too', () => {
        useRecurrencePreview.mockReturnValue({ status: 'ready', preview: previewOf() });

        const { getByTestId } = renderFields(
          repeatForm({ endMode: 'until', until: '2026-11-17', count: '' })
        );

        expect(getByTestId('repeat-preview-summary')).toHaveTextContent(
          'series.preview.creates:{"count":3}'
        );
      });

      it('says "up to" with the last possible date when the series has no end yet', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'ready',
          preview: previewOf({ count: 14, max: 14, window_end: '2027-02-03' }),
        });

        const { getByTestId, queryByText } = renderFields(repeatForm({ count: '' }));

        expect(getByTestId('repeat-preview-summary')).toHaveTextContent(
          'series.preview.upTo:{"count":14,"date":"3 Feb"}'
        );
        expect(queryByText(/series\.preview\.creates/)).toBeNull();
        expect(getByTestId('repeat-preview-dates')).toBeTruthy();
      });

      it('also says "up to" when the end date is not picked yet', () => {
        useRecurrencePreview.mockReturnValue({ status: 'ready', preview: previewOf() });

        const { getByTestId } = renderFields(
          repeatForm({ endMode: 'until', until: '', count: '' })
        );

        expect(getByTestId('repeat-preview-summary')).toHaveTextContent(
          'series.preview.upTo:{"count":14,"date":"3 Feb"}'
        );
      });

      it('writes the dates in the language of the user', () => {
        useRecurrencePreview.mockReturnValue({ status: 'ready', preview: previewOf() });

        const { getByTestId } = renderFields(repeatForm(), { userLanguage: 'nl' });

        expect(getByTestId('repeat-preview-dates')).toHaveTextContent(
          'di 3 nov · di 10 nov · di 17 nov'
        );
      });

      it('writes a date past midnight UTC as the Brussels day it falls on', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'ready',
          preview: previewOf({
            occurrences: [{ start_time: '2026-11-03T23:30:00.000Z', end_time: null }],
            count: 1,
          }),
        });

        const { getByTestId } = renderFields(repeatForm());

        expect(getByTestId('repeat-preview-dates')).toHaveTextContent('Wed 4 Nov');
      });
    });

    describe('refused', () => {
      it('gives the cap message with the maximum and the last possible date', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'refused',
          error: {
            code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
            message: 'too many',
            max: 14,
            windowEnd: '2027-01-27',
          },
        });

        const { getByTestId, queryByTestId } = renderFields(repeatForm());

        expect(getByTestId('repeat-preview-error')).toHaveTextContent(
          'series.errors.tooMany:{"max":14,"date":"27 Jan"}'
        );
        expect(queryByTestId('repeat-preview-summary')).toBeNull();
        expect(queryByTestId('repeat-preview-dates')).toBeNull();
      });

      it('writes the last possible date in the language of the user', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'refused',
          error: { code: 'RECURRENCE_TOO_MANY_OCCURRENCES', max: 14, windowEnd: '2027-01-27' },
        });

        const { getByTestId } = renderFields(repeatForm(), { userLanguage: 'fr' });

        expect(getByTestId('repeat-preview-error')).toHaveTextContent(
          'series.errors.tooMany:{"max":14,"date":"27 janv."}'
        );
      });

      it('gives the copy of the code for any other refusal, not the backend English', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'refused',
          error: { code: 'RECURRENCE_TOO_FEW_OCCURRENCES', message: 'At least 2 occurrences' },
        });

        const { getByTestId } = renderFields(repeatForm());

        expect(getByTestId('repeat-preview-error')).toHaveTextContent('series.errors.tooFew');
      });

      it('says the feature is off when the backend says so', () => {
        useRecurrencePreview.mockReturnValue({
          status: 'refused',
          error: { code: 'RECURRENCE_DISABLED', message: 'disabled' },
        });

        const { getByTestId } = renderFields(repeatForm());

        expect(getByTestId('repeat-preview-error')).toHaveTextContent('series.errors.disabled');
      });
    });

    describe('unavailable', () => {
      it('says the dates cannot be shown, and shows no verdict on the rule', () => {
        useRecurrencePreview.mockReturnValue({ status: 'unavailable' });

        const { getByText, queryByTestId } = renderFields(repeatForm());

        expect(getByText('series.preview.unavailable')).toBeTruthy();
        expect(queryByTestId('repeat-preview-error')).toBeNull();
        expect(queryByTestId('repeat-preview-summary')).toBeNull();
      });
    });

    describe('a field the form can flag by itself', () => {
      const STATES = [
        { status: 'loading' },
        { status: 'unavailable' },
        { status: 'ready', preview: previewOf() },
        { status: 'refused', error: { code: 'RECURRENCE_INVALID', message: 'invalid' } },
      ];

      it('names a count of 1 and asks the backend for nothing', () => {
        const { getByTestId } = renderFields(repeatForm({ count: '1' }));

        expect(getByTestId('repeat-error-count')).toHaveTextContent('series.repeat.errors.count');
        expect(useRecurrencePreview).toHaveBeenLastCalledWith(null);
      });

      it.each(STATES)('hides the %j preview state behind it', (state) => {
        useRecurrencePreview.mockReturnValue(state);

        const { getByTestId, queryByTestId, queryByText } = renderFields(
          repeatForm({ count: '1' })
        );

        expect(getByTestId('repeat-error-count')).toBeTruthy();
        expect(queryByTestId('repeat-preview-summary')).toBeNull();
        expect(queryByTestId('repeat-preview-dates')).toBeNull();
        expect(queryByTestId('repeat-preview-error')).toBeNull();
        expect(queryByText('series.preview.loading')).toBeNull();
        expect(queryByText('series.preview.unavailable')).toBeNull();
      });

      it('lists every field that is wrong', () => {
        const { getByTestId, queryByTestId } = renderFields(
          repeatForm({
            startsOn: '2026-11-01',
            endLocal: '19:00',
            endMode: 'until',
            until: '2026-10-30',
            count: '',
          })
        );

        expect(getByTestId('repeat-error-starts_on')).toHaveTextContent(
          'series.repeat.errors.startsOn'
        );
        expect(getByTestId('repeat-error-end_local')).toHaveTextContent(
          'series.repeat.errors.endLocal'
        );
        expect(getByTestId('repeat-error-until')).toHaveTextContent('series.repeat.errors.until');
        expect(queryByTestId('repeat-error-count')).toBeNull();
      });

      it('leaves the missing start time to the field and the submit, not to the preview box', () => {
        const { queryByTestId } = renderFields(repeatForm({ startLocal: '' }));

        expect(queryByTestId('repeat-error-start_local')).toBeNull();
        expect(queryByTestId('repeat-preview-summary')).toBeNull();
      });

      it('does not nag about an empty end while the user is still picking one', () => {
        const { queryByTestId } = renderFields(repeatForm({ count: '' }));
        expect(queryByTestId('repeat-error-count')).toBeNull();

        const until = renderFields(repeatForm({ endMode: 'until', until: '', count: '' }));
        expect(until.queryByTestId('repeat-error-until')).toBeNull();
      });

      it('shows the preview again once the field is fixed', () => {
        useRecurrencePreview.mockReturnValue({ status: 'ready', preview: previewOf() });

        const { queryByTestId, rerender, onChange } = renderFields(repeatForm({ count: '1' }));
        expect(queryByTestId('repeat-preview-summary')).toBeNull();

        rerender(
          <RepeatFields
            repeat={repeatForm({ count: '3' })}
            onChange={onChange}
            startTime=""
            endTime=""
            userLanguage="en"
          />
        );

        expect(queryByTestId('repeat-error-count')).toBeNull();
        expect(queryByTestId('repeat-preview-summary')).toBeTruthy();
      });
    });
  });
});
