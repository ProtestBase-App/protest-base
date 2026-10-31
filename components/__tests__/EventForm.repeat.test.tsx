jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

// The dates themselves are RepeatFields' own tests; here the preview stays quiet.
jest.mock('@/hooks/useRecurrencePreview', () => ({
  useRecurrencePreview: jest.fn(() => ({ status: 'idle' })),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/utils/imageOptimization', () => ({
  optimizeImageForUpload: jest.fn(),
}));

jest.mock('@/services/address.service', () => ({
  searchAddress: jest.fn(),
  AddressSearchError: class AddressSearchError extends Error {},
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import EventForm from '@/components/EventForm';
import { renderWithProviders } from '@/test-utils/render';
import type { EventFormProps, FormState } from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';

const baseForm: FormState = {
  organization_id: 'org-a',
  title: 'Weekly vigil',
  description: 'Every week',
  images: [],
  street_address: '',
  city: '',
  region: '',
  country: '',
  start_time: '',
  end_time: '',
  organizer_name: '',
  website_url: '',
  categories: 'Protest',
  disclaimer: '',
  postal_code: null,
  co_organizers: [],
  help_needed: false,
  help_description: null,
  geocod_lat: null,
  geocod_lng: null,
};

const weeklyRepeat = (overrides: Partial<RepeatFormState> = {}): RepeatFormState => ({
  frequency: 'weekly',
  weekday: 'tuesday',
  weekOfMonth: 1,
  startLocal: '19:00',
  endLocal: '',
  startsOn: '2099-01-06',
  endMode: 'count',
  until: '',
  count: '3',
  ...overrides,
});

// Far enough ahead to stay clear of the clock: a Tuesday, 19:00 to 21:00 in Brussels.
const TUESDAY_EVENING = {
  start_time: '2099-01-06T18:00:00.000Z',
  end_time: '2099-01-06T20:00:00.000Z',
};

const onFormRender = jest.fn<void, [FormState]>();
const latestForm = (): FormState => onFormRender.mock.lastCall![0];

/** The repeat changes go through a functional setForm, so the form needs real state. */
function Harness({
  initial,
  ...props
}: { initial: FormState } & Partial<Omit<EventFormProps, 'form' | 'setForm'>>) {
  const [form, setForm] = React.useState<FormState>(initial);
  React.useEffect(() => {
    onFormRender(form);
  }, [form]);
  return (
    <EventForm
      form={form}
      setForm={setForm}
      emptyFields={{ title: false, start_time: false, description: false, help_description: false }}
      userLanguage="en"
      {...props}
    />
  );
}

const renderForm = (
  initial: Partial<FormState> = {},
  props: Partial<Omit<EventFormProps, 'form' | 'setForm'>> = {}
) => renderWithProviders(<Harness initial={{ ...baseForm, ...initial }} {...props} />);

const CHIPS = ['once', 'weekly', 'every_2_weeks', 'monthly'];
const ORDINALS = ['1', '2', '3', '4', '-1'];
const RULE_FIELDS = [
  'repeat-start-time',
  'repeat-end-time',
  'repeat-starts-on',
  'repeat-weekday-monday',
  'repeat-end-count',
  'repeat-end-until',
  'repeat-count',
];

describe('EventForm Repeat control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without showRepeat', () => {
    it.each([
      ['the default (create-event, also what the draft editor uses)', undefined],
      ['edit-event', 'edit-event' as const],
    ])('has no Repeat control, and keeps both date fields, in %s', (_label, mode) => {
      const { queryByTestId, getByTestId } = renderForm({}, { mode });

      for (const chip of CHIPS) expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
    });

    it.each(['create-template', 'edit-template'] as const)(
      'has no Repeat control and no date fields at all in %s',
      (mode) => {
        const { queryByTestId } = renderForm({}, { mode });

        for (const chip of CHIPS) expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
        expect(queryByTestId('input-event-start-time')).toBeNull();
        expect(queryByTestId('input-event-end-time')).toBeNull();
      }
    );

    // A resumed autosave can hold a rule from when the feature was on.
    it.each([
      ['create-event', undefined],
      ['edit-event', 'edit-event' as const],
    ])(
      'still shows the single-event fields for a form that holds a rule, in %s',
      (_label, mode) => {
        const { queryByTestId, getByTestId } = renderForm(
          { ...TUESDAY_EVENING, repeat: weeklyRepeat() },
          { mode }
        );

        expect(getByTestId('input-event-start-time')).toBeTruthy();
        expect(getByTestId('input-event-end-time')).toBeTruthy();
        for (const chip of CHIPS) expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
        for (const field of RULE_FIELDS) expect(queryByTestId(field)).toBeNull();
      }
    );
  });

  describe('with showRepeat', () => {
    it('offers Once, Weekly, Every 2 weeks and Monthly, on Once, with the two date fields kept', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      for (const chip of CHIPS) expect(getByTestId(`repeat-chip-${chip}`)).toBeTruthy();
      expect(getByTestId('repeat-chip-once').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('repeat-chip-weekly').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
      for (const field of RULE_FIELDS) expect(queryByTestId(field)).toBeNull();
    });

    it.each(['create-template', 'edit-template'] as const)(
      'still has no Repeat control in %s, which has no dates',
      (mode) => {
        const { queryByTestId } = renderForm({}, { mode, showRepeat: true });

        for (const chip of CHIPS) expect(queryByTestId(`repeat-chip-${chip}`)).toBeNull();
      }
    );

    it('keeps the date fields for a rule left on Once', () => {
      const { getByTestId, queryByTestId } = renderForm(
        { repeat: weeklyRepeat({ frequency: 'once' }) },
        { showRepeat: true }
      );

      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
      expect(queryByTestId('repeat-start-time')).toBeNull();
      expect(getByTestId('repeat-chip-once').props.accessibilityState.selected).toBe(true);
    });

    it('keeps the date fields when Once is chosen on a fresh form', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-once'));

      expect(latestForm().repeat?.frequency).toBe('once');
      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(queryByTestId('repeat-start-time')).toBeNull();
    });
  });

  describe('choosing a rule', () => {
    it('swaps the two date fields for the rule fields on Weekly', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-weekly'));

      expect(latestForm().repeat?.frequency).toBe('weekly');
      expect(queryByTestId('input-event-start-time')).toBeNull();
      expect(queryByTestId('input-event-end-time')).toBeNull();
      for (const field of RULE_FIELDS) expect(getByTestId(field)).toBeTruthy();
      expect(getByTestId('repeat-chip-weekly').props.accessibilityState.selected).toBe(true);
    });

    it('shows no ordinal for a weekly rule', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-weekly'));

      for (const ordinal of ORDINALS) expect(queryByTestId(`repeat-ordinal-${ordinal}`)).toBeNull();
    });

    it('shows no ordinal for a rule every 2 weeks, and swaps the date fields too', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-every_2_weeks'));

      expect(latestForm().repeat?.frequency).toBe('every_2_weeks');
      expect(queryByTestId('input-event-start-time')).toBeNull();
      expect(getByTestId('repeat-start-time')).toBeTruthy();
      for (const ordinal of ORDINALS) expect(queryByTestId(`repeat-ordinal-${ordinal}`)).toBeNull();
    });

    it('shows the ordinals, and the last one, for a monthly rule', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-monthly'));

      expect(latestForm().repeat?.frequency).toBe('monthly');
      expect(queryByTestId('input-event-start-time')).toBeNull();
      for (const ordinal of ORDINALS) expect(getByTestId(`repeat-ordinal-${ordinal}`)).toBeTruthy();
    });

    it('takes the ordinals away again when going from Monthly to Weekly', () => {
      const { getByTestId, queryByTestId } = renderForm({}, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-monthly'));
      fireEvent.press(getByTestId('repeat-chip-weekly'));

      for (const ordinal of ORDINALS) expect(queryByTestId(`repeat-ordinal-${ordinal}`)).toBeNull();
      expect(getByTestId('repeat-start-time')).toBeTruthy();
    });

    it('brings the date fields back on Once, with the date that was picked before', () => {
      const { getByTestId, queryByTestId } = renderForm(TUESDAY_EVENING, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-weekly'));
      expect(queryByTestId('input-event-start-time')).toBeNull();
      fireEvent.press(getByTestId('repeat-chip-once'));

      expect(getByTestId('input-event-start-time')).toBeTruthy();
      expect(getByTestId('input-event-end-time')).toBeTruthy();
      expect(queryByTestId('repeat-start-time')).toBeNull();
      expect(latestForm().start_time).toBe(TUESDAY_EVENING.start_time);
      expect(latestForm().end_time).toBe(TUESDAY_EVENING.end_time);
    });

    it('seeds the rule from the date picked before, as Brussels parts', () => {
      const { getByTestId, getByDisplayValue } = renderForm(TUESDAY_EVENING, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-monthly'));

      expect(getByDisplayValue('19:00')).toBeTruthy();
      expect(getByDisplayValue('21:00')).toBeTruthy();
      expect(latestForm().repeat).toEqual({
        frequency: 'monthly',
        weekday: 'tuesday',
        weekOfMonth: 1,
        startLocal: '19:00',
        endLocal: '21:00',
        startsOn: '2099-01-06',
        endMode: 'count',
        until: '',
        count: '',
      });
    });

    it('keeps the single date in the form while a rule is chosen', () => {
      const { getByTestId } = renderForm(TUESDAY_EVENING, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-weekly'));

      expect(latestForm().start_time).toBe(TUESDAY_EVENING.start_time);
      expect(latestForm().end_time).toBe(TUESDAY_EVENING.end_time);
    });

    it('writes later choices into the rule, not into the single date', () => {
      const { getByTestId } = renderForm(TUESDAY_EVENING, { showRepeat: true });

      fireEvent.press(getByTestId('repeat-chip-monthly'));
      fireEvent.press(getByTestId('repeat-ordinal--1'));
      fireEvent.press(getByTestId('repeat-weekday-friday'));
      fireEvent.press(getByTestId('repeat-end-until'));

      expect(latestForm().repeat).toMatchObject({
        frequency: 'monthly',
        weekOfMonth: -1,
        weekday: 'friday',
        endMode: 'until',
      });
      expect(latestForm().start_time).toBe(TUESDAY_EVENING.start_time);
    });

    it('shows a rule that is already in the form as the chosen one', () => {
      const { getByTestId, queryByTestId } = renderForm(
        { repeat: weeklyRepeat({ frequency: 'monthly', weekOfMonth: 3 }) },
        { showRepeat: true }
      );

      expect(getByTestId('repeat-chip-monthly').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('repeat-ordinal-3').props.accessibilityState.selected).toBe(true);
      expect(queryByTestId('input-event-start-time')).toBeNull();
    });
  });

  describe('the required-fields progress', () => {
    const percentage = (utils: ReturnType<typeof renderForm>) =>
      utils.getByRole('progressbar').props.accessibilityValue.now;

    it('counts the start time of a single event', () => {
      expect(percentage(renderForm({}, { showRepeat: true }))).toBe(75);
      expect(percentage(renderForm(TUESDAY_EVENING, { showRepeat: true }))).toBe(100);
    });

    it('counts the start time of the rule instead, for a repeating event', () => {
      const withoutTime = renderForm(
        { ...TUESDAY_EVENING, repeat: weeklyRepeat({ startLocal: '' }) },
        { showRepeat: true }
      );
      // The single date is still in the form but is no longer the one that is asked for.
      expect(percentage(withoutTime)).toBe(75);

      const withTime = renderForm(
        { repeat: weeklyRepeat({ startLocal: '19:00' }) },
        { showRepeat: true }
      );
      expect(percentage(withTime)).toBe(100);
    });

    it('goes on counting the single date when the control is not offered', () => {
      const utils = renderForm(
        { ...TUESDAY_EVENING, repeat: weeklyRepeat({ startLocal: '' }) },
        { showRepeat: false }
      );

      expect(percentage(utils)).toBe(100);
    });
  });
});
