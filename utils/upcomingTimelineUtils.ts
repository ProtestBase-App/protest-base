/**
 * Pure helpers for the organizer "Upcoming" timeline (June 2026 redesign):
 * splitting loaded events into ongoing / next-up / rest buckets, building the
 * date-grouped sections, the Next-Up countdown, and Day x/y progress for
 * ongoing multi-day events.
 *
 * Day keys are Belgium-timezone YYYY-MM-DD strings, consistent with
 * `utils/calendarTabUtils.ts` (events display in Europe/Brussels regardless
 * of device timezone).
 */

import { Event } from '@/types/event.types';
import { dateKeyToDate } from '@/utils/calendarTabUtils';
import { getEventDateKeyInBelgium } from '@/utils/calendarUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { getEffectiveEndTime } from '@/utils/eventStatus';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface UpcomingSplit {
  /** Started but not ended (start ≤ now < effective end) — the NOW rows. */
  ongoing: Event[];
  /** The soonest not-yet-started event(s); >1 when start times tie. */
  nextUp: Event[];
  /** Remaining future events, chronologically sorted. */
  rest: Event[];
}

/**
 * Design rule: an event whose start ≤ now < effective end renders the
 * ongoing treatment (single-day events included — unlike the calendar tab's
 * multi-day-only `isEventInProgress`, this list is about the organizer's
 * NOW).
 */
export function isStartedAndOngoing(event: Event, now: Date): boolean {
  if (!event.start_time) return false;
  return parseAsUTC(event.start_time) <= now && getEffectiveEndTime(event) > now;
}

/**
 * Dedupe (by $id), drop ended events, sort chronologically and split into
 * the three timeline buckets. `events` may mix the server-side ongoing
 * lookback page with the paginated future pages — overlap is expected.
 */
export function splitUpcomingEvents(events: Event[], now: Date): UpcomingSplit {
  const seen = new Set<string>();
  const ongoing: Event[] = [];
  const future: Event[] = [];

  for (const event of events) {
    if (!event.start_time || seen.has(event.$id)) continue;
    seen.add(event.$id);
    if (getEffectiveEndTime(event) <= now) continue;
    if (parseAsUTC(event.start_time) <= now) {
      ongoing.push(event);
    } else {
      future.push(event);
    }
  }

  const byStart = (a: Event, b: Event) =>
    parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime();
  ongoing.sort(byStart);
  future.sort(byStart);

  if (future.length === 0) {
    return { ongoing, nextUp: [], rest: [] };
  }

  // Ties are minute-granular: the screen displays times as HH:mm, so events
  // whose starts differ only in seconds must still form the carousel.
  const firstStartMinute = Math.floor(parseAsUTC(future[0].start_time).getTime() / 60000);
  const nextUp = future.filter(
    (event) => Math.floor(parseAsUTC(event.start_time).getTime() / 60000) === firstStartMinute
  );

  return { ongoing, nextUp, rest: future.slice(nextUp.length) };
}

/** One timeline row: the event plus whether it renders the NOW treatment. */
export interface UpcomingSectionRow {
  event: Event;
  ongoing: boolean;
}

/** A date group for the SectionList. */
export interface UpcomingSection {
  /** Belgium-TZ YYYY-MM-DD day key. */
  dayKey: string;
  isToday: boolean;
  data: UpcomingSectionRow[];
}

/**
 * Group rows by Belgium-TZ start day. Ongoing events always land in today's
 * section (the NOW treatment states a fact about now, not the start day),
 * ahead of today's not-yet-started rows.
 */
export function buildUpcomingSections(
  ongoing: Event[],
  rest: Event[],
  todayKey: string
): UpcomingSection[] {
  const byDay = new Map<string, UpcomingSectionRow[]>();

  if (ongoing.length > 0) {
    byDay.set(
      todayKey,
      ongoing.map((event) => ({ event, ongoing: true }))
    );
  }

  for (const event of rest) {
    const dayKey = getEventDateKeyInBelgium(event.start_time);
    const rows = byDay.get(dayKey) ?? [];
    rows.push({ event, ongoing: false });
    byDay.set(dayKey, rows);
  }

  return [...byDay.keys()].sort().map((dayKey) => ({
    dayKey,
    isToday: dayKey === todayKey,
    data: byDay.get(dayKey)!,
  }));
}

/**
 * "Fri, June 12" style date label for a group header (components render it
 * uppercase). Locale-aware; the day key already encodes the Belgium day, so
 * no timezone conversion happens here.
 */
export function formatGroupDateLabel(dayKey: string, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  }).format(dateKeyToDate(dayKey));
}

export interface StartsIn {
  unit: 'minutes' | 'hours' | 'days';
  value: number;
}

/**
 * Coarse countdown for the Next-Up label ("starts in 2 h"): minutes under an
 * hour, rounded hours under a day, rounded days beyond. Never below 1 minute.
 */
export function getStartsIn(startTime: string, now: Date): StartsIn {
  const diffMs = Math.max(parseAsUTC(startTime).getTime() - now.getTime(), 0);
  const minutes = Math.max(Math.ceil(diffMs / 60000), 1);
  if (minutes < 60) return { unit: 'minutes', value: minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { unit: 'hours', value: hours };
  return { unit: 'days', value: Math.max(Math.round(hours / 24), 1) };
}

export interface OngoingDayProgress {
  /** 1-based position of today within the event's span. */
  dayIndex: number;
  /** Total days the event spans (1 for single-day events). */
  totalDays: number;
}

/**
 * "Day x/y" progress of an ongoing event relative to today. `totalDays` is 1
 * for single-day events — callers hide the label then.
 */
export function getOngoingDayProgress(event: Event, todayKey: string): OngoingDayProgress {
  const startKey = getEventDateKeyInBelgium(event.start_time);
  const endKey = event.end_time ? getEventDateKeyInBelgium(event.end_time) : startKey;

  const startDate = dateKeyToDate(startKey);
  const spanDays = Math.round((dateKeyToDate(endKey).getTime() - startDate.getTime()) / DAY_MS) + 1;
  const totalDays = Number.isFinite(spanDays) && spanDays > 1 ? spanDays : 1;

  const todayOffset =
    Math.round((dateKeyToDate(todayKey).getTime() - startDate.getTime()) / DAY_MS) + 1;
  const dayIndex = Math.min(Math.max(todayOffset, 1), totalDays);

  return { dayIndex, totalDays };
}
