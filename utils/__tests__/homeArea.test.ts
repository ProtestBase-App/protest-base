import { HOME_AREA_CENTROIDS } from '@/constants/HomeAreaCentroids';
import { POSTAL_CODES_EN } from '@/constants/PostalCodes_BE_EN';
import { createMockEvent } from '@/test-utils/render';
import {
  buildLocationFilterOptions,
  expandLocationTokens,
  type LocationFilterOption,
} from '@/utils/locationFilterOptions';
import {
  buildHomeAreaMatch,
  deriveHomeAreaCenter,
  HomeAreaMatch,
  rankEventByHomeArea,
  resolveHomeAreaCenter,
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
    expect(match.token).toBe('m:be:7500');
    expect([...match.municipalityCodes].sort()).toEqual(['7500', '7501', '7502']);
    expect(match.provinceCodes.has('7000')).toBe(true);
    expect(match.provinceCodes.has('5000')).toBe(false);
    expect(match.regionCodes.has('5000')).toBe(true);
    // Resolved parent tokens drive the centroid fallback chain.
    expect(match.provinceToken).toBe('p:be:hainaut');
    expect(match.regionToken).toBe('r:be:wallonia');
  });

  it('resolves a province token: empty municipality set, province = home, region resolved', () => {
    const match = buildHomeAreaMatch('p:be:hainaut', OPTIONS, mockExpand)!;
    expect(match.municipalityCodes.size).toBe(0);
    expect(match.provinceCodes.has('7000')).toBe(true);
    expect(match.regionCodes.has('5000')).toBe(true);
    expect(match.provinceToken).toBe('p:be:hainaut');
    expect(match.regionToken).toBe('r:be:wallonia');
  });

  it('resolves a region token: only the region set is populated', () => {
    const match = buildHomeAreaMatch('r:be:wallonia', OPTIONS, mockExpand)!;
    expect(match.municipalityCodes.size).toBe(0);
    expect(match.provinceCodes.size).toBe(0);
    expect(match.regionCodes.has('5000')).toBe(true);
    expect(match.provinceToken).toBeNull();
    expect(match.regionToken).toBe('r:be:wallonia');
  });

  it('leaves the region set empty for an NL province (NL has no region tier)', () => {
    const match = buildHomeAreaMatch('p:nl:overijssel', OPTIONS, mockExpand)!;
    expect(match.country).toBe('netherlands');
    expect(match.provinceCodes.has('7510')).toBe(true);
    expect(match.regionCodes.size).toBe(0);
    expect(match.provinceToken).toBe('p:nl:overijssel');
    expect(match.regionToken).toBeNull();
  });
});

// ============================================================================
// resolveHomeAreaCenter — static per-area centering (the home-area map fix)
// ============================================================================

describe('resolveHomeAreaCenter', () => {
  /** Build a bare match; resolveHomeAreaCenter only reads the three token fields. */
  function match(
    token: string,
    provinceToken: string | null,
    regionToken: string | null
  ): HomeAreaMatch {
    return {
      token,
      country: 'belgium',
      municipalityCodes: new Set(),
      provinceCodes: new Set(),
      regionCodes: new Set(),
      provinceToken,
      regionToken,
    };
  }

  it('centers a listed municipality on its own coordinate (Tournai)', () => {
    const center = resolveHomeAreaCenter(match('m:be:7500', 'p:be:hainaut', 'r:be:wallonia'));
    expect(center).toEqual([3.3891, 50.6071]);
  });

  it('regression: Antwerp centers on Antwerp, not the Flanders protest cluster', () => {
    // The old event-mean recenter dropped Antwerp onto the Ghent area (~lng 3.7)
    // because Antwerp had no nearby protests. It must now land on Antwerp.
    const center = resolveHomeAreaCenter(match('m:be:2000', 'p:be:antwerp', 'r:be:flanders'))!;
    expect(center[0]).toBeGreaterThan(4.2); // clearly east of Ghent (~3.72)
    expect(center[1]).toBeGreaterThan(51.1); // Antwerp ~51.22
  });

  it('falls back to the province center for an unlisted municipality', () => {
    // A village not in the curated table still centers inside its province.
    const center = resolveHomeAreaCenter(match('m:be:6044', 'p:be:hainaut', 'r:be:wallonia'));
    expect(center).toEqual([3.9557, 50.4542]); // Mons (Hainaut capital)
  });

  it('falls back to the region center when neither muni nor province is listed', () => {
    const center = resolveHomeAreaCenter(match('m:be:6044', null, 'r:be:wallonia'));
    expect(center).toEqual([4.85, 50.3]);
  });

  it('returns null when no tier is in the centroid table', () => {
    expect(resolveHomeAreaCenter(match('9999', null, null))).toBeNull();
  });
});

// ============================================================================
// Integration: real bundled dataset → real hierarchy options → centering.
//
// Guards against token drift: the curated centroid table keys must match the
// tokens the live builder actually emits (municipality min-code tokens, and the
// province/region tokens resolved by postcode-containment).
// ============================================================================

describe('home-area centering — real BE dataset integration', () => {
  const { options, tokenToCodes } = buildLocationFilterOptions({
    // Cast mirrors the provider, which holds the rows as `any[]`.
    belgiumRows: POSTAL_CODES_EN as unknown as Record<string, unknown>[],
    lang: 'en',
  });
  const expand = (values: string[]) => expandLocationTokens(values, tokenToCodes);

  it('resolves the Antwerp municipality to its real parent tokens', () => {
    const match = buildHomeAreaMatch('m:be:2000', options, expand)!;
    expect(match.provinceToken).toBe('p:be:antwerp');
    expect(match.regionToken).toBe('r:be:flanders');
  });

  it('regression: picking Antwerp centers on Antwerp, not the Ghent cluster', () => {
    const center = resolveHomeAreaCenter(buildHomeAreaMatch('m:be:2000', options, expand)!)!;
    expect(center[0]).toBeGreaterThan(4.2); // east of Ghent (~3.72)
    expect(center[1]).toBeGreaterThan(51.1); // Antwerp ~51.22
  });

  it('centers an unlisted Antwerp-province village on the province capital', () => {
    // Mortsel (m:be:2640) is a real Antwerp-province municipality not in the
    // curated table — it must fall back to the Antwerp province center.
    const match = buildHomeAreaMatch('m:be:2640', options, expand)!;
    expect(match.token).toBe('m:be:2640');
    expect(resolveHomeAreaCenter(match)).toEqual([4.4025, 51.2194]); // Antwerp (province capital)
  });
});

// ============================================================================
// HOME_AREA_CENTROIDS coordinate sanity — every value is hand-entered, so guard
// against the silent failure mode: a transposed [lat, lng] or wrong-country
// pair recreates the exact "wrong city" bug for a different area.
// ============================================================================

describe('HOME_AREA_CENTROIDS coordinate integrity', () => {
  it('places every centroid inside the BE/NL bounding box (catches lat/lng swaps)', () => {
    // Belgium + Netherlands span roughly lng 2.5–7.3, lat 49.4–53.7. A swapped
    // pair puts a ~51 latitude into the longitude slot → out of range. Collect
    // offenders so a failure names the token.
    const outOfBounds = Object.entries(HOME_AREA_CENTROIDS).filter(
      ([, [lng, lat]]) => lng < 2.5 || lng > 7.3 || lat < 49.4 || lat > 53.7
    );
    expect(outOfBounds).toEqual([]);
  });

  it('keeps each province center equal to its capital municipality (invariant lock)', () => {
    // Province centers are defined as the province capital's coordinate — assert
    // it stays byte-identical so an edit to one without the other is caught.
    const PROVINCE_CAPITAL: Record<string, string> = {
      'p:be:antwerp': 'm:be:2000', // Antwerp
      'p:be:east-flanders': 'm:be:9000', // Ghent
      'p:be:flemish-brabant': 'm:be:3000', // Leuven
      'p:be:hainaut': 'm:be:7000', // Mons
      'p:be:liege': 'm:be:4000', // Liège
      'p:be:limburg': 'm:be:3500', // Hasselt
      'p:be:namur': 'm:be:5000', // Namur
      'p:be:walloon-brabant': 'm:be:1300', // Wavre
      'p:be:west-flanders': 'm:be:8000', // Bruges
      'p:nl:zuid-holland': 'm:nl:2292', // The Hague
      'p:nl:noord-holland': 'm:nl:2011', // Haarlem
      'p:nl:noord-brabant': 'm:nl:5211', // 's-Hertogenbosch
      'p:nl:gelderland': 'm:nl:6811', // Arnhem
      'p:nl:utrecht': 'm:nl:3451', // Utrecht
      'p:nl:overijssel': 'm:nl:8011', // Zwolle
      'p:nl:limburg': 'm:nl:6211', // Maastricht
      'p:nl:groningen': 'm:nl:9479', // Groningen
      'p:nl:fryslan': 'm:nl:8832', // Leeuwarden
      'p:nl:drenthe': 'm:nl:9401', // Assen
      'p:nl:flevoland': 'm:nl:1336', // Lelystad
      'p:nl:zeeland': 'm:nl:4331', // Middelburg
    };
    for (const [prov, muni] of Object.entries(PROVINCE_CAPITAL)) {
      expect(HOME_AREA_CENTROIDS[prov]).toEqual(HOME_AREA_CENTROIDS[muni]);
    }
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
