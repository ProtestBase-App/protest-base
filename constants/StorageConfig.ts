/**
 * Storage Configuration Constants
 * Centralized configuration for local storage and draft-related values
 */

/**
 * Draft storage configuration
 */
export const DRAFT_CONFIG = {
  /** Time in milliseconds after which a draft expires (default: 24 hours) */
  EXPIRY_MS: 24 * 60 * 60 * 1000,

  /** Auto-save debounce delay in milliseconds */
  AUTO_SAVE_DEBOUNCE_MS: 500,

  /** Number of consecutive save failures before showing a warning */
  SAVE_FAILURE_THRESHOLD: 3,
} as const;

/**
 * Storage keys used throughout the app.
 *
 * SAVED_EVENT_IDS / LIKED_EVENT_IDS / FOLLOWED_ORG_IDS are kept here for the
 * one-shot AsyncStorage→SecureStore migration in `secureListStorage.readList`
 * and as defense-in-depth in `clearAllUserData`. New writes go to the
 * SECURE_LIST_KEYS namespace below.
 */
export const STORAGE_KEYS = {
  SAVED_EVENT_IDS: 'savedEventIds',
  LIKED_EVENT_IDS: 'likedEventIds',
  FOLLOWED_ORG_IDS: 'followedOrgIds',
  EVENT_DRAFT: 'eventDraft',
  SELECTED_ORGANIZATION_ID: 'selectedOrganizationId',
  PAST_EVENTS_CACHE: 'pastEventsCache',
  PAST_EVENTS_CACHE_TIMESTAMP: 'pastEventsCacheTimestamp',
  TEMPLATES_CACHE: 'templatesCache',
  TEMPLATES_CACHE_TIMESTAMP: 'templatesCacheTimestamp',
  USER_EVENT_COUNTS: 'userEventCounts',
  API_PREFIX: 'apiPrefix',
  HOME_VIEW_PREFERENCE: 'homeViewPreference',
  NOTIFICATION_PERMISSION_REQUESTED: 'notificationPermissionRequested',
  // Manually-chosen "home area" administrative token (e.g. m:be:7500) for the
  // privacy-clean "near me" feature. Deliberately NOT in USER_DATA_KEYS below:
  // it's an anonymous device preference that should survive logout and stay
  // usable for logged-out browsers (explore/maps are public).
  HOME_AREA: 'homeArea',
} as const;

/**
 * Secure store keys for sensitive data (expo-secure-store)
 */
export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  SESSION_ID: 'session_id',
  /**
   * Per-install bearer token returned by /auth/integrity/attest after the
   * backend verifies a Play Integrity / App Attest payload (or honors the
   * dev bypass header on non-prod builds). Sent on every API call as
   * `X-Install-Token`. See services/integrity.service.ts.
   */
  INSTALL_TOKEN: 'install_token',
  INSTALL_TOKEN_EXPIRES_AT: 'install_token_expires_at',
  /**
   * App Attest key identifier (iOS only). Generated once per install via
   * `attestKey()` and reused for subsequent assertions. Backend stores the
   * public key associated with this id on first attestation.
   */
  INTEGRITY_KEY_ID: 'integrity_key_id',
} as const;

/**
 * SecureStore base keys for encrypted list storage. Each list is stored either
 * as a single JSON value at the base key, or chunked as `${base}.0..N-1` with a
 * manifest `{ __chunks: N }` at the base key when the JSON payload exceeds the
 * SecureStore per-value limit. Chunking is handled transparently by
 * `services/secureListStorage`.
 *
 * NOTE: SecureStore restricts key characters to alphanumeric, `.`, `-`, `_`.
 * Do not introduce keys with `:` or other punctuation.
 */
export const SECURE_LIST_KEYS = {
  SAVED_EVENT_IDS: 'securelist.savedEventIds',
  LIKED_EVENT_IDS: 'securelist.likedEventIds',
  FOLLOWED_ORG_IDS: 'securelist.followedOrgIds',
} as const;

export type DraftConfig = typeof DRAFT_CONFIG;
export type StorageKeys = typeof STORAGE_KEYS;
export type SecureStoreKeys = typeof SECURE_STORE_KEYS;
export type SecureListKeys = typeof SECURE_LIST_KEYS;
