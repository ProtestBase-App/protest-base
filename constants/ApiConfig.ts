/**
 * API Configuration Constants
 * Centralized configuration for API-related values
 */

/**
 * Default limits for API pagination
 * Used across services and providers to ensure consistent data fetching
 */
export const API_LIMITS = {
  /** Default limit for fetching events */
  EVENTS_DEFAULT: 100,
  /** Backend's documented ceiling for a single /events page (1-500). The global
   * events cache pulls its whole browse window in one request at this limit. */
  EVENTS_MAX: 500,
  /** Default limit for fetching templates */
  TEMPLATES_DEFAULT: 100,
  /** Default limit for fetching past events */
  PAST_EVENTS_DEFAULT: 100,
} as const;

export type ApiLimits = typeof API_LIMITS;
