import { logger } from '@/utils/logger';
import { canonicalCountry, normalizeEventPostcode } from '@/utils/eventLocation';
import type { LuxembourgCanton, LuxembourgCommune } from '@/constants/PostalCodes_LU';

/**
 * Administrative-hierarchy location options for the /explore filter.
 *
 * Instead of one option per postal code, the explore location filter groups
 * postal codes into real administrative areas:
 *
 *   - Belgium: region (3) -> province (10) -> municipality (578)
 *   - Netherlands: province (12) -> sub-municipality (351)
 *   - Luxembourg, while selectable: country (1) -> canton (12) -> commune (100)
 *
 * Selecting an area filters by ALL of its member postal codes. Explore sends the
 * tokens themselves as `areas` and the backend expands them per country;
 * {@link expandLocationTokens} remains for the legacy `postalCodes` request, and
 * {@link buildLocationMatch} applies the same rule to events on the device.
 *
 * Token scheme (collision-free, verified against the bundled datasets):
 *
 *   r:be:<slug>     region        e.g. r:be:brussels
 *   p:be:<slug>     province      e.g. p:be:hainaut
 *   p:nl:<slug>     NL province   e.g. p:nl:zuid-holland
 *   m:be:<minCode>  municipality  e.g. m:be:7500  (Tournai)
 *   m:nl:<minCode>  sub-municip.  e.g. m:nl:1011
 *   c:lu            LU country    (matches on the country alone)
 *   p:lu:<slug>     LU canton     e.g. p:lu:esch-sur-alzette
 *   m:lu:<slug>     LU commune    e.g. m:lu:kaerjeng
 *
 * BE/NL municipalities/sub-municipalities are keyed by the minimum member postal
 * code; LU communes by slug, because some LU codes belong to two communes. The postal-code -> municipality partition is byte-identical across the
 * three Belgian language files, so the min-code token is language-independent
 * and these options can be built from whichever single BE file is loaded at
 * runtime.
 *
 * This module is pure (no React, no i18n). Display-only formatting that needs
 * translation (tier headers, "{n} postal codes") is done by the screen.
 */

export type Lang = 'en' | 'fr' | 'nl';
export type LocationTier = 'country' | 'region' | 'province' | 'municipality';

export interface LocationFilterOption {
  /** Hierarchy token (see token scheme above). */
  value: string;
  /** Localized display name, e.g. "Tournai" or "Hainaut". */
  label: string;
  /** Tier this option belongs to (drives section grouping). */
  tier: LocationTier;
  /** Number of member postal codes. */
  count: number;
  /** Localized province name for municipalities; '' for province/region. */
  provinceLabel: string;
  /**
   * Lowercased search haystack. Municipalities include their member postal
   * codes so typing a postcode surfaces its municipality; provinces/regions are
   * name-only (a bare postcode resolves to its municipality, not its province).
   */
  searchText: string;
}

export interface LocationFilterData {
  /** Options sorted by (tier, label), regions first. */
  options: LocationFilterOption[];
  /** token -> deduped member postal codes (sorted, as strings). */
  tokenToCodes: Map<string, string[]>;
  /** token -> localized label, for resolving chips/previews. */
  tokenToLabel: Map<string, string>;
}

/**
 * Maximum comma-joined postal-code length we allow a legacy `postalCodes`
 * request to carry. The backend caps that param at 4000 chars; we guard below
 * it so any single region/province (Wallonia, the largest, ~615 codes ~3,075
 * chars) passes. Selections sent as `areas` tokens are not subject to it.
 */
export const BACKEND_SAFE_LIMIT = 3800;

/**
 * An area token as the backend's `areas` filter accepts it (mirror of the
 * backend grammar). Anything else, e.g. a raw postal code from older saved
 * state, turns the whole `areas` request into a 400.
 */
export const AREA_TOKEN_PATTERN =
  /^(c:(be|nl|lu)|r:be:[a-z0-9-]+|p:(be|nl|lu):[a-z0-9-]+|m:(be|nl):\d{1,4}|m:lu:[a-z0-9-]+)$/;
export const MAX_AREA_TOKENS = 50;
export const MAX_AREA_TOKEN_LENGTH = 64;

const TOKEN_COUNTRY: Record<string, string> = {
  be: 'belgium',
  nl: 'netherlands',
  lu: 'luxembourg',
};

// ---------------------------------------------------------------------------
// Curated trilingual tables
//
// The raw region/province strings in the datasets are noisy and DIFFER per
// language file ("Hainaut (le)" / "Henegouwen", "Liège" / "Lüttich"). The NL
// file even carries the German exonym "Lüttich" AND "Liège" as separate strings
// for the same province. Every observed raw string across the three BE files
// (EN/FR/NL) and the NL file maps to a stable slug here; the test suite asserts
// full coverage so an unmapped string fails CI rather than silently dropping an
// area at runtime.
// ---------------------------------------------------------------------------

const BE_REGION_SLUG: Record<string, string> = {
  'Région wallonne': 'wallonia',
  'Waals Gewest': 'wallonia',
  'Région flamande': 'flanders',
  'Vlaams Gewest': 'flanders',
  'Région de Bruxelles-Capitale': 'brussels',
  'Brussels Hoofdstedelijk Gewest': 'brussels',
};

const BE_REGION_LABEL: Record<string, Record<Lang, string>> = {
  wallonia: { en: 'Wallonia', fr: 'Région wallonne', nl: 'Waals Gewest' },
  flanders: { en: 'Flanders', fr: 'Région flamande', nl: 'Vlaams Gewest' },
  brussels: { en: 'Brussels-Capital', fr: 'Bruxelles-Capitale', nl: 'Brussel-Hoofdstad' },
};

const BE_PROVINCE_SLUG: Record<string, string> = {
  Antwerp: 'antwerp',
  Antwerpen: 'antwerp',
  Anvers: 'antwerp',
  'Flandre orientale (la)': 'east-flanders',
  'Oost-Vlaanderen': 'east-flanders',
  'Brabant flamand (le)': 'flemish-brabant',
  'Vlaams-Brabant': 'flemish-brabant',
  'Hainaut (le)': 'hainaut',
  Henegouwen: 'hainaut',
  Liège: 'liege',
  Lüttich: 'liege', // German exonym present in the BE_NL file
  Luik: 'liege',
  'Limbourg (le)': 'limburg',
  Limburg: 'limburg',
  Luxembourg: 'luxembourg',
  Luxemburg: 'luxembourg',
  Namur: 'namur',
  Namen: 'namur',
  'Brabant wallon (le)': 'walloon-brabant',
  'Waals-Brabant': 'walloon-brabant',
  'Flandre occidentale (la)': 'west-flanders',
  'West-Vlaanderen': 'west-flanders',
};

const BE_PROVINCE_LABEL: Record<string, Record<Lang, string>> = {
  antwerp: { en: 'Antwerp', fr: 'Anvers', nl: 'Antwerpen' },
  'east-flanders': { en: 'East Flanders', fr: 'Flandre orientale', nl: 'Oost-Vlaanderen' },
  'flemish-brabant': { en: 'Flemish Brabant', fr: 'Brabant flamand', nl: 'Vlaams-Brabant' },
  hainaut: { en: 'Hainaut', fr: 'Hainaut', nl: 'Henegouwen' },
  liege: { en: 'Liège', fr: 'Liège', nl: 'Luik' },
  limburg: { en: 'Limburg', fr: 'Limbourg', nl: 'Limburg' },
  luxembourg: { en: 'Luxembourg', fr: 'Luxembourg', nl: 'Luxemburg' },
  namur: { en: 'Namur', fr: 'Namur', nl: 'Namen' },
  'walloon-brabant': { en: 'Walloon Brabant', fr: 'Brabant wallon', nl: 'Waals-Brabant' },
  'west-flanders': { en: 'West Flanders', fr: 'Flandre occidentale', nl: 'West-Vlaanderen' },
};

// NL province names are already clean Dutch; the label reuses the raw Dutch form
// across languages (matching existing city behavior), and only the slug is curated.
const NL_PROVINCE_SLUG: Record<string, string> = {
  'Zuid-Holland': 'zuid-holland',
  'Noord-Holland': 'noord-holland',
  'Noord-Brabant': 'noord-brabant',
  Gelderland: 'gelderland',
  Utrecht: 'utrecht',
  Overijssel: 'overijssel',
  Limburg: 'limburg',
  Groningen: 'groningen',
  Fryslân: 'fryslan',
  Drenthe: 'drenthe',
  Flevoland: 'flevoland',
  Zeeland: 'zeeland',
};

// Luxembourg, once selectable, is also a country, a canton and a commune; these
// labels keep its rows apart from each other and from the Belgian province.
const BE_LUXEMBOURG_PROVINCE_QUALIFIED: Record<Lang, string> = {
  en: 'Luxembourg (Belgium)',
  fr: 'Luxembourg (Belgique)',
  nl: 'Luxemburg (België)',
};
const LU_COUNTRY_LABEL: Record<Lang, string> = {
  en: 'Luxembourg (country)',
  fr: 'Luxembourg (pays)',
  nl: 'Luxemburg (land)',
};
const LU_CANTON_PREFIX: Record<Lang, string> = { en: 'Canton', fr: 'Canton', nl: 'Kanton' };
const LU_CANTON_NAME_NL: Record<string, string> = { luxembourg: 'Luxemburg' };

const TIER_RANK: Record<LocationTier, number> = {
  country: 0,
  region: 1,
  province: 2,
  municipality: 3,
};

/** Locate a field by prefix (handles the per-language `*_english/_french/_dutch` suffixes). */
function findKey(row: Record<string, unknown>, prefix: string): string | undefined {
  return Object.keys(row).find((k) => k.startsWith(prefix));
}

interface BuildParams {
  belgiumRows?: Record<string, unknown>[];
  netherlandsRows?: Record<string, unknown>[];
  /** Luxembourg areas; only passed while Luxembourg is selectable. */
  luxembourg?: { cantons: LuxembourgCanton[]; communes: LuxembourgCommune[] };
  lang: Lang;
}

/**
 * Build the full set of hierarchy options plus the lookup maps used for
 * expansion and label resolution, in a single pass over each dataset.
 */
export function buildLocationFilterOptions({
  belgiumRows,
  netherlandsRows,
  luxembourg,
  lang,
}: BuildParams): LocationFilterData {
  const tokenToCodes = new Map<string, string[]>();
  const tokenToLabel = new Map<string, string>();
  const options: LocationFilterOption[] = [];

  const register = (
    value: string,
    label: string,
    tier: LocationTier,
    codes: Set<number>,
    provinceLabel = ''
  ) => {
    const codeList = [...codes].sort((a, b) => a - b).map(String);
    tokenToCodes.set(value, codeList);
    tokenToLabel.set(value, label);
    const searchText =
      tier === 'municipality'
        ? `${label} ${provinceLabel} ${codeList.join(' ')}`.toLowerCase()
        : label.toLowerCase();
    options.push({ value, label, tier, count: codeList.length, provinceLabel, searchText });
  };

  if (belgiumRows && belgiumRows.length > 0) {
    const muniKey = findKey(belgiumRows[0], 'municipality_name');
    const provKey = findKey(belgiumRows[0], 'province_name');
    const regionKey = findKey(belgiumRows[0], 'region_name');

    const muniCodes = new Map<string, Set<number>>();
    const muniProvinceSlug = new Map<string, string>();
    const provCodes = new Map<string, Set<number>>();
    const regionCodes = new Map<string, Set<number>>();
    const unmappedProvince = new Set<string>();
    const unmappedRegion = new Set<string>();

    for (const row of belgiumRows) {
      const code = row.post_code as number;
      const muni = muniKey ? (row[muniKey] as string | null) : null;
      const provRaw = provKey ? (row[provKey] as string | null) : null;
      const regionRaw = regionKey ? (row[regionKey] as string | null) : null;

      if (muni) {
        if (!muniCodes.has(muni)) muniCodes.set(muni, new Set());
        muniCodes.get(muni)!.add(code);
      }
      if (provRaw) {
        const slug = BE_PROVINCE_SLUG[provRaw];
        if (slug) {
          if (!provCodes.has(slug)) provCodes.set(slug, new Set());
          provCodes.get(slug)!.add(code);
          if (muni && !muniProvinceSlug.has(muni)) muniProvinceSlug.set(muni, slug);
        } else {
          unmappedProvince.add(provRaw);
        }
      }
      if (regionRaw) {
        const slug = BE_REGION_SLUG[regionRaw];
        if (slug) {
          if (!regionCodes.has(slug)) regionCodes.set(slug, new Set());
          regionCodes.get(slug)!.add(code);
        } else {
          unmappedRegion.add(regionRaw);
        }
      }
    }

    if (unmappedProvince.size > 0 || unmappedRegion.size > 0) {
      logger.warn('[locationFilter] Unmapped BE administrative names', {
        provinces: [...unmappedProvince],
        regions: [...unmappedRegion],
      });
    }

    for (const [slug, codes] of regionCodes) {
      register(`r:be:${slug}`, BE_REGION_LABEL[slug]?.[lang] ?? slug, 'region', codes);
    }
    const beProvinceLabel = (slug: string) =>
      slug === 'luxembourg' && luxembourg
        ? BE_LUXEMBOURG_PROVINCE_QUALIFIED[lang]
        : (BE_PROVINCE_LABEL[slug]?.[lang] ?? slug);

    for (const [slug, codes] of provCodes) {
      register(`p:be:${slug}`, beProvinceLabel(slug), 'province', codes);
    }
    for (const [muni, codes] of muniCodes) {
      const minCode = Math.min(...codes);
      const provSlug = muniProvinceSlug.get(muni);
      const provLabel = provSlug ? beProvinceLabel(provSlug) : '';
      register(`m:be:${minCode}`, muni, 'municipality', codes, provLabel);
    }
  }

  if (netherlandsRows && netherlandsRows.length > 0) {
    const provCodes = new Map<string, Set<number>>();
    const provLabelBySlug = new Map<string, string>();
    const subMuniCodes = new Map<string, Set<number>>();
    const subMuniProvLabel = new Map<string, string>();
    const unmappedProvince = new Set<string>();

    for (const row of netherlandsRows) {
      const code = row.post_code as number;
      const sub = row.sub_municipality_name as string | null;
      const provRaw = row.prov_name as string | null;
      let provLabel = '';

      if (provRaw) {
        const slug = NL_PROVINCE_SLUG[provRaw];
        if (slug) {
          provLabel = provRaw; // NL provinces keep the Dutch form across languages
          if (!provCodes.has(slug)) provCodes.set(slug, new Set());
          provCodes.get(slug)!.add(code);
          provLabelBySlug.set(slug, provLabel);
        } else {
          unmappedProvince.add(provRaw);
        }
      }
      if (sub) {
        if (!subMuniCodes.has(sub)) subMuniCodes.set(sub, new Set());
        subMuniCodes.get(sub)!.add(code);
        if (provLabel && !subMuniProvLabel.has(sub)) subMuniProvLabel.set(sub, provLabel);
      }
    }

    if (unmappedProvince.size > 0) {
      logger.warn('[locationFilter] Unmapped NL province names', {
        provinces: [...unmappedProvince],
      });
    }

    for (const [slug, codes] of provCodes) {
      register(`p:nl:${slug}`, provLabelBySlug.get(slug) ?? slug, 'province', codes);
    }
    for (const [sub, codes] of subMuniCodes) {
      const minCode = Math.min(...codes);
      register(`m:nl:${minCode}`, sub, 'municipality', codes, subMuniProvLabel.get(sub) ?? '');
    }
  }

  if (luxembourg && luxembourg.communes.length > 0) {
    const cantonLabel = (slug: string) => {
      const name = luxembourg.cantons.find((canton) => canton.slug === slug)?.name ?? slug;
      return `${LU_CANTON_PREFIX[lang]} ${lang === 'nl' ? (LU_CANTON_NAME_NL[slug] ?? name) : name}`;
    };
    const countryCodes = new Set<number>();
    const cantonCodes = new Map<string, Set<number>>();
    for (const commune of luxembourg.communes) {
      if (!cantonCodes.has(commune.canton)) cantonCodes.set(commune.canton, new Set());
      for (const code of commune.codes) {
        countryCodes.add(code);
        cantonCodes.get(commune.canton)!.add(code);
      }
    }

    // c:lu matches on the country alone; its codes only feed the count and the
    // legacy fallback, which is too broad for them and so never sends.
    register('c:lu', LU_COUNTRY_LABEL[lang], 'country', countryCodes);
    for (const canton of luxembourg.cantons) {
      const codes = cantonCodes.get(canton.slug);
      if (codes) register(`p:lu:${canton.slug}`, cantonLabel(canton.slug), 'province', codes);
    }
    for (const commune of luxembourg.communes) {
      register(
        `m:lu:${commune.slug}`,
        commune.name,
        'municipality',
        new Set(commune.codes),
        cantonLabel(commune.canton)
      );
    }
  }

  options.sort((a, b) => {
    if (TIER_RANK[a.tier] !== TIER_RANK[b.tier]) return TIER_RANK[a.tier] - TIER_RANK[b.tier];
    return a.label.localeCompare(b.label);
  });

  return { options, tokenToCodes, tokenToLabel };
}

/** Comma-joined length of a postal-code list, matching what the request carries. */
function joinedLength(codes: string[]): number {
  if (codes.length === 0) return 0;
  return codes.reduce((sum, c) => sum + c.length + 1, -1);
}

/**
 * Expand hierarchy tokens to a deduped list of postal codes. Unrecognized values
 * pass through unchanged, so a bare postal code (legacy / restored state) still
 * filters correctly. `truncated` is true when the comma-joined result would
 * exceed {@link BACKEND_SAFE_LIMIT}; codes are never silently capped.
 */
export function expandLocationTokens(
  values: string[],
  tokenToCodes: Map<string, string[]>
): { codes: string[]; truncated: boolean } {
  const set = new Set<string>();
  for (const value of values) {
    const codes = tokenToCodes.get(value);
    if (codes) {
      for (const code of codes) set.add(code);
    } else {
      set.add(value); // pass-through for raw postal codes
    }
  }
  const codes = [...set];
  return { codes, truncated: joinedLength(codes) > BACKEND_SAFE_LIMIT };
}

/** True when the selection can go to the backend as `areas`: only tokens, within its limits. */
export function isAreaTokenSelection(values: string[]): boolean {
  return (
    values.length > 0 &&
    values.length <= MAX_AREA_TOKENS &&
    values.every((value) => value.length <= MAX_AREA_TOKEN_LENGTH && AREA_TOKEN_PATTERN.test(value))
  );
}

/**
 * True when the selection can only go out as a postal-code list and that list
 * would pass the safe limit. Used by the filter screens to block over-broad
 * selections before any request is fired.
 */
export function isLocationSelectionTooBroad(
  values: string[],
  tokenToCodes: Map<string, string[]>
): boolean {
  if (isAreaTokenSelection(values)) return false;
  return expandLocationTokens(values, tokenToCodes).truncated;
}

/** A location selection prepared for matching events on the device. */
export interface LocationMatch {
  /** Member postal codes per canonical country, from area tokens. */
  codesByCountry: Map<string, Set<string>>;
  /** Countries selected whole (`c:*` tokens). */
  wholeCountries: Set<string>;
  /** Raw postal codes from older saved state; they carry no country. */
  rawCodes: Set<string>;
}

/**
 * Prepare a selection for {@link matchesLocationFilter}. Unknown tokens add
 * nothing, so they match no event, as on the server.
 */
export function buildLocationMatch(
  values: string[],
  tokenToCodes: Map<string, string[]>
): LocationMatch {
  const match: LocationMatch = {
    codesByCountry: new Map(),
    wholeCountries: new Set(),
    rawCodes: new Set(),
  };
  for (const value of values) {
    if (!AREA_TOKEN_PATTERN.test(value)) {
      match.rawCodes.add(value);
      continue;
    }
    const [tier, countryCode] = value.split(':');
    const country = TOKEN_COUNTRY[countryCode];
    if (tier === 'c') {
      match.wholeCountries.add(country);
      continue;
    }
    const codes = tokenToCodes.get(value);
    if (!codes) continue;
    if (!match.codesByCountry.has(country)) match.codesByCountry.set(country, new Set());
    const countryCodes = match.codesByCountry.get(country)!;
    for (const code of codes) countryCodes.add(code);
  }
  return match;
}

/**
 * The backend's `areas` rule, applied on the device: the event's country must be
 * the token's country, and its postcode one of the area's codes (a whole-country
 * token needs no postcode). Events without a recognised country never match a
 * token. Raw postal codes keep their legacy meaning: the code, in any country.
 */
export function matchesLocationFilter(
  event: { country?: string | null; postal_code?: string | number | null },
  match: LocationMatch
): boolean {
  const code =
    event.postal_code === null || event.postal_code === undefined
      ? null
      : normalizeEventPostcode(event.postal_code);
  if (code && match.rawCodes.has(code)) return true;
  const country = canonicalCountry(event.country);
  if (!country) return false;
  if (match.wholeCountries.has(country)) return true;
  return code !== null && (match.codesByCountry.get(country)?.has(code) ?? false);
}

/**
 * Resolve a token (or raw postal code) to a display label. Tokens use the
 * localized label map; bare postal codes fall back to `resolveRawCode`
 * (e.g. "Brussels (1000)"); anything else returns unchanged.
 */
export function resolveLocationLabel(
  value: string,
  tokenToLabel: Map<string, string>,
  resolveRawCode?: (code: string) => string
): string {
  const label = tokenToLabel.get(value);
  if (label) return label;
  if (resolveRawCode && /^\d+$/.test(value)) return resolveRawCode(value);
  return value;
}
