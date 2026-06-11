/**
 * Helpers for event timing status (ongoing, ended, active during a date range).
 */

import { parseAsUTC } from './eventFormatters';
import { DEFAULT_EVENT_DURATION_MS } from '@/constants/EventConfig';

/**
 * Effective end time of an event: `end_time` if set, otherwise
 * `start_time + DEFAULT_EVENT_DURATION_MS`.
 */
export function getEffectiveEndTime(event: { start_time: string; end_time?: string }): Date {
  if (event.end_time) {
    return parseAsUTC(event.end_time);
  }
  const startTime = parseAsUTC(event.start_time);
  return new Date(startTime.getTime() + DEFAULT_EVENT_DURATION_MS);
}

/**
 * True when the event's effective end time is in the future. Pass `now` to
 * evaluate against a render-stable clock value (screens refresh it on focus);
 * it defaults to the current time.
 */
export function isEventOngoing(
  event: { start_time: string; end_time?: string },
  now: Date = new Date()
): boolean {
  const effectiveEndTime = getEffectiveEndTime(event);
  return effectiveEndTime > now;
}

export function hasEventEnded(
  event: { start_time: string; end_time?: string },
  now: Date = new Date()
): boolean {
  return !isEventOngoing(event, now);
}

/**
 * True when the event spans (any part of) the target date.
 * Used by date filters (today/tomorrow) so multi-day events are still matched.
 */
export function isEventActiveDuringDate(
  event: { start_time: string; end_time?: string },
  targetDate: Date
): boolean {
  const startTime = parseAsUTC(event.start_time);
  const effectiveEndTime = getEffectiveEndTime(event);

  const targetDayStart = new Date(targetDate);
  targetDayStart.setHours(0, 0, 0, 0);

  const targetDayEnd = new Date(targetDate);
  targetDayEnd.setHours(23, 59, 59, 999);

  // Overlap test: event starts on/before day end AND ends on/after day start.
  return startTime <= targetDayEnd && effectiveEndTime >= targetDayStart;
}

/**
 * True when the event overlaps a date range. Used by "this week" / "this weekend".
 */
export function isEventActiveDuringRange(
  event: { start_time: string; end_time?: string },
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const startTime = parseAsUTC(event.start_time);
  const effectiveEndTime = getEffectiveEndTime(event);

  return startTime <= rangeEnd && effectiveEndTime >= rangeStart;
}
