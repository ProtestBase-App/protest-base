import type { FormState, SavedPin } from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import { isBelgiumMidnight, parseAsUTC } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import {
  brusselsDateOf,
  brusselsInstant,
  brusselsTimeOf,
  formatLongDate,
} from '@/utils/recurrence';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type EventDates = Pick<FormState, 'start_time' | 'end_time'>;

const toMs = (value: string) => parseAsUTC(value).getTime();

/** A new start. The end moves with it, so the event keeps its length. */
export function moveStart(dates: EventDates, start: string): EventDates {
  if (!dates.start_time || !dates.end_time) return { ...dates, start_time: start };
  const length = toMs(dates.end_time) - toMs(dates.start_time);
  return { start_time: start, end_time: new Date(toMs(start) + length).toISOString() };
}

/** The same time on another Brussels day. */
export function moveToDay(dates: EventDates, day: string): EventDates {
  return moveStart(dates, brusselsInstant(day, brusselsTimeOf(dates.start_time)));
}

/** An end picked as a time of day. Before the start means the next day. */
export function endAtTime(dates: EventDates, time: string): EventDates {
  const sameDay = toMs(brusselsInstant(brusselsDateOf(dates.start_time), time));
  const end = sameDay < toMs(dates.start_time) ? sameDay + DAY_MS : sameDay;
  return { ...dates, end_time: new Date(end).toISOString() };
}

export function endAfterHours(dates: EventDates, hours: number): EventDates {
  return { ...dates, end_time: new Date(toMs(dates.start_time) + hours * HOUR_MS).toISOString() };
}

/** Hours from start to end, when that is a whole number; a duration chip can then show it. */
export function durationHours({ start_time, end_time }: EventDates): number | null {
  if (!start_time || !end_time) return null;
  const hours = (toMs(end_time) - toMs(start_time)) / HOUR_MS;
  return Number.isInteger(hours) ? hours : null;
}

export function endsOnAnotherDay({ start_time, end_time }: EventDates): boolean {
  return !!start_time && !!end_time && brusselsDateOf(start_time) !== brusselsDateOf(end_time);
}

export interface FormRowSummary {
  title: string;
  subtitle?: string;
}

/** The When row once a date is set. */
export function whenSummary(
  dates: EventDates,
  userLanguage: string,
  isAllDay: boolean,
  withYear = false
): FormRowSummary | null {
  if (!dates.start_time) return null;

  const longDate = (value: string) => {
    const day = brusselsDateOf(value);
    const date = formatLongDate(day, userLanguage);
    return withYear ? `${date} ${day.slice(0, 4)}` : date;
  };
  const title = longDate(dates.start_time);
  if (isAllDay && isBelgiumMidnight(dates.start_time)) {
    return { title, subtitle: t('events.allDay') };
  }

  const start = brusselsTimeOf(dates.start_time);
  if (!dates.end_time) return { title, subtitle: start };
  const end = endsOnAnotherDay(dates)
    ? `${longDate(dates.end_time)}, ${brusselsTimeOf(dates.end_time)}`
    : brusselsTimeOf(dates.end_time);
  return { title, subtitle: t('createEvent.whenRange', { start, end }) };
}

const FREQUENCY_KEYS: Record<RepeatFormState['frequency'], string> = {
  once: 'series.repeat.once',
  weekly: 'series.repeat.weekly',
  every_2_weeks: 'series.repeat.everyTwoWeeks',
  monthly: 'series.repeat.monthly',
};

/** Where the map pin goes: picked now, or saved while the street is unchanged. */
export function formPin(
  form: Pick<FormState, 'street_address' | 'geocod_lat' | 'geocod_lng'>,
  savedPin?: SavedPin | null
): Pick<SavedPin, 'latitude' | 'longitude'> | null {
  if (!form.street_address) return null;
  if (form.geocod_lat !== null && form.geocod_lng !== null) {
    return { latitude: form.geocod_lat, longitude: form.geocod_lng };
  }
  return savedPin?.street === form.street_address ? savedPin : null;
}

/** The When row of a series. */
export function repeatSummary(repeat: RepeatFormState): FormRowSummary {
  const day = t(`series.weekdays.${repeat.weekday}`);
  return {
    title: t(FREQUENCY_KEYS[repeat.frequency]),
    subtitle: repeat.startLocal ? `${day}, ${repeat.startLocal}` : day,
  };
}

/** The Where row once a place is set. */
export function whereSummary(
  form: Pick<FormState, 'street_address' | 'city' | 'postal_code'>
): FormRowSummary | null {
  const town = [form.postal_code, form.city].filter(Boolean).join(' ');
  if (form.street_address) return { title: form.street_address, subtitle: town || undefined };
  return town ? { title: town } : null;
}
