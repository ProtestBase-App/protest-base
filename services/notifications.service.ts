import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import {
  DIGEST_BODY_MAX_CHARS,
  NOTIFICATION_ACTIONS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DELIVERY_HOUR,
  NOTIFICATION_DELIVERY_MINUTE,
  NOTIFICATION_TYPES,
  REMIND_1H_NOTIFICATION_PREFIX,
  SAVED_DAY_MAX_SCHEDULED_DAYS,
  SAVED_DAY_NOTIFICATION_PREFIX,
} from '@/constants/NotificationsConfig';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { Event } from '@/types/event.types';
import {
  Remind1hNotificationData,
  SavedDayEventSnapshot,
  SavedDayNotificationData,
} from '@/types/notifications.types';
import { getEventDateKeyInBelgium, getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { isValidEventId } from '@/utils/deepLinkValidation';
import { formatEventTime24h, parseAsUTC } from '@/utils/eventFormatters';
import { getCurrentLocale, t, tPlural } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { openMap } from '@/utils/mapHelpers';

/**
 * Never schedule a trigger closer than this to "now": iOS rejects past (or
 * sub-second) dates with ERR_NOTIFICATIONS_FAILED_TO_SCHEDULE and Android
 * silently drops them.
 */
const MIN_TRIGGER_MARGIN_MS = 5000;

/**
 * Creates the Android channel used by all saved-event notifications, or
 * updates its localized name if it already exists. Importance and sound
 * freeze at the first creation per install — only name/description can
 * change afterwards.
 */
export async function ensureAndroidNotificationChannel(language: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  // `sound` is intentionally omitted: omitting it keeps the system default
  // sound, while `sound: null` would silence the channel entirely.
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: t('notifications.channelName', { locale: language }),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Registers both notification categories (action buttons). Re-registering
 * the same identifiers replaces the previous registration, so calling this
 * again after a language change refreshes the button labels. Labels only
 * apply to notifications presented after the call.
 */
export async function registerNotificationCategories(language: string): Promise<void> {
  const locale = { locale: language };

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.EVENT_TODAY, [
    {
      identifier: NOTIFICATION_ACTIONS.DIRECTIONS,
      buttonTitle: t('notifications.actions.directions', locale),
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIFICATION_ACTIONS.REMIND_1H,
      buttonTitle: t('notifications.actions.remind1h', locale),
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIFICATION_ACTIONS.VIEW_EVENT,
      buttonTitle: t('notifications.actions.viewEvent', locale),
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.EVENTS_TODAY_DIGEST, [
    {
      identifier: NOTIFICATION_ACTIONS.VIEW_AGENDA,
      buttonTitle: t('notifications.actions.viewAgenda', locale),
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIFICATION_ACTIONS.REMIND_EACH_1H,
      buttonTitle: t('notifications.actions.remindEach1h', locale),
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * Contextual permission ask, fired on the user's first save. Never throws and
 * never asks twice: after one answered prompt the user manages the permission
 * in system settings. Saving works regardless of the outcome.
 */
export async function requestNotificationPermissionsOnFirstSave(): Promise<void> {
  try {
    const alreadyRequested = await AsyncStorage.getItem(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_REQUESTED
    );
    if (alreadyRequested) {
      return;
    }
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) {
      const result = await Notifications.requestPermissionsAsync();
      logger.info('[Notifications] Permission requested on first save', {
        status: result.status,
      });
    }
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PERMISSION_REQUESTED, 'true');
  } catch (error) {
    logger.warn('[Notifications] Permission request failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** "street, city" with null-tolerant fallbacks; null when neither exists. */
function buildPlaceLabel(event: Event): string | null {
  const parts = [event.street_address, event.city].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Builds the content of the 08:30 day-of notification for one Belgium-day's
 * saved events: single-event copy for one event, digest copy for 2+. Events
 * are sorted by start time ascending; a digest body longer than
 * DIGEST_BODY_MAX_CHARS lists the first 2 events plus "et {N} autres".
 */
export function buildSavedDayContent(
  dateKey: string,
  events: Event[],
  language: string
): Notifications.NotificationContentInput {
  const locale = { locale: language };
  const sorted = [...events].sort(
    (a, b) => parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime()
  );

  let title: string;
  let body: string;
  let categoryIdentifier: string;

  if (sorted.length === 1) {
    const event = sorted[0];
    const time = formatEventTime24h(event.start_time);
    const place = buildPlaceLabel(event);
    title = t('notifications.dayOf.title', locale);
    body = place
      ? t('notifications.dayOf.body', { ...locale, name: event.title, time, place })
      : t('notifications.dayOf.bodyNoPlace', { ...locale, name: event.title, time });
    categoryIdentifier = NOTIFICATION_CATEGORIES.EVENT_TODAY;
  } else {
    const items = sorted.map((event) =>
      t('notifications.dayOf.digestItem', {
        ...locale,
        name: event.title,
        time: formatEventTime24h(event.start_time),
      })
    );
    title = t('notifications.dayOf.digestTitle', { ...locale, count: sorted.length });
    body = `${items.join(' · ')}.`;
    if (body.length > DIGEST_BODY_MAX_CHARS && sorted.length > 2) {
      const more = tPlural('notifications.dayOf.more', sorted.length - 2, locale);
      body = `${items.slice(0, 2).join(' · ')} ${more}.`;
    }
    categoryIdentifier = NOTIFICATION_CATEGORIES.EVENTS_TODAY_DIGEST;
  }

  const data: SavedDayNotificationData = {
    type: NOTIFICATION_TYPES.SAVED_DAY,
    dateKey,
    eventIds: sorted.map((event) => event.$id),
    lang: language,
    events: sorted.map((event) => ({
      id: event.$id,
      title: event.title,
      start: event.start_time,
      place: buildPlaceLabel(event),
      lat: typeof event.geocod_lat === 'number' ? event.geocod_lat : null,
      lng: typeof event.geocod_lng === 'number' ? event.geocod_lng : null,
    })),
  };

  return { title, body, categoryIdentifier, data };
}

/**
 * Schedules the "remind 1 h before" follow-up for one event at start − 1h.
 * Returns false (without scheduling) when that moment is already past —
 * never fire a "starts in 1 hour" that is wrong. Never throws.
 */
export async function scheduleRemind1hForSnapshot(
  snapshot: SavedDayEventSnapshot,
  language: string
): Promise<boolean> {
  // Snapshots round-trip through OS notification payloads — guard against a
  // diverged/older payload shape before doing date arithmetic on it.
  if (typeof snapshot.start !== 'string') {
    logger.warn('[Notifications] Invalid snapshot start in remind-1h request', {
      eventId: snapshot.id,
    });
    return false;
  }
  const triggerDate = new Date(parseAsUTC(snapshot.start).getTime() - 60 * 60 * 1000);
  if (triggerDate.getTime() < Date.now() + MIN_TRIGGER_MARGIN_MS) {
    logger.info('[Notifications] Skipping remind-1h — start minus 1 h is already past', {
      eventId: snapshot.id,
    });
    return false;
  }

  const locale = { locale: language };
  const data: Remind1hNotificationData = {
    type: NOTIFICATION_TYPES.REMIND_1H,
    eventId: snapshot.id,
    lang: language,
  };
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMIND_1H_NOTIFICATION_PREFIX}${snapshot.id}`,
      content: {
        title: t('notifications.remind1h.title', locale),
        body: snapshot.place
          ? t('notifications.remind1h.body', {
              ...locale,
              name: snapshot.title,
              place: snapshot.place,
            })
          : t('notifications.remind1h.bodyNoPlace', { ...locale, name: snapshot.title }),
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
    return true;
  } catch (error) {
    logger.warn('[Notifications] Failed to schedule remind-1h', {
      eventId: snapshot.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/** Device-local 08:30 on the given Belgium day key (YYYY-MM-DD). */
export function computeSavedDayTriggerDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(
    year,
    month - 1,
    day,
    NOTIFICATION_DELIVERY_HOUR,
    NOTIFICATION_DELIVERY_MINUTE,
    0,
    0
  );
}

export interface SavedDayReconcileParams {
  savedEventIds: string[];
  eventsCache: Record<string, Event>;
  language: string;
}

let pendingReconcile: SavedDayReconcileParams | null = null;
let reconcileRunning = false;

/**
 * Latest-wins, serialized entry point for the reconcile: rapid save/unsave
 * toggles and cache refreshes coalesce into at most one queued run behind the
 * in-flight one, so stale batches can never interleave with newer ones.
 */
export function requestSavedDayReconcile(params: SavedDayReconcileParams): void {
  pendingReconcile = params;
  if (reconcileRunning) {
    return;
  }
  reconcileRunning = true;
  void (async () => {
    try {
      while (pendingReconcile) {
        const next = pendingReconcile;
        pendingReconcile = null;
        try {
          await reconcileSavedDayNotifications(next);
        } catch (error) {
          logger.warn('[Notifications] Reconcile failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      reconcileRunning = false;
    }
  })();
}

/**
 * Source-of-truth sync between the saved-events state and the OS-scheduled
 * notifications (`getAllScheduledNotificationsAsync` — no parallel store):
 *
 * - cancels day-of notifications for days with no remaining saved events,
 *   past days, and orphaned "remind 1 h before" follow-ups;
 * - (re)schedules every desired day. Same-identifier scheduling replaces the
 *   pending request, which also refreshes content after event edits or
 *   language changes and re-anchors the iOS relative trigger after timezone
 *   changes.
 *
 * Days where it is already past 08:30 are skipped, never fired late. Saved
 * ids missing from the cache are skipped too; hydration upserts re-run the
 * reconcile once they arrive.
 */
export async function reconcileSavedDayNotifications(
  params: SavedDayReconcileParams
): Promise<void> {
  const { savedEventIds, eventsCache, language } = params;
  const savedIdSet = new Set(savedEventIds);
  const todayKey = getTodayDateKeyInBelgium();
  const minTriggerTime = Date.now() + MIN_TRIGGER_MARGIN_MS;

  const eventsByDay = new Map<string, Event[]>();
  for (const id of savedEventIds) {
    const event = eventsCache[id];
    if (!event) continue;
    if (event.status === 'cancelled' || event.status === 'past') continue;
    const dateKey = getEventDateKeyInBelgium(event.start_time);
    if (dateKey < todayKey) continue;
    const dayEvents = eventsByDay.get(dateKey);
    if (dayEvents) {
      dayEvents.push(event);
    } else {
      eventsByDay.set(dateKey, [event]);
    }
  }

  const desired = new Map<
    string,
    { content: Notifications.NotificationContentInput; triggerDate: Date }
  >();
  const keepIdentifiers = new Set<string>();
  const dayKeys = [...eventsByDay.keys()].sort().slice(0, SAVED_DAY_MAX_SCHEDULED_DAYS);
  for (const dateKey of dayKeys) {
    const triggerDate = computeSavedDayTriggerDate(dateKey);
    if (triggerDate.getTime() < minTriggerTime) {
      // Too late to (re)schedule this day, but an already-pending request may
      // be about to fire (or riding out an inexact-alarm delay on Android) —
      // it must not be classified as stale and cancelled below.
      keepIdentifiers.add(`${SAVED_DAY_NOTIFICATION_PREFIX}${dateKey}`);
      continue;
    }
    desired.set(`${SAVED_DAY_NOTIFICATION_PREFIX}${dateKey}`, {
      content: buildSavedDayContent(dateKey, eventsByDay.get(dateKey) ?? [], language),
      triggerDate,
    });
  }

  let scheduled: Notifications.NotificationRequest[];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    logger.warn('[Notifications] Could not read scheduled notifications', {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  let cancelledCount = 0;
  for (const request of scheduled) {
    const isStaleDayOf =
      request.identifier.startsWith(SAVED_DAY_NOTIFICATION_PREFIX) &&
      !desired.has(request.identifier) &&
      !keepIdentifiers.has(request.identifier) &&
      !referencesUnhydratedSavedEvent(request, savedIdSet, eventsCache);
    const isOrphanedReminder =
      request.identifier.startsWith(REMIND_1H_NOTIFICATION_PREFIX) &&
      isReminderOrphaned(request.identifier, savedIdSet, eventsCache);
    if (!isStaleDayOf && !isOrphanedReminder) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      cancelledCount++;
    } catch (error) {
      logger.warn('[Notifications] Failed to cancel notification', {
        identifier: request.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const [identifier, { content, triggerDate }] of desired) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    } catch (error) {
      // iOS rejects triggers that slipped into the past between the margin
      // check and this call; Android drops them silently.
      logger.warn('[Notifications] Failed to schedule day-of reminder', {
        identifier,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.debug('[Notifications] Reconcile complete', {
    desiredDays: desired.size,
    cancelled: cancelledCount,
    language,
  });
}

/**
 * A pending "remind 1 h before" is orphaned when its event was unsaved or is
 * known to be cancelled/past. An event missing from the cache is kept — it
 * may simply not be hydrated yet.
 */
function isReminderOrphaned(
  identifier: string,
  savedIdSet: Set<string>,
  eventsCache: Record<string, Event>
): boolean {
  const eventId = identifier.slice(REMIND_1H_NOTIFICATION_PREFIX.length);
  if (!savedIdSet.has(eventId)) {
    return true;
  }
  const event = eventsCache[eventId];
  if (!event) {
    return false;
  }
  return event.status === 'cancelled' || event.status === 'past';
}

/**
 * True when a pending day-of notification still references a saved event that
 * is missing from the cache (offline launch, failed bulk fetch, not yet
 * hydrated). Such requests must be kept: cancelling them would destroy
 * reminders the OS could fire with zero network. Hydration (or the 404
 * removal) re-runs the reconcile and settles the day properly later.
 */
function referencesUnhydratedSavedEvent(
  request: Notifications.NotificationRequest,
  savedIdSet: Set<string>,
  eventsCache: Record<string, Event>
): boolean {
  const data = request.content.data as Partial<SavedDayNotificationData> | null | undefined;
  if (!data || !Array.isArray(data.eventIds)) {
    return false;
  }
  return data.eventIds.some(
    (id) => typeof id === 'string' && savedIdSet.has(id) && !eventsCache[id]
  );
}

/** How a notification response should navigate. Cold start replaces the
 * splash route; the warm-app listener pushes onto the existing stack. */
export type NotificationNavigationMode = 'push' | 'replace';

// Key + time of the last successfully handled response. The warm-app
// listener and the cold-start check can both observe the same response;
// recording the key only AFTER successful handling lets a too-early attempt
// (navigator not mounted yet) be retried by the cold-start path.
let lastHandledResponseKey: string | null = null;
let lastHandledResponseAt = 0;

// The double-observation always plays out around launch, so the dedupe is
// time-boxed: notification.date is the DELIVERY timestamp, and on Android an
// action tap doesn't dismiss the notification — a genuine re-tap later in
// the session produces the same key and must route again.
const RESPONSE_DEDUPE_WINDOW_MS = 10_000;

/**
 * Routes a notification response (plain tap or action button) created by
 * this feature. Returns true when the response was recognized and handled —
 * callers then skip their own navigation fallbacks. Returns false for
 * foreign notifications and on handling errors.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  mode: NotificationNavigationMode
): boolean {
  const data = response.notification.request.content.data as
    | (Partial<SavedDayNotificationData> & Partial<Remind1hNotificationData>)
    | null
    | undefined;
  if (
    !data ||
    (data.type !== NOTIFICATION_TYPES.SAVED_DAY && data.type !== NOTIFICATION_TYPES.REMIND_1H)
  ) {
    return false;
  }

  const responseKey = `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
  if (
    responseKey === lastHandledResponseKey &&
    Date.now() - lastHandledResponseAt < RESPONSE_DEDUPE_WINDOW_MS
  ) {
    return true;
  }

  try {
    if (data.type === NOTIFICATION_TYPES.REMIND_1H) {
      navigateToEvent(typeof data.eventId === 'string' ? data.eventId : null, mode);
    } else {
      handleSavedDayResponse(data, response.actionIdentifier, mode);
    }
    lastHandledResponseKey = responseKey;
    lastHandledResponseAt = Date.now();
    // Remove the handled notification from the Android shade — action taps
    // don't auto-cancel there (iOS removes it on interaction by itself).
    Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(
      (error) => {
        logger.debug('[Notifications] Could not dismiss handled notification', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );
    return true;
  } catch (error) {
    logger.warn('[Notifications] Failed to handle notification response', {
      identifier: response.notification.request.identifier,
      actionIdentifier: response.actionIdentifier,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function handleSavedDayResponse(
  data: Partial<SavedDayNotificationData>,
  actionIdentifier: string,
  mode: NotificationNavigationMode
): void {
  const snapshots: SavedDayEventSnapshot[] = Array.isArray(data.events) ? data.events : [];
  const eventIds = Array.isArray(data.eventIds) ? data.eventIds : [];
  const isDigest = eventIds.length > 1;
  const language = getCurrentLocale();
  const first = snapshots[0];
  const firstEventId = eventIds[0] ?? first?.id ?? null;

  switch (actionIdentifier) {
    case NOTIFICATION_ACTIONS.DIRECTIONS:
      if (first && typeof first.lat === 'number' && typeof first.lng === 'number') {
        openMap(first.lat, first.lng, first.place ?? undefined);
      }
      // Event Details underneath, so returning from the Maps app lands on
      // the event rather than wherever the app happened to be.
      navigateToEvent(firstEventId, mode);
      return;
    case NOTIFICATION_ACTIONS.REMIND_1H:
      if (first) {
        void scheduleRemind1hForSnapshot(first, language);
      }
      navigateToEvent(firstEventId, mode);
      return;
    case NOTIFICATION_ACTIONS.REMIND_EACH_1H:
      for (const snapshot of snapshots) {
        void scheduleRemind1hForSnapshot(snapshot, language);
      }
      navigateToCalendar(mode);
      return;
    case NOTIFICATION_ACTIONS.VIEW_AGENDA:
      navigateToCalendar(mode);
      return;
    case NOTIFICATION_ACTIONS.VIEW_EVENT:
      navigateToEvent(firstEventId, mode);
      return;
    default:
      // Plain tap (DEFAULT_ACTION_IDENTIFIER) and any unknown action id.
      if (isDigest) {
        navigateToCalendar(mode);
      } else {
        navigateToEvent(firstEventId, mode);
      }
  }
}

function navigateToEvent(eventId: string | null, mode: NotificationNavigationMode): void {
  if (eventId && isValidEventId(eventId)) {
    const route = DynamicRoutes.event(eventId);
    if (mode === 'replace') {
      router.replace(route);
    } else {
      router.push(route);
    }
    return;
  }
  logger.warn('[Notifications] Invalid event id in notification payload', { eventId });
  if (mode === 'replace') {
    router.replace(Routes.EXPLORE);
  } else {
    router.push(Routes.EXPLORE);
  }
}

function navigateToCalendar(mode: NotificationNavigationMode): void {
  if (mode === 'replace') {
    router.replace(Routes.HOME);
  } else {
    router.push(Routes.HOME);
  }
}

/**
 * Cancels every pending notification created by this feature. Called when
 * user data is wiped (logout, account deletion, session invalidation) so
 * saved-event reminders don't keep firing for a signed-out user. Never
 * throws.
 */
export async function cancelAllSavedEventNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduled) {
      if (
        !request.identifier.startsWith(SAVED_DAY_NOTIFICATION_PREFIX) &&
        !request.identifier.startsWith(REMIND_1H_NOTIFICATION_PREFIX)
      ) {
        continue;
      }
      try {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      } catch (error) {
        logger.warn('[Notifications] Failed to cancel notification on user-data wipe', {
          identifier: request.identifier,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    logger.warn('[Notifications] Could not cancel notifications on user-data wipe', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
