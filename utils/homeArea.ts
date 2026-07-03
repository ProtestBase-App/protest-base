/**
 * Pure helpers for the privacy-clean "near me" (home-area) feature.
 *
 * A "home area" is a single administrative-hierarchy token the user picks
 * manually (no GPS, no device ID): a municipality (`m:be:7500`), province
 * (`p:be:hainaut` / `p:nl:overijssel`), or region (`r:be:wallonia`). These
 * helpers rank/sort events toward that area and derive a map-recenter point —
 * all from postcodes already in memory, with NO network call.
 *
 * Token-shape trap: the explore hierarchy tokens (`m:be:7500`) are a DIFFERENT
 * scheme from `mapTabUtils.postalTokenForEvent` (`belgium:7500`). We never
 * compare the two — matching is by postcode-string membership against expanded
 * sets, gated by country. Belgian and Dutch postcodes both span 1000–9999, so
 * the country gate is load-bearing: without it an NL event with postcode 7500
 * would falsely rank inside Belgian Hainaut.
 *
 * Pure module — no React, no i18n (mirrors `utils/locationFilterOptions.ts`).
 */

import { HOME_AREA_CENTROIDS } from '@/constants/HomeAreaCentroids';
import { Event } from '@/types/event.types';
import { parseAsUTC } from '@/utils/eventFormatters';
import { hasMapCoordinates } from '@/utils/mapTabUtils';
import { LocationFilterOption } from '@/utils/locationFilterOptions';

/** Backend country value for each token country segment. Only two exist. */
const TOKEN_COUNTRY: Record<string, string> = {
  be: 'belgium',
  nl: 'netherlands',
};

export interface HomeAreaMatch {
  /** The original home-area token this match was built from (for centroid lookup). */
  token: string;
  /**
   * Backend country value the home token belongs to ('belgium' | 'netherlands'),
   * or null for a raw/unknown token. Gates event matching against the BE/NL
   * postcode-range collision.
   */
  country: string | null;
  /** Postcodes in the home municipality (empty unless the token is municipality-tier). */
  municipalityCodes: Set<string>;
  /** Postcodes in the home province (empty for a region-tier home). */
  provinceCodes: Set<string>;
  /** Postcodes in the home region (empty for NL, which has no region tier). */
  regionCodes: Set<string>;
  /** Resolved province token (e.g. 'p:be:antwerp'); null when unresolved/NL-raw. */
  provinceToken: string | null;
  /** Resolved region token (e.g. 'r:be:flanders'); null for NL and raw tokens. */
  regionToken: string | null;
}

type ExpandTokens = (values: string[]) => { codes: string[]; truncated: boolean };

/**
 * Find the option at `tierPrefix` (e.g. 'p:be:') whose member postcodes include
 * `code`, returning both its token and its expanded code set. Since municipality
 * ⊂ province ⊂ region, the containing option is unique. Bounded cost (~10
 * provinces / ~3 regions), run once per home change.
 */
function findContainingTier(
  options: LocationFilterOption[],
  tierPrefix: string,
  code: string,
  expandTokens: ExpandTokens
): { token: string; codes: Set<string> } | null {
  for (const option of options) {
    if (!option.value.startsWith(tierPrefix)) continue;
    const codes = expandTokens([option.value]).codes;
    if (codes.includes(code)) return { token: option.value, codes: new Set(codes) };
  }
  return null;
}

/**
 * Resolve a home token to the three graduated postcode sets (municipality →
 * province → region) plus the country gate. The datasets carry no parent
 * pointers, so parents are resolved by postcode-containment against the
 * same-country options of each broader tier. Returns null for an empty/
 * unresolvable token (e.g. postal data not loaded yet, or a stale token).
 */
export function buildHomeAreaMatch(
  token: string | null,
  options: LocationFilterOption[],
  expandTokens: ExpandTokens
): HomeAreaMatch | null {
  if (!token) return null;

  const homeCodes = new Set(expandTokens([token]).codes);
  if (homeCodes.size === 0) return null;

  // Token shape: <tier>:<country>:<rest> e.g. m:be:7500 / p:nl:overijssel.
  const parts = token.split(':');
  const tierPrefix = parts.length >= 3 ? parts[0] : ''; // 'm' | 'p' | 'r' | '' (raw code)
  const countrySegment = parts.length >= 3 ? parts[1] : '';
  const country = TOKEN_COUNTRY[countrySegment] ?? null;

  let municipalityCodes = new Set<string>();
  let provinceCodes = new Set<string>();
  let regionCodes = new Set<string>();
  let provinceToken: string | null = null;
  let regionToken: string | null = null;

  if (tierPrefix === 'p') {
    provinceCodes = homeCodes;
    provinceToken = token;
  } else if (tierPrefix === 'r') {
    regionCodes = homeCodes;
    regionToken = token;
  } else {
    // Municipality token, or a raw postal code treated as the finest tier.
    municipalityCodes = homeCodes;
  }

  // Resolve broader tiers by containment (only when the token names a country).
  if (country && (tierPrefix === 'm' || tierPrefix === 'p' || tierPrefix === '')) {
    const rep = homeCodes.values().next().value as string;
    if (tierPrefix !== 'p') {
      const province = findContainingTier(options, `p:${countrySegment}:`, rep, expandTokens);
      if (province) {
        provinceCodes = province.codes;
        provinceToken = province.token;
      }
    }
    const region = findContainingTier(options, `r:${countrySegment}:`, rep, expandTokens);
    if (region) {
      regionCodes = region.codes;
      regionToken = region.token;
    }
  }

  return {
    token,
    country,
    municipalityCodes,
    provinceCodes,
    regionCodes,
    provinceToken,
    regionToken,
  };
}

/**
 * Normalize an event postcode to the 4-digit numeric key the datasets use.
 * NL event postcodes carry a 2-letter suffix ("5611 EC") while the bundled
 * postal datasets (and therefore the match Sets) key on the bare 4-digit code
 * ("5611"); BE postcodes are already 4-digit. Returns null when no 4-digit
 * code is present (online/ungeocoded events).
 */
function normalizeEventPostcode(postalCode: number | string): string | null {
  const match = String(postalCode).match(/\d{4}/);
  return match ? match[0] : null;
}

/**
 * Rank an event by proximity to the home area: 0 same municipality, 1 same
 * province, 2 same region, 3 elsewhere. Checked narrow → broad (the sets are
 * nested supersets). The country gate runs first: BE and NL postcodes collide
 * numerically, so a bare postcode match is unsafe across countries.
 */
export function rankEventByHomeArea(event: Event, match: HomeAreaMatch): 0 | 1 | 2 | 3 {
  if (match.country && event.country?.toLowerCase() !== match.country) return 3;
  if (event.postal_code === null || event.postal_code === undefined) return 3;
  const code = normalizeEventPostcode(event.postal_code);
  if (!code) return 3;
  if (match.municipalityCodes.has(code)) return 0;
  if (match.provinceCodes.has(code)) return 1;
  if (match.regionCodes.has(code)) return 2;
  return 3;
}

/**
 * Near-area-first ordering: by rank, then soonest-first, then `$id` for a
 * stable tiebreak (mirrors `mapTabUtils.sortEventsChronologically` so the
 * carousel two-way sync keeps a deterministic order).
 */
export function sortEventsByHomeArea(events: Event[], match: HomeAreaMatch): Event[] {
  return [...events].sort((a, b) => {
    const rankDiff = rankEventByHomeArea(a, match) - rankEventByHomeArea(b, match);
    if (rankDiff !== 0) return rankDiff;
    const timeDiff = parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.$id.localeCompare(b.$id);
  });
}

/** Mean [lng, lat] of geocoded events whose postcode is in `codes`; null if none. */
function meanCenter(
  events: Event[],
  match: HomeAreaMatch,
  codes: Set<string>
): [number, number] | null {
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  for (const event of events) {
    if (match.country && event.country?.toLowerCase() !== match.country) continue;
    if (event.postal_code === null || event.postal_code === undefined) continue;
    const code = normalizeEventPostcode(event.postal_code);
    if (!code || !codes.has(code)) continue;
    if (!hasMapCoordinates(event)) continue;
    sumLng += event.geocod_lng!;
    sumLat += event.geocod_lat!;
    n += 1;
  }
  if (n === 0) return null; // guard: mean of ∅ is NaN
  return [sumLng / n, sumLat / n];
}

/**
 * Static map-recenter point for the home area: the curated geographic center of
 * the picked area, tightest tier first (municipality → province → region), or
 * null when none of the three tiers is in the centroid table (e.g. a raw postal
 * code). This is preferred over {@link deriveHomeAreaCenter} because it centers
 * on *the area itself* rather than on where protests happen to be — so picking a
 * city with no nearby protests still recenters on that city, not on the
 * region-wide protest cluster.
 */
export function resolveHomeAreaCenter(match: HomeAreaMatch): [number, number] | null {
  for (const tokenAtTier of [match.token, match.provinceToken, match.regionToken]) {
    if (!tokenAtTier) continue;
    const center = HOME_AREA_CENTROIDS[tokenAtTier];
    if (center) return center;
  }
  return null;
}

/**
 * Map-recenter point: the arithmetic mean of geocoded events in the home area,
 * tightest tier first (municipality → province → region), or null when no
 * in-area event has coordinates (caller falls back to a static center).
 *
 * Centers on "where protests in your area are", not the geographic centroid —
 * kept as a fallback behind {@link resolveHomeAreaCenter} for tokens the curated
 * centroid table doesn't cover.
 */
export function deriveHomeAreaCenter(
  events: Event[],
  match: HomeAreaMatch
): [number, number] | null {
  for (const codes of [match.municipalityCodes, match.provinceCodes, match.regionCodes]) {
    if (codes.size === 0) continue;
    const center = meanCenter(events, match, codes);
    if (center) return center;
  }
  return null;
}
