/**
 * Tests for the confidence/sort/reschedule helpers added to
 * utils/draftStatusUtils.ts by the drafts redesign.
 *
 * The rules pinned here are the ones that are easy to get subtly wrong and
 * impossible to notice: null vs a scored 0, band boundaries, "undated last in
 * BOTH directions", "unscored last, never treated as 0", and a reschedule
 * shortcut that must keep the original weekday and clock time.
 */

import { CONFIDENCE_BANDS } from '@/constants/EventConfig';
import { Event } from '@/types/event.types';
import {
  DEFAULT_SORT_DIRECTION,
  countChecksRan,
  getConfidenceBand,
  getConfidenceChecks,
  getRescheduleOptions,
  hasConfidenceScore,
  isCappedByStartDate,
  isNewDraft,
  sortDrafts,
} from '@/utils/draftStatusUtils';

function event(overrides: Partial<Event> = {}): Event {
  return {
    $id: 'e1',
    title: 'Event',
    organizer_name: 'Org',
    ...overrides,
  } as Event;
}

describe('hasConfidenceScore', () => {
  // The whole point of the rule: absent/null means never scored and must render
  // nothing, while a scored 0 means nothing corroborated and must render.
  it('is false for null and undefined', () => {
    expect(hasConfidenceScore(event({ confidence_score: null }))).toBe(false);
    expect(hasConfidenceScore(event())).toBe(false);
  });

  it('is TRUE for a scored zero', () => {
    expect(hasConfidenceScore(event({ confidence_score: 0 }))).toBe(true);
  });

  it('is true for any other number', () => {
    expect(hasConfidenceScore(event({ confidence_score: 74 }))).toBe(true);
  });
});

describe('getConfidenceBand', () => {
  it('maps the documented boundaries', () => {
    expect(getConfidenceBand(100)).toBe('high');
    expect(getConfidenceBand(CONFIDENCE_BANDS.high)).toBe('high');
    expect(getConfidenceBand(CONFIDENCE_BANDS.high - 1)).toBe('medium');
    expect(getConfidenceBand(CONFIDENCE_BANDS.medium)).toBe('medium');
    expect(getConfidenceBand(CONFIDENCE_BANDS.medium - 1)).toBe('low');
    expect(getConfidenceBand(0)).toBe('low');
  });

  it('puts 49/50 and 79/80 on the expected sides', () => {
    expect(getConfidenceBand(49)).toBe('low');
    expect(getConfidenceBand(50)).toBe('medium');
    expect(getConfidenceBand(79)).toBe('medium');
    expect(getConfidenceBand(80)).toBe('high');
  });
});

describe('getConfidenceChecks', () => {
  it('always returns the four fields in display order', () => {
    expect(getConfidenceChecks({}).map((c) => c.field)).toEqual([
      'start_date',
      'start_time_of_day',
      'title',
      'city',
    ]);
  });

  it('reads booleans as found / not found', () => {
    const checks = getConfidenceChecks({ start_date: true, city: false });
    expect(checks.find((c) => c.field === 'start_date')?.state).toBe('found');
    expect(checks.find((c) => c.field === 'city')?.state).toBe('notFound');
  });

  // A numeric title value is a word-overlap ratio, not a verdict.
  it('reads a partial ratio as partial and keeps the raw value', () => {
    const check = getConfidenceChecks({ title: 0.6 }).find((c) => c.field === 'title');
    expect(check?.state).toBe('partial');
    expect(check?.ratio).toBe(0.6);
  });

  it('reads ratio extremes as found and not found', () => {
    expect(getConfidenceChecks({ title: 1 }).find((c) => c.field === 'title')?.state).toBe('found');
    expect(getConfidenceChecks({ title: 0 }).find((c) => c.field === 'title')?.state).toBe(
      'notFound'
    );
  });

  it('reads the string vocabulary', () => {
    expect(getConfidenceChecks({ city: 'found' }).find((c) => c.field === 'city')?.state).toBe(
      'found'
    );
    expect(getConfidenceChecks({ city: 'partial' }).find((c) => c.field === 'city')?.state).toBe(
      'partial'
    );
    expect(getConfidenceChecks({ city: 'not_found' }).find((c) => c.field === 'city')?.state).toBe(
      'notFound'
    );
  });

  // confidence_details is free-form by backend design (the automation workflow
  // owns its shape), so anything unrecognised must degrade, never throw.
  it('degrades unknown shapes and missing details to notChecked', () => {
    expect(getConfidenceChecks(undefined).every((c) => c.state === 'notChecked')).toBe(true);
    expect(getConfidenceChecks(null).every((c) => c.state === 'notChecked')).toBe(true);
    const weird = getConfidenceChecks({ start_date: { nested: true }, title: ['a'] });
    expect(weird.every((c) => c.state === 'notChecked')).toBe(true);
  });

  it('counts only the checks that ran', () => {
    const checks = getConfidenceChecks({ start_date: true, title: 0.5 });
    expect(countChecksRan(checks)).toBe(2);
    expect(checks).toHaveLength(4);
  });
});

describe('isCappedByStartDate', () => {
  it('is true only for the start_date cap marker', () => {
    expect(isCappedByStartDate({ capped_by: 'start_date' })).toBe(true);
    expect(isCappedByStartDate({ capped_by: 'title' })).toBe(false);
    expect(isCappedByStartDate({})).toBe(false);
    expect(isCappedByStartDate(null)).toBe(false);
  });
});

describe('isNewDraft', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('is true within 48 hours of creation', () => {
    expect(isNewDraft({ $createdAt: '2026-08-07T12:00:00.000Z' }, now)).toBe(true);
  });

  it('is false beyond 48 hours', () => {
    expect(isNewDraft({ $createdAt: '2026-08-05T12:00:00.000Z' }, now)).toBe(false);
  });

  it('is false without a creation timestamp', () => {
    expect(isNewDraft({}, now)).toBe(false);
  });
});

describe('sortDrafts', () => {
  const dated = (id: string, start: string, edited: string) =>
    event({ $id: id, start_time: start, $updatedAt: edited });

  describe('by date', () => {
    const a = dated('a', '2026-09-01T10:00:00.000Z', '2026-08-01T00:00:00.000Z');
    const b = dated('b', '2026-10-01T10:00:00.000Z', '2026-08-02T00:00:00.000Z');
    const undated = event({ $id: 'u', $updatedAt: '2026-08-03T00:00:00.000Z' });

    it('sorts ascending and descending by start time', () => {
      expect(sortDrafts([b, a], 'date', 'asc').map((e) => e.$id)).toEqual(['a', 'b']);
      expect(sortDrafts([a, b], 'date', 'desc').map((e) => e.$id)).toEqual(['b', 'a']);
    });

    // An undated draft is not "the oldest" — it has no date at all, so it goes
    // last whichever way the arrow points.
    it('puts undated drafts last in BOTH directions', () => {
      expect(sortDrafts([undated, a, b], 'date', 'asc').map((e) => e.$id)).toEqual(['a', 'b', 'u']);
      expect(sortDrafts([undated, a, b], 'date', 'desc').map((e) => e.$id)).toEqual([
        'b',
        'a',
        'u',
      ]);
    });

    it('treats an unparseable start time as undated', () => {
      const broken = event({ $id: 'x', start_time: 'not-a-date' });
      expect(sortDrafts([broken, a], 'date', 'asc').map((e) => e.$id)).toEqual(['a', 'x']);
    });

    it('breaks ties on last edited, most recent first', () => {
      const older = dated('older', '2026-09-01T10:00:00.000Z', '2026-08-01T00:00:00.000Z');
      const newer = dated('newer', '2026-09-01T10:00:00.000Z', '2026-08-05T00:00:00.000Z');
      expect(sortDrafts([older, newer], 'date', 'asc').map((e) => e.$id)).toEqual([
        'newer',
        'older',
      ]);
    });
  });

  describe('by confidence', () => {
    const scored = (id: string, score: number | null, edited = '2026-08-01T00:00:00.000Z') =>
      event({ $id: id, confidence_score: score, $updatedAt: edited });

    it('sorts descending by score by default', () => {
      const rows = sortDrafts([scored('low', 20), scored('high', 90)], 'confidence', 'desc');
      expect(rows.map((e) => e.$id)).toEqual(['high', 'low']);
    });

    it('sorts ascending for triage (lowest match first)', () => {
      const rows = sortDrafts([scored('high', 90), scored('low', 20)], 'confidence', 'asc');
      expect(rows.map((e) => e.$id)).toEqual(['low', 'high']);
    });

    // An unscored draft must never be sorted as if it scored 0 — that would rank
    // every human draft as the worst-corroborated thing in the list.
    it('puts unscored drafts last in BOTH directions, not as zero', () => {
      const rows = [scored('unscored', null), scored('zero', 0), scored('high', 90)];
      expect(sortDrafts(rows, 'confidence', 'asc').map((e) => e.$id)).toEqual([
        'zero',
        'high',
        'unscored',
      ]);
      expect(sortDrafts(rows, 'confidence', 'desc').map((e) => e.$id)).toEqual([
        'high',
        'zero',
        'unscored',
      ]);
    });
  });

  describe('by last edited', () => {
    it('defaults to most recently edited first', () => {
      const older = event({ $id: 'older', $updatedAt: '2026-08-01T00:00:00.000Z' });
      const newer = event({ $id: 'newer', $updatedAt: '2026-08-07T00:00:00.000Z' });
      expect(sortDrafts([older, newer], 'lastEdited').map((e) => e.$id)).toEqual([
        'newer',
        'older',
      ]);
    });

    it('falls back to $createdAt when $updatedAt is absent', () => {
      const created = event({ $id: 'created', $createdAt: '2026-08-07T00:00:00.000Z' });
      const updated = event({ $id: 'updated', $updatedAt: '2026-08-01T00:00:00.000Z' });
      expect(sortDrafts([updated, created], 'lastEdited').map((e) => e.$id)).toEqual([
        'created',
        'updated',
      ]);
    });
  });

  // Each key answers a different question, so picking a key implies a direction:
  // newest edits first, soonest dates first, and least-corroborated first — the
  // triage order the website uses.
  describe('DEFAULT_SORT_DIRECTION', () => {
    it('pairs each key with the direction that key means', () => {
      expect(DEFAULT_SORT_DIRECTION).toEqual({
        lastEdited: 'desc',
        date: 'asc',
        confidence: 'asc',
      });
    });

    it('puts the soonest date and the lowest score first by default', () => {
      const soon = event({ $id: 'soon', start_time: '2026-09-01T10:00:00.000Z' });
      const later = event({ $id: 'later', start_time: '2026-10-01T10:00:00.000Z' });
      expect(
        sortDrafts([later, soon], 'date', DEFAULT_SORT_DIRECTION.date).map((e) => e.$id)
      ).toEqual(['soon', 'later']);

      const high = event({ $id: 'high', confidence_score: 90 });
      const low = event({ $id: 'low', confidence_score: 20 });
      expect(
        sortDrafts([high, low], 'confidence', DEFAULT_SORT_DIRECTION.confidence).map((e) => e.$id)
      ).toEqual(['low', 'high']);
    });
  });

  it('does not mutate the input array', () => {
    const rows = [event({ $id: 'a' }), event({ $id: 'b' })];
    sortDrafts(rows, 'lastEdited');
    expect(rows.map((e) => e.$id)).toEqual(['a', 'b']);
  });
});

describe('getRescheduleOptions', () => {
  // 2026-08-08 is a Saturday; the original draft below is a Saturday 14:00 UTC.
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('offers the next two occurrences of the same weekday', () => {
    const options = getRescheduleOptions('2026-07-25T14:00:00.000Z', 'en', now);

    expect(options).toHaveLength(2);
    const first = new Date(options[0].isoDate);
    const second = new Date(options[1].isoDate);
    // Saturday, like the original.
    expect(first.getUTCDay()).toBe(6);
    expect(second.getUTCDay()).toBe(6);
    expect(second.getTime() - first.getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it('keeps the original clock time', () => {
    const options = getRescheduleOptions('2026-07-25T14:30:00.000Z', 'en', now);
    const first = new Date(options[0].isoDate);
    expect(first.getUTCHours()).toBe(14);
    expect(first.getUTCMinutes()).toBe(30);
  });

  it('only ever offers future dates', () => {
    const options = getRescheduleOptions('2026-07-25T14:00:00.000Z', 'en', now);
    options.forEach((option) => {
      expect(new Date(option.isoDate).getTime()).toBeGreaterThan(now.getTime());
    });
  });

  // A draft abandoned for a year should not produce 52 weeks of arithmetic drift
  // or a past date.
  it('handles a start time more than a year old', () => {
    const options = getRescheduleOptions('2025-03-01T09:00:00.000Z', 'en', now);
    expect(options).toHaveLength(2);
    const first = new Date(options[0].isoDate);
    expect(first.getTime()).toBeGreaterThan(now.getTime());
    // 2025-03-01 was a Saturday.
    expect(first.getUTCDay()).toBe(6);
    expect(first.getUTCHours()).toBe(9);
  });

  // Whole-week UTC arithmetic is what makes this safe: adding calendar days in a
  // DST-observing zone would shift the wall-clock time by an hour.
  it('does not shift the clock time across a DST boundary', () => {
    // Late-October start, "now" before it in a year where Europe/Brussels ends
    // DST on 25 October 2026.
    const options = getRescheduleOptions(
      '2026-10-17T10:00:00.000Z',
      'en',
      new Date('2026-10-20T00:00:00.000Z')
    );
    const first = new Date(options[0].isoDate);
    expect(first.getUTCHours()).toBe(10);
    expect(first.getUTCDay()).toBe(6);
  });

  it('advances a start time that is exactly now', () => {
    const options = getRescheduleOptions(now.toISOString(), 'en', now);
    expect(new Date(options[0].isoDate).getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns nothing without a usable start time', () => {
    expect(getRescheduleOptions(undefined, 'en', now)).toEqual([]);
    expect(getRescheduleOptions('', 'en', now)).toEqual([]);
    expect(getRescheduleOptions('not-a-date', 'en', now)).toEqual([]);
  });

  it('labels options with weekday, day and month', () => {
    const options = getRescheduleOptions('2026-07-25T14:00:00.000Z', 'en', now);
    expect(options[0].label).toMatch(/^[A-Z][a-z]{2} \d{2} [A-Z][a-z]{2}$/);
  });
});
