import api from '@/services/api';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/networkError';
import {
  EventWeather,
  WeatherCondition,
  WeatherConfidence,
  WeatherDay,
} from '@/types/weather.types';
import { WEATHER_MEMORY_TTL_MS } from '@/constants/WeatherConfig';

/**
 * "Protest forecast" for one event, via `GET /events/:id/weather`.
 *
 * Privacy: the request carries the event id only — never coordinates — and
 * goes out WITHOUT the user's JWT (`skipAuth`), like the view counter, so a
 * "looked at this protest" signal can never be tied to an account. The
 * backend is the only party that talks to the weather provider.
 *
 * Never throws and never surfaces an error state: a forecast that cannot be
 * shown is simply `null`, and the card stays hidden.
 */

export interface GetEventWeatherOptions {
  /** Bypass the memory TTL (pull-to-refresh). Still joins an in-flight request. */
  force?: boolean;
  /** Offline: answer from memory (or a request already on its way), never the network. */
  cacheOnly?: boolean;
  /**
   * The event's window and pin as one string (`getWeatherFingerprint`). A
   * cached answer is reused only for the same fingerprint, so an organizer's
   * edit of the time or address never shows the pre-edit forecast.
   */
  fingerprint?: string;
}

interface CacheEntry {
  weather: EventWeather | null;
  fetchedAt: number;
  fingerprint: string;
}

// Per-event answers, incl. "no forecast" ones (`null`), so reopening an event
// within the TTL costs no request. Errors are never cached. Memory only: a
// forecast must never outlive the session (see the persisted events cache).
const weatherCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<EventWeather | null>>();

const CONDITIONS: readonly string[] = [
  'clear',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'thunder',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isInstant = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const numberOrNull = (value: unknown): number | null => (isFiniteNumber(value) ? value : null);
const instantOrNull = (value: unknown): string | null => (isInstant(value) ? value : null);

// A condition this app doesn't know renders the neutral glyph; an unknown
// confidence is treated as the cautious one ("may still change").
const asCondition = (value: unknown): WeatherCondition | null =>
  typeof value === 'string' && CONDITIONS.includes(value) ? (value as WeatherCondition) : null;
const asConfidence = (value: unknown): WeatherConfidence => (value === 'high' ? 'high' : 'medium');

/**
 * The first day, rebuilt field by field: the card branches on every one of
 * them, so nothing is trusted as typed. null when the fields the card cannot
 * render without are missing; everything else is nullable by contract.
 */
function toWeatherDay(raw: unknown): WeatherDay | null {
  if (
    !isRecord(raw) ||
    !isInstant(raw.window_start) ||
    !isInstant(raw.window_end) ||
    !isFiniteNumber(raw.temp_min) ||
    !isFiniteNumber(raw.temp_max)
  ) {
    return null;
  }
  return {
    date: typeof raw.date === 'string' ? raw.date : raw.window_start.slice(0, 10),
    window_start: raw.window_start,
    window_end: raw.window_end,
    confidence: asConfidence(raw.confidence),
    condition: asCondition(raw.condition),
    is_night: raw.is_night === true,
    temp_min: raw.temp_min,
    temp_max: raw.temp_max,
    feels_min: numberOrNull(raw.feels_min),
    feels_max: numberOrNull(raw.feels_max),
    precip_probability_max: numberOrNull(raw.precip_probability_max),
    precip_mm: numberOrNull(raw.precip_mm),
    gust_max_kmh: numberOrNull(raw.gust_max_kmh),
    uv_max: numberOrNull(raw.uv_max),
    sunrise: instantOrNull(raw.sunrise),
    sunset: instantOrNull(raw.sunset),
  };
}

type Normalized = { ok: true; weather: EventWeather | null } | { ok: false; reason: string };

/**
 * Only an `available` answer with a renderable first day becomes weather; any
 * other status (including ones this app doesn't know yet) is a valid "no
 * card". The app shows one window, whatever the backend's cap, so only the
 * first day is kept.
 */
function normalizeEventWeather(body: unknown): Normalized {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    return { ok: false, reason: 'envelope' };
  }
  const data = body.data;
  if (typeof data.status !== 'string' || !Array.isArray(data.days)) {
    return { ok: false, reason: 'shape' };
  }
  if (data.status !== 'available') return { ok: true, weather: null };

  const day = toWeatherDay(data.days[0]);
  if (!day) return { ok: false, reason: 'day' };

  return {
    ok: true,
    weather: {
      status: 'available',
      reason: null,
      available_from: null,
      generated_at: instantOrNull(data.generated_at),
      stale: data.stale === true,
      attribution: 'open-meteo',
      days: [day],
    },
  };
}

function logFailure(eventId: string, error: unknown): void {
  const failed = error as {
    isRateLimited?: boolean;
    message?: string;
    response?: { status?: number; data?: { code?: string } };
  };
  // api.ts rewrites 429s into a plain object with no `.response`.
  if (failed?.isRateLimited === true) {
    logger.info('[Weather] Rate limited; forecast hidden', { eventId });
    return;
  }
  const status = failed?.response?.status;
  const code = failed?.response?.data?.code;
  // Expected while the backend has no forecast (or no route yet).
  if (status === 404 || status === 503) {
    logger.info('[Weather] Forecast not available', { eventId, status, code });
    return;
  }
  if (isNetworkError(error)) {
    logger.info('[Weather] Network unavailable; forecast hidden', { eventId });
    return;
  }
  logger.warn('[Weather] Forecast request failed', {
    eventId,
    status,
    code,
    message: failed?.message,
  });
}

// `fallback` is the last good answer for this fingerprint: a failed refresh
// keeps the card the user is reading rather than blanking it (stale-if-error).
async function fetchEventWeather(
  eventId: string,
  fingerprint: string,
  fallback: EventWeather | null
): Promise<EventWeather | null> {
  try {
    // Validated below rather than trusted: the card branches on these fields.
    const response = await api.get<unknown>(`/events/${eventId}/weather`, { skipAuth: true });
    const normalized = normalizeEventWeather(response.data);
    if (!normalized.ok) {
      logger.warn('[Weather] Unexpected response shape', { eventId, reason: normalized.reason });
      return fallback;
    }
    weatherCache.set(eventId, { weather: normalized.weather, fetchedAt: Date.now(), fingerprint });
    return normalized.weather;
  } catch (error) {
    logFailure(eventId, error);
    return fallback;
  }
}

/**
 * The event's forecast, or `null` when there is nothing to show. Resolves
 * from memory within WEATHER_MEMORY_TTL_MS; concurrent callers share one
 * request.
 */
export async function getEventWeather(
  eventId: string,
  options: GetEventWeatherOptions = {}
): Promise<EventWeather | null> {
  const fingerprint = options.fingerprint ?? '';
  const cached = weatherCache.get(eventId);
  // A copy made for a different window or pin is worthless, whatever its age.
  const usable = cached && cached.fingerprint === fingerprint ? cached : undefined;
  const key = `${eventId}|${fingerprint}`;

  if (options.cacheOnly) return inFlight.get(key) ?? usable?.weather ?? null;
  if (usable && !options.force && Date.now() - usable.fetchedAt < WEATHER_MEMORY_TTL_MS) {
    return usable.weather;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchEventWeather(eventId, fingerprint, usable?.weather ?? null).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

/** Test seam. */
export function clearEventWeatherCache(): void {
  weatherCache.clear();
  inFlight.clear();
}
