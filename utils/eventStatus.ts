/**
 * Helpers for event timing status (ongoing, ended, active during a date range).
 */

import { Event } from '@/types/event.types';
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

/** True when the event's effective end time is in the future. */
export function isEventOngoing(event: { start_time: string; end_time?: string }): boolean {
  const now = new Date();
  const effectiveEndTime = getEffectiveEndTime(event);
  return effectiveEndTime > now;
}

export function hasEventEnded(event: { start_time: string; end_time?: string }): boolean {
  return !isEventOngoing(event);
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
