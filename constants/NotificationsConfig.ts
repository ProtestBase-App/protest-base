/**
 * Identifiers for the saved-event day-of reminder notifications.
 *
 * Category identifiers are camelCase on purpose: expo-notifications documents
 * that `-` or `:` inside a CATEGORY identifier can break category handling.
 * Action identifiers have no such restriction and keep the hyphenated names
 * from the design spec.
 */
export const NOTIFICATION_CHANNEL_ID = 'saved-events';

export const NOTIFICATION_CATEGORIES = {
  EVENT_TODAY: 'eventToday',
  EVENTS_TODAY_DIGEST: 'eventsTodayDigest',
} as const;

export const NOTIFICATION_ACTIONS = {
  DIRECTIONS: 'directions',
  REMIND_1H: 'remind-1h',
  VIEW_EVENT: 'view-event',
  VIEW_AGENDA: 'view-agenda',
  REMIND_EACH_1H: 'remind-each-1h',
} as const;

export const NOTIFICATION_TYPES = {
  SAVED_DAY: 'savedDay',
  REMIND_1H: 'remind1h',
} as const;

/**
 * Request-identifier prefixes. Immutable once shipped: the reconcile
 * recognizes its own pending notifications by these prefixes, and already-
 * scheduled notifications on users' devices keep the old format forever.
 */
export const SAVED_DAY_NOTIFICATION_PREFIX = 'saved-day-';
export const REMIND_1H_NOTIFICATION_PREFIX = 'remind-1h-';

/** Day-of reminders fire at 08:30 device-local time. */
export const NOTIFICATION_DELIVERY_HOUR = 8;
export const NOTIFICATION_DELIVERY_MINUTE = 30;

/**
 * iOS keeps only the soonest-firing 64 pending notifications and silently
 * discards the rest. Cap the day-of slots well below that to leave room for
 * the "remind 1 h before" follow-ups.
 */
export const SAVED_DAY_MAX_SCHEDULED_DAYS = 30;

/**
 * iOS truncates the collapsed body around this length; longer digests fall
 * back to "first 2 events + et {N} autres".
 */
export const DIGEST_BODY_MAX_CHARS = 178;
