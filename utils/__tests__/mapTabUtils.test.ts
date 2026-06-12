import { createMockEvent } from '@/test-utils/render';
import {
  addDaysToDateKey,
  buildCountryOptions,
  buildPostalCodeOptions,
  countActiveMapFilters,
  countryOfPostalToken,
  DEFAULT_MAP_FILTERS,
  formatMapCardDateLabel,
  getCountryLabel,
  hasActiveMapFilters,
  hasMapCoordinates,
  isNotEnded,
  MapFilterContext,
  MapFilters,
  matchesMapFilters,
  matchesTimeWindow,
  postalTokenForEvent,
  sortEventsChronologically,
} from '../mapTabUtils';

// ============================================================================
// Helpers
// ============================================================================

const TODAY_KEY = '2026-06-10';
// 14:00 Belgium (CEST) on TODAY_KEY — the clock the ended cutoff runs against.
const NOW = new Date('2026-06-10T12:00:00.000Z');

function filtersWith(overrides: Partial<MapFilters> = {}): MapFilters {
  return { ...DEFAULT_MAP_FILTERS, ...overrides };
}

function contextWith(overrides: Partial<MapFilterContext> = {}): MapFilterContext {
  return { isSaved: () => false, ...overrides };
}

function geocodedEvent(overrides: Parameters<typeof createMockEvent>[0] = {}) {
  return createMockEvent({
    geocod_lat: 50.8466,
    geocod_lng: 4.3528,
    country: 'belgium',
    postal_code: 1000,
    ...overrides,
  });
}

describe('mapTabUtils', () => {
  // ==========================================================================
  // hasMapCoordinates
  // ==========================================================================

  describe('hasMapCoordinates', () => {
    it('accepts events with both coordinates', () => {
      expect(hasMapCoordinates(geocodedEvent())).toBe(true);
    });

    it('rejects events missing either coordinate (online/ungeocoded)', () => {
      expect(hasMapCoordinates(createMockEvent())).toBe(false);
      expect(hasMapCoordinates(createMockEvent({ geocod_lat: 50.8 }))).toBe(false);
      expect(hasMapCoordinates(createMockEvent({ geocod_lng: 4.35 }))).toBe(false);
      expect(hasMapCoordinates(createMockEvent({ geocod_lat: null, geocod_lng: null }))).toBe(
        false
      );
    });

    it('rejects non-finite coordinates', () => {
      expect(hasMapCoordinates(createMockEvent({ geocod_lat: NaN, geocod_lng: 4.35 }))).toBe(false);
    });
  });

  // ==========================================================================
  // addDaysToDateKey
  // ==========================================================================

  describe('addDaysToDateKey', () => {
    it('shifts within the same month', () => {
      expect(addDaysToDateKey('2026-06-10', 7)).toBe('2026-06-17');
    });

    it('rolls over month and year boundaries', () => {
      expect(addDaysToDateKey('2026-06-28', 7)).toBe('2026-07-05');
      expect(addDaysToDateKey('2026-12-30', 7)).toBe('2027-01-06');
    });
  });

  // ==========================================================================
  // isNotEnded / matchesTimeWindow
  // ==========================================================================

  describe('isNotEnded', () => {
    it('keeps events starting later today or in the future', () => {
      expect(isNotEnded(geocodedEvent({ start_time: '2026-06-10T16:00:00.000Z' }), NOW)).toBe(true);
      expect(isNotEnded(geocodedEvent({ start_time: '2026-07-01T10:00:00.000Z' }), NOW)).toBe(true);
    });

    it('drops events that ended on an earlier day', () => {
      expect(isNotEnded(geocodedEvent({ start_time: '2026-06-09T10:00:00.000Z' }), NOW)).toBe(
        false
      );
    });

    it('drops a today event whose end time has already passed', () => {
      // 09:00–10:00 Belgium; "now" is 14:00 Belgium the same day.
      const endedToday = geocodedEvent({
        start_time: '2026-06-10T07:00:00.000Z',
        end_time: '2026-06-10T08:00:00.000Z',
      });
      expect(isNotEnded(endedToday, NOW)).toBe(false);
    });

    it('keeps a today event that is currently in progress', () => {
      // 13:00–15:00 Belgium spans "now" (14:00 Belgium).
      const inProgress = geocodedEvent({
        start_time: '2026-06-10T11:00:00.000Z',
        end_time: '2026-06-10T13:00:00.000Z',
      });
      expect(isNotEnded(inProgress, NOW)).toBe(true);
    });

    it('uses the default duration for events without an end time', () => {
      // Effective end = start + 2h: 11:00Z ends 13:00Z (after NOW), 09:00Z
      // ends 11:00Z (before NOW).
      expect(isNotEnded(geocodedEvent({ start_time: '2026-06-10T11:00:00.000Z' }), NOW)).toBe(true);
      expect(isNotEnded(geocodedEvent({ start_time: '2026-06-10T09:00:00.000Z' }), NOW)).toBe(
        false
      );
    });

    it('keeps multi-day events still running today', () => {
      const event = geocodedEvent({
        start_time: '2026-06-08T10:00:00.000Z',
        end_time: '2026-06-12T18:00:00.000Z',
      });
      expect(isNotEnded(event, NOW)).toBe(true);
    });

    it('drops events without a start time', () => {
      expect(isNotEnded(geocodedEvent({ start_time: '' }), NOW)).toBe(false);
    });
  });

  describe('matchesTimeWindow', () => {
    const today = geocodedEvent({ start_time: '2026-06-10T16:00:00.000Z' });
    const inFiveDays = geocodedEvent({ start_time: '2026-06-15T10:00:00.000Z' });
    const inTenDays = geocodedEvent({ start_time: '2026-06-20T10:00:00.000Z' });
    const ongoingMultiDay = geocodedEvent({
      start_time: '2026-06-08T10:00:00.000Z',
      end_time: '2026-06-12T18:00:00.000Z',
    });

    it("'all' keeps every upcoming event", () => {
      expect(matchesTimeWindow(today, 'all', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(inTenDays, 'all', TODAY_KEY, NOW)).toBe(true);
    });

    it("'all' still drops past events", () => {
      const past = geocodedEvent({ start_time: '2026-06-01T10:00:00.000Z' });
      expect(matchesTimeWindow(past, 'all', TODAY_KEY, NOW)).toBe(false);
    });

    it('a today event whose end time has passed matches no window', () => {
      const endedToday = geocodedEvent({
        start_time: '2026-06-10T07:00:00.000Z',
        end_time: '2026-06-10T08:00:00.000Z',
      });
      expect(matchesTimeWindow(endedToday, 'all', TODAY_KEY, NOW)).toBe(false);
      expect(matchesTimeWindow(endedToday, 'today', TODAY_KEY, NOW)).toBe(false);
      expect(matchesTimeWindow(endedToday, 'week', TODAY_KEY, NOW)).toBe(false);
    });

    it("'today' keeps events starting today and multi-day events spanning today", () => {
      expect(matchesTimeWindow(today, 'today', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(ongoingMultiDay, 'today', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(inFiveDays, 'today', TODAY_KEY, NOW)).toBe(false);
    });

    it("'week' keeps events starting within the next 7 days, including ongoing ones", () => {
      expect(matchesTimeWindow(today, 'week', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(inFiveDays, 'week', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(ongoingMultiDay, 'week', TODAY_KEY, NOW)).toBe(true);
      expect(matchesTimeWindow(inTenDays, 'week', TODAY_KEY, NOW)).toBe(false);
    });
  });

  // ==========================================================================
  // postal tokens
  // ==========================================================================

  describe('postalTokenForEvent', () => {
    it('prefixes the code with the country so BE/NL codes cannot collide', () => {
      expect(postalTokenForEvent(geocodedEvent())).toBe('belgium:1000');
      expect(
        postalTokenForEvent(geocodedEvent({ country: 'netherlands', postal_code: 1012 }))
      ).toBe('netherlands:1012');
    });

    it('returns null without a postal code or country', () => {
      expect(postalTokenForEvent(geocodedEvent({ postal_code: null }))).toBeNull();
      expect(postalTokenForEvent(geocodedEvent({ country: '' }))).toBeNull();
    });

    it('countryOfPostalToken extracts the country', () => {
      expect(countryOfPostalToken('belgium:1000')).toBe('belgium');
      expect(countryOfPostalToken('netherlands:1012')).toBe('netherlands');
    });
  });

  // ==========================================================================
  // matchesMapFilters
  // ==========================================================================

  describe('matchesMapFilters', () => {
    it('matches everything with the default filters', () => {
      expect(matchesMapFilters(geocodedEvent(), DEFAULT_MAP_FILTERS, contextWith())).toBe(true);
    });

    it('filters by category overlap', () => {
      const event = geocodedEvent({ categories: ['Strike'] });
      expect(
        matchesMapFilters(event, filtersWith({ categories: ['Strike', 'Learn'] }), contextWith())
      ).toBe(true);
      expect(
        matchesMapFilters(event, filtersWith({ categories: ['Protest'] }), contextWith())
      ).toBe(false);
    });

    it('drops events without categories when a category filter is active', () => {
      const event = geocodedEvent({ categories: undefined });
      expect(
        matchesMapFilters(event, filtersWith({ categories: ['Protest'] }), contextWith())
      ).toBe(false);
    });

    it('filters by country, case-insensitively', () => {
      const event = geocodedEvent({ country: 'Belgium' });
      expect(matchesMapFilters(event, filtersWith({ country: 'belgium' }), contextWith())).toBe(
        true
      );
      expect(matchesMapFilters(event, filtersWith({ country: 'netherlands' }), contextWith())).toBe(
        false
      );
    });

    it('drops events without a country when a country filter is active', () => {
      const event = geocodedEvent({ country: '' });
      expect(matchesMapFilters(event, filtersWith({ country: 'belgium' }), contextWith())).toBe(
        false
      );
    });

    it('filters by postal-code tokens', () => {
      const brussels = geocodedEvent();
      const ghent = geocodedEvent({ postal_code: 9000 });
      const filters = filtersWith({ postalCodes: ['belgium:1000'] });
      expect(matchesMapFilters(brussels, filters, contextWith())).toBe(true);
      expect(matchesMapFilters(ghent, filters, contextWith())).toBe(false);
    });

    it('drops events without a postal code when a postal filter is active', () => {
      const event = geocodedEvent({ postal_code: null });
      expect(
        matchesMapFilters(event, filtersWith({ postalCodes: ['belgium:1000'] }), contextWith())
      ).toBe(false);
    });

    it('filters by organization id', () => {
      const event = geocodedEvent({ organization_id: 'org-1' });
      expect(
        matchesMapFilters(event, filtersWith({ organizations: ['org-1'] }), contextWith())
      ).toBe(true);
      expect(
        matchesMapFilters(event, filtersWith({ organizations: ['org-2'] }), contextWith())
      ).toBe(false);
    });

    it('filters by saved state via the context callback', () => {
      const event = geocodedEvent();
      const savedContext = contextWith({ isSaved: (id) => id === event.$id });
      expect(matchesMapFilters(event, filtersWith({ savedOnly: true }), savedContext)).toBe(true);
      expect(matchesMapFilters(event, filtersWith({ savedOnly: true }), contextWith())).toBe(false);
    });

    it('filters by help needed', () => {
      expect(
        matchesMapFilters(
          geocodedEvent({ help_needed: true }),
          filtersWith({ helpNeeded: true }),
          contextWith()
        )
      ).toBe(true);
      expect(
        matchesMapFilters(geocodedEvent(), filtersWith({ helpNeeded: true }), contextWith())
      ).toBe(false);
    });
  });

  // ==========================================================================
  // sortEventsChronologically
  // ==========================================================================

  describe('sortEventsChronologically', () => {
    it('sorts soonest first without mutating the input', () => {
      const later = geocodedEvent({ start_time: '2026-06-20T10:00:00.000Z' });
      const sooner = geocodedEvent({ start_time: '2026-06-11T10:00:00.000Z' });
      const input = [later, sooner];
      const sorted = sortEventsChronologically(input);
      expect(sorted.map((e) => e.$id)).toEqual([sooner.$id, later.$id]);
      expect(input[0].$id).toBe(later.$id);
    });

    it('breaks ties on id for a stable order', () => {
      const a = geocodedEvent({ $id: 'a', start_time: '2026-06-11T10:00:00.000Z' });
      const b = geocodedEvent({ $id: 'b', start_time: '2026-06-11T10:00:00.000Z' });
      expect(sortEventsChronologically([b, a]).map((e) => e.$id)).toEqual(['a', 'b']);
    });
  });

  // ==========================================================================
  // countActiveMapFilters / hasActiveMapFilters
  // ==========================================================================

  describe('countActiveMapFilters', () => {
    it('returns 0 for the default filters', () => {
      expect(countActiveMapFilters(DEFAULT_MAP_FILTERS)).toBe(0);
      expect(hasActiveMapFilters(DEFAULT_MAP_FILTERS)).toBe(false);
    });

    it('counts categories and country as one each, postal codes and organizations per item', () => {
      const filters = filtersWith({
        categories: ['Protest', 'Strike'],
        country: 'belgium',
        postalCodes: ['belgium:1000', 'belgium:9000'],
        organizations: ['org-1'],
        savedOnly: true,
        helpNeeded: true,
      });
      // 1 (categories) + 1 (country) + 2 (postals) + 1 (orgs) + 1 + 1
      expect(countActiveMapFilters(filters)).toBe(7);
      expect(hasActiveMapFilters(filters)).toBe(true);
    });
  });

  // ==========================================================================
  // option derivation
  // ==========================================================================

  describe('buildCountryOptions', () => {
    it('lists distinct known countries with localized labels, Belgium first', () => {
      const events = [
        geocodedEvent({ country: 'netherlands' }),
        geocodedEvent({ country: 'belgium' }),
        geocodedEvent({ country: 'belgium' }),
      ];
      expect(buildCountryOptions(events, 'fr')).toEqual([
        { value: 'belgium', label: 'Belgique' },
        { value: 'netherlands', label: 'Pays-Bas' },
      ]);
    });

    it('ignores events without a country and appends unknown values as-is', () => {
      const events = [geocodedEvent({ country: '' }), geocodedEvent({ country: 'germany' })];
      expect(buildCountryOptions(events, 'en')).toEqual([{ value: 'germany', label: 'germany' }]);
    });

    it('getCountryLabel falls back to English, then the raw value', () => {
      expect(getCountryLabel('belgium', 'nl')).toBe('België');
      expect(getCountryLabel('atlantis', 'fr')).toBe('atlantis');
    });
  });

  describe('buildPostalCodeOptions', () => {
    const resolveCommune = (code: string, country: string, fallbackCity?: string | null) => {
      if (country === 'belgium' && code === '1000') return 'Bruxelles';
      return fallbackCity ?? '';
    };

    it('derives distinct "{code} · {commune}" options from the events', () => {
      const events = [
        geocodedEvent(),
        geocodedEvent(), // duplicate postal code — deduped
        geocodedEvent({ country: 'netherlands', postal_code: 1012, city: 'Amsterdam' }),
      ];
      expect(buildPostalCodeOptions(events, resolveCommune)).toEqual([
        {
          value: 'belgium:1000',
          label: '1000 · Bruxelles',
          searchText: '1000 · bruxelles',
          country: 'belgium',
        },
        {
          value: 'netherlands:1012',
          label: '1012 · Amsterdam',
          searchText: '1012 · amsterdam',
          country: 'netherlands',
        },
      ]);
    });

    it('falls back to the bare code when no commune resolves', () => {
      const events = [geocodedEvent({ postal_code: 9000, city: null })];
      expect(buildPostalCodeOptions(events, resolveCommune)).toEqual([
        { value: 'belgium:9000', label: '9000', searchText: '9000', country: 'belgium' },
      ]);
    });

    it('skips events without a postal code or country', () => {
      const events = [geocodedEvent({ postal_code: null }), geocodedEvent({ country: '' })];
      expect(buildPostalCodeOptions(events, resolveCommune)).toEqual([]);
    });
  });

  // ==========================================================================
  // formatMapCardDateLabel
  // ==========================================================================

  describe('formatMapCardDateLabel', () => {
    const TODAY_LABEL = "Aujourd'hui";

    it('returns the today label for events starting today', () => {
      const event = geocodedEvent({ start_time: '2026-06-10T16:00:00.000Z' });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe(TODAY_LABEL);
    });

    it('formats single-day events as "Weekday day month"', () => {
      // 2026-06-20 is a Saturday.
      const event = geocodedEvent({ start_time: '2026-06-20T12:00:00.000Z' });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe('Sam. 20 juin');
      expect(formatMapCardDateLabel(event, 'en', TODAY_KEY, 'Today')).toBe('Sat 20 June');
    });

    it('formats same-month multi-day events as a compact range', () => {
      const event = geocodedEvent({
        start_time: '2026-06-19T10:00:00.000Z',
        end_time: '2026-06-22T18:00:00.000Z',
      });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe('19–22 juin');
    });

    it('keeps the range for multi-day events spanning today (prototype priority)', () => {
      const event = geocodedEvent({
        start_time: '2026-06-09T10:00:00.000Z',
        end_time: '2026-06-12T18:00:00.000Z',
      });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe('9–12 juin');
    });

    it('formats cross-month multi-day events with short month names', () => {
      const event = geocodedEvent({
        start_time: '2026-06-28T10:00:00.000Z',
        end_time: '2026-07-02T18:00:00.000Z',
      });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe('28 juin – 2 juil.');
    });

    it('uses the Belgium day for events near midnight UTC', () => {
      // 23:30 UTC on the 19th is 01:30 on the 20th in Brussels (summer, UTC+2).
      const event = geocodedEvent({ start_time: '2026-06-19T23:30:00.000Z' });
      expect(formatMapCardDateLabel(event, 'fr', TODAY_KEY, TODAY_LABEL)).toBe('Sam. 20 juin');
    });
  });
});
