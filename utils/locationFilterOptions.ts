import { logger } from '@/utils/logger';

/**
 * Administrative-hierarchy location options for the /explore filter.
 *
 * Instead of one option per postal code, the explore location filter groups
 * postal codes into real administrative areas:
 *
 *   - Belgium: region (3) -> province (10) -> municipality (578)
 *   - Netherlands: province (12) -> sub-municipality (351)
 *
 * Selecting an area filters by ALL of its member postal codes. Tokens are
 * resolved back to postal codes by {@link expandLocationTokens} before the
 * request reaches the backend, which already accepts the comma-joined list.
 *
 * Token scheme (collision-free, verified against the bundled datasets):
 *
 *   r:be:<slug>     region        e.g. r:be:brussels
 *   p:be:<slug>     province      e.g. p:be:hainaut
 *   p:nl:<slug>     NL province   e.g. p:nl:zuid-holland
 *   m:be:<minCode>  municipality  e.g. m:be:7500  (Tournai)
 *   m:nl:<minCode>  sub-municip.  e.g. m:nl:1011
 *
 * Municipalities/sub-municipalities are keyed by the minimum member postal
 * code. The postal-code -> municipality partition is byte-identical across the
 * three Belgian language files, so the min-code token is language-independent
 * and these options can be built from whichever single BE file is loaded at
 * runtime.
 *
 * This module is pure (no React, no i18n). Display-only formatting that needs
 * translation (tier headers, "{n} postal codes") is done by the screen.
 */

export type Lang = 'en' | 'fr' | 'nl';
export type LocationTier = 'region' | 'province' | 'municipality';

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
 * Maximum comma-joined postal-code length we allow a single explore request to
 * carry. The backend caps the param at 4000 chars; we guard below it so any
 * single region/province (Wallonia, the largest, ~615 codes ~3,075 chars)
 * passes while multi-region stacking is blocked client-side.
 */
export const BACKEND_SAFE_LIMIT = 3800;

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

const TIER_RANK: Record<LocationTier, number> = { region: 0, province: 1, municipality: 2 };

/** Locate a field by prefix (handles the per-language `*_english/_french/_dutch` suffixes). */
function findKey(row: Record<string, unknown>, prefix: string): string | undefined {
  return Object.keys(row).find((k) => k.startsWith(prefix));
}

interface BuildParams {
  belgiumRows?: Record<string, unknown>[];
  netherlandsRows?: Record<string, unknown>[];
  lang: Lang;
}

/**
 * Build the full set of hierarchy options plus the lookup maps used for
 * expansion and label resolution, in a single pass over each dataset.
 */
export function buildLocationFilterOptions({
  belgiumRows,
  netherlandsRows,
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
    for (const [slug, codes] of provCodes) {
      register(`p:be:${slug}`, BE_PROVINCE_LABEL[slug]?.[lang] ?? slug, 'province', codes);
    }
    for (const [muni, codes] of muniCodes) {
      const minCode = Math.min(...codes);
      const provSlug = muniProvinceSlug.get(muni);
      const provLabel = provSlug ? (BE_PROVINCE_LABEL[provSlug]?.[lang] ?? '') : '';
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

/**
 * True when the selection would expand past the safe limit. Used by the filter
 * screen to block over-broad selections before any request is fired.
 */
export function isLocationSelectionTooBroad(
  values: string[],
  tokenToCodes: Map<string, string[]>
): boolean {
  return expandLocationTokens(values, tokenToCodes).truncated;
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
