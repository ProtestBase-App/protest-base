/**
 * Tests for utils/draftStatusUtils.ts
 *
 * Fixed "now" anchor: 2026-06-12T10:00:00Z (UTC).
 * In Belgium (UTC+2 in June) that is 2026-06-12 12:00:00 local time.
 *
 * getDraftStatus delegates to getPublishIssues, which calls Date.now()
 * internally for the future-start check. Any test that exercises start_time
 * behaviour uses jest.useFakeTimers().setSystemTime() so the faked wall clock
 * matches the explicit `now` argument we pass.
 */

import { createMockEvent } from '@/test-utils/render';
import {
  getDraftStatus,
  getEditedAgoParts,
  formatDraftDateLine,
  sortDraftsByLastEdited,
} from '../draftStatusUtils';

// ============================================================================
// Shared constants
// ============================================================================

/** Fixed UTC instant used as `now` throughout every test group. */
const NOW = new Date('2026-06-12T10:00:00Z');

/** One minute before NOW — parse-safe past date. */
const PAST_START = '2026-06-12T09:59:00Z';

/** One minute after NOW — a valid future start. */
const FUTURE_START = '2026-06-12T10:01:00Z';

// ============================================================================
// getDraftStatus
// ============================================================================

describe('getDraftStatus', () => {
  // Anchor the fake clock so getPublishIssues' Date.now() check aligns with NOW.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Happy path — kind: 'ready'
  // --------------------------------------------------------------------------

  describe("kind: 'ready'", () => {
    it('returns ready when all required fields are present and start_time is in the future', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('ready');
      expect(result.missingFieldKeys).toHaveLength(0);
    });

    it('returns ready when location is satisfied by street_address alone (no city)', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['March'],
        city: null,
        street_address: 'Main Street 1',
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('ready');
    });

    it('returns ready when location is satisfied by city alone (no street_address)', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Rally'],
        city: 'Ghent',
        street_address: null,
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('ready');
    });

    it('returns ready when start_time is exactly 1 minute in the future', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Rally'],
        city: 'Ghent',
        start_time: FUTURE_START, // NOW + 1 min
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('ready');
    });
  });

  // --------------------------------------------------------------------------
  // kind: 'missing'
  // --------------------------------------------------------------------------

  describe("kind: 'missing'", () => {
    it('returns missing when description is absent', () => {
      const event = createMockEvent({
        description: '',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldDescription');
    });

    it('returns missing when categories is an empty array', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: [],
        city: 'Brussels',
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldCategory');
    });

    it('returns missing when categories is undefined', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: undefined,
        city: 'Brussels',
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldCategory');
    });

    it('returns missing when both city and street_address are absent', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: null,
        street_address: null,
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldLocation');
    });

    it('returns missing when city is an empty string and street_address is absent', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: '   ',
        street_address: null,
        start_time: FUTURE_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldLocation');
    });

    it('returns missing with drafts.fieldDate when start_time is absent (undefined)', () => {
      // start_time is required by the Event type, so we cast
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: undefined as unknown as string,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldDate');
    });

    it('returns missing with drafts.fieldDate when start_time is an empty string', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: '',
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldDate');
    });

    it('returns missing with drafts.fieldDate when start_time is unparseable', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: 'not-a-date',
      });

      const result = getDraftStatus(event, NOW);

      // Blank/unparseable start counts as missing field, not pastDate
      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldDate');
    });

    it('accumulates all four missing field keys when the draft is completely empty', () => {
      const event = createMockEvent({
        description: '',
        categories: [],
        city: null,
        street_address: null,
        start_time: '',
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('missing');
      expect(result.missingFieldKeys).toContain('drafts.fieldDescription');
      expect(result.missingFieldKeys).toContain('drafts.fieldCategory');
      expect(result.missingFieldKeys).toContain('drafts.fieldLocation');
      expect(result.missingFieldKeys).toContain('drafts.fieldDate');
    });
  });

  // --------------------------------------------------------------------------
  // kind: 'pastDate'
  // --------------------------------------------------------------------------

  describe("kind: 'pastDate'", () => {
    it('returns pastDate when start_time is before now', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: PAST_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('pastDate');
    });

    it('returns pastDate when start_time equals now exactly (boundary: <= now)', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: NOW.toISOString(),
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('pastDate');
    });

    it('excludes the start_time issue from missingFieldKeys for pastDate', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: PAST_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.missingFieldKeys).not.toContain('drafts.fieldDate');
    });

    it('takes pastDate precedence even when other fields are also missing', () => {
      // description and categories are missing, but past start_time takes precedence
      const event = createMockEvent({
        description: '',
        categories: [],
        city: 'Brussels',
        start_time: PAST_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('pastDate');
    });

    it('lists other missing fields in missingFieldKeys alongside pastDate kind', () => {
      // description and categories are missing; start_time is past
      const event = createMockEvent({
        description: '',
        categories: [],
        city: 'Brussels',
        start_time: PAST_START,
      });

      const result = getDraftStatus(event, NOW);

      // start_time field is suppressed from missingFieldKeys
      expect(result.missingFieldKeys).not.toContain('drafts.fieldDate');
      // other missing fields are still listed
      expect(result.missingFieldKeys).toContain('drafts.fieldDescription');
      expect(result.missingFieldKeys).toContain('drafts.fieldCategory');
    });

    it('returns pastDate with empty missingFieldKeys when only start_time is the problem', () => {
      const event = createMockEvent({
        description: 'Valid description',
        categories: ['Strike'],
        city: 'Brussels',
        start_time: PAST_START,
      });

      const result = getDraftStatus(event, NOW);

      expect(result.kind).toBe('pastDate');
      expect(result.missingFieldKeys).toHaveLength(0);
    });
  });
});

// ============================================================================
// getEditedAgoParts
// ============================================================================

describe('getEditedAgoParts', () => {
  describe('null when no timestamps', () => {
    it('returns null when both $updatedAt and $createdAt are absent', () => {
      const event = createMockEvent({ $updatedAt: undefined, $createdAt: undefined });

      expect(getEditedAgoParts(event, NOW)).toBeNull();
    });

    it('returns null when $updatedAt is an empty string and $createdAt is absent', () => {
      const event = createMockEvent({ $updatedAt: '', $createdAt: undefined });

      // empty string is falsy, so falls through to $createdAt which is also absent
      expect(getEditedAgoParts(event, NOW)).toBeNull();
    });

    it('returns null when the only timestamp is unparseable (NaN elapsed)', () => {
      const event = createMockEvent({ $updatedAt: 'garbage', $createdAt: undefined });

      expect(getEditedAgoParts(event, NOW)).toBeNull();
    });
  });

  describe('timestamp fallback: $updatedAt takes precedence over $createdAt', () => {
    it('uses $updatedAt when both are present', () => {
      const updatedAt = new Date(NOW.getTime() - 5 * 60000).toISOString(); // 5 min ago
      const createdAt = new Date(NOW.getTime() - 60 * 60000).toISOString(); // 60 min ago

      const event = createMockEvent({ $updatedAt: updatedAt, $createdAt: createdAt });

      const result = getEditedAgoParts(event, NOW);

      // 5 minutes → editedMinutesAgo
      expect(result?.key).toBe('drafts.editedMinutesAgo');
      expect(result?.count).toBe(5);
    });

    it('falls back to $createdAt when $updatedAt is absent', () => {
      const createdAt = new Date(NOW.getTime() - 3 * 60000).toISOString(); // 3 min ago

      const event = createMockEvent({ $updatedAt: undefined, $createdAt: createdAt });

      const result = getEditedAgoParts(event, NOW);

      expect(result?.key).toBe('drafts.editedMinutesAgo');
      expect(result?.count).toBe(3);
    });

    it('uses $createdAt when $updatedAt is absent and $createdAt is present', () => {
      const createdAt = new Date(NOW.getTime() - 25 * 60000).toISOString(); // 25 min ago

      const event = createMockEvent({ $updatedAt: undefined, $createdAt: createdAt });

      const result = getEditedAgoParts(event, NOW);

      expect(result?.key).toBe('drafts.editedMinutesAgo');
      expect(result?.count).toBe(25);
    });
  });

  describe('editedJustNow bucket (<1 min elapsed)', () => {
    it('returns editedJustNow for an edit 0 seconds ago (exactly now)', () => {
      const event = createMockEvent({ $updatedAt: NOW.toISOString() });

      const result = getEditedAgoParts(event, NOW);

      expect(result).toEqual({ key: 'drafts.editedJustNow' });
    });

    it('returns editedJustNow for an edit 30 seconds ago', () => {
      const stamp = new Date(NOW.getTime() - 30000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({ key: 'drafts.editedJustNow' });
    });

    it('returns editedJustNow for a future timestamp (negative elapsed)', () => {
      const futureStamp = new Date(NOW.getTime() + 60000).toISOString();
      const event = createMockEvent({ $updatedAt: futureStamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({ key: 'drafts.editedJustNow' });
    });

    it('returns editedJustNow for an edit exactly 59 seconds ago', () => {
      const stamp = new Date(NOW.getTime() - 59000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({ key: 'drafts.editedJustNow' });
    });
  });

  describe('editedMinutesAgo bucket (1–59 min)', () => {
    it('returns editedMinutesAgo with count=1 for an edit exactly 1 minute ago', () => {
      const stamp = new Date(NOW.getTime() - 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedMinutesAgo',
        count: 1,
      });
    });

    it('returns editedMinutesAgo with count=30 for an edit 30 minutes ago', () => {
      const stamp = new Date(NOW.getTime() - 30 * 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedMinutesAgo',
        count: 30,
      });
    });

    it('returns editedMinutesAgo with count=59 for an edit exactly 59 minutes ago', () => {
      const stamp = new Date(NOW.getTime() - 59 * 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedMinutesAgo',
        count: 59,
      });
    });
  });

  describe('editedHoursAgo bucket (1–23 h)', () => {
    it('returns editedHoursAgo with count=1 for an edit exactly 60 minutes ago', () => {
      const stamp = new Date(NOW.getTime() - 60 * 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedHoursAgo',
        count: 1,
      });
    });

    it('returns editedHoursAgo with count=5 for an edit 5 hours ago', () => {
      const stamp = new Date(NOW.getTime() - 5 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedHoursAgo',
        count: 5,
      });
    });

    it('returns editedHoursAgo with count=23 for an edit 23 hours 59 minutes ago', () => {
      const stamp = new Date(NOW.getTime() - (23 * 60 + 59) * 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedHoursAgo',
        count: 23,
      });
    });
  });

  describe('editedYesterday bucket (exactly 1 day)', () => {
    it('returns editedYesterday for an edit exactly 24 hours ago', () => {
      const stamp = new Date(NOW.getTime() - 24 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({ key: 'drafts.editedYesterday' });
    });

    it('returns editedYesterday for an edit 47 hours 59 minutes ago (still floor-day=1)', () => {
      const stamp = new Date(NOW.getTime() - (47 * 60 + 59) * 60000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({ key: 'drafts.editedYesterday' });
    });
  });

  describe('editedDaysAgo bucket (2–6 days)', () => {
    it('returns editedDaysAgo with count=2 for an edit 48 hours ago', () => {
      const stamp = new Date(NOW.getTime() - 48 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedDaysAgo',
        count: 2,
      });
    });

    it('returns editedDaysAgo with count=6 for an edit 6 days ago', () => {
      const stamp = new Date(NOW.getTime() - 6 * 24 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedDaysAgo',
        count: 6,
      });
    });
  });

  describe('editedWeeksAgo bucket (7+ days)', () => {
    it('returns editedWeeksAgo with count=1 for an edit exactly 7 days ago', () => {
      const stamp = new Date(NOW.getTime() - 7 * 24 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedWeeksAgo',
        count: 1,
      });
    });

    it('returns editedWeeksAgo with count=2 for an edit 14 days ago', () => {
      const stamp = new Date(NOW.getTime() - 14 * 24 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedWeeksAgo',
        count: 2,
      });
    });

    it('returns editedWeeksAgo with count=4 for an edit 30 days ago (floor 30/7 = 4)', () => {
      const stamp = new Date(NOW.getTime() - 30 * 24 * 3600000).toISOString();
      const event = createMockEvent({ $updatedAt: stamp });

      expect(getEditedAgoParts(event, NOW)).toEqual({
        key: 'drafts.editedWeeksAgo',
        count: 4,
      });
    });
  });
});

// ============================================================================
// formatDraftDateLine
// ============================================================================

describe('formatDraftDateLine', () => {
  /**
   * Reference instant: 2026-06-27T11:00:00Z
   * Belgium (UTC+2 in June summer time) → local date is Saturday 27 June at 13:00.
   */
  const SATURDAY_JUN_27_UTC = '2026-06-27T11:00:00Z';

  describe('null for missing / blank / unparseable start times', () => {
    it('returns null for undefined', () => {
      expect(formatDraftDateLine(undefined, 'en')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(formatDraftDateLine('', 'en')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(formatDraftDateLine('   ', 'en')).toBeNull();
    });

    it('returns null for an unparseable string', () => {
      expect(formatDraftDateLine('not-a-date', 'en')).toBeNull();
    });
  });

  describe('UTC-to-Brussels offset (UTC+2 in June)', () => {
    it("renders 13:00 for '2026-06-27T11:00:00Z' (UTC+2 shift)", () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');

      expect(result).not.toBeNull();
      expect(result).toContain('13:00');
    });

    it('contains the separator · in the result', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');

      expect(result).toContain('·');
    });

    it('matches /Sat/i for a Saturday in en locale', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');

      expect(result).toMatch(/sat/i);
    });

    it('contains "27" (the day of month) for 2026-06-27', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');

      expect(result).toMatch(/27/);
    });

    it('contains a Jun abbreviation for June in en locale', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');

      expect(result).toMatch(/jun/i);
    });
  });

  describe('fr locale', () => {
    it('returns a non-null result for a valid start time', () => {
      expect(formatDraftDateLine(SATURDAY_JUN_27_UTC, 'fr')).not.toBeNull();
    });

    it('still uses 24h time (13:00) regardless of locale', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'fr');

      expect(result).toContain('13:00');
    });

    it('still contains the · separator in fr locale', () => {
      expect(formatDraftDateLine(SATURDAY_JUN_27_UTC, 'fr')).toContain('·');
    });
  });

  describe('nl locale', () => {
    it('returns a non-null result for a valid start time', () => {
      expect(formatDraftDateLine(SATURDAY_JUN_27_UTC, 'nl')).not.toBeNull();
    });

    it('still uses 24h time (13:00) regardless of locale', () => {
      const result = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'nl');

      expect(result).toContain('13:00');
    });
  });

  describe('unknown locale falls back to en-GB', () => {
    it('returns a non-null result for an unknown locale code', () => {
      expect(formatDraftDateLine(SATURDAY_JUN_27_UTC, 'xx')).not.toBeNull();
    });

    it('produces the same result as en for an unknown locale', () => {
      const en = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'en');
      const xx = formatDraftDateLine(SATURDAY_JUN_27_UTC, 'xx');

      expect(xx).toBe(en);
    });
  });

  describe('midnight boundary — no timezone is applied on the wrong day', () => {
    it("renders the correct Belgium day for '2026-06-26T22:00:00Z' (UTC+2 → 00:00 Jun 27)", () => {
      // 22:00 UTC = 00:00 Brussels next day
      const result = formatDraftDateLine('2026-06-26T22:00:00Z', 'en');

      // The day rendered must be 27 June, not 26
      expect(result).toMatch(/27/);
      expect(result).toContain('00:00');
    });
  });
});

// ============================================================================
// sortDraftsByLastEdited
// ============================================================================

describe('sortDraftsByLastEdited', () => {
  describe('basic ordering', () => {
    it('returns an empty array when given an empty array', () => {
      expect(sortDraftsByLastEdited([])).toEqual([]);
    });

    it('returns a single-element array unchanged', () => {
      const event = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });

      const result = sortDraftsByLastEdited([event]);

      expect(result).toHaveLength(1);
      expect(result[0].$id).toBe(event.$id);
    });

    it('sorts two events descending by $updatedAt', () => {
      const older = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const newer = createMockEvent({ $updatedAt: '2026-06-11T10:00:00Z' });

      const result = sortDraftsByLastEdited([older, newer]);

      expect(result[0].$id).toBe(newer.$id);
      expect(result[1].$id).toBe(older.$id);
    });

    it('sorts three events correctly in descending order', () => {
      const a = createMockEvent({ $updatedAt: '2026-06-08T10:00:00Z' });
      const b = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const c = createMockEvent({ $updatedAt: '2026-06-09T10:00:00Z' });

      const result = sortDraftsByLastEdited([a, b, c]);

      expect(result.map((e) => e.$id)).toEqual([b.$id, c.$id, a.$id]);
    });
  });

  describe('$updatedAt vs $createdAt fallback', () => {
    it('uses $updatedAt when present, ignoring $createdAt for ordering', () => {
      // A was created earlier but updated later
      const a = createMockEvent({
        $createdAt: '2026-06-05T10:00:00Z',
        $updatedAt: '2026-06-12T10:00:00Z',
      });
      // B was created later but never updated
      const b = createMockEvent({
        $createdAt: '2026-06-11T10:00:00Z',
        $updatedAt: undefined,
      });

      const result = sortDraftsByLastEdited([b, a]);

      expect(result[0].$id).toBe(a.$id);
    });

    it('falls back to $createdAt when $updatedAt is absent', () => {
      const older = createMockEvent({
        $createdAt: '2026-06-08T10:00:00Z',
        $updatedAt: undefined,
      });
      const newer = createMockEvent({
        $createdAt: '2026-06-10T10:00:00Z',
        $updatedAt: undefined,
      });

      const result = sortDraftsByLastEdited([older, newer]);

      expect(result[0].$id).toBe(newer.$id);
      expect(result[1].$id).toBe(older.$id);
    });
  });

  describe('missing / invalid timestamps sort last', () => {
    it('places an event with no timestamps after an event with valid timestamps', () => {
      const withStamp = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const noStamp = createMockEvent({ $updatedAt: undefined, $createdAt: undefined });

      const result = sortDraftsByLastEdited([noStamp, withStamp]);

      expect(result[0].$id).toBe(withStamp.$id);
      expect(result[1].$id).toBe(noStamp.$id);
    });

    it('places an event with an invalid $updatedAt timestamp after a valid one', () => {
      const valid = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const invalid = createMockEvent({ $updatedAt: 'garbage', $createdAt: undefined });

      const result = sortDraftsByLastEdited([invalid, valid]);

      expect(result[0].$id).toBe(valid.$id);
      expect(result[1].$id).toBe(invalid.$id);
    });

    it('places two no-timestamp events both after events with valid timestamps', () => {
      const a = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const b = createMockEvent({ $updatedAt: undefined, $createdAt: undefined });
      const c = createMockEvent({ $updatedAt: undefined, $createdAt: undefined });

      const result = sortDraftsByLastEdited([b, a, c]);

      // a must be first; b and c (both 0) may be in any order relative to each other
      expect(result[0].$id).toBe(a.$id);
      expect([result[1].$id, result[2].$id]).toEqual(expect.arrayContaining([b.$id, c.$id]));
    });
  });

  describe('does not mutate the input array', () => {
    it('returns a new array and leaves the original untouched', () => {
      const a = createMockEvent({ $updatedAt: '2026-06-08T10:00:00Z' });
      const b = createMockEvent({ $updatedAt: '2026-06-10T10:00:00Z' });
      const original = [a, b];

      const result = sortDraftsByLastEdited(original);

      // Input order should be unchanged
      expect(original[0].$id).toBe(a.$id);
      expect(original[1].$id).toBe(b.$id);
      // Result is a new reference
      expect(result).not.toBe(original);
      // Result is sorted
      expect(result[0].$id).toBe(b.$id);
    });
  });

  describe('equal timestamps', () => {
    it('handles two events with the same $updatedAt without crashing', () => {
      const stamp = '2026-06-10T10:00:00Z';
      const a = createMockEvent({ $updatedAt: stamp });
      const b = createMockEvent({ $updatedAt: stamp });

      const result = sortDraftsByLastEdited([a, b]);

      // Both should be present; order between equal timestamps is stable but not specified
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.$id)).toEqual(expect.arrayContaining([a.$id, b.$id]));
    });
  });
});
