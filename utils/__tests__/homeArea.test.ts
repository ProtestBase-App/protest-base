import { createMockEvent } from '@/test-utils/render';
import type { LocationFilterOption } from '@/utils/locationFilterOptions';
import {
  buildHomeAreaMatch,
  deriveHomeAreaCenter,
  HomeAreaMatch,
  rankEventByHomeArea,
  sortEventsByHomeArea,
} from '../homeArea';

// ============================================================================
// Fixtures
//
// A deliberate BE/NL postcode collision: Belgian Tournai (m:be:7500, Hainaut,
// Wallonia) and Dutch Overijssel (p:nl:overijssel) BOTH contain postcode 7500.
// This is the exact trap the country gate must defend against.
// ============================================================================

const CODES: Record<string, string[]> = {
  'm:be:7500': ['7500', '7501', '7502'],
  'p:be:hainaut': ['6000', '7000', '7500', '7501', '7502'],
  'r:be:wallonia': ['5000', '6000', '7000', '7500', '7501', '7502'],
  'p:nl:overijssel': ['7500', '7510'],
};

const mockExpand = (values: string[]) => {
  const set = new Set<string>();
  for (const value of values) {
    const codes = CODES[value];
    if (codes) codes.forEach((c) => set.add(c));
    else set.add(value); // raw pass-through, like the real expandLocationTokens
  }
  return { codes: [...set], truncated: false };
};

function option(value: string, tier: LocationFilterOption['tier']): LocationFilterOption {
  return { value, label: value, tier, count: 0, provinceLabel: '', searchText: '' };
}

const OPTIONS: LocationFilterOption[] = [
  option('r:be:wallonia', 'region'),
  option('p:be:hainaut', 'province'),
  option('p:nl:overijssel', 'province'),
  option('m:be:7500', 'municipality'),
];

function beEvent(postalCode: number, overrides: Parameters<typeof createMockEvent>[0] = {}) {
  return createMockEvent({ country: 'belgium', postal_code: postalCode, ...overrides });
}

// ============================================================================
// buildHomeAreaMatch
// ============================================================================

describe('buildHomeAreaMatch', () => {
  it('returns null for a null token', () => {
    expect(buildHomeAreaMatch(null, OPTIONS, mockExpand)).toBeNull();
  });

  it('returns null when the token expands to no codes (postal data not loaded)', () => {
    const emptyExpand = () => ({ codes: [], truncated: false });
    expect(buildHomeAreaMatch('m:be:7500', OPTIONS, emptyExpand)).toBeNull();
  });

  it('resolves a municipality token to graduated muni/province/region sets', () => {
    const match = buildHomeAreaMatch('m:be:7500', OPTIONS, mockExpand)!;
    expect(match.country).toBe('belgium');
    expect([...match.municipalityCodes].sort()).toEqual(['7500', '7501', '7502']);
    expect(match.provinceCodes.has('7000')).toBe(true);
    expect(match.provinceCodes.has('5000')).toBe(false);
    expect(match.regionCodes.has('5000')).toBe(true);
  });

  it('resolves a province token: empty municipality set, province = home, region resolved', () => {
    const match = buildHomeAreaMatch('p:be:hainaut', OPTIONS, mockExpand)!;
    expect(match.municipalityCodes.size).toBe(0);
    expect(match.provinceCodes.has('7000')).toBe(true);
    expect(match.regionCodes.has('5000')).toBe(true);
  });

  it('resolves a region token: only the region set is populated', () => {
    const match = buildHomeAreaMatch('r:be:wallonia', OPTIONS, mockExpand)!;
    expect(match.municipalityCodes.size).toBe(0);
    expect(match.provinceCodes.size).toBe(0);
    expect(match.regionCodes.has('5000')).toBe(true);
  });

  it('leaves the region set empty for an NL province (NL has no region tier)', () => {
    const match = buildHomeAreaMatch('p:nl:overijssel', OPTIONS, mockExpand)!;
    expect(match.country).toBe('netherlands');
    expect(match.provinceCodes.has('7510')).toBe(true);
    expect(match.regionCodes.size).toBe(0);
  });
});

// ============================================================================
// rankEventByHomeArea
// ============================================================================

describe('rankEventByHomeArea', () => {
  const match = buildHomeAreaMatch('m:be:7500', OPTIONS, mockExpand)!;

  it('ranks 0 for a same-municipality event', () => {
    expect(rankEventByHomeArea(beEvent(7500), match)).toBe(0);
  });

  it('ranks 1 for a same-province (not same-municipality) event', () => {
    expect(rankEventByHomeArea(beEvent(7000), match)).toBe(1);
  });

  it('ranks 2 for a same-region (not same-province) event', () => {
    expect(rankEventByHomeArea(beEvent(5000), match)).toBe(2);
  });

  it('ranks 3 for an event elsewhere in the same country', () => {
    expect(rankEventByHomeArea(beEvent(9000), match)).toBe(3);
  });

  it('ranks 3 for an event with no postal code', () => {
    expect(rankEventByHomeArea(createMockEvent({ country: 'belgium' }), match)).toBe(3);
  });

  it('ranks 3 for a colliding NL postcode — country gate (regression)', () => {
    // Dutch event with postcode 7500 must NOT match Belgian Tournai/Hainaut.
    const nlEvent = createMockEvent({ country: 'netherlands', postal_code: 7500 });
    expect(rankEventByHomeArea(nlEvent, match)).toBe(3);
  });

  it('matches NL events despite the "5611 EC" alphanumeric postcode format', () => {
    // NL event postcodes arrive as "7500 AB" strings; the datasets key on the
    // bare 4-digit code, so the prefix must be normalized before membership.
    const nlMatch = buildHomeAreaMatch('p:nl:overijssel', OPTIONS, mockExpand)!;
    const nlEvent = createMockEvent({
      country: 'netherlands',
      postal_code: '7500 AB' as unknown as number,
    });
    expect(rankEventByHomeArea(nlEvent, nlMatch)).toBe(1); // same NL province
  });
});

// ============================================================================
// sortEventsByHomeArea
// ============================================================================

describe('sortEventsByHomeArea', () => {
  const match = buildHomeAreaMatch('m:be:7500', OPTIONS, mockExpand)!;
  const t = (iso: string) => iso;

  it('orders by rank first, then chronologically', () => {
    // A far event sooner in time still sorts after a near event later in time.
    const nearLater = beEvent(7500, { $id: 'near', start_time: t('2026-07-10T10:00:00Z') });
    const farSooner = beEvent(9000, { $id: 'far', start_time: t('2026-07-01T10:00:00Z') });
    const sorted = sortEventsByHomeArea([farSooner, nearLater], match);
    expect(sorted.map((e) => e.$id)).toEqual(['near', 'far']);
  });

  it('breaks ties on $id for a stable order (same rank, same start_time)', () => {
    const a = beEvent(7500, { $id: 'aaa', start_time: t('2026-07-01T10:00:00Z') });
    const b = beEvent(7500, { $id: 'bbb', start_time: t('2026-07-01T10:00:00Z') });
    expect(sortEventsByHomeArea([b, a], match).map((e) => e.$id)).toEqual(['aaa', 'bbb']);
  });

  it('does not mutate the input array', () => {
    const input = [beEvent(9000, { $id: 'x' }), beEvent(7500, { $id: 'y' })];
    const snapshot = input.map((e) => e.$id);
    sortEventsByHomeArea(input, match);
    expect(input.map((e) => e.$id)).toEqual(snapshot);
  });
});

// ============================================================================
// deriveHomeAreaCenter
// ============================================================================

describe('deriveHomeAreaCenter', () => {
  const match = buildHomeAreaMatch('m:be:7500', OPTIONS, mockExpand)!;

  it('returns the mean of in-municipality geocoded events', () => {
    const events = [
      beEvent(7500, { geocod_lng: 3.0, geocod_lat: 50.0 }),
      beEvent(7501, { geocod_lng: 4.0, geocod_lat: 51.0 }),
    ];
    expect(deriveHomeAreaCenter(events, match)).toEqual([3.5, 50.5]);
  });

  it('excludes events without coordinates from the mean', () => {
    const events = [
      beEvent(7500, { geocod_lng: 3.0, geocod_lat: 50.0 }),
      beEvent(7501), // no coordinates → ignored
    ];
    expect(deriveHomeAreaCenter(events, match)).toEqual([3.0, 50.0]);
  });

  it('excludes colliding NL events via the country gate', () => {
    const events = [
      beEvent(7500, { geocod_lng: 3.0, geocod_lat: 50.0 }),
      createMockEvent({
        country: 'netherlands',
        postal_code: 7500,
        geocod_lng: 6.9,
        geocod_lat: 52.2,
      }),
    ];
    // The NL event must not drag the center north into the Netherlands.
    expect(deriveHomeAreaCenter(events, match)).toEqual([3.0, 50.0]);
  });

  it('falls back to province events when no municipality event has coordinates', () => {
    const events = [
      beEvent(7500), // muni, no coords
      beEvent(7000, { geocod_lng: 3.5, geocod_lat: 50.5 }), // province only
    ];
    expect(deriveHomeAreaCenter(events, match)).toEqual([3.5, 50.5]);
  });

  it('returns null when no in-area event has coordinates', () => {
    const events = [beEvent(9000, { geocod_lng: 5.0, geocod_lat: 51.0 })];
    expect(deriveHomeAreaCenter(events, match)).toBeNull();
  });

  it('includes NL events with alphanumeric postcodes in the center', () => {
    const nlMatch = buildHomeAreaMatch('p:nl:overijssel', OPTIONS, mockExpand)!;
    const events = [
      createMockEvent({
        country: 'netherlands',
        postal_code: '7500 AB' as unknown as number,
        geocod_lng: 6.9,
        geocod_lat: 52.2,
      }),
    ];
    expect(deriveHomeAreaCenter(events, nlMatch)).toEqual([6.9, 52.2]);
  });

  it('returns null for an empty event set', () => {
    const emptyMatch: HomeAreaMatch = buildHomeAreaMatch('m:be:7500', OPTIONS, mockExpand)!;
    expect(deriveHomeAreaCenter([], emptyMatch)).toBeNull();
  });
});
