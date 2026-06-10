/**
 * Pure helpers for the calendar tab's "browse all protests" redesign:
 * filter matching, multi-day expansion into per-day entries, next-event
 * lookup, and compact count formatting.
 *
 * All day keys are Belgium-timezone YYYY-MM-DD strings, consistent with
 * `utils/calendarUtils.ts` (events display in Europe/Brussels regardless of
 * device timezone).
 */

import { Event } from '@/types/event.types';
import { getEventDateKeyInBelgium } from '@/utils/calendarUtils';
import { parseAsUTC } from '@/utils/eventFormatters';

export interface CalendarFilters {
  /** Backend category values, e.g. ['Protest', 'Strike']. Empty = all. */
  categories: string[];
  /** Administrative-hierarchy location tokens (same scheme as explore). Empty = all. */
  locations: string[];
  /** Organization IDs. Empty = all. */
  organizations: string[];
  savedOnly: boolean;
  helpNeeded: boolean;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  categories: [],
  locations: [],
  organizations: [],
  savedOnly: false,
  helpNeeded: false,
};

/**
 * Active-filter count shown on the filter button badge. Categories count as a
 * single group; locations and organizations count one per selection.
 */
export function countActiveCalendarFilters(filters: CalendarFilters): number {
  return (
    (filters.categories.length > 0 ? 1 : 0) +
    filters.locations.length +
    filters.organizations.length +
    (filters.savedOnly ? 1 : 0) +
    (filters.helpNeeded ? 1 : 0)
  );
}

export function hasActiveCalendarFilters(filters: CalendarFilters): boolean {
  return countActiveCalendarFilters(filters) > 0;
}

export interface CalendarFilterContext {
  isSaved: (eventId: string) => boolean;
  /**
   * Postal codes expanded from `filters.locations` tokens (via
   * `expandLocationTokens`), or null when no location filter is active.
   */
  postalCodeSet: Set<string> | null;
}

/**
 * Client-side equivalent of the explore filters for the calendar tab.
 * Mirrors explore semantics: location matching drops events without a postal
 * code; organization matching uses `organization_id`.
 */
export function matchesCalendarFilters(
  event: Event,
  filters: CalendarFilters,
  context: CalendarFilterContext
): boolean {
  if (filters.categories.length > 0) {
    const eventCategories = event.categories ?? [];
    if (!eventCategories.some((category) => filters.categories.includes(category))) {
      return false;
    }
  }

  if (context.postalCodeSet) {
    if (event.postal_code === null || event.postal_code === undefined) return false;
    if (!context.postalCodeSet.has(String(event.postal_code))) return false;
  }

  if (filters.organizations.length > 0) {
    if (!event.organization_id || !filters.organizations.includes(event.organization_id)) {
      return false;
    }
  }

  if (filters.savedOnly && !context.isSaved(event.$id)) return false;

  if (filters.helpNeeded && event.help_needed !== true) return false;

  return true;
}

export interface CalendarDayEntry {
  event: Event;
  /** 1-based day position within a multi-day event ("Day 2/4"). */
  dayIndex: number;
  /** Total days the event spans (1 for single-day events). */
  totalDays: number;
}

export type EventsByDay = Record<string, CalendarDayEntry[]>;

/** Safety cap for malformed end dates — longer spans are clamped. */
const MAX_MULTI_DAY_SPAN = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD key into a local-midnight Date (for display formatting). */
export function dateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateToKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Expand events into one entry per Belgium-TZ calendar day they span, keyed
 * by YYYY-MM-DD. Multi-day events (with `end_time` on a later day) appear on
 * every day in range carrying dayIndex/totalDays. Each day's entries are
 * sorted by start time.
 */
export function expandEventsByDay(events: Event[]): EventsByDay {
  const byDay: EventsByDay = {};

  for (const event of events) {
    if (!event.start_time) continue;

    const startKey = getEventDateKeyInBelgium(event.start_time);
    const endKey = event.end_time ? getEventDateKeyInBelgium(event.end_time) : startKey;

    const startDate = dateKeyToDate(startKey);
    const endDate = dateKeyToDate(endKey);

    let spanDays = Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
    if (!Number.isFinite(spanDays) || spanDays < 1) spanDays = 1;
    if (spanDays > MAX_MULTI_DAY_SPAN) spanDays = MAX_MULTI_DAY_SPAN;

    for (let index = 0; index < spanDays; index++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + index);
      const dayKey = dateToKey(dayDate);
      (byDay[dayKey] = byDay[dayKey] ?? []).push({
        event,
        dayIndex: index + 1,
        totalDays: spanDays,
      });
    }
  }

  for (const entries of Object.values(byDay)) {
    entries.sort(
      (a, b) => parseAsUTC(a.event.start_time).getTime() - parseAsUTC(b.event.start_time).getTime()
    );
  }

  return byDay;
}

/**
 * Find the next day key with events strictly after (or from, when
 * `inclusive`) the given key. Returns null when none exists.
 */
export function findNextEventDayKey(
  byDay: EventsByDay,
  fromKey: string,
  inclusive = false
): string | null {
  let next: string | null = null;
  for (const key of Object.keys(byDay)) {
    if (byDay[key].length === 0) continue;
    if (inclusive ? key < fromKey : key <= fromKey) continue;
    if (next === null || key < next) next = key;
  }
  return next;
}

/**
 * Count events matching the filters that have not ended before today —
 * powers the filter sheet's live "See N protests" apply label.
 */
export function countUpcomingCalendarMatches(
  events: Event[],
  filters: CalendarFilters,
  context: CalendarFilterContext,
  todayKey: string
): number {
  let count = 0;
  for (const event of events) {
    if (!event.start_time) continue;
    const endKey = event.end_time
      ? getEventDateKeyInBelgium(event.end_time)
      : getEventDateKeyInBelgium(event.start_time);
    if (endKey < todayKey) continue;
    if (matchesCalendarFilters(event, filters, context)) count++;
  }
  return count;
}

/**
 * Compact attendee count: below 1000 the plain number, above formatted as
 * "1.2k" (en) / "1,2 k" (fr/nl), trailing zero trimmed.
 */
export function formatCompactCount(count: number, locale: string): string {
  if (count < 1000) return String(count);
  const compact = (count / 1000).toFixed(1).replace(/\.0$/, '');
  if (locale === 'en') return `${compact}k`;
  return `${compact.replace('.', ',')} k`;
}
