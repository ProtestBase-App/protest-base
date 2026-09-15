/**
 * Contract of `GET /events/:id/weather` (backend `weather.service.ts`): the
 * "Protest forecast" summary for an event's own time window, in numbers and
 * enums only. Tips and every piece of copy are derived in the app.
 */

export type WeatherStatus = 'available' | 'too_early' | 'not_applicable' | 'unavailable';

/**
 * Why a forecast is not available. `not_applicable`: cancelled | past |
 * category | ended. `unavailable`: no_location | disabled. `too_early`: null
 * (starts after today + 7) or beyond_forecast (provider has no data yet).
 */
export type WeatherReason =
  'cancelled' | 'past' | 'category' | 'ended' | 'no_location' | 'disabled' | 'beyond_forecast';

export type WeatherCondition = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

/** `high` when the window starts within 48 h (hourly-updated model), else `medium`. */
export type WeatherConfidence = 'high' | 'medium';

export interface WeatherDay {
  /** Brussels calendar date of `window_start` — a label, never use it for time math. */
  date: string;
  /** UTC ISO instant (whole seconds). Already clipped to "now" for an ongoing event. */
  window_start: string;
  window_end: string;
  confidence: WeatherConfidence;
  /** Dominant condition over the window; null when the provider sent no code. */
  condition: WeatherCondition | null;
  is_night: boolean;
  /** °C, integers. Always present: a window without temperature data is dropped server-side. */
  temp_min: number;
  temp_max: number;
  /** °C apparent temperature, integers. */
  feels_min: number | null;
  feels_max: number | null;
  /** Highest hourly precipitation probability in the window, %. */
  precip_probability_max: number | null;
  /** mm summed over the window, 1 decimal. */
  precip_mm: number | null;
  /** km/h, strongest gust. */
  gust_max_kmh: number | null;
  /** UV index, 1 decimal. */
  uv_max: number | null;
  /** UTC ISO instants of that date's sunrise/sunset. */
  sunrise: string | null;
  sunset: string | null;
}

export interface EventWeather {
  status: WeatherStatus;
  reason: WeatherReason | null;
  /** `too_early` only: the first Brussels date a forecast can be shown. */
  available_from: string | null;
  /** `available` only: when the provider data was fetched (UTC ISO). */
  generated_at: string | null;
  /** The forecast could not be refreshed and is past its freshness target (never > 12 h old). */
  stale: boolean;
  attribution: 'open-meteo';
  /** 1–3 entries when available (the app renders only the first), [] otherwise. */
  days: WeatherDay[];
}

export interface EventWeatherResponse {
  success: boolean;
  data: EventWeather;
}
