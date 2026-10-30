/**
 * Recurring events: the Repeat control's values and the words for a series.
 *
 * Everything here is in Brussels terms and independent of the device's timezone: a
 * rule travels as `HH:MM` and `YYYY-MM-DD`, never as a picker instant, so nothing
 * below reads a local getter or `toISOString()` for a date.
 *
 * What this never does is compute a series date. The backend expands every rule (DST,
 * "the last Tuesday", the 3-month cap) and the preview is the only place the app gets
 * series dates from. The checks here are the ones a form can make on its own.
 */

import { t } from '@/utils/i18n';
import type { EventStatus } from '@/types/event.types';
import type {
  EventSeries,
  EventSeriesOccurrence,
  RecurrenceInput,
  RepeatFormState,
  Weekday,
  WeekOfMonth,
} from '@/types/eventSeries.types';
import { getEventDateKeyInBelgium, getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import {
  EVENT_TIMEZONE,
  formatEventTime24h,
  getDateFormatter,
  getDatePartsInBelgium,
  parseAsUTC,
} from '@/utils/eventFormatters';

/** Monday first, the order of the app's calendar. */
export const WEEKDAYS: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const WEEKS_OF_MONTH: readonly WeekOfMonth[] = [1, 2, 3, 4, -1];

/** `count` bounds, the first date included (backend `recurrence.ts`). */
export const RECURRENCE_MIN_COUNT = 2;
export const RECURRENCE_MAX_COUNT = 31;

const WEEK_OF_MONTH_KEYS: Record<string, string> = {
  '1': 'first',
  '2': 'second',
  '3': 'third',
  '4': 'fourth',
  '-1': 'last',
};

const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A calendar date as a UTC midnight, so its weekday and day never shift with a timezone. */
function utcDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** The weekday of a calendar date. */
export function weekdayOfDate(dateKey: string): Weekday {
  // getUTCDay: 0 = Sunday. WEEKDAYS starts on Monday.
  return WEEKDAYS[(utcDate(dateKey).getUTCDay() + 6) % 7];
}

/** Which `<weekday>` of its month a date is: 1 to 4, or -1 for a fifth, always the last. */
export function weekOfMonthOfDate(dateKey: string): WeekOfMonth {
  const ordinal = Math.ceil(utcDate(dateKey).getUTCDate() / 7);
  return ordinal >= 5 ? -1 : (ordinal as WeekOfMonth);
}

/** The Brussels calendar date of an instant, `YYYY-MM-DD`. */
export function brusselsDateOf(isoString: string): string {
  return getEventDateKeyInBelgium(isoString);
}

/** The Brussels wall clock of an instant, `HH:MM`. */
export function brusselsTimeOf(isoString: string): string {
  // Some engines write midnight as 24:00 with hour12: false.
  return formatEventTime24h(isoString).replace(/^24/, '00');
}

/**
 * The instant Brussels calls this date and time, to seed a picker running in the
 * Brussels zone. Never sent: the rule goes out as the date and the time themselves.
 */
export function brusselsInstant(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  const shown = getDatePartsInBelgium(new Date(asIfUtc));
  const shownAsUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour % 24,
    shown.minute
  );
  return new Date(asIfUtc - (shownAsUtc - asIfUtc)).toISOString();
}

/** True when the Repeat control is on anything but Once. */
export function isRepeating(repeat: RepeatFormState | undefined): repeat is RepeatFormState {
  return !!repeat && repeat.frequency !== 'once';
}

/**
 * The Repeat control's starting values. A date picked before turning Repeat on seeds
 * the day and the times; that is a convenience only, the user can change them all.
 */
export function createRepeatForm(
  seed: { startTime?: string; endTime?: string } = {},
  today: string = getTodayDateKeyInBelgium()
): RepeatFormState {
  const seededDate = seed.startTime ? brusselsDateOf(seed.startTime) : null;
  const startsOn = seededDate && seededDate >= today ? seededDate : today;
  const startLocal = seed.startTime ? brusselsTimeOf(seed.startTime) : '';
  const endLocal = seed.endTime ? brusselsTimeOf(seed.endTime) : '';
  return {
    frequency: 'weekly',
    weekday: weekdayOfDate(startsOn),
    weekOfMonth: weekOfMonthOfDate(startsOn),
    startLocal,
    endLocal: endLocal === startLocal ? '' : endLocal,
    startsOn,
    endMode: 'count',
    until: '',
    count: '',
  };
}

/** A Repeat field the form can flag by itself. */
export type RepeatField = 'start_local' | 'end_local' | 'starts_on' | 'until' | 'count';

export type RecurrenceRuleResult =
  { rule: RecurrenceInput; errors: [] } | { rule: null; errors: RepeatField[] };

/**
 * The wire rule from the Repeat control's values, or the fields to flag.
 *
 * `requireEnd: false` builds the rule for the "up to N events" preview while no end is
 * picked yet: an empty end is left out instead of flagged, a filled one is still
 * checked. Optional keys are left out rather than nulled: the backend's schema has no
 * null for them. Whether the dates fit the 3-month window is the backend's to say.
 */
export function buildRecurrenceRule(
  repeat: RepeatFormState,
  options: { requireEnd?: boolean; today?: string } = {}
): RecurrenceRuleResult {
  const requireEnd = options.requireEnd ?? true;
  const today = options.today ?? getTodayDateKeyInBelgium();
  const errors: RepeatField[] = [];

  if (!LOCAL_TIME.test(repeat.startLocal)) errors.push('start_local');
  // Earlier than the start means "ends the next day"; the same time is no duration at all.
  if (repeat.endLocal !== '' && repeat.endLocal === repeat.startLocal) errors.push('end_local');
  if (repeat.startsOn < today) errors.push('starts_on');

  let until: string | undefined;
  let count: number | undefined;
  if (repeat.endMode === 'until') {
    if (repeat.until === '') {
      if (requireEnd) errors.push('until');
    } else if (repeat.until < repeat.startsOn) {
      errors.push('until');
    } else {
      until = repeat.until;
    }
  } else if (repeat.count === '') {
    if (requireEnd) errors.push('count');
  } else {
    const parsed = Number(repeat.count);
    if (
      !Number.isInteger(parsed) ||
      parsed < RECURRENCE_MIN_COUNT ||
      parsed > RECURRENCE_MAX_COUNT
    ) {
      errors.push('count');
    } else {
      count = parsed;
    }
  }

  if (errors.length > 0 || repeat.frequency === 'once') {
    return { rule: null, errors };
  }

  const rule: RecurrenceInput = {
    frequency: repeat.frequency,
    weekday: repeat.weekday,
    start_local: repeat.startLocal,
    starts_on: repeat.startsOn,
  };
  if (repeat.frequency === 'monthly') rule.week_of_month = repeat.weekOfMonth;
  if (repeat.endLocal !== '') rule.end_local = repeat.endLocal;
  if (until !== undefined) rule.until = until;
  if (count !== undefined) rule.count = count;
  return { rule, errors: [] };
}

const REPEAT_ERROR_KEYS: Record<RepeatField, string> = {
  start_local: 'series.repeat.errors.startLocal',
  end_local: 'series.repeat.errors.endLocal',
  starts_on: 'series.repeat.errors.startsOn',
  until: 'series.repeat.errors.until',
  count: 'series.repeat.errors.count',
};

/** The message for a Repeat field the form flagged. */
export function repeatFieldMessage(field: RepeatField): string {
  return t(REPEAT_ERROR_KEYS[field]);
}

/**
 * The `start_local` / `end_local` of a "this and following" edit from the form's two
 * instants, or null when the form asks for something a series cannot do: the schedule
 * is immutable, so a moved date, or an end more than a day out (the wire format only
 * has "the same day" or "the next day"), can only apply to the one event.
 */
export function seriesTimesFromForm(
  form: { start_time: string; end_time: string },
  loadedStartTime: string
): { start_local: string; end_local: string | null } | null {
  if (!form.start_time || !loadedStartTime) return null;
  if (brusselsDateOf(form.start_time) !== brusselsDateOf(loadedStartTime)) return null;

  const start_local = brusselsTimeOf(form.start_time);
  if (!form.end_time) return { start_local, end_local: null };

  const durationMs = parseAsUTC(form.end_time).getTime() - parseAsUTC(form.start_time).getTime();
  const end_local = brusselsTimeOf(form.end_time);
  if (durationMs >= 24 * 60 * 60 * 1000 || end_local === start_local) return null;
  return { start_local, end_local };
}

/** Day before month in English too, as the app's audience writes dates. */
const dateLocale = (locale: string): string => (locale === 'en' ? 'en-GB' : locale);

/** "Tue 3 Nov" in Brussels time: one date of a preview or a series list. */
export function formatOccurrenceDate(isoString: string, locale: string): string {
  return getDateFormatter(dateLocale(locale), {
    timeZone: EVENT_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseAsUTC(isoString));
}

/** "17 Nov" for a calendar date, never shifted by a timezone. */
export function formatCalendarDate(dateKey: string, locale: string): string {
  return getDateFormatter(dateLocale(locale), {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(utcDate(dateKey));
}

/** "19:00–21:00", "19:00", or '' for an all-day series. Accepts `HH:MM:SS`. */
export function formatLocalTimeRange(
  startLocal: string | null | undefined,
  endLocal: string | null | undefined
): string {
  const start = startLocal ? startLocal.slice(0, 5) : '';
  if (!start) return '';
  const end = endLocal ? endLocal.slice(0, 5) : '';
  return end ? `${start}–${end}` : start;
}

type SeriesDayRule = Pick<EventSeries, 'frequency' | 'weekday' | 'week_of_month'>;

/** "Every Tuesday", "Every 1st Tuesday of the month". */
export function describeSeriesDay(rule: SeriesDayRule, locale?: string): string {
  const options = locale ? { locale } : {};
  const weekday = t(`series.weekdays.${rule.weekday}`, options);
  if (rule.frequency === 'monthly') {
    const ordinal = t(
      `series.ordinals.${WEEK_OF_MONTH_KEYS[String(rule.week_of_month)] ?? 'first'}`,
      options
    );
    return t('series.rule.monthly', { ...options, ordinal, weekday });
  }
  const key =
    rule.frequency === 'every_2_weeks' ? 'series.rule.everyTwoWeeks' : 'series.rule.weekly';
  return t(key, { ...options, weekday });
}

/** "Every 1st Tuesday of the month · 19:00 · until 17 Nov": the series screen's summary. */
export function describeSeries(series: EventSeries, locale: string): string {
  return [
    describeSeriesDay(series, locale),
    formatLocalTimeRange(series.start_local, series.end_local),
    t('series.rule.until', { locale, date: formatCalendarDate(series.until_date, locale) }),
  ]
    .filter(Boolean)
    .join(' · ');
}

const BADGE_KEYS: Record<EventSeries['frequency'], string> = {
  weekly: 'series.badge.weekly',
  every_2_weeks: 'series.badge.everyTwoWeeks',
  monthly: 'series.badge.monthly',
};

/** "Repeats weekly · 14 events", counting the dates this viewer may see. */
export function seriesBadgeText(
  series: Pick<EventSeries, 'frequency' | 'occurrences'>,
  locale: string
): string {
  const count = t('series.badge.count', { locale, count: series.occurrences.length });
  return `${t(BADGE_KEYS[series.frequency], { locale })} · ${count}`;
}

const SERIES_ERROR_KEYS: Record<string, string> = {
  RECURRENCE_DISABLED: 'series.errors.disabled',
  RECURRENCE_INVALID: 'series.errors.invalid',
  RECURRENCE_UNTIL_BEFORE_START: 'series.errors.untilBeforeStart',
  RECURRENCE_TOO_FEW_OCCURRENCES: 'series.errors.tooFew',
  MISSING_START_TIME: 'series.errors.lostRule',
  SERIES_NOT_CONFIRMED: 'series.errors.notConfirmed',
  SERIES_NOT_FOUND: 'series.errors.notFound',
  SERIES_NOTHING_UPCOMING: 'series.errors.nothingUpcoming',
  SERIES_SCHEDULE_IMMUTABLE: 'series.errors.scheduleImmutable',
  SERIES_ENDED: 'series.errors.ended',
  INVALID_FROM_EVENT: 'series.errors.invalidFromEvent',
  CANCELLATION_REASON_TOO_LONG: 'series.errors.reasonTooLong',
  CONFLICT: 'series.errors.conflict',
  NOT_ORGANIZATION_MEMBER: 'series.errors.notMember',
};

/**
 * Localized copy for anything a series call threw. The backend's messages are
 * English-only, so this keys on `code`, and only falls back to the message for what
 * the code cannot tell: a VALIDATION_ERROR names its own field, like a single edit's.
 */
export function seriesErrorMessage(error: unknown, locale: string): string {
  const failure = (error ?? {}) as {
    code?: string;
    isRateLimited?: boolean;
    max?: number;
    windowEnd?: string;
    message?: string;
  };
  if (failure.isRateLimited) return t('errors.rateLimit.message');
  if (failure.code === 'RECURRENCE_TOO_MANY_OCCURRENCES' && failure.max !== undefined) {
    return t('series.errors.tooMany', {
      max: failure.max,
      date: failure.windowEnd ? formatCalendarDate(failure.windowEnd, locale) : '',
    });
  }
  if (failure.code === 'VALIDATION_ERROR' && /recurrence/i.test(failure.message ?? '')) {
    return t('series.errors.invalid');
  }
  const key = failure.code ? SERIES_ERROR_KEYS[failure.code] : undefined;
  if (key) return t(key);
  return failure.message || t('series.errors.generic');
}

const isUpcoming = (occurrence: EventSeriesOccurrence, now: Date): boolean =>
  parseAsUTC(occurrence.start_time).getTime() > now.getTime();

/** The dates a series action can still touch, in date order. */
export function upcomingOccurrences(
  series: Pick<EventSeries, 'occurrences'>,
  now: Date = new Date()
): EventSeriesOccurrence[] {
  return series.occurrences
    .filter((occurrence) => isUpcoming(occurrence, now))
    .sort((a, b) => parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime());
}

const EDITABLE_STATUSES: readonly EventStatus[] = ['active', 'draft'];

/** The dates a series edit writes to: upcoming, and not cancelled. */
export function editableOccurrences(
  series: Pick<EventSeries, 'occurrences'>,
  now: Date = new Date()
): EventSeriesOccurrence[] {
  return upcomingOccurrences(series, now).filter((occurrence) =>
    EDITABLE_STATUSES.includes(occurrence.status)
  );
}

/**
 * The date whose details stand for the series, whose GET has no title or organization:
 * the next published one, else the latest published one, else a draft.
 */
export function representativeOccurrence(
  series: Pick<EventSeries, 'occurrences'>,
  now: Date = new Date()
): EventSeriesOccurrence | null {
  const byStart = [...series.occurrences].sort(
    (a, b) => parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime()
  );
  const published = byStart.filter((occurrence) => occurrence.status !== 'draft');
  const nextActive = published.find(
    (occurrence) => occurrence.status === 'active' && isUpcoming(occurrence, now)
  );
  return nextActive ?? published.at(-1) ?? byStart[0] ?? null;
}

/**
 * Whether deleting from this date on would only remove drafts. A series delete takes
 * every upcoming date in scope whatever its status, and the app only deletes drafts,
 * so a published date later in the series rules the choice out. Without `fromEventId`
 * the scope is every upcoming date.
 */
export function isDraftsOnlyScope(
  series: Pick<EventSeries, 'occurrences'>,
  fromEventId?: string,
  now: Date = new Date()
): boolean {
  const upcoming = upcomingOccurrences(series, now);
  const from = fromEventId ? upcoming.findIndex((occurrence) => occurrence.$id === fromEventId) : 0;
  if (from < 0) return false;
  const scope = upcoming.slice(from);
  return scope.length > 0 && scope.every((occurrence) => occurrence.status === 'draft');
}
