/**
 * Event weather ("Protest forecast") configuration.
 *
 * The forecast itself comes from the backend; these constants govern the
 * app-side eligibility pre-check, the in-memory cache, and the tip rules.
 */

/**
 * Mirrors the backend's WEATHER_HORIZON_DAYS: a forecast exists for Brussels
 * dates up to today + 7. The app skips the request for later events.
 */
export const WEATHER_HORIZON_DAYS = 7;

/**
 * How long an event's weather answer is reused in memory. The backend caches
 * per location for 1–3 h, so this only saves round-trips while the user moves
 * between screens; it never has to be "correct" — a forecast does not go wrong
 * within half an hour.
 */
export const WEATHER_MEMORY_TTL_MS = 30 * 60 * 1000;

/** At most this many tips on the card, highest priority first. */
export const WEATHER_MAX_TIPS = 3;

/**
 * The geocoder's legacy Brussels-Central fallback pin. Rows that still carry
 * it would show Brussels weather for a march anywhere else, so it counts as
 * "no location" — the same rule the backend applies.
 */
export const WEATHER_NO_LOCATION_SENTINEL = { lat: 50.850346, lng: 4.351721 } as const;

/** The backend never serves a copy older than this; anything beyond is a bug, not a caption. */
export const WEATHER_UPDATED_AGO_MAX_HOURS = 12;

/** Thresholds for the tip rules (utils/weatherTips.ts). Temperatures are feels-like °C. */
export const WEATHER_TIP_THRESHOLDS = {
  HEAT_FEELS_C: 30,
  WARM_FEELS_C: 25,
  FREEZING_FEELS_C: 0,
  COLD_FEELS_C: 8,
  WIND_STRONG_KMH: 60,
  WIND_KMH: 40,
  RAIN_PROBABILITY_PCT: 60,
  SHOWERS_PROBABILITY_PCT: 30,
  RAIN_MM: 1,
  UV_HIGH: 6,
} as const;
