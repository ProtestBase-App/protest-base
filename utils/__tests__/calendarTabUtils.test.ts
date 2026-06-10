import { createMockEvent } from '@/test-utils/render';
import {
  CalendarFilterContext,
  CalendarFilters,
  DEFAULT_CALENDAR_FILTERS,
  countActiveCalendarFilters,
  countUpcomingCalendarMatches,
  dateKeyToDate,
  expandEventsByDay,
  findNextEventDayKey,
  formatCompactCount,
  hasActiveCalendarFilters,
  matchesCalendarFilters,
} from '../calendarTabUtils';

// ============================================================================
// Helpers
// ============================================================================

function filtersWith(overrides: Partial<CalendarFilters> = {}): CalendarFilters {
  return { ...DEFAULT_CALENDAR_FILTERS, ...overrides };
}

function contextWith(overrides: Partial<CalendarFilterContext> = {}): CalendarFilterContext {
  return { isSaved: () => false, postalCodeSet: null, ...overrides };
}

describe('calendarTabUtils', () => {
  // ==========================================================================
  // countActiveCalendarFilters / hasActiveCalendarFilters
  // ==========================================================================

  describe('countActiveCalendarFilters', () => {
    it('returns 0 for the default filters', () => {
      expect(countActiveCalendarFilters(DEFAULT_CALENDAR_FILTERS)).toBe(0);
    });

    it('counts categories as a single group regardless of how many are selected', () => {
      expect(countActiveCalendarFilters(filtersWith({ categories: ['Protest'] }))).toBe(1);
      expect(
        countActiveCalendarFilters(filtersWith({ categories: ['Protest', 'Strike', 'March'] }))
      ).toBe(1);
    });

    it('counts each selected location individually', () => {
      expect(countActiveCalendarFilters(filtersWith({ locations: ['be-bru'] }))).toBe(1);
      expect(
        countActiveCalendarFilters(filtersWith({ locations: ['be-bru', 'be-vlg', 'nl-nh'] }))
      ).toBe(3);
    });

    it('counts each selected organization individually', () => {
      expect(countActiveCalendarFilters(filtersWith({ organizations: ['org-1'] }))).toBe(1);
      expect(countActiveCalendarFilters(filtersWith({ organizations: ['org-1', 'org-2'] }))).toBe(
        2
      );
    });

    it('counts savedOnly and helpNeeded toggles as 1 each', () => {
      expect(countActiveCalendarFilters(filtersWith({ savedOnly: true }))).toBe(1);
      expect(countActiveCalendarFilters(filtersWith({ helpNeeded: true }))).toBe(1);
      expect(countActiveCalendarFilters(filtersWith({ savedOnly: true, helpNeeded: true }))).toBe(
        2
      );
    });

    it('sums all groups: categories(1) + locations(n) + organizations(n) + toggles', () => {
      const filters = filtersWith({
        categories: ['Protest', 'Strike'], // 1 (group)
        locations: ['be-bru', 'be-vlg'], // 2
        organizations: ['org-1'], // 1
        savedOnly: true, // 1
        helpNeeded: true, // 1
      });
      expect(countActiveCalendarFilters(filters)).toBe(6);
    });
  });

  describe('hasActiveCalendarFilters', () => {
    it('is false for the default filters', () => {
      expect(hasActiveCalendarFilters(DEFAULT_CALENDAR_FILTERS)).toBe(false);
    });

    it('is true when any single filter is active', () => {
      expect(hasActiveCalendarFilters(filtersWith({ categories: ['Protest'] }))).toBe(true);
      expect(hasActiveCalendarFilters(filtersWith({ locations: ['be-bru'] }))).toBe(true);
      expect(hasActiveCalendarFilters(filtersWith({ organizations: ['org-1'] }))).toBe(true);
      expect(hasActiveCalendarFilters(filtersWith({ savedOnly: true }))).toBe(true);
      expect(hasActiveCalendarFilters(filtersWith({ helpNeeded: true }))).toBe(true);
    });
  });

  // ==========================================================================
  // matchesCalendarFilters
  // ==========================================================================

  describe('matchesCalendarFilters', () => {
    it('matches every event when no filters are active', () => {
      const event = createMockEvent();
      expect(matchesCalendarFilters(event, DEFAULT_CALENDAR_FILTERS, contextWith())).toBe(true);
    });

    describe('categories (OR within the group)', () => {
      it("matches when the event has at least one of the filter's categories", () => {
        const event = createMockEvent({ categories: ['Strike'] });
        const filters = filtersWith({ categories: ['Protest', 'Strike'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(true);
      });

      it('rejects when the event has none of the filter categories', () => {
        const event = createMockEvent({ categories: ['March'] });
        const filters = filtersWith({ categories: ['Protest', 'Strike'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(false);
      });

      it('rejects events without categories when a category filter is active', () => {
        const event = createMockEvent({ categories: undefined });
        const filters = filtersWith({ categories: ['Protest'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(false);
      });

      it('matches all events (with or without categories) when the categories filter is empty', () => {
        const withCategories = createMockEvent({ categories: ['Protest'] });
        const withoutCategories = createMockEvent({ categories: undefined });
        expect(matchesCalendarFilters(withCategories, filtersWith(), contextWith())).toBe(true);
        expect(matchesCalendarFilters(withoutCategories, filtersWith(), contextWith())).toBe(true);
      });
    });

    describe('locations (postalCodeSet)', () => {
      it('matches a numeric postal_code against the string set via String() coercion', () => {
        const event = createMockEvent({ postal_code: 1000 });
        const context = contextWith({ postalCodeSet: new Set(['1000', '1050']) });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(true);
      });

      it('rejects when the postal code is not in the set', () => {
        const event = createMockEvent({ postal_code: 2000 });
        const context = contextWith({ postalCodeSet: new Set(['1000']) });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(false);
      });

      it('drops events with undefined postal_code when the set is active', () => {
        const event = createMockEvent({ postal_code: undefined });
        const context = contextWith({ postalCodeSet: new Set(['1000']) });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(false);
      });

      it('drops events with null postal_code when the set is active', () => {
        const event = createMockEvent({ postal_code: null });
        const context = contextWith({ postalCodeSet: new Set(['1000']) });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(false);
      });

      it('skips the location check entirely when postalCodeSet is null', () => {
        const event = createMockEvent({ postal_code: undefined });
        const context = contextWith({ postalCodeSet: null });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(true);
      });
    });

    describe('organizations', () => {
      it('matches by organization_id', () => {
        const event = createMockEvent({ organization_id: 'org-1' });
        const filters = filtersWith({ organizations: ['org-1', 'org-2'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(true);
      });

      it('rejects an event from a different organization', () => {
        const event = createMockEvent({ organization_id: 'org-3' });
        const filters = filtersWith({ organizations: ['org-1', 'org-2'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(false);
      });

      it('drops events without organization_id when the filter is active', () => {
        const event = createMockEvent({ organization_id: undefined });
        const filters = filtersWith({ organizations: ['org-1'] });
        expect(matchesCalendarFilters(event, filters, contextWith())).toBe(false);
      });
    });

    describe('savedOnly', () => {
      it('matches only events the context reports as saved', () => {
        const saved = createMockEvent();
        const notSaved = createMockEvent();
        const context = contextWith({ isSaved: (id) => id === saved.$id });
        const filters = filtersWith({ savedOnly: true });
        expect(matchesCalendarFilters(saved, filters, context)).toBe(true);
        expect(matchesCalendarFilters(notSaved, filters, context)).toBe(false);
      });

      it('ignores saved state when savedOnly is off', () => {
        const event = createMockEvent();
        const context = contextWith({ isSaved: () => false });
        expect(matchesCalendarFilters(event, filtersWith(), context)).toBe(true);
      });
    });

    describe('helpNeeded', () => {
      it('matches only events with help_needed === true', () => {
        const event = createMockEvent({ help_needed: true });
        expect(
          matchesCalendarFilters(event, filtersWith({ helpNeeded: true }), contextWith())
        ).toBe(true);
      });

      it('rejects events with help_needed false', () => {
        const event = createMockEvent({ help_needed: false });
        expect(
          matchesCalendarFilters(event, filtersWith({ helpNeeded: true }), contextWith())
        ).toBe(false);
      });

      it('rejects events with help_needed undefined (strict === true check)', () => {
        const event = createMockEvent({ help_needed: undefined });
        expect(
          matchesCalendarFilters(event, filtersWith({ helpNeeded: true }), contextWith())
        ).toBe(false);
      });
    });

    it('requires ALL active filter groups to pass (AND across groups)', () => {
      const event = createMockEvent({
        categories: ['Strike'],
        postal_code: 1000,
        organization_id: 'org-1',
        help_needed: true,
      });
      const filters = filtersWith({
        categories: ['Strike'],
        organizations: ['org-1'],
        savedOnly: true,
        helpNeeded: true,
      });
      const matchingContext = contextWith({
        isSaved: () => true,
        postalCodeSet: new Set(['1000']),
      });
      expect(matchesCalendarFilters(event, filters, matchingContext)).toBe(true);

      // Flip just one group (saved state) and the event no longer matches.
      const notSavedContext = contextWith({
        isSaved: () => false,
        postalCodeSet: new Set(['1000']),
      });
      expect(matchesCalendarFilters(event, filters, notSavedContext)).toBe(false);
    });
  });

  // ==========================================================================
  // expandEventsByDay
  // ==========================================================================

  describe('expandEventsByDay', () => {
    it('returns an empty object for an empty events array', () => {
      expect(expandEventsByDay([])).toEqual({});
    });

    it('places a single-day event under its Belgium-TZ start key with dayIndex 1/1', () => {
      // June 10 at 16:00 UTC = 18:00 in Brussels (CEST, UTC+2) — same Belgium day.
      const event = createMockEvent({ start_time: '2026-06-10T16:00:00Z' });
      const byDay = expandEventsByDay([event]);

      expect(Object.keys(byDay)).toEqual(['2026-06-10']);
      expect(byDay['2026-06-10']).toHaveLength(1);
      expect(byDay['2026-06-10'][0]).toEqual({ event, dayIndex: 1, totalDays: 1 });
    });

    it('shifts a late-UTC event to the next Belgium day (DST midnight crossing)', () => {
      // June 10 at 22:30 UTC = June 11, 00:30 in Brussels (CEST, UTC+2).
      const event = createMockEvent({ start_time: '2026-06-10T22:30:00Z' });
      const byDay = expandEventsByDay([event]);

      expect(byDay['2026-06-11']).toHaveLength(1);
      expect(byDay['2026-06-10']).toBeUndefined();
    });

    it('keeps an event with end_time on the same Belgium day as a single-day entry', () => {
      const event = createMockEvent({
        start_time: '2026-06-10T08:00:00Z',
        end_time: '2026-06-10T16:00:00Z',
      });
      const byDay = expandEventsByDay([event]);

      expect(Object.keys(byDay)).toEqual(['2026-06-10']);
      expect(byDay['2026-06-10'][0]).toEqual({ event, dayIndex: 1, totalDays: 1 });
    });

    it('expands a multi-day event into one entry per day with dayIndex/totalDays', () => {
      // June 19 → June 22 in Brussels = 4 calendar days.
      const event = createMockEvent({
        start_time: '2026-06-19T10:00:00Z',
        end_time: '2026-06-22T15:00:00Z',
      });
      const byDay = expandEventsByDay([event]);

      const expectedKeys = ['2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22'];
      expect(Object.keys(byDay).sort()).toEqual(expectedKeys);
      expectedKeys.forEach((key, index) => {
        expect(byDay[key]).toHaveLength(1);
        expect(byDay[key][0].event).toBe(event);
        expect(byDay[key][0].dayIndex).toBe(index + 1);
        expect(byDay[key][0].totalDays).toBe(4);
      });
    });

    it('expands across a month boundary onto consecutive keys', () => {
      const event = createMockEvent({
        start_time: '2026-06-30T08:00:00Z',
        end_time: '2026-07-01T16:00:00Z',
      });
      const byDay = expandEventsByDay([event]);

      expect(Object.keys(byDay).sort()).toEqual(['2026-06-30', '2026-07-01']);
      expect(byDay['2026-06-30'][0]).toMatchObject({ dayIndex: 1, totalDays: 2 });
      expect(byDay['2026-07-01'][0]).toMatchObject({ dayIndex: 2, totalDays: 2 });
    });

    it('sorts same-day entries by start time regardless of input order', () => {
      const later = createMockEvent({ start_time: '2026-06-10T15:00:00Z' });
      const earlier = createMockEvent({ start_time: '2026-06-10T08:00:00Z' });
      const byDay = expandEventsByDay([later, earlier]);

      expect(byDay['2026-06-10']).toHaveLength(2);
      expect(byDay['2026-06-10'][0].event.$id).toBe(earlier.$id);
      expect(byDay['2026-06-10'][1].event.$id).toBe(later.$id);
    });

    it('clamps an end_time before start_time to a single day', () => {
      const event = createMockEvent({
        start_time: '2026-06-10T10:00:00Z',
        end_time: '2026-06-08T10:00:00Z',
      });
      const byDay = expandEventsByDay([event]);

      expect(Object.keys(byDay)).toEqual(['2026-06-10']);
      expect(byDay['2026-06-10'][0]).toEqual({ event, dayIndex: 1, totalDays: 1 });
    });

    it('clamps malformed extreme spans to the 60-day safety cap', () => {
      // June 1 → September 1 spans 93 calendar days — clamped to 60.
      const event = createMockEvent({
        start_time: '2026-06-01T10:00:00Z',
        end_time: '2026-09-01T10:00:00Z',
      });
      const byDay = expandEventsByDay([event]);

      const keys = Object.keys(byDay);
      expect(keys).toHaveLength(60);
      // Day 60 of the clamped span is July 30 (June 1 + 59 days).
      expect(byDay['2026-07-30'][0]).toMatchObject({ dayIndex: 60, totalDays: 60 });
      expect(byDay['2026-07-31']).toBeUndefined();
    });

    it('skips events with a missing start_time', () => {
      const noStart = createMockEvent({ start_time: '' });
      const valid = createMockEvent({ start_time: '2026-06-10T10:00:00Z' });
      const byDay = expandEventsByDay([noStart, valid]);

      const allEntries = Object.values(byDay).flat();
      expect(allEntries).toHaveLength(1);
      expect(allEntries[0].event.$id).toBe(valid.$id);
    });
  });

  // ==========================================================================
  // findNextEventDayKey
  // ==========================================================================

  describe('findNextEventDayKey', () => {
    const entry = { event: createMockEvent(), dayIndex: 1, totalDays: 1 };

    it('returns the next day key strictly after fromKey by default', () => {
      const byDay = { '2026-06-10': [entry], '2026-06-15': [entry] };
      expect(findNextEventDayKey(byDay, '2026-06-10')).toBe('2026-06-15');
    });

    it('returns fromKey itself when inclusive and it has events', () => {
      const byDay = { '2026-06-10': [entry], '2026-06-15': [entry] };
      expect(findNextEventDayKey(byDay, '2026-06-10', true)).toBe('2026-06-10');
    });

    it('returns the earliest later key even when keys were inserted out of order', () => {
      const byDay = { '2026-07-01': [entry], '2026-06-20': [entry], '2026-06-25': [entry] };
      expect(findNextEventDayKey(byDay, '2026-06-12')).toBe('2026-06-20');
    });

    it('skips day keys whose entry arrays are empty', () => {
      const byDay = { '2026-06-13': [], '2026-06-15': [entry] };
      expect(findNextEventDayKey(byDay, '2026-06-12')).toBe('2026-06-15');
    });

    it('returns null when no day with events exists after fromKey', () => {
      const byDay = { '2026-06-10': [entry] };
      expect(findNextEventDayKey(byDay, '2026-06-10')).toBeNull();
      expect(findNextEventDayKey(byDay, '2026-07-01', true)).toBeNull();
    });

    it('returns null for an empty byDay map', () => {
      expect(findNextEventDayKey({}, '2026-06-10')).toBeNull();
      expect(findNextEventDayKey({}, '2026-06-10', true)).toBeNull();
    });
  });

  // ==========================================================================
  // countUpcomingCalendarMatches
  // ==========================================================================

  describe('countUpcomingCalendarMatches', () => {
    const TODAY_KEY = '2026-05-12';

    it('excludes events whose start day (no end_time) is before todayKey', () => {
      const past = createMockEvent({ start_time: '2026-05-10T10:00:00Z' });
      expect(
        countUpcomingCalendarMatches([past], DEFAULT_CALENDAR_FILTERS, contextWith(), TODAY_KEY)
      ).toBe(0);
    });

    it('counts events starting today or later', () => {
      const today = createMockEvent({ start_time: '2026-05-12T16:00:00Z' });
      const future = createMockEvent({ start_time: '2026-06-01T10:00:00Z' });
      expect(
        countUpcomingCalendarMatches(
          [today, future],
          DEFAULT_CALENDAR_FILTERS,
          contextWith(),
          TODAY_KEY
        )
      ).toBe(2);
    });

    it('counts an ongoing multi-day event that started in the past but ends today or later', () => {
      const ongoing = createMockEvent({
        start_time: '2026-05-10T10:00:00Z',
        end_time: '2026-05-13T10:00:00Z',
      });
      expect(
        countUpcomingCalendarMatches([ongoing], DEFAULT_CALENDAR_FILTERS, contextWith(), TODAY_KEY)
      ).toBe(1);
    });

    it('excludes a multi-day event that fully ended before today', () => {
      const ended = createMockEvent({
        start_time: '2026-05-08T10:00:00Z',
        end_time: '2026-05-10T10:00:00Z',
      });
      expect(
        countUpcomingCalendarMatches([ended], DEFAULT_CALENDAR_FILTERS, contextWith(), TODAY_KEY)
      ).toBe(0);
    });

    it('uses the Belgium-TZ end key (late-UTC end on May 11 lands on May 12 in Brussels)', () => {
      // May 11 at 22:30 UTC = May 12, 00:30 CEST — ends "today", so counted.
      const event = createMockEvent({
        start_time: '2026-05-11T10:00:00Z',
        end_time: '2026-05-11T22:30:00Z',
      });
      expect(
        countUpcomingCalendarMatches([event], DEFAULT_CALENDAR_FILTERS, contextWith(), TODAY_KEY)
      ).toBe(1);
    });

    it('skips events without a start_time', () => {
      const noStart = createMockEvent({ start_time: '' });
      expect(
        countUpcomingCalendarMatches([noStart], DEFAULT_CALENDAR_FILTERS, contextWith(), TODAY_KEY)
      ).toBe(0);
    });

    it('respects the active filters when counting', () => {
      const strike = createMockEvent({
        start_time: '2026-06-01T10:00:00Z',
        categories: ['Strike'],
      });
      const march = createMockEvent({ start_time: '2026-06-01T10:00:00Z', categories: ['March'] });
      const filters = filtersWith({ categories: ['Strike'] });
      expect(countUpcomingCalendarMatches([strike, march], filters, contextWith(), TODAY_KEY)).toBe(
        1
      );
    });

    it('applies savedOnly through the context when counting', () => {
      const saved = createMockEvent({ start_time: '2026-06-01T10:00:00Z' });
      const notSaved = createMockEvent({ start_time: '2026-06-01T10:00:00Z' });
      const filters = filtersWith({ savedOnly: true });
      const context = contextWith({ isSaved: (id) => id === saved.$id });
      expect(countUpcomingCalendarMatches([saved, notSaved], filters, context, TODAY_KEY)).toBe(1);
    });
  });

  // ==========================================================================
  // dateKeyToDate
  // ==========================================================================

  describe('dateKeyToDate', () => {
    it('parses a YYYY-MM-DD key into a local Date at that calendar day', () => {
      const date = dateKeyToDate('2026-06-10');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June (0-based)
      expect(date.getDate()).toBe(10);
    });

    it('parses zero-padded months and days', () => {
      const date = dateKeyToDate('2026-01-05');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(5);
    });

    it('returns a local-midnight Date (no time component)', () => {
      const date = dateKeyToDate('2026-06-10');
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });
  });

  // ==========================================================================
  // formatCompactCount
  // ==========================================================================

  describe('formatCompactCount', () => {
    it('returns the plain number below 1000', () => {
      expect(formatCompactCount(0, 'en')).toBe('0');
      expect(formatCompactCount(42, 'en')).toBe('42');
      expect(formatCompactCount(999, 'en')).toBe('999');
      expect(formatCompactCount(999, 'fr')).toBe('999');
    });

    it('formats exactly 1000 with the trailing zero trimmed', () => {
      expect(formatCompactCount(1000, 'en')).toBe('1k');
      expect(formatCompactCount(1000, 'fr')).toBe('1 k');
      expect(formatCompactCount(1000, 'nl')).toBe('1 k');
    });

    it('formats 1200 with one decimal, comma separator for fr/nl', () => {
      expect(formatCompactCount(1200, 'en')).toBe('1.2k');
      expect(formatCompactCount(1200, 'fr')).toBe('1,2 k');
      expect(formatCompactCount(1200, 'nl')).toBe('1,2 k');
    });

    it('trims the trailing zero for round thousands', () => {
      expect(formatCompactCount(2000, 'en')).toBe('2k');
      expect(formatCompactCount(2000, 'nl')).toBe('2 k');
    });

    it('keeps one decimal for larger counts', () => {
      expect(formatCompactCount(12345, 'en')).toBe('12.3k');
      expect(formatCompactCount(12345, 'fr')).toBe('12,3 k');
    });
  });
});
