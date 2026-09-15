/**
 * Client-side pre-check for the "Protest forecast" card.
 *
 * A request saver, not the source of truth: the backend applies the same
 * rules (plus the category scope, which is deliberately NOT checked here so
 * the server can widen it without an app release). Everything below mirrors
 * the server's evaluation, including its reading of an end time that is not
 * after the start.
 */

import { Event } from '@/types/event.types';
import { DEFAULT_EVENT_DURATION_MS } from '@/constants/EventConfig';
import { WEATHER_HORIZON_DAYS, WEATHER_NO_LOCATION_SENTINEL } from '@/constants/WeatherConfig';
import { getEventDateKeyInBelgium } from '@/utils/calendarUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { addDaysToDateKey, hasMapCoordinates } from '@/utils/mapTabUtils';

// Coordinates round-trip through JSON and Postgres doubles; never compare them with ===.
const SENTINEL_TOLERANCE = 1e-6;

type WeatherLocationFields = Pick<Event, 'geocod_status' | 'geocod_lat' | 'geocod_lng'>;
type WeatherWindowFields = Pick<Event, 'start_time' | 'end_time'>;
type WeatherEligibilityFields = Pick<Event, 'status'> & WeatherWindowFields & WeatherLocationFields;

/**
 * True when the event carries a geocoded pin the forecast can be looked up
 * for: a confirmed geocode with real coordinates that are not the geocoder's
 * legacy Brussels-Central fallback. Stricter than the map's `hasMap` on purpose.
 */
export function hasUsableWeatherLocation(event: WeatherLocationFields): boolean {
  if (event.geocod_status !== 'OK' || !hasMapCoordinates(event)) return false;
  const isSentinel =
    Math.abs(event.geocod_lat - WEATHER_NO_LOCATION_SENTINEL.lat) < SENTINEL_TOLERANCE &&
    Math.abs(event.geocod_lng - WEATHER_NO_LOCATION_SENTINEL.lng) < SENTINEL_TOLERANCE;
  return !isSentinel;
}

// Mirrors the backend's eventEnd(): every write path accepts end_time equal to
// start_time, and both sides read that as the default duration.
function effectiveEnd(start: Date, endTime: string | null | undefined): Date {
  const end = endTime ? parseAsUTC(endTime) : null;
  return end && end.getTime() > start.getTime()
    ? end
    : new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
}

/**
 * What the forecast was asked for. A cached answer is only reused while this
 * is unchanged, so an organizer's edit of the time or address is never shown
 * with the pre-edit forecast.
 */
export function getWeatherFingerprint(event: WeatherWindowFields & WeatherLocationFields): string {
  return [
    event.start_time,
    event.end_time ?? '',
    event.geocod_lat ?? '',
    event.geocod_lng ?? '',
  ].join('|');
}

/**
 * Whether asking the backend for this event's forecast can possibly succeed.
 * `todayKey` is the Belgium date key (see `getTodayDateKeyInBelgium`) so the
 * horizon is compared the way the server compares it.
 */
export function isWeatherEligible(
  event: WeatherEligibilityFields,
  todayKey: string,
  now: Date
): boolean {
  // Older cache entries and fixtures omit status; the API default is 'active'.
  if ((event.status ?? 'active') !== 'active') return false;
  if (!event.start_time) return false;
  // Guard before any date-key call: Intl throws on an invalid Date.
  const start = parseAsUTC(event.start_time);
  if (Number.isNaN(start.getTime())) return false;
  if (effectiveEnd(start, event.end_time).getTime() <= now.getTime()) return false;
  if (!hasUsableWeatherLocation(event)) return false;
  return (
    getEventDateKeyInBelgium(event.start_time) <= addDaysToDateKey(todayKey, WEATHER_HORIZON_DAYS)
  );
}
