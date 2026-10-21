jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { logger } from '@/utils/logger';
import {
  AREA_TOKEN_PATTERN,
  MAX_AREA_TOKEN_LENGTH,
  MAX_AREA_TOKENS,
  buildLocationFilterOptions,
  buildLocationMatch,
  countryOfLocationToken,
  expandLocationTokens,
  isAreaTokenSelection,
  isLocationSelectionTooBroad,
  matchesLocationFilter,
  resolveLocationLabel,
  withoutFrenchAreas,
  type LocationFilterData,
  type LocationFilterOption,
} from '../locationFilterOptions';
import { POSTAL_CODES_EN } from '@/constants/PostalCodes_BE_EN';
import { POSTAL_CODES_FR } from '@/constants/PostalCodes_BE_FR';
import { POSTAL_CODES_NL } from '@/constants/PostalCodes_BE_NL';
import { POSTAL_CODES_NL_NL } from '@/constants/PostalCodes_NL';
import { LU_CANTONS, LU_COMMUNES } from '@/constants/PostalCodes_LU';
import { FR_AREAS } from '@/constants/PostalCodes_FR';

// The dataset interfaces have no index signature; the builder takes a generic
// record, so widen once here.
type Row = Record<string, unknown>;
const BE_EN = POSTAL_CODES_EN as unknown as Row[];
const BE_FR = POSTAL_CODES_FR as unknown as Row[];
const BE_NL = POSTAL_CODES_NL as unknown as Row[];
const NL = POSTAL_CODES_NL_NL as unknown as Row[];

const mockWarn = logger.warn as jest.Mock;

const countByTier = (options: LocationFilterOption[], tier: string) =>
  options.filter((o) => o.tier === tier).length;

const codesOf = (data: LocationFilterData, token: string) =>
  new Set((data.tokenToCodes.get(token) ?? []).map(Number));

describe('buildLocationFilterOptions — invariants on the bundled datasets', () => {
  beforeEach(() => mockWarn.mockClear());

  it('produces 3 regions / 10 provinces / 578 municipalities for Belgium (EN)', () => {
    const { options } = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });
    expect(countByTier(options, 'region')).toBe(3);
    expect(countByTier(options, 'province')).toBe(10);
    expect(countByTier(options, 'municipality')).toBe(578);
    // No unmapped region/province strings -> no warnings.
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('produces 12 provinces / 351 sub-municipalities for the Netherlands', () => {
    const { options } = buildLocationFilterOptions({
      netherlandsRows: NL,
      lang: 'en',
    });
    expect(countByTier(options, 'province')).toBe(12);
    expect(countByTier(options, 'municipality')).toBe(351);
    expect(countByTier(options, 'region')).toBe(0);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('maps every region/province string in all three BE files (no unmapped warnings)', () => {
    for (const rows of [BE_EN, BE_FR, BE_NL]) {
      mockWarn.mockClear();
      const { options } = buildLocationFilterOptions({ belgiumRows: rows, lang: 'en' });
      expect(countByTier(options, 'region')).toBe(3);
      expect(countByTier(options, 'province')).toBe(10);
      expect(countByTier(options, 'municipality')).toBe(578);
      expect(mockWarn).not.toHaveBeenCalled();
    }
  });

  it('folds the German exonym "Lüttich" into the Liège province (BE_NL file)', () => {
    // Province membership must be identical regardless of which language file is
    // loaded: in BE_NL the Liège province is split across "Lüttich" and "Liège".
    const en = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });
    const nl = buildLocationFilterOptions({ belgiumRows: BE_NL, lang: 'nl' });
    const enLiege = codesOf(en, 'p:be:liege');
    const nlLiege = codesOf(nl, 'p:be:liege');
    expect(nlLiege.size).toBeGreaterThan(0);
    expect(nlLiege).toEqual(enLiege);
  });

  it('keys municipalities by their minimum member postal code', () => {
    const { tokenToCodes } = buildLocationFilterOptions({
      belgiumRows: BE_EN,
      lang: 'en',
    });
    // Tournai spans many codes; its token is the min (7500).
    const tournai = tokenToCodes.get('m:be:7500');
    expect(tournai).toBeDefined();
    expect(Math.min(...tournai!.map(Number))).toBe(7500);
    expect(tournai!.length).toBeGreaterThan(1);
  });

  it('localizes region/province labels per language', () => {
    const en = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });
    const nl = buildLocationFilterOptions({ belgiumRows: BE_NL, lang: 'nl' });
    expect(en.tokenToLabel.get('r:be:brussels')).toBe('Brussels-Capital');
    expect(nl.tokenToLabel.get('r:be:brussels')).toBe('Brussel-Hoofdstad');
    expect(en.tokenToLabel.get('p:be:liege')).toBe('Liège');
    expect(nl.tokenToLabel.get('p:be:liege')).toBe('Luik');
  });

  it('builds searchText so a postcode surfaces its municipality but not its province', () => {
    const { options } = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });
    const tournai = options.find((o) => o.value === 'm:be:7500')!;
    expect(tournai.searchText).toContain('7500');
    const province = options.find((o) => o.tier === 'province')!;
    expect(province.searchText).not.toMatch(/\d{4}/);
  });
});

describe('expandLocationTokens', () => {
  const data = buildLocationFilterOptions({
    belgiumRows: BE_EN,
    netherlandsRows: NL,
    lang: 'en',
  });

  it('expands a region token to all of its member postal codes', () => {
    const expected = codesOf(data, 'r:be:brussels');
    const { codes, truncated } = expandLocationTokens(['r:be:brussels'], data.tokenToCodes);
    expect(new Set(codes.map(Number))).toEqual(expected);
    expect(truncated).toBe(false);
    // Brussels-Capital is far more than just 1000.
    expect(codes).toContain('1040'); // Etterbeek
    expect(codes.length).toBeGreaterThan(20);
  });

  it('dedupes overlap between a region and a member municipality', () => {
    const regionOnly = expandLocationTokens(['r:be:brussels'], data.tokenToCodes).codes;
    // Etterbeek (1040) is inside Brussels-Capital.
    const withMember = expandLocationTokens(
      ['r:be:brussels', 'm:be:1040'],
      data.tokenToCodes
    ).codes;
    expect(withMember.length).toBe(regionOnly.length);
    expect(withMember.filter((c) => c === '1040')).toHaveLength(1);
  });

  it('passes through unrecognized raw postal codes unchanged', () => {
    const { codes } = expandLocationTokens(['9999', 'r:be:brussels'], data.tokenToCodes);
    expect(codes).toContain('9999');
  });

  it('expands and resolves the Netherlands province + sub-municipality path', () => {
    expect(data.tokenToLabel.get('p:nl:zuid-holland')).toBe('Zuid-Holland');
    expect(
      expandLocationTokens(['p:nl:zuid-holland'], data.tokenToCodes).codes.length
    ).toBeGreaterThan(0);

    const nlMunicipality = [...data.tokenToCodes.keys()].find((token) =>
      token.startsWith('m:nl:')
    )!;
    expect(nlMunicipality).toBeDefined();
    expect(expandLocationTokens([nlMunicipality], data.tokenToCodes).codes.length).toBeGreaterThan(
      0
    );
    expect(resolveLocationLabel(nlMunicipality, data.tokenToLabel)).toBeTruthy();
  });
});

describe('area tokens on the wire', () => {
  // Every value the app can send must pass the backend's `areas` grammar,
  // or every request that uses it fails with a 400.
  it('the bundled BE + NL options all match the backend token grammar', () => {
    const { options } = buildLocationFilterOptions({
      belgiumRows: BE_EN,
      netherlandsRows: NL,
      lang: 'en',
    });
    expect(options).toHaveLength(954);
    for (const { value } of options) {
      expect(value).toMatch(AREA_TOKEN_PATTERN);
      expect(value.length).toBeLessThanOrEqual(MAX_AREA_TOKEN_LENGTH);
    }
  });

  it('accepts a selection of tokens within the limits', () => {
    expect(isAreaTokenSelection(['r:be:brussels', 'm:be:9', 'p:nl:fryslan', 'c:lu'])).toBe(true);
  });

  it('rejects raw postcodes, malformed tokens, empty and oversized selections', () => {
    expect(isAreaTokenSelection(['r:be:brussels', '1000'])).toBe(false);
    expect(isAreaTokenSelection(['R:BE:BRUSSELS'])).toBe(false);
    expect(isAreaTokenSelection(['r:nl:holland'])).toBe(false);
    expect(isAreaTokenSelection([])).toBe(false);
    expect(isAreaTokenSelection(Array(MAX_AREA_TOKENS + 1).fill('c:be'))).toBe(false);
  });

  it('accepts the French country, région and département tokens', () => {
    expect(
      isAreaTokenSelection(['c:fr', 'r:fr:ile-de-france', 'p:fr:75', 'p:fr:01', 'p:fr:2a'])
    ).toBe(true);
  });

  it('rejects what the backend rejects for France: a commune tier, upper case', () => {
    expect(isAreaTokenSelection(['m:fr:75056'])).toBe(false);
    expect(isAreaTokenSelection(['p:fr:2A'])).toBe(false);
    expect(isAreaTokenSelection(['r:nl:holland', 'c:fr'])).toBe(false);
  });
});

describe('countryOfLocationToken', () => {
  it('maps every token tier to its canonical country', () => {
    expect(countryOfLocationToken('r:be:brussels')).toBe('belgium');
    expect(countryOfLocationToken('p:be:luxembourg')).toBe('belgium');
    expect(countryOfLocationToken('m:be:7500')).toBe('belgium');
    expect(countryOfLocationToken('p:nl:zuid-holland')).toBe('netherlands');
    expect(countryOfLocationToken('m:nl:1011')).toBe('netherlands');
    expect(countryOfLocationToken('c:lu')).toBe('luxembourg');
    expect(countryOfLocationToken('p:lu:esch-sur-alzette')).toBe('luxembourg');
    expect(countryOfLocationToken('m:lu:kaerjeng')).toBe('luxembourg');
    expect(countryOfLocationToken('c:fr')).toBe('france');
    expect(countryOfLocationToken('r:fr:corse')).toBe('france');
    expect(countryOfLocationToken('p:fr:2b')).toBe('france');
  });

  it('returns null for raw postal codes and malformed tokens', () => {
    expect(countryOfLocationToken('1000')).toBeNull();
    expect(countryOfLocationToken('r:nl:holland')).toBeNull();
    expect(countryOfLocationToken('R:BE:BRUSSELS')).toBeNull();
    expect(countryOfLocationToken('')).toBeNull();
  });
});

describe('isLocationSelectionTooBroad', () => {
  const data = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });

  it('never blocks a token selection: it goes out as `areas`', () => {
    expect(isLocationSelectionTooBroad(['r:be:wallonia'], data.tokenToCodes)).toBe(false);
    expect(isLocationSelectionTooBroad(['r:be:wallonia', 'r:be:flanders'], data.tokenToCodes)).toBe(
      false
    );
  });

  it('still blocks a postal-code list past the safe limit', () => {
    const rawCodes = data.tokenToCodes
      .get('r:be:wallonia')!
      .concat(data.tokenToCodes.get('r:be:flanders')!);
    expect(isLocationSelectionTooBroad(rawCodes, data.tokenToCodes)).toBe(true);
  });

  it('leaves French areas out of the postal-code list, which never carries them', () => {
    const tokenToCodes = new Map([
      ['r:fr:grand-est', Array.from({ length: 900 }, (_, i) => String(51000 + i * 10))],
    ]);
    expect(isLocationSelectionTooBroad(['1000', 'r:fr:grand-est'], tokenToCodes)).toBe(false);
  });
});

describe('withoutFrenchAreas', () => {
  it('drops French tokens and keeps every other value, raw codes included', () => {
    expect(
      withoutFrenchAreas(['c:fr', 'r:fr:corse', 'p:fr:75', 'p:be:liege', 'c:lu', '1000'])
    ).toEqual(['p:be:liege', 'c:lu', '1000']);
  });
});

describe('French postcodes on the device (5 digits)', () => {
  const tokenToCodes = new Map([
    ['p:fr:01', ['01000', '01090']],
    ['p:fr:75', ['75001', '75011']],
  ]);

  it('matches the full 5-digit code, leading zero included', () => {
    const ain = buildLocationMatch(['p:fr:01'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'france', postal_code: '01000' }, ain)).toBe(true);
    expect(matchesLocationFilter({ country: 'Frankrijk', postal_code: '01090' }, ain)).toBe(true);
    expect(matchesLocationFilter({ country: 'france', postal_code: '01100' }, ain)).toBe(false);
  });

  it('folds the spellings the backend canonicalises', () => {
    const paris = buildLocationMatch(['p:fr:75'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'france', postal_code: 'F-75011' }, paris)).toBe(true);
    expect(matchesLocationFilter({ country: 'FR', postal_code: '75 011' }, paris)).toBe(true);
  });

  it('never truncates a French code onto a 4-digit one', () => {
    const rawCodes = buildLocationMatch(['7501', '0100'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'france', postal_code: '75011' }, rawCodes)).toBe(
      false
    );
    expect(matchesLocationFilter({ country: 'france', postal_code: '01000' }, rawCodes)).toBe(
      false
    );
  });

  it('keeps French areas to French events', () => {
    const ain = buildLocationMatch(['p:fr:01'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'belgium', postal_code: '01000' }, ain)).toBe(false);
    expect(matchesLocationFilter({ country: null, postal_code: '01000' }, ain)).toBe(false);
  });

  it('matches the whole country without a postcode', () => {
    const france = buildLocationMatch(['c:fr'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'France', postal_code: null }, france)).toBe(true);
    expect(matchesLocationFilter({ country: 'belgium', postal_code: '1000' }, france)).toBe(false);
  });
});

describe('buildLocationMatch', () => {
  const tokenToCodes = new Map([['r:be:brussels', ['1000', '1060']]]);

  it('scopes token codes by country and keeps raw codes and whole countries apart', () => {
    const match = buildLocationMatch(['r:be:brussels', 'c:lu', '9000'], tokenToCodes);
    expect([...(match.codesByCountry.get('belgium') ?? [])]).toEqual(['1000', '1060']);
    expect([...match.wholeCountries]).toEqual(['luxembourg']);
    expect([...match.rawCodes]).toEqual(['9000']);
  });

  it('adds nothing for an unknown token', () => {
    const match = buildLocationMatch(['m:be:1'], tokenToCodes);
    expect(match.codesByCountry.size).toBe(0);
    expect(match.wholeCountries.size).toBe(0);
    expect(match.rawCodes.size).toBe(0);
  });
});

describe('resolveLocationLabel', () => {
  const data = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });

  it('resolves a token to its label', () => {
    expect(resolveLocationLabel('r:be:brussels', data.tokenToLabel)).toBe('Brussels-Capital');
  });

  it('falls back to the raw-code resolver for bare postal codes', () => {
    const resolver = (code: string) => `City (${code})`;
    expect(resolveLocationLabel('1000', data.tokenToLabel, resolver)).toBe('City (1000)');
  });

  it('returns the value unchanged when nothing matches', () => {
    expect(resolveLocationLabel('mystery', data.tokenToLabel)).toBe('mystery');
  });
});

describe('France next to Belgium, the Netherlands and Luxembourg', () => {
  beforeEach(() => mockWarn.mockClear());

  it('adds its 110 areas without an unmapped name or a token clash', () => {
    const { options } = buildLocationFilterOptions({
      belgiumRows: BE_EN,
      netherlandsRows: NL,
      luxembourg: { cantons: LU_CANTONS, communes: LU_COMMUNES },
      france: FR_AREAS,
      lang: 'en',
    });
    const values = options.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.filter((value) => countryOfLocationToken(value) === 'france')).toHaveLength(110);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('lists the countries first, France among them', () => {
    const { options } = buildLocationFilterOptions({
      luxembourg: { cantons: LU_CANTONS, communes: LU_COMMUNES },
      france: FR_AREAS,
      lang: 'nl',
    });
    expect(options.slice(0, 2).map((o) => o.label)).toEqual(['Frankrijk', 'Luxemburg (land)']);
  });
});

describe('Luxembourg options', () => {
  const build = (lang: 'en' | 'fr' | 'nl', withLuxembourg = true) =>
    buildLocationFilterOptions({
      belgiumRows: BE_EN,
      luxembourg: withLuxembourg ? { cantons: LU_CANTONS, communes: LU_COMMUNES } : undefined,
      lang,
    });

  it('adds the country, 12 cantons and 100 communes', () => {
    const lu = build('en').options.filter((o) => /^[cpm]:lu(:|$)/.test(o.value));
    expect(lu.filter((o) => o.tier === 'country')).toHaveLength(1);
    expect(lu.filter((o) => o.tier === 'province')).toHaveLength(12);
    expect(lu.filter((o) => o.tier === 'municipality')).toHaveLength(100);
  });

  it('keeps the four "Luxembourg" rows apart', () => {
    const byValue = new Map(build('en').options.map((o) => [o.value, o]));
    expect(byValue.get('c:lu')?.label).toBe('Luxembourg (country)');
    expect(byValue.get('p:lu:luxembourg')?.label).toBe('Canton Luxembourg');
    expect(byValue.get('m:lu:luxembourg')).toEqual(
      expect.objectContaining({ label: 'Luxembourg', provinceLabel: 'Canton Luxembourg' })
    );
    expect(byValue.get('p:be:luxembourg')?.label).toBe('Luxembourg (Belgium)');
  });

  it('leaves the Belgian labels alone while Luxembourg is off', () => {
    const { options } = build('en', false);
    expect(options.find((o) => o.value === 'p:be:luxembourg')?.label).toBe('Luxembourg');
    expect(options.some((o) => /^[cpm]:lu(:|$)/.test(o.value))).toBe(false);
  });

  it('uses the Dutch names in Dutch', () => {
    const byValue = new Map(build('nl').options.map((o) => [o.value, o]));
    expect(byValue.get('p:lu:luxembourg')?.label).toBe('Kanton Luxemburg');
    expect(byValue.get('c:lu')?.label).toBe('Luxemburg (land)');
  });

  it('lists the country first and counts its postal codes', () => {
    const { options, tokenToCodes } = build('en');
    expect(options[0].value).toBe('c:lu');
    expect(tokenToCodes.get('c:lu')).toHaveLength(4272);
    expect(tokenToCodes.get('m:lu:luxembourg')).toHaveLength(792);
  });

  it('never lets the whole country go out as a postal-code list', () => {
    const { tokenToCodes } = build('en');
    expect(expandLocationTokens(['c:lu'], tokenToCodes).truncated).toBe(true);
  });

  it('matches by country for c:lu and by commune codes for m:lu', () => {
    const { tokenToCodes } = build('en');
    const code = String(LU_COMMUNES.find((c) => c.slug === 'kaerjeng')!.codes[0]);
    const commune = buildLocationMatch(['m:lu:kaerjeng'], tokenToCodes);
    const country = buildLocationMatch(['c:lu'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'luxembourg', postal_code: code }, commune)).toBe(true);
    expect(matchesLocationFilter({ country: 'belgium', postal_code: code }, commune)).toBe(false);
    expect(matchesLocationFilter({ country: 'Luxemburg', postal_code: null }, country)).toBe(true);
  });
});
