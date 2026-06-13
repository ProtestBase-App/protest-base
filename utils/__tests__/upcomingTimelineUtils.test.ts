import { createMockEvent } from '@/test-utils/render';
import {
  isStartedAndOngoing,
  splitUpcomingEvents,
  buildUpcomingSections,
  formatGroupDateLabel,
  getStartsIn,
  getOngoingDayProgress,
} from '../upcomingTimelineUtils';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fixed "now" for all tests: 2026-06-12T10:00:00Z.
 * In Belgium (UTC+2 in June), this is 2026-06-12 12:00:00.
 * Today key: '2026-06-12'.
 */
const NOW = new Date('2026-06-12T10:00:00Z');
const TODAY_KEY = '2026-06-12';

// ============================================================================
// isStartedAndOngoing
// ============================================================================

describe('isStartedAndOngoing', () => {
  it('returns false for an event with no start_time', () => {
    const event = createMockEvent({ start_time: '' });
    expect(isStartedAndOngoing(event, NOW)).toBe(false);
  });

  it('returns false for a future event that has not started yet', () => {
    const event = createMockEvent({ start_time: '2026-06-12T11:00:00Z' });
    expect(isStartedAndOngoing(event, NOW)).toBe(false);
  });

  it('returns true for an event that started before now and has not ended', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    expect(isStartedAndOngoing(event, NOW)).toBe(true);
  });

  it('returns false for an event whose end_time is exactly now (not strictly after)', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T10:00:00Z',
    });
    // effectiveEnd === now — condition is start <= now < effectiveEnd, so now < now is false
    expect(isStartedAndOngoing(event, NOW)).toBe(false);
  });

  it('returns false for an event that already ended before now', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T06:00:00Z',
      end_time: '2026-06-12T08:00:00Z',
    });
    expect(isStartedAndOngoing(event, NOW)).toBe(false);
  });

  it('returns true when start_time equals now (start <= now is satisfied)', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T10:00:00Z',
      end_time: '2026-06-12T14:00:00Z',
    });
    expect(isStartedAndOngoing(event, NOW)).toBe(true);
  });

  describe('no-end_time events — effective end is start + 2 hours', () => {
    it('returns true when now is within the 2-hour window', () => {
      // started at 09:00Z, effective end 11:00Z, now 10:00Z → ongoing
      const event = createMockEvent({ start_time: '2026-06-12T09:00:00Z' });
      expect(isStartedAndOngoing(event, NOW)).toBe(true);
    });

    it('returns false when now is past the 2-hour window', () => {
      // started at 07:00Z, effective end 09:00Z, now 10:00Z → ended
      const event = createMockEvent({ start_time: '2026-06-12T07:00:00Z' });
      expect(isStartedAndOngoing(event, NOW)).toBe(false);
    });

    it('returns false when now is exactly at the 2-hour effective end', () => {
      // started at 08:00Z, effective end 10:00Z, now 10:00Z → not strictly before
      const event = createMockEvent({ start_time: '2026-06-12T08:00:00Z' });
      expect(isStartedAndOngoing(event, NOW)).toBe(false);
    });
  });
});

// ============================================================================
// splitUpcomingEvents
// ============================================================================

describe('splitUpcomingEvents', () => {
  it('returns empty buckets for an empty input', () => {
    const result = splitUpcomingEvents([], NOW);
    expect(result).toEqual({ ongoing: [], nextUp: [], rest: [] });
  });

  it('skips events with no start_time', () => {
    const noStart = createMockEvent({ start_time: '' });
    const result = splitUpcomingEvents([noStart], NOW);
    expect(result).toEqual({ ongoing: [], nextUp: [], rest: [] });
  });

  it('drops events that have fully ended', () => {
    const ended = createMockEvent({
      start_time: '2026-06-12T06:00:00Z',
      end_time: '2026-06-12T08:00:00Z',
    });
    const result = splitUpcomingEvents([ended], NOW);
    expect(result).toEqual({ ongoing: [], nextUp: [], rest: [] });
  });

  it('places a single ongoing event in ongoing, with empty nextUp and rest', () => {
    const ongoing = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    const result = splitUpcomingEvents([ongoing], NOW);
    expect(result.ongoing).toHaveLength(1);
    expect(result.ongoing[0].$id).toBe(ongoing.$id);
    expect(result.nextUp).toHaveLength(0);
    expect(result.rest).toHaveLength(0);
  });

  it('places a single future event in nextUp, with empty rest', () => {
    const future = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
    const result = splitUpcomingEvents([future], NOW);
    expect(result.ongoing).toHaveLength(0);
    expect(result.nextUp).toHaveLength(1);
    expect(result.nextUp[0].$id).toBe(future.$id);
    expect(result.rest).toHaveLength(0);
  });

  it('separates the earliest future event into nextUp and the rest into rest', () => {
    const first = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
    const second = createMockEvent({ start_time: '2026-06-14T10:00:00Z' });
    const third = createMockEvent({ start_time: '2026-06-15T10:00:00Z' });
    const result = splitUpcomingEvents([third, first, second], NOW);
    expect(result.nextUp).toHaveLength(1);
    expect(result.nextUp[0].$id).toBe(first.$id);
    expect(result.rest.map((e) => e.$id)).toEqual([second.$id, third.$id]);
  });

  describe('tie detection for nextUp', () => {
    it('includes all future events sharing the earliest start time in nextUp', () => {
      const a = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
      const b = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
      const later = createMockEvent({ start_time: '2026-06-14T10:00:00Z' });
      const result = splitUpcomingEvents([a, b, later], NOW);
      expect(result.nextUp).toHaveLength(2);
      expect(result.nextUp.map((e) => e.$id)).toContain(a.$id);
      expect(result.nextUp.map((e) => e.$id)).toContain(b.$id);
      expect(result.rest).toHaveLength(1);
      expect(result.rest[0].$id).toBe(later.$id);
    });

    it('treats equivalent ISO encodings (Z vs +00:00) as equal start times', () => {
      // Both represent the same UTC epoch: 2026-06-13T17:00:00Z
      const withZ = createMockEvent({ start_time: '2026-06-13T17:00:00Z' });
      const withOffset = createMockEvent({ start_time: '2026-06-13T17:00:00+00:00' });
      const result = splitUpcomingEvents([withZ, withOffset], NOW);
      expect(result.nextUp).toHaveLength(2);
    });

    it('ties at minute granularity — the screen displays HH:mm', () => {
      const onTheMinute = createMockEvent({ start_time: '2026-06-13T17:00:00Z' });
      const thirtySecondsLater = createMockEvent({ start_time: '2026-06-13T17:00:30Z' });
      const nextMinute = createMockEvent({ start_time: '2026-06-13T17:01:00Z' });
      const result = splitUpcomingEvents([nextMinute, thirtySecondsLater, onTheMinute], NOW);
      expect(result.nextUp.map((e) => e.$id)).toEqual([onTheMinute.$id, thirtySecondsLater.$id]);
      expect(result.rest.map((e) => e.$id)).toEqual([nextMinute.$id]);
    });
  });

  describe('deduplication by $id', () => {
    it('dedupes duplicate events by $id across overlapping lookback and paginated lists', () => {
      const event = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
      // Simulate the same event appearing twice (once from lookback, once from pagination)
      const duplicate = { ...event };
      const result = splitUpcomingEvents([event, duplicate], NOW);
      expect(result.ongoing.length + result.nextUp.length + result.rest.length).toBe(1);
    });

    it('dedupes a duplicate that appears in both ongoing window and future list', () => {
      const event = createMockEvent({
        start_time: '2026-06-12T08:00:00Z',
        end_time: '2026-06-12T12:00:00Z',
      });
      const duplicate = { ...event };
      const result = splitUpcomingEvents([event, duplicate], NOW);
      expect(result.ongoing).toHaveLength(1);
    });
  });

  describe('no-end_time event deduplication around the 2-hour window', () => {
    it('drops a no-end_time event that is past its 2-hour effective end', () => {
      // started 07:00Z, effective end 09:00Z < 10:00Z now
      const ended = createMockEvent({ start_time: '2026-06-12T07:00:00Z' });
      const result = splitUpcomingEvents([ended], NOW);
      expect(result).toEqual({ ongoing: [], nextUp: [], rest: [] });
    });

    it('keeps a no-end_time event that is still within the 2-hour window', () => {
      // started 09:00Z, effective end 11:00Z > 10:00Z now
      const ongoing = createMockEvent({ start_time: '2026-06-12T09:00:00Z' });
      const result = splitUpcomingEvents([ongoing], NOW);
      expect(result.ongoing).toHaveLength(1);
    });
  });

  it('sorts ongoing events chronologically by start_time', () => {
    const later = createMockEvent({
      start_time: '2026-06-12T09:30:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    const earlier = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    const result = splitUpcomingEvents([later, earlier], NOW);
    expect(result.ongoing[0].$id).toBe(earlier.$id);
    expect(result.ongoing[1].$id).toBe(later.$id);
  });

  it('sorts rest events chronologically', () => {
    const a = createMockEvent({ start_time: '2026-06-15T10:00:00Z' });
    const b = createMockEvent({ start_time: '2026-06-14T10:00:00Z' });
    const first = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
    const result = splitUpcomingEvents([a, b, first], NOW);
    expect(result.nextUp[0].$id).toBe(first.$id);
    expect(result.rest[0].$id).toBe(b.$id);
    expect(result.rest[1].$id).toBe(a.$id);
  });
});

// ============================================================================
// buildUpcomingSections
// ============================================================================

describe('buildUpcomingSections', () => {
  it('returns an empty array when both ongoing and rest are empty', () => {
    const result = buildUpcomingSections([], [], TODAY_KEY);
    expect(result).toEqual([]);
  });

  it('creates a single today section for ongoing events only', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    const result = buildUpcomingSections([event], [], TODAY_KEY);
    expect(result).toHaveLength(1);
    expect(result[0].dayKey).toBe(TODAY_KEY);
    expect(result[0].isToday).toBe(true);
    expect(result[0].data).toHaveLength(1);
    expect(result[0].data[0].ongoing).toBe(true);
    expect(result[0].data[0].event.$id).toBe(event.$id);
  });

  it('creates sections from rest events only, no today section when no ongoing', () => {
    const event = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
    const result = buildUpcomingSections([], [event], TODAY_KEY);
    expect(result).toHaveLength(1);
    expect(result[0].dayKey).toBe('2026-06-13');
    expect(result[0].isToday).toBe(false);
    expect(result[0].data[0].ongoing).toBe(false);
  });

  it('groups rest events by their Belgium-TZ start day', () => {
    // Two events on the same Belgium day, one event on the next
    const e1 = createMockEvent({ start_time: '2026-06-13T08:00:00Z' });
    const e2 = createMockEvent({ start_time: '2026-06-13T14:00:00Z' });
    const e3 = createMockEvent({ start_time: '2026-06-14T10:00:00Z' });
    const result = buildUpcomingSections([], [e1, e2, e3], TODAY_KEY);
    expect(result).toHaveLength(2);
    expect(result[0].dayKey).toBe('2026-06-13');
    expect(result[0].data).toHaveLength(2);
    expect(result[1].dayKey).toBe('2026-06-14');
    expect(result[1].data).toHaveLength(1);
  });

  it('sorts sections by dayKey ascending', () => {
    const e1 = createMockEvent({ start_time: '2026-06-15T10:00:00Z' });
    const e2 = createMockEvent({ start_time: '2026-06-14T10:00:00Z' });
    const result = buildUpcomingSections([], [e1, e2], TODAY_KEY);
    expect(result[0].dayKey).toBe('2026-06-14');
    expect(result[1].dayKey).toBe('2026-06-15');
  });

  it('merges ongoing events into today section ahead of same-day future events', () => {
    const ongoingEvent = createMockEvent({
      start_time: '2026-06-12T08:00:00Z',
      end_time: '2026-06-12T12:00:00Z',
    });
    // A future event also on 2026-06-12 in Belgium
    const futureToday = createMockEvent({ start_time: '2026-06-12T12:00:00Z' });
    const result = buildUpcomingSections([ongoingEvent], [futureToday], TODAY_KEY);
    expect(result).toHaveLength(1);
    expect(result[0].dayKey).toBe(TODAY_KEY);
    expect(result[0].isToday).toBe(true);
    expect(result[0].data).toHaveLength(2);
    // Ongoing rows come first (built first), future row second
    expect(result[0].data[0].ongoing).toBe(true);
    expect(result[0].data[1].ongoing).toBe(false);
  });

  it('sets isToday=true only for the todayKey section', () => {
    const today = createMockEvent({ start_time: '2026-06-12T12:00:00Z' });
    const tomorrow = createMockEvent({ start_time: '2026-06-13T10:00:00Z' });
    const result = buildUpcomingSections([], [today, tomorrow], TODAY_KEY);
    const todaySection = result.find((s) => s.dayKey === TODAY_KEY);
    const tomorrowSection = result.find((s) => s.dayKey === '2026-06-13');
    expect(todaySection?.isToday).toBe(true);
    expect(tomorrowSection?.isToday).toBe(false);
  });

  it('groups a late-UTC event (cross-midnight) into the next Belgium day', () => {
    // 2026-06-12T23:00:00Z = 2026-06-13 01:00 in Brussels (UTC+2)
    const crossMidnight = createMockEvent({ start_time: '2026-06-12T23:00:00Z' });
    const result = buildUpcomingSections([], [crossMidnight], TODAY_KEY);
    expect(result).toHaveLength(1);
    expect(result[0].dayKey).toBe('2026-06-13');
    expect(result[0].isToday).toBe(false);
  });

  it('marks a rest event starting on todayKey as isToday=true', () => {
    // An event at 12:00Z on June 12 — still June 12 in Brussels
    const todayLater = createMockEvent({ start_time: '2026-06-12T12:00:00Z' });
    const result = buildUpcomingSections([], [todayLater], TODAY_KEY);
    expect(result[0].dayKey).toBe(TODAY_KEY);
    expect(result[0].isToday).toBe(true);
  });

  it('places ongoing events in todayKey section even if they span multiple days', () => {
    // A multi-day event that started yesterday (Belgium TZ day key is yesterday)
    const multiDay = createMockEvent({
      start_time: '2026-06-11T10:00:00Z',
      end_time: '2026-06-14T18:00:00Z',
    });
    const result = buildUpcomingSections([multiDay], [], TODAY_KEY);
    expect(result).toHaveLength(1);
    // Ongoing events always go into todayKey regardless of their start day
    expect(result[0].dayKey).toBe(TODAY_KEY);
  });
});

// ============================================================================
// formatGroupDateLabel
// ============================================================================

describe('formatGroupDateLabel', () => {
  const JUNE_12 = '2026-06-12'; // Friday

  it('returns a non-empty string for the en locale', () => {
    const label = formatGroupDateLabel(JUNE_12, 'en');
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('contains the day number 12 for all locales', () => {
    expect(formatGroupDateLabel(JUNE_12, 'en')).toMatch(/12/);
    expect(formatGroupDateLabel(JUNE_12, 'fr')).toMatch(/12/);
    expect(formatGroupDateLabel(JUNE_12, 'nl')).toMatch(/12/);
  });

  it('contains a representation of Friday for en locale on 2026-06-12', () => {
    const label = formatGroupDateLabel(JUNE_12, 'en');
    expect(label).toMatch(/fri/i);
  });

  it('contains a representation of June for en locale on 2026-06-12', () => {
    const label = formatGroupDateLabel(JUNE_12, 'en');
    expect(label).toMatch(/june/i);
  });

  it('returns a non-empty string for fr locale', () => {
    const label = formatGroupDateLabel(JUNE_12, 'fr');
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(3);
  });

  it('returns a non-empty string for nl locale', () => {
    const label = formatGroupDateLabel(JUNE_12, 'nl');
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(3);
  });

  it('falls back to en-US for an unknown locale', () => {
    const enLabel = formatGroupDateLabel(JUNE_12, 'en');
    const unknownLabel = formatGroupDateLabel(JUNE_12, 'xx');
    // Both should use en-US formatting
    expect(unknownLabel).toBe(enLabel);
  });

  it('handles a day key that crosses into the next month correctly', () => {
    const label = formatGroupDateLabel('2026-06-30', 'en');
    expect(label).toMatch(/30/);
    expect(label).toMatch(/june/i);
  });

  it('handles a day key in July correctly', () => {
    const label = formatGroupDateLabel('2026-07-01', 'en');
    expect(label).toMatch(/1/);
    expect(label).toMatch(/july/i);
  });
});

// ============================================================================
// getStartsIn
// ============================================================================

describe('getStartsIn', () => {
  it('returns 1 minute for an event starting at exactly now (0 ms diff)', () => {
    const result = getStartsIn('2026-06-12T10:00:00Z', NOW);
    expect(result).toEqual({ unit: 'minutes', value: 1 });
  });

  it('returns 1 minute for an event that already started (clamps to 0 ms diff → ceil → 1)', () => {
    const result = getStartsIn('2026-06-12T09:00:00Z', NOW);
    expect(result).toEqual({ unit: 'minutes', value: 1 });
  });

  it('returns 1 minute for a start exactly 1 minute in the future', () => {
    const result = getStartsIn('2026-06-12T10:01:00Z', NOW);
    expect(result).toEqual({ unit: 'minutes', value: 1 });
  });

  it('returns 30 minutes for a start 30 minutes away', () => {
    const result = getStartsIn('2026-06-12T10:30:00Z', NOW);
    expect(result).toEqual({ unit: 'minutes', value: 30 });
  });

  it('returns 59 minutes for a start 59 minutes away', () => {
    const result = getStartsIn('2026-06-12T10:59:00Z', NOW);
    expect(result).toEqual({ unit: 'minutes', value: 59 });
  });

  it('returns hours (not minutes) for a start exactly 60 minutes away', () => {
    // 60 minutes → minutes=60, hours=round(60/60)=1
    const result = getStartsIn('2026-06-12T11:00:00Z', NOW);
    expect(result).toEqual({ unit: 'hours', value: 1 });
  });

  it('returns 2 hours for a start 2 hours away', () => {
    const result = getStartsIn('2026-06-12T12:00:00Z', NOW);
    expect(result).toEqual({ unit: 'hours', value: 2 });
  });

  it('returns rounded hours for a fractional-hour difference', () => {
    // 1h 24m = 84 minutes → round(84/60) = round(1.4) = 1 hour
    const result = getStartsIn('2026-06-12T11:24:00Z', NOW);
    expect(result).toEqual({ unit: 'hours', value: 1 });
  });

  it('rounds up to 2 hours when diff is 1h 30m (round 1.5 = 2)', () => {
    // 1h 30m = 90 minutes → round(90/60) = round(1.5) = 2
    const result = getStartsIn('2026-06-12T11:30:00Z', NOW);
    expect(result).toEqual({ unit: 'hours', value: 2 });
  });

  it('returns 23 hours for a start 23.4 hours away (stays under 24h threshold)', () => {
    // 23h 24m = 1404 min → hours = round(1404/60) = round(23.4) = 23 — still < 24
    const result = getStartsIn('2026-06-13T09:24:00Z', NOW);
    expect(result).toEqual({ unit: 'hours', value: 23 });
  });

  it('returns days when the start is 25 hours away', () => {
    // 25h = 1500 min → hours = round(1500/60) = 25 → days = round(25/24) = round(1.04) = 1
    const result = getStartsIn('2026-06-13T11:00:00Z', NOW);
    expect(result).toEqual({ unit: 'days', value: 1 });
  });

  it('returns days (not hours) for 24 hours exactly', () => {
    // 24h = 1440 min → hours = round(1440/60) = 24 → !(hours < 24) → days = round(24/24) = 1
    const result = getStartsIn('2026-06-13T10:00:00Z', NOW);
    expect(result).toEqual({ unit: 'days', value: 1 });
  });

  it('returns 2 days for a start 2 days away', () => {
    const result = getStartsIn('2026-06-14T10:00:00Z', NOW);
    expect(result).toEqual({ unit: 'days', value: 2 });
  });

  it('returns at least 1 day for a days result (clamp floor)', () => {
    // 24h 01min → hours = round(1441/60) ≈ 24 → days = round(24.02) = 24? No.
    // Actually 24h 1min = 1441 min → ceil(1441) = 1441 → hours = round(1441/60) = round(24.02) = 24
    // 24 >= 24 → days branch → round(24/24) = 1
    const result = getStartsIn('2026-06-13T10:01:00Z', NOW);
    expect(result.unit).toBe('days');
    expect(result.value).toBeGreaterThanOrEqual(1);
  });

  it('returns 7 days for a start one week away', () => {
    const result = getStartsIn('2026-06-19T10:00:00Z', NOW);
    expect(result).toEqual({ unit: 'days', value: 7 });
  });
});

// ============================================================================
// getOngoingDayProgress
// ============================================================================

describe('getOngoingDayProgress', () => {
  it('returns dayIndex=1 and totalDays=1 for a single-day event (no end_time)', () => {
    const event = createMockEvent({ start_time: '2026-06-12T10:00:00Z' });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 1, totalDays: 1 });
  });

  it('returns dayIndex=1 and totalDays=1 for a single-day event with same-day end_time', () => {
    const event = createMockEvent({
      start_time: '2026-06-12T10:00:00Z',
      end_time: '2026-06-12T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 1, totalDays: 1 });
  });

  it('returns correct day index for the first day of a multi-day event', () => {
    // Event spans June 12-14 (3 days), today is June 12 → dayIndex=1
    const event = createMockEvent({
      start_time: '2026-06-12T10:00:00Z',
      end_time: '2026-06-14T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 1, totalDays: 3 });
  });

  it('returns correct day index for a middle day of a multi-day event', () => {
    // Event spans June 11-14 (4 days), today is June 12 → dayIndex=2
    const event = createMockEvent({
      start_time: '2026-06-11T10:00:00Z',
      end_time: '2026-06-14T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 2, totalDays: 4 });
  });

  it('returns correct day index for the last day of a multi-day event', () => {
    // Event spans June 10-12 (3 days), today is June 12 → dayIndex=3
    const event = createMockEvent({
      start_time: '2026-06-10T10:00:00Z',
      end_time: '2026-06-12T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 3, totalDays: 3 });
  });

  it('clamps dayIndex to 1 when todayKey is before the event startKey', () => {
    // Event starts 2026-06-14, but todayKey is 2026-06-12
    // todayOffset = round((June12 - June14) / DAY_MS) + 1 = round(-2) + 1 = -1 → clamp to 1
    const event = createMockEvent({
      start_time: '2026-06-14T10:00:00Z',
      end_time: '2026-06-16T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result.dayIndex).toBe(1);
  });

  it('clamps dayIndex to totalDays when todayKey is past the event endKey', () => {
    // Event spans June 8-10 (3 days), todayKey is June 12 → dayIndex should clamp to 3
    const event = createMockEvent({
      start_time: '2026-06-08T10:00:00Z',
      end_time: '2026-06-10T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result.dayIndex).toBe(result.totalDays);
  });

  it('uses Belgium-TZ day boundaries for a late-UTC event (start_time crosses midnight)', () => {
    // 2026-06-11T23:00:00Z = 2026-06-12 01:00 in Brussels → startKey is '2026-06-12'
    // end_time: 2026-06-13T22:00:00Z = 2026-06-14 in Brussels → endKey is '2026-06-14'
    // Span: June 12, 13, 14 = 3 days; today June 12 → dayIndex=1
    const event = createMockEvent({
      start_time: '2026-06-11T23:00:00Z',
      end_time: '2026-06-13T22:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result.totalDays).toBe(3);
    expect(result.dayIndex).toBe(1);
  });

  it('returns totalDays=1 when end_time is missing (uses startKey as endKey)', () => {
    const event = createMockEvent({ start_time: '2026-06-12T10:00:00Z' });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result.totalDays).toBe(1);
  });

  it('handles a week-long event at day 3/7', () => {
    // June 10 → June 16 = 7 days; today June 12 → dayIndex=3
    const event = createMockEvent({
      start_time: '2026-06-10T10:00:00Z',
      end_time: '2026-06-16T18:00:00Z',
    });
    const result = getOngoingDayProgress(event, TODAY_KEY);
    expect(result).toEqual({ dayIndex: 3, totalDays: 7 });
  });
});
