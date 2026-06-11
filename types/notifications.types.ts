import { NOTIFICATION_TYPES } from '@/constants/NotificationsConfig';

/**
 * Self-contained snapshot of the fields the response handlers need, baked in
 * at schedule time so action buttons work offline and before the events
 * cache hydrates. Refreshed on every reconcile (same-identifier reschedule).
 */
export type SavedDayEventSnapshot = {
  /** Event $id. */
  id: string;
  title: string;
  /** ISO start time (parseAsUTC-compatible). */
  start: string;
  /** "street, city" label; null when neither exists. */
  place: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Payload attached to the 08:30 day-of notification (single event or digest).
 *
 * This schema is load-bearing: iOS returns no absolute fire date for pending
 * notifications, so the launch reconcile identifies and diffs notifications
 * by identifier + this data alone. Only add fields — never rename or remove
 * them once shipped.
 */
export type SavedDayNotificationData = {
  type: typeof NOTIFICATION_TYPES.SAVED_DAY;
  /** Belgium-timezone day key (YYYY-MM-DD) the notification fires for. */
  dateKey: string;
  /** Saved event ids ($id) for that day, sorted by start time ascending. */
  eventIds: string[];
  /** Language the title/body were built in. */
  lang: string;
  /** Snapshots in the same order as eventIds. */
  events: SavedDayEventSnapshot[];
};

/** Payload attached to a "remind 1 h before" follow-up notification. */
export type Remind1hNotificationData = {
  type: typeof NOTIFICATION_TYPES.REMIND_1H;
  eventId: string;
  lang: string;
};

export type ProtestNotificationData = SavedDayNotificationData | Remind1hNotificationData;
