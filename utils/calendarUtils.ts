import { EVENT_TIMEZONE, parseAsUTC } from '@/utils/eventFormatters';

/**
 * Represents a single day cell in the calendar grid.
 */
export interface CalendarDay {
  /** The date object for this cell */
  date: Date;
  /** Day of month (1-31) */
  day: number;
  /** Whether this day belongs to the currently displayed month */
  isCurrentMonth: boolean;
  /** Whether this day is today */
  isToday: boolean;
  /** Whether this day is before today */
  isPast: boolean;
  /** ISO date string in YYYY-MM-DD format (in Belgium timezone) */
  dateKey: string;
}

/**
 * Represents a row (week) in the calendar grid.
 */
export interface CalendarWeek {
  /** ISO week number */
  weekNumber: number;
  /** The 7 days (Mon-Sun) in this week */
  days: CalendarDay[];
}

/**
 * Get the ISO week number for a given date.
 * ISO 8601: Week 1 is the week containing the first Thursday of the year.
 * Weeks start on Monday.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // ISO 8601: snap to the nearest Thursday (current date + 4 - day number, Mon=1..Sun=7).
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build a YYYY-MM-DD key from raw year/month/day numbers. Used by the calendar
 * grid so cell keys are constructed without going through a local-TZ Date —
 * keeping them consistent with event keys (which are computed in Belgium TZ).
 *
 * @param year Full year (e.g. 2026)
 * @param month Month index (0-based: 0 = January)
 * @param day Day of the month (1-31)
 */
export function belgiumDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Date key for "today" in Belgium time. The home screen seeds
 * `selectedDateKey` from this so the initial selection lines up with
 * event keys (which are also computed in Belgium TZ) rather than the
 * user's local TZ.
 */
export function getTodayDateKeyInBelgium(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Generate the 6-week calendar grid for a given month.
 *
 * @param year - Full year (e.g. 2026)
 * @param month - Month index (0-based: 0 = January)
 * @returns Array of 6 CalendarWeek objects
 */
export function generateCalendarGrid(year: number, month: number): CalendarWeek[] {
  // "Today" is the Belgium calendar date so the today ring always marks the
  // same cell as the (Belgium-keyed) selection highlight and event keys, even
  // for viewers outside CET around midnight.
  const todayKey = getTodayDateKeyInBelgium();
  const firstOfMonth = new Date(year, month, 1);

  // Find the Monday on or before the first of the month so Monday is the first
  // column. getDay() returns 0=Sun..6=Sat; convert to Monday-based 0..6.
  let dayOfWeek = firstOfMonth.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startDate = new Date(year, month, 1 - mondayOffset);

  const weeks: CalendarWeek[] = [];

  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const cellDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + week * 7 + dayIdx
      );

      // Construct the key from y/m/d directly so it doesn't drift with the
      // viewer's local TZ — matches the Belgium-TZ keys used for events.
      const dateKey = belgiumDateKey(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate()
      );
      days.push({
        date: cellDate,
        day: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month && cellDate.getFullYear() === year,
        isToday: dateKey === todayKey,
        isPast: dateKey < todayKey,
        dateKey,
      });
    }

    weeks.push({
      weekNumber: getISOWeekNumber(days[0].date),
      days,
    });
  }

  return weeks;
}

/**
 * Get the date key (YYYY-MM-DD) for an event's start_time in Belgium timezone.
 * This ensures events are grouped by the day they occur in Belgium, not UTC.
 */
export function getEventDateKeyInBelgium(startTime: string): string {
  const date = parseAsUTC(startTime);
  // en-CA outputs YYYY-MM-DD.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Build a Set of date keys (YYYY-MM-DD) that have events. One key per event,
 * derived from the event's start day in Belgium TZ — multi-day events get a
 * single dot on the day they begin, not one dot per day they span.
 */
export function buildEventDateSet(events: { start_time: string }[]): Set<string> {
  const dateSet = new Set<string>();
  for (const event of events) {
    dateSet.add(getEventDateKeyInBelgium(event.start_time));
  }
  return dateSet;
}

/**
 * Get the single-letter day-of-week headers starting from Monday.
 * Uses Intl to get localized narrow weekday names.
 */
export function getDayHeaders(locale: string): string[] {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';
  // Jan 5, 2026 is a Monday — use it as a known reference day.
  const monday = new Date(2026, 0, 5);
  const headers: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const name = d.toLocaleDateString(resolvedLocale, { weekday: 'narrow' });
    headers.push(name.toUpperCase());
  }
  return headers;
}

/**
 * Get the localized month name for a given month index and locale.
 */
export function getMonthName(month: number, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';
  const date = new Date(2000, month, 1);
  const name = date.toLocaleDateString(resolvedLocale, { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Get the localized full day name + day number (e.g. "Sunday 29").
 */
export function formatDayHeader(date: Date, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';
  const dayName = date.toLocaleDateString(resolvedLocale, { weekday: 'long' });
  const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalizedDayName} ${date.getDate()}`;
}
