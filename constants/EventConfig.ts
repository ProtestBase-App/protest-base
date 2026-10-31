/**
 * Event Configuration Constants
 * Centralized configuration for event-related business logic
 */

/** Default event duration in milliseconds when end_time is not provided (2 hours) */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Default event duration in hours (for display purposes) */
export const DEFAULT_EVENT_DURATION_HOURS = 2;

/**
 * How far back the global events cache reaches when listing events.
 * Matches the saved-event retention window in `utils/listCleanup.ts` so that
 * any event still tracked in the user's saved-events list is also resolvable
 * from the cache without a per-event hydration round-trip.
 */
export const MAX_EVENT_LOOKBACK_MS = 20 * 24 * 60 * 60 * 1000;

/** MAX_EVENT_LOOKBACK_MS expressed in days. */
export const MAX_EVENT_LOOKBACK_DAYS = 20;

/** Maximum number of images per event — mirrors the backend's MAX_EVENT_IMAGES cap. */
export const MAX_EVENT_IMAGES = 5;

/** Maximum number of co-organizers per event — mirrors the backend's MAX_CO_ORGANIZERS cap. */
export const MAX_CO_ORGANIZERS = 10;

/**
 * Text limits mirroring the backend, so the form refuses only what the server would.
 * Volunteer text takes the stricter of the backend's two routes: JSON allows 500,
 * multipart 1,000. Raise it once they match.
 */
export const EVENT_TEXT_LIMITS = {
  title: 100,
  description: 8000,
  disclaimer: 500,
  helpDescription: 500,
  websiteUrl: 500,
} as const;

/** Mirrors the backend's template caps. `eventData` applies to the serialized `event_data`. */
export const TEMPLATE_LIMITS = {
  name: 100,
  description: 200,
  eventData: 10000,
} as const;

/**
 * Lower bounds for the source-match ("confidence") score bands on automation
 * drafts: >= 80 high, >= 50 medium, below that low. Mirrors the website's bands.
 *
 * The score measures how much of a scraped draft the crawler could corroborate
 * against its source page — it is not an accuracy or AI-confidence rating, and
 * it never gates publishing.
 */
export const CONFIDENCE_BANDS = { high: 80, medium: 50 } as const;
