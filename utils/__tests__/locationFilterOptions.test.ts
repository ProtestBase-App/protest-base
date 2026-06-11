jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { logger } from '@/utils/logger';
import {
  buildLocationFilterOptions,
  expandLocationTokens,
  isLocationSelectionTooBroad,
  resolveLocationLabel,
  type LocationFilterData,
  type LocationFilterOption,
} from '../locationFilterOptions';
import { POSTAL_CODES_EN } from '@/constants/PostalCodes_BE_EN';
import { POSTAL_CODES_FR } from '@/constants/PostalCodes_BE_FR';
import { POSTAL_CODES_NL } from '@/constants/PostalCodes_BE_NL';
import { POSTAL_CODES_NL_NL } from '@/constants/PostalCodes_NL';

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

describe('isLocationSelectionTooBroad', () => {
  const data = buildLocationFilterOptions({ belgiumRows: BE_EN, lang: 'en' });

  it('allows a single region but blocks stacking two regions', () => {
    expect(isLocationSelectionTooBroad(['r:be:wallonia'], data.tokenToCodes)).toBe(false);
    expect(isLocationSelectionTooBroad(['r:be:wallonia', 'r:be:flanders'], data.tokenToCodes)).toBe(
      true
    );
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
