// Mock expo-notifications BEFORE imports (jest.setup.js does NOT mock it globally)
jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 } as const,
  SchedulableTriggerInputTypes: { DATE: 'date' } as const,
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  getLastNotificationResponse: jest.fn().mockReturnValue(null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/mapHelpers', () => ({
  __esModule: true,
  openMap: jest.fn(),
}));

// AsyncStorage is globally mocked in jest.setup.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  buildSavedDayContent,
  cancelAllSavedEventNotifications,
  computeSavedDayTriggerDate,
  handleNotificationResponse,
  reconcileSavedDayNotifications,
  requestSavedDayReconcile,
  requestNotificationPermissionsOnFirstSave,
  scheduleRemind1hForSnapshot,
  type SavedDayReconcileParams,
} from '@/services/notifications.service';
import { Event } from '@/types/event.types';
import { SavedDayEventSnapshot } from '@/types/notifications.types';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import {
  NOTIFICATION_ACTIONS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  SAVED_DAY_NOTIFICATION_PREFIX,
  REMIND_1H_NOTIFICATION_PREFIX,
  SAVED_DAY_MAX_SCHEDULED_DAYS,
} from '@/constants/NotificationsConfig';
import { openMap } from '@/utils/mapHelpers';

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// ---------------------------------------------------------------------------
// Helper: build a minimal valid Event with optional field overrides
// ---------------------------------------------------------------------------
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    $id: 'evt-default',
    id: 'evt-default',
    title: 'Test Event',
    description: 'A test event description',
    start_time: '2026-06-20T10:00:00Z',
    country: 'BE',
    organizer_name: 'Test Organizer',
    status: 'active',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: build a mock scheduled notification request
// ---------------------------------------------------------------------------
function makeScheduledRequest(
  identifier: string,
  data?: Record<string, unknown>
): Notifications.NotificationRequest {
  return {
    identifier,
    content: {
      title: 'Test',
      subtitle: null,
      body: 'Test body',
      data: data ?? {},
      categoryIdentifier: null,
      sound: null,
    } as Notifications.NotificationContent,
    trigger: null as unknown as Notifications.NotificationTrigger,
  };
}

// ===========================================================================
// 1. buildSavedDayContent
// ===========================================================================
describe('buildSavedDayContent', () => {
  // -------------------------------------------------------------------------
  // Single-event: FR with street + city
  // -------------------------------------------------------------------------
  describe('single event', () => {
    it('FR: produces exact body with middot (·) and em-dash (—) for event with street + city', () => {
      // 2026-06-15T12:00:00Z = 14:00 CEST (Brussels UTC+2 in summer)
      const event = makeEvent({
        $id: 'evt-1',
        title: 'Marche pour le climat',
        start_time: '2026-06-15T12:00:00Z',
        street_address: 'Place De Brouckère',
        city: 'Bruxelles',
      });

      const result = buildSavedDayContent('2026-06-15', [event], 'fr');

      expect(result.title).toBe("C'est aujourd'hui");
      expect(result.body).toBe('Marche pour le climat · 14:00 — Place De Brouckère, Bruxelles.');
      // Explicit glyph checks
      expect(result.body).toContain('·'); // U+00B7 middle dot ·
      expect(result.body).toContain('—'); // U+2014 em dash —
      expect(result.categoryIdentifier).toBe(NOTIFICATION_CATEGORIES.EVENT_TODAY);
      expect(result.data).toEqual({
        type: NOTIFICATION_TYPES.SAVED_DAY,
        dateKey: '2026-06-15',
        eventIds: ['evt-1'],
        lang: 'fr',
        events: [
          {
            id: 'evt-1',
            title: 'Marche pour le climat',
            start: '2026-06-15T12:00:00Z',
            place: 'Place De Brouckère, Bruxelles',
            lat: null,
            lng: null,
          },
        ],
      });
    });

    it('FR: body with city only → "— Bruxelles." (no street segment before the dash)', () => {
      const event = makeEvent({
        $id: 'evt-2',
        title: 'Test',
        start_time: '2026-06-15T12:00:00Z',
        street_address: null,
        city: 'Bruxelles',
      });

      const result = buildSavedDayContent('2026-06-15', [event], 'fr');

      expect(result.body).toBe('Test · 14:00 — Bruxelles.');
    });

    it('FR: body with neither street nor city → bodyNoPlace (no dash segment)', () => {
      const event = makeEvent({
        $id: 'evt-3',
        title: 'Event sans lieu',
        start_time: '2026-06-15T12:00:00Z',
        street_address: null,
        city: null,
      });

      const result = buildSavedDayContent('2026-06-15', [event], 'fr');

      // bodyNoPlace: '{{name}} · {{time}}.'
      expect(result.body).toBe('Event sans lieu · 14:00.');
      expect(result.body).not.toContain('—'); // no em dash
    });

    it('EN: title "It\'s today", body uses 24h time (no AM/PM)', () => {
      const event = makeEvent({
        $id: 'evt-en',
        title: 'Climate March',
        start_time: '2026-06-20T12:00:00Z', // 14:00 CEST
        city: 'Brussels',
        street_address: null,
      });

      const result = buildSavedDayContent('2026-06-20', [event], 'en');

      expect(result.title).toBe("It's today");
      // 24h — no "AM"/"PM" suffix
      expect(result.body).toBe('Climate March · 14:00 — Brussels.');
      expect(result.body).not.toMatch(/AM|PM/i);
    });

    it('NL: title "Het is vandaag", digestItem connector "om"', () => {
      const event = makeEvent({
        $id: 'evt-nl',
        title: 'Klimaatmars',
        start_time: '2026-06-20T12:00:00Z',
        city: 'Brussel',
        street_address: null,
      });

      const result = buildSavedDayContent('2026-06-20', [event], 'nl');

      expect(result.title).toBe('Het is vandaag');
      expect(result.body).toBe('Klimaatmars · 14:00 — Brussel.');
    });

    it('passes lang into the data payload', () => {
      const event = makeEvent({ $id: 'evt-lang', start_time: '2026-07-01T10:00:00Z' });
      const result = buildSavedDayContent('2026-07-01', [event], 'nl');
      expect((result.data as { lang: string }).lang).toBe('nl');
    });
  });

  // -------------------------------------------------------------------------
  // Digest (2+ events)
  // -------------------------------------------------------------------------
  describe('digest (2+ events)', () => {
    it('FR: sorts 2 events passed in REVERSE order → ascending body with "à" connector', () => {
      // A at 14:00, B at 18:00 — passed in reverse
      const eventB = makeEvent({
        $id: 'evt-b',
        title: 'B',
        start_time: '2026-06-20T16:00:00Z', // 18:00 CEST
      });
      const eventA = makeEvent({
        $id: 'evt-a',
        title: 'A',
        start_time: '2026-06-20T12:00:00Z', // 14:00 CEST
      });

      const result = buildSavedDayContent('2026-06-20', [eventB, eventA], 'fr');

      expect(result.body).toBe('A à 14:00 · B à 18:00.');
      expect(result.title).toBe("2 manifestations aujourd'hui");
      expect(result.categoryIdentifier).toBe(NOTIFICATION_CATEGORIES.EVENTS_TODAY_DIGEST);
      // eventIds must be chronological (A then B)
      expect((result.data as { eventIds: string[] }).eventIds).toEqual(['evt-a', 'evt-b']);
    });

    it('EN: digest body with "at" connector', () => {
      const evtA = makeEvent({
        $id: 'evt-a',
        title: 'A',
        start_time: '2026-06-20T12:00:00Z',
      });
      const evtB = makeEvent({
        $id: 'evt-b',
        title: 'B',
        start_time: '2026-06-20T16:00:00Z',
      });

      const result = buildSavedDayContent('2026-06-20', [evtA, evtB], 'en');

      expect(result.body).toBe('A at 14:00 · B at 18:00.');
      expect(result.title).toBe('2 protests today');
    });

    it('NL: digest body with "om" connector, title "{{count}} protesten vandaag"', () => {
      const evtA = makeEvent({
        $id: 'evt-a',
        title: 'A',
        start_time: '2026-06-20T12:00:00Z',
      });
      const evtB = makeEvent({
        $id: 'evt-b',
        title: 'B',
        start_time: '2026-06-20T16:00:00Z',
      });

      const result = buildSavedDayContent('2026-06-20', [evtA, evtB], 'nl');

      expect(result.body).toBe('A om 14:00 · B om 18:00.');
      expect(result.title).toBe('2 protesten vandaag');
    });
  });

  // -------------------------------------------------------------------------
  // Truncation
  // -------------------------------------------------------------------------
  describe('digest truncation', () => {
    /**
     * Build events with very long titles so the full join exceeds
     * DIGEST_BODY_MAX_CHARS (178 chars), triggering the truncation branch.
     * Truncation only fires when sorted.length > 2.
     */
    function makeLongTitleEvent(id: string, startTimeUtc: string): Event {
      return makeEvent({
        $id: id,
        title: 'A'.repeat(60), // 60-char title per event
        start_time: startTimeUtc,
      });
    }

    it('FR: 3 events with long names → truncates to first 2 + " · et 1 autre." (singular)', () => {
      const e1 = makeLongTitleEvent('e1', '2026-06-20T08:00:00Z');
      const e2 = makeLongTitleEvent('e2', '2026-06-20T10:00:00Z');
      const e3 = makeLongTitleEvent('e3', '2026-06-20T12:00:00Z');

      const result = buildSavedDayContent('2026-06-20', [e1, e2, e3], 'fr');

      // Must end with singular "autre" (count=1) — French singular key is 'one'
      expect(result.body).toMatch(/ · et 1 autre\.$/);
      // Must start with first 2 items joined by ' · '
      const item1 = `${'A'.repeat(60)} à 10:00`; // 10:00 CEST (UTC+2)
      const item2 = `${'A'.repeat(60)} à 12:00`;
      expect(result.body).toContain(`${item1} · ${item2}`);
    });

    it('FR: 4 events with long names → suffix " · et 2 autres." (plural)', () => {
      const events = [
        makeLongTitleEvent('e1', '2026-06-20T08:00:00Z'),
        makeLongTitleEvent('e2', '2026-06-20T10:00:00Z'),
        makeLongTitleEvent('e3', '2026-06-20T12:00:00Z'),
        makeLongTitleEvent('e4', '2026-06-20T14:00:00Z'),
      ];

      const result = buildSavedDayContent('2026-06-20', events, 'fr');

      // 4 - 2 = 2 remaining → plural
      expect(result.body).toMatch(/ · et 2 autres\.$/);
    });

    it('2-event body LONGER than 178 chars is NOT truncated (rule requires 3+ events)', () => {
      // 2 events with very long titles — would exceed 178 if 3 were present,
      // but the truncation guard requires sorted.length > 2
      const longTitle = 'X'.repeat(90);
      const evtA = makeEvent({ $id: 'a', title: longTitle, start_time: '2026-06-20T08:00:00Z' });
      const evtB = makeEvent({ $id: 'b', title: longTitle, start_time: '2026-06-20T10:00:00Z' });

      const result = buildSavedDayContent('2026-06-20', [evtA, evtB], 'fr');

      // Body should be the full two items — no truncation
      expect(result.body).not.toMatch(/autre/);
      expect(result.body).toContain(longTitle);
    });

    it('3-event body SHORTER than 178 chars is NOT truncated', () => {
      // Short titles → joined body is well under 178 chars
      const evtA = makeEvent({ $id: 'a', title: 'A', start_time: '2026-06-20T08:00:00Z' });
      const evtB = makeEvent({ $id: 'b', title: 'B', start_time: '2026-06-20T10:00:00Z' });
      const evtC = makeEvent({ $id: 'c', title: 'C', start_time: '2026-06-20T12:00:00Z' });

      const result = buildSavedDayContent('2026-06-20', [evtA, evtB, evtC], 'fr');

      expect(result.body).not.toMatch(/autre/);
      // All three items should be in the body
      expect(result.body).toContain('A');
      expect(result.body).toContain('B');
      expect(result.body).toContain('C');
    });
  });
});

// ===========================================================================
// 2. computeSavedDayTriggerDate
// ===========================================================================
describe('computeSavedDayTriggerDate', () => {
  it('returns a Date whose local components are year=2026, month=5 (June), day=15, hours=8, minutes=30', () => {
    const result = computeSavedDayTriggerDate('2026-06-15');

    // Component assertions are TZ-independent (new Date(year, month-1, day, h, m) is local)
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // 0-indexed: 5 = June
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('handles January correctly (month 1 → getMonth() 0)', () => {
    const result = computeSavedDayTriggerDate('2026-01-01');

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(30);
  });

  it('handles December correctly (month 12 → getMonth() 11)', () => {
    const result = computeSavedDayTriggerDate('2026-12-31');

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(31);
  });
});

// ===========================================================================
// 3. reconcileSavedDayNotifications
// ===========================================================================
describe('reconcileSavedDayNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('mock-id');
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic scheduling
  // -------------------------------------------------------------------------
  describe('scheduling future days', () => {
    it('schedules a saved-day-<dateKey> notification for a future event', async () => {
      // Use a date far in the future relative to any machine TZ
      const futureDate = '2027-03-15';
      const event = makeEvent({
        $id: 'evt-future',
        start_time: '2027-03-15T10:00:00Z',
        status: 'active',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-future'],
        eventsCache: { 'evt-future': event },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: `${SAVED_DAY_NOTIFICATION_PREFIX}${futureDate}`,
          trigger: expect.objectContaining({
            type: 'date',
            channelId: 'saved-events',
          }),
        })
      );
    });

    it('groups 2 events on the same Belgium day into ONE schedule call (digest)', async () => {
      const sameDay = '2027-04-10';
      const evtA = makeEvent({ $id: 'a', start_time: '2027-04-10T10:00:00Z', status: 'active' });
      const evtB = makeEvent({ $id: 'b', start_time: '2027-04-10T12:00:00Z', status: 'active' });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['a', 'b'],
        eventsCache: { a: evtA, b: evtB },
        language: 'fr',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
      expect(call.identifier).toBe(`${SAVED_DAY_NOTIFICATION_PREFIX}${sameDay}`);
      // Digest category — 2 events
      expect(call.content.categoryIdentifier).toBe(NOTIFICATION_CATEGORIES.EVENTS_TODAY_DIGEST);
    });

    it('schedules separate notifications for events on different days', async () => {
      const evtDay1 = makeEvent({
        $id: 'd1',
        start_time: '2027-04-10T10:00:00Z',
        status: 'active',
      });
      const evtDay2 = makeEvent({
        $id: 'd2',
        start_time: '2027-04-11T10:00:00Z',
        status: 'active',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['d1', 'd2'],
        eventsCache: { d1: evtDay1, d2: evtDay2 },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Cancellation
  // -------------------------------------------------------------------------
  describe('cancellation', () => {
    it('cancels a pending saved-day-X that is no longer desired', async () => {
      const staleId = `${SAVED_DAY_NOTIFICATION_PREFIX}2027-01-01`;
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest(staleId),
      ]);

      const params: SavedDayReconcileParams = {
        savedEventIds: [], // nothing saved → nothing desired
        eventsCache: {},
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(staleId);
    });

    it('leaves foreign identifiers (e.g. "some-other-id") alone', async () => {
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest('some-other-id'),
      ]);

      const params: SavedDayReconcileParams = {
        savedEventIds: [],
        eventsCache: {},
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(
        'some-other-id'
      );
    });

    it('cancels a remind-1h-<id> when the event id is unsaved', async () => {
      const remindId = `${REMIND_1H_NOTIFICATION_PREFIX}evt-unsaved`;
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest(remindId),
      ]);

      const params: SavedDayReconcileParams = {
        savedEventIds: [], // evt-unsaved is NOT saved
        eventsCache: {},
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(remindId);
    });

    it('KEEPS remind-1h-<id> when event id is still saved but missing from eventsCache', async () => {
      const remindId = `${REMIND_1H_NOTIFICATION_PREFIX}evt-saved-no-cache`;
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest(remindId),
      ]);

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-saved-no-cache'], // saved but not in cache
        eventsCache: {},
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(remindId);
    });

    it('cancels remind-1h-<id> when the event status is "cancelled"', async () => {
      const remindId = `${REMIND_1H_NOTIFICATION_PREFIX}evt-cancelled`;
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest(remindId),
      ]);
      const cancelledEvent = makeEvent({ $id: 'evt-cancelled', status: 'cancelled' });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-cancelled'],
        eventsCache: { 'evt-cancelled': cancelledEvent },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(remindId);
    });

    it('cancels remind-1h-<id> when the event status is "past"', async () => {
      const remindId = `${REMIND_1H_NOTIFICATION_PREFIX}evt-past`;
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
        makeScheduledRequest(remindId),
      ]);
      const pastEvent = makeEvent({ $id: 'evt-past', status: 'past' });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-past'],
        eventsCache: { 'evt-past': pastEvent },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(remindId);
    });
  });

  // -------------------------------------------------------------------------
  // Skipping rules
  // -------------------------------------------------------------------------
  describe('skipping rules', () => {
    it('skips saved ids that are missing from eventsCache', async () => {
      const params: SavedDayReconcileParams = {
        savedEventIds: ['missing-id'],
        eventsCache: {}, // id not present
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('skips events with status "cancelled"', async () => {
      const event = makeEvent({
        $id: 'evt-c',
        start_time: '2027-06-15T10:00:00Z',
        status: 'cancelled',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-c'],
        eventsCache: { 'evt-c': event },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('skips events with status "past"', async () => {
      const event = makeEvent({
        $id: 'evt-p',
        start_time: '2025-01-01T10:00:00Z',
        status: 'past',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-p'],
        eventsCache: { 'evt-p': event },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('skips days whose Belgium dateKey is strictly before today-key', async () => {
      // Use a start_time whose Belgium dateKey will always be before today
      const event = makeEvent({
        $id: 'evt-old',
        start_time: '2020-01-01T10:00:00Z',
        status: 'active',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-old'],
        eventsCache: { 'evt-old': event },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('skips today when it is already past 08:30 local time (trigger in past)', async () => {
      jest.useFakeTimers();
      // Set now to 20:45 UTC on 2026-06-10 (Belgium date = 2026-06-10 at 22:45 CEST).
      // device-local 08:30 of 2026-06-10 is ≤ 20:30 UTC for any offset in [-12, +14].
      jest.setSystemTime(new Date('2026-06-10T20:45:00Z'));

      // Event on Belgium-today (2026-06-10 in CEST)
      const event = makeEvent({
        $id: 'evt-today',
        start_time: '2026-06-10T10:00:00Z', // 12:00 CEST on June 10
        status: 'active',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-today'],
        eventsCache: { 'evt-today': event },
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      // The trigger date (device-local 08:30 on June 10) is in the past → skipped
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Horizon cap
  // -------------------------------------------------------------------------
  describe('horizon cap', () => {
    it(`caps at ${SAVED_DAY_MAX_SCHEDULED_DAYS} days even with 31+ distinct future day-keys`, async () => {
      // Build 35 events each on a unique future date — spread across
      // months to avoid invalid calendar dates (e.g. Jan 32).
      const savedIds: string[] = [];
      const cache: Record<string, Event> = {};

      // 31 days in March 2028 + 4 in April = 35 distinct dates, all valid.
      const startBase = new Date('2028-03-01T10:00:00Z');
      for (let i = 0; i < 35; i++) {
        const d = new Date(startBase);
        d.setUTCDate(d.getUTCDate() + i);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const id = `cap-evt-${i}`;
        const event = makeEvent({
          $id: id,
          start_time: `${year}-${month}-${day}T10:00:00Z`,
          status: 'active',
        });
        savedIds.push(id);
        cache[id] = event;
      }

      const params: SavedDayReconcileParams = {
        savedEventIds: savedIds,
        eventsCache: cache,
        language: 'en',
      };

      await reconcileSavedDayNotifications(params);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(
        SAVED_DAY_MAX_SCHEDULED_DAYS
      );
    });
  });

  // -------------------------------------------------------------------------
  // getAllScheduledNotificationsAsync throwing
  // -------------------------------------------------------------------------
  describe('getAllScheduledNotificationsAsync failure', () => {
    it('logs and returns without scheduling when getAllScheduledNotificationsAsync throws', async () => {
      mockNotifications.getAllScheduledNotificationsAsync.mockRejectedValue(
        new Error('OS read error')
      );

      const event = makeEvent({
        $id: 'evt-ok',
        start_time: '2027-09-01T10:00:00Z',
        status: 'active',
      });

      const params: SavedDayReconcileParams = {
        savedEventIds: ['evt-ok'],
        eventsCache: { 'evt-ok': event },
        language: 'en',
      };

      // Must not throw
      await expect(reconcileSavedDayNotifications(params)).resolves.toBeUndefined();
      // Must not schedule (early return)
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // scheduleNotificationAsync failure is swallowed (per-notification try/catch)
  // -------------------------------------------------------------------------
  it('swallows per-notification schedule failures without throwing', async () => {
    mockNotifications.scheduleNotificationAsync.mockRejectedValue(
      new Error('ERR_NOTIFICATIONS_FAILED_TO_SCHEDULE')
    );

    const event = makeEvent({
      $id: 'evt-ok',
      start_time: '2027-09-05T10:00:00Z',
      status: 'active',
    });

    const params: SavedDayReconcileParams = {
      savedEventIds: ['evt-ok'],
      eventsCache: { 'evt-ok': event },
      language: 'en',
    };

    await expect(reconcileSavedDayNotifications(params)).resolves.toBeUndefined();
  });
});

// ===========================================================================
// 4. requestSavedDayReconcile — serialization & coalescing
// ===========================================================================
describe('requestSavedDayReconcile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Strategy: give getAllScheduledNotificationsAsync a controlled resolve so we
   * can ensure the in-flight run completes before asserting.  We fire three
   * calls synchronously; the first starts an async run (in-flight), calls 2
   * and 3 update pendingReconcile with successively different params.
   *
   * After all micro-tasks flush:
   *   - run with params #1 completed
   *   - run with params #3 ran (latest wins, #2 was overwritten)
   *   - run with params #2 data never reached scheduleNotificationAsync
   *
   * We distinguish the three param sets by the number of saved events:
   *   params1: ['id-first']
   *   params2: ['id-middle'] ← must NOT appear as the sole schedule call
   *   params3: ['id-last']
   *
   * Each event is on a unique future day.
   */
  it('coalesces rapid calls: never runs with the middle params', async () => {
    // Events on unique far-future days
    const evtFirst = makeEvent({
      $id: 'id-first',
      start_time: '2028-02-01T10:00:00Z',
      status: 'active',
    });
    const evtMiddle = makeEvent({
      $id: 'id-middle',
      start_time: '2028-02-02T10:00:00Z',
      status: 'active',
    });
    const evtLast = makeEvent({
      $id: 'id-last',
      start_time: '2028-02-03T10:00:00Z',
      status: 'active',
    });

    const combinedCache = {
      'id-first': evtFirst,
      'id-middle': evtMiddle,
      'id-last': evtLast,
    };

    // Track invocations of getAllScheduledNotificationsAsync
    let getAllCallCount = 0;
    mockNotifications.getAllScheduledNotificationsAsync.mockImplementation(async () => {
      getAllCallCount++;
      return [];
    });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('id');

    const params1: SavedDayReconcileParams = {
      savedEventIds: ['id-first'],
      eventsCache: combinedCache,
      language: 'en',
    };
    const params2: SavedDayReconcileParams = {
      savedEventIds: ['id-middle'],
      eventsCache: combinedCache,
      language: 'en',
    };
    const params3: SavedDayReconcileParams = {
      savedEventIds: ['id-last'],
      eventsCache: combinedCache,
      language: 'en',
    };

    // Fire 3 times synchronously
    requestSavedDayReconcile(params1);
    requestSavedDayReconcile(params2);
    requestSavedDayReconcile(params3);

    // Flush all microtasks / macrotasks
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // At most 2 full runs (in-flight + 1 coalesced latest)
    expect(getAllCallCount).toBeLessThanOrEqual(2);

    // The schedule calls correspond to actual runs.
    // The identifiers scheduled must never be ONLY id-middle's day
    const scheduledIdentifiers = mockNotifications.scheduleNotificationAsync.mock.calls.map(
      (call) => call[0].identifier
    );

    // If a middle-only run had fired, it would produce ONLY saved-day-2028-02-02
    // and never saved-day-2028-02-03. Verify that if 2028-02-03 was scheduled it
    // dominates — or at minimum 2028-02-02 was not the *only* identifier.
    const onlyMiddle =
      scheduledIdentifiers.length === 1 &&
      scheduledIdentifiers[0] === `${SAVED_DAY_NOTIFICATION_PREFIX}2028-02-02`;
    expect(onlyMiddle).toBe(false);
  });

  it('does not interleave: at most 2 getAllScheduledNotificationsAsync calls for 3 synchronous fires', async () => {
    let callCount = 0;
    mockNotifications.getAllScheduledNotificationsAsync.mockImplementation(async () => {
      callCount++;
      return [];
    });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('id');

    const event = makeEvent({ $id: 'e', start_time: '2028-05-01T10:00:00Z', status: 'active' });
    const p = (n: number): SavedDayReconcileParams => ({
      savedEventIds: [`e`],
      eventsCache: { e: event },
      language: n === 1 ? 'en' : n === 2 ? 'fr' : 'nl',
    });

    requestSavedDayReconcile(p(1));
    requestSavedDayReconcile(p(2));
    requestSavedDayReconcile(p(3));

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Serialization contract: at most 2 runs (in-flight + 1 coalesced)
    expect(callCount).toBeLessThanOrEqual(2);
  });
});

// ===========================================================================
// 5. requestNotificationPermissionsOnFirstSave
// ===========================================================================
describe('requestNotificationPermissionsOnFirstSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: AsyncStorage returns null (flag not set)
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('calls requestPermissionsAsync when flag is unset and permission is undetermined (canAskAgain true)', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: false,
      status: 'granted' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });

    await requestNotificationPermissionsOnFirstSave();

    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_REQUESTED,
      'true'
    );
  });

  it('does NOT call requestPermissionsAsync when the flag is already set', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    await requestNotificationPermissionsOnFirstSave();

    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    // setItem should also NOT be called (early return before it)
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('does NOT call requestPermissionsAsync when already granted, but sets the flag', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: false,
      status: 'granted' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });

    await requestNotificationPermissionsOnFirstSave();

    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_REQUESTED,
      'true'
    );
  });

  it('does NOT call requestPermissionsAsync when canAskAgain is false, but sets the flag', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });

    await requestNotificationPermissionsOnFirstSave();

    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.NOTIFICATION_PERMISSION_REQUESTED,
      'true'
    );
  });

  it('never throws when getPermissionsAsync rejects', async () => {
    mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('OS error'));

    await expect(requestNotificationPermissionsOnFirstSave()).resolves.toBeUndefined();
  });

  it('never throws when requestPermissionsAsync rejects', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });
    mockNotifications.requestPermissionsAsync.mockRejectedValue(new Error('Dialog error'));

    await expect(requestNotificationPermissionsOnFirstSave()).resolves.toBeUndefined();
  });

  it('never throws when AsyncStorage.setItem rejects', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'undetermined' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: false,
      status: 'granted' as Notifications.PermissionStatus,
      expires: 'never',
      ios: undefined,
      android: undefined,
    });
    mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

    await expect(requestNotificationPermissionsOnFirstSave()).resolves.toBeUndefined();
  });
});

// ===========================================================================
// 6. reconcileSavedDayNotifications — keep semantics (offline / margin window)
// ===========================================================================
describe('reconcileSavedDayNotifications keep semantics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('mock-id');
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('KEEPS a pending saved-day-* whose data.eventIds reference a saved event missing from the cache (offline launch)', async () => {
    const pendingId = `${SAVED_DAY_NOTIFICATION_PREFIX}2027-07-01`;
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(pendingId, {
        type: NOTIFICATION_TYPES.SAVED_DAY,
        dateKey: '2027-07-01',
        eventIds: ['evt-offline'],
        lang: 'en',
      }),
    ]);

    const params: SavedDayReconcileParams = {
      savedEventIds: ['evt-offline'],
      eventsCache: {}, // bulk fetch failed / offline — nothing hydrated
      language: 'en',
    };

    await reconcileSavedDayNotifications(params);

    expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(pendingId);
  });

  it('still cancels a pending saved-day-* whose data.eventIds are all unsaved', async () => {
    const pendingId = `${SAVED_DAY_NOTIFICATION_PREFIX}2027-07-02`;
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(pendingId, {
        type: NOTIFICATION_TYPES.SAVED_DAY,
        dateKey: '2027-07-02',
        eventIds: ['evt-gone'],
        lang: 'en',
      }),
    ]);

    const params: SavedDayReconcileParams = {
      savedEventIds: [], // unsaved everywhere
      eventsCache: {},
      language: 'en',
    };

    await reconcileSavedDayNotifications(params);

    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(pendingId);
  });

  it('cancels a pending saved-day-* whose payload has no eventIds (unknown format)', async () => {
    const pendingId = `${SAVED_DAY_NOTIFICATION_PREFIX}2027-07-03`;
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(pendingId, {}),
    ]);

    const params: SavedDayReconcileParams = {
      savedEventIds: ['evt-whatever'],
      eventsCache: {},
      language: 'en',
    };

    await reconcileSavedDayNotifications(params);

    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(pendingId);
  });

  it('KEEPS a pending saved-day-<today> when reconcile runs past 08:30 (margin-skipped day is not stale)', async () => {
    jest.useFakeTimers();
    // 20:45 UTC on 2026-06-10: Belgium date is still 2026-06-10, and the
    // device-local 08:30 of that day is in the past for any TZ in [-12, +14].
    jest.setSystemTime(new Date('2026-06-10T20:45:00Z'));

    const event = makeEvent({
      $id: 'evt-today',
      start_time: '2026-06-10T10:00:00Z',
      status: 'active',
    });
    const pendingId = `${SAVED_DAY_NOTIFICATION_PREFIX}2026-06-10`;
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(pendingId, {
        type: NOTIFICATION_TYPES.SAVED_DAY,
        dateKey: '2026-06-10',
        eventIds: ['evt-today'],
        lang: 'en',
      }),
    ]);

    const params: SavedDayReconcileParams = {
      savedEventIds: ['evt-today'],
      eventsCache: { 'evt-today': event }, // hydrated — only the margin keep applies
      language: 'en',
    };

    await reconcileSavedDayNotifications(params);

    expect(mockNotifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(pendingId);
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. cancelAllSavedEventNotifications (logout / account deletion)
// ===========================================================================
describe('cancelAllSavedEventNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  it('cancels every saved-day-* and remind-1h-* request but leaves foreign identifiers alone', async () => {
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(`${SAVED_DAY_NOTIFICATION_PREFIX}2027-01-01`),
      makeScheduledRequest(`${REMIND_1H_NOTIFICATION_PREFIX}evt-1`),
      makeScheduledRequest('foreign-id'),
    ]);

    await cancelAllSavedEventNotifications();

    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-01-01`
    );
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      `${REMIND_1H_NOTIFICATION_PREFIX}evt-1`
    );
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('never throws when getAllScheduledNotificationsAsync rejects', async () => {
    mockNotifications.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('OS error'));

    await expect(cancelAllSavedEventNotifications()).resolves.toBeUndefined();
  });

  it('continues cancelling after an individual cancel failure', async () => {
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      makeScheduledRequest(`${SAVED_DAY_NOTIFICATION_PREFIX}2027-01-01`),
      makeScheduledRequest(`${SAVED_DAY_NOTIFICATION_PREFIX}2027-01-02`),
    ]);
    mockNotifications.cancelScheduledNotificationAsync
      .mockRejectedValueOnce(new Error('cancel failed'))
      .mockResolvedValue(undefined);

    await expect(cancelAllSavedEventNotifications()).resolves.toBeUndefined();
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// 8. scheduleRemind1hForSnapshot
// ===========================================================================
describe('scheduleRemind1hForSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('mock-id');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeSnapshot(overrides: Partial<SavedDayEventSnapshot> = {}): SavedDayEventSnapshot {
    // Start 6 hours from now — start − 1h is comfortably in the future.
    const start = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    return {
      id: 'abcdef0123456789abcd',
      title: 'Marche pour le climat',
      start,
      place: 'Place De Brouckère, Bruxelles',
      lat: null,
      lng: null,
      ...overrides,
    };
  }

  it('schedules remind-1h-<id> at start − 1h with the FR copy', async () => {
    const snapshot = makeSnapshot();

    const result = await scheduleRemind1hForSnapshot(snapshot, 'fr');

    expect(result).toBe(true);
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.identifier).toBe(`${REMIND_1H_NOTIFICATION_PREFIX}${snapshot.id}`);
    expect(call.content.title).toBe('Dans 1 heure');
    expect(call.content.body).toBe(
      'Marche pour le climat commence dans 1 heure — Place De Brouckère, Bruxelles.'
    );
    expect(call.content.data).toEqual({
      type: NOTIFICATION_TYPES.REMIND_1H,
      eventId: snapshot.id,
      lang: 'fr',
    });
    const trigger = call.trigger as { type: string; date: Date; channelId: string };
    expect(trigger.type).toBe('date');
    expect(trigger.channelId).toBe('saved-events');
    expect(trigger.date.getTime()).toBe(new Date(snapshot.start).getTime() - 60 * 60 * 1000);
  });

  it('uses bodyNoPlace when the snapshot has no place', async () => {
    const snapshot = makeSnapshot({ place: null });

    await scheduleRemind1hForSnapshot(snapshot, 'fr');

    const call = mockNotifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(call.content.body).toBe('Marche pour le climat commence dans 1 heure.');
  });

  it('returns false without scheduling when start − 1h is already past', async () => {
    // Event starts in 30 minutes — the reminder moment has passed.
    const snapshot = makeSnapshot({
      start: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    const result = await scheduleRemind1hForSnapshot(snapshot, 'fr');

    expect(result).toBe(false);
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('returns false (never throws) when scheduleNotificationAsync rejects', async () => {
    mockNotifications.scheduleNotificationAsync.mockRejectedValue(new Error('OS error'));

    const result = await scheduleRemind1hForSnapshot(makeSnapshot(), 'en');

    expect(result).toBe(false);
  });
});

// ===========================================================================
// 9. handleNotificationResponse
// ===========================================================================
describe('handleNotificationResponse', () => {
  const mockRouter = router as jest.Mocked<typeof router>;
  const mockOpenMap = openMap as jest.Mock;
  // 20-char hex strings pass isValidEventId
  const VALID_ID = 'abcdef0123456789abcd';
  const VALID_ID_2 = '0123456789abcdef0123';

  // The handler dedupes on identifier|action|date at module level — every
  // test must use a unique `date` so earlier tests can't shadow later ones.
  let uniqueDate = 1000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('mock-id');
  });

  function makeSnapshot(id: string, overrides: Partial<SavedDayEventSnapshot> = {}) {
    return {
      id,
      title: 'Marche pour le climat',
      start: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      place: 'Place De Brouckère, Bruxelles',
      lat: null,
      lng: null,
      ...overrides,
    };
  }

  function makeResponse(
    identifier: string,
    data: Record<string, unknown>,
    actionIdentifier: string
  ): Notifications.NotificationResponse {
    uniqueDate += 1;
    return {
      actionIdentifier,
      notification: {
        date: uniqueDate,
        request: makeScheduledRequest(identifier, data),
      },
    } as Notifications.NotificationResponse;
  }

  function savedDayData(ids: string[], snapshots?: SavedDayEventSnapshot[]) {
    return {
      type: NOTIFICATION_TYPES.SAVED_DAY,
      dateKey: '2027-06-15',
      eventIds: ids,
      lang: 'en',
      events: snapshots ?? ids.map((id) => makeSnapshot(id)),
    };
  }

  it('plain tap on a single → replaces to Event Details in replace mode', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-15`,
      savedDayData([VALID_ID]),
      'expo.modules.notifications.actions.DEFAULT'
    );

    const handled = handleNotificationResponse(response, 'replace');

    expect(handled).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('plain tap on a digest → navigates to the Calendar tab', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-16`,
      savedDayData([VALID_ID, VALID_ID_2]),
      'expo.modules.notifications.actions.DEFAULT'
    );

    const handled = handleNotificationResponse(response, 'replace');

    expect(handled).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/home');
  });

  it('view-event action in push mode → pushes Event Details', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-17`,
      savedDayData([VALID_ID]),
      NOTIFICATION_ACTIONS.VIEW_EVENT
    );

    handleNotificationResponse(response, 'push');

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
  });

  it('view-agenda action → navigates to the Calendar tab', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-18`,
      savedDayData([VALID_ID, VALID_ID_2]),
      NOTIFICATION_ACTIONS.VIEW_AGENDA
    );

    handleNotificationResponse(response, 'push');

    expect(mockRouter.push).toHaveBeenCalledWith('/home');
  });

  it('directions action → opens the maps app with coords + place and navigates to the event', () => {
    const snapshot = makeSnapshot(VALID_ID, { lat: 50.85, lng: 4.35 });
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-19`,
      savedDayData([VALID_ID], [snapshot]),
      NOTIFICATION_ACTIONS.DIRECTIONS
    );

    handleNotificationResponse(response, 'push');

    expect(mockOpenMap).toHaveBeenCalledWith(50.85, 4.35, 'Place De Brouckère, Bruxelles');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
  });

  it('directions action without coordinates → skips openMap but still navigates', () => {
    const snapshot = makeSnapshot(VALID_ID, { lat: null, lng: null });
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-20`,
      savedDayData([VALID_ID], [snapshot]),
      NOTIFICATION_ACTIONS.DIRECTIONS
    );

    handleNotificationResponse(response, 'push');

    expect(mockOpenMap).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it('remind-1h action → schedules the follow-up and navigates to the event', async () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-21`,
      savedDayData([VALID_ID]),
      NOTIFICATION_ACTIONS.REMIND_1H
    );

    handleNotificationResponse(response, 'push');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifications.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe(
      `${REMIND_1H_NOTIFICATION_PREFIX}${VALID_ID}`
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
  });

  it('remind-each-1h action on a digest → schedules one follow-up per event and opens the Calendar', async () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-22`,
      savedDayData([VALID_ID, VALID_ID_2]),
      NOTIFICATION_ACTIONS.REMIND_EACH_1H
    );

    handleNotificationResponse(response, 'push');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(mockRouter.push).toHaveBeenCalledWith('/home');
  });

  it('tap on a remind-1h notification → navigates to its event', () => {
    const response = makeResponse(
      `${REMIND_1H_NOTIFICATION_PREFIX}${VALID_ID}`,
      { type: NOTIFICATION_TYPES.REMIND_1H, eventId: VALID_ID, lang: 'en' },
      'expo.modules.notifications.actions.DEFAULT'
    );

    const handled = handleNotificationResponse(response, 'push');

    expect(handled).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
  });

  it('returns false for foreign notifications and does not navigate', () => {
    const response = makeResponse('some-other-notification', { foo: 'bar' }, 'whatever');

    const handled = handleNotificationResponse(response, 'replace');

    expect(handled).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('falls back to Explore when the event id fails validation', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-23`,
      savedDayData(['../../evil']),
      'expo.modules.notifications.actions.DEFAULT'
    );

    handleNotificationResponse(response, 'replace');

    expect(mockRouter.replace).toHaveBeenCalledWith('/explore');
  });

  it('dedupes: handling the exact same response twice navigates only once', () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-24`,
      savedDayData([VALID_ID]),
      'expo.modules.notifications.actions.DEFAULT'
    );

    expect(handleNotificationResponse(response, 'replace')).toBe(true);
    expect(handleNotificationResponse(response, 'push')).toBe(true);

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('routes a genuine re-tap of the same notification after the dedupe window expires', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2027-01-01T10:00:00Z'));
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-25`,
      savedDayData([VALID_ID]),
      NOTIFICATION_ACTIONS.VIEW_EVENT
    );

    expect(handleNotificationResponse(response, 'push')).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);

    // An Android action tap doesn't dismiss the notification; a later re-tap
    // delivers the identical identifier|action|date and must route again.
    jest.setSystemTime(new Date('2027-01-01T10:00:15Z'));
    expect(handleNotificationResponse(response, 'push')).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('does not record the dedupe key when navigation throws — the retry succeeds', () => {
    (mockRouter.push as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Attempted to navigate before mounting the Root Layout component');
    });
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-26`,
      savedDayData([VALID_ID]),
      'expo.modules.notifications.actions.DEFAULT'
    );

    expect(handleNotificationResponse(response, 'push')).toBe(false);
    expect(handleNotificationResponse(response, 'push')).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledTimes(2);
  });

  it('tolerates a payload without events snapshots: remind-1h no-ops, navigation still works', async () => {
    const response = makeResponse(
      `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-27`,
      {
        type: NOTIFICATION_TYPES.SAVED_DAY,
        dateKey: '2027-06-27',
        eventIds: [VALID_ID],
        lang: 'en',
        // no `events` — older/diverged payload shape
      },
      NOTIFICATION_ACTIONS.REMIND_1H
    );

    expect(handleNotificationResponse(response, 'push')).toBe(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/event/[id]',
      params: { id: VALID_ID },
    });
  });

  it('dismisses the handled notification (Android shade cleanup)', () => {
    const identifier = `${SAVED_DAY_NOTIFICATION_PREFIX}2027-06-28`;
    const response = makeResponse(
      identifier,
      savedDayData([VALID_ID]),
      'expo.modules.notifications.actions.DEFAULT'
    );

    handleNotificationResponse(response, 'push');

    expect(mockNotifications.dismissNotificationAsync).toHaveBeenCalledWith(identifier);
  });
});
