import { FR_AREAS } from '@/constants/PostalCodes_FR';
import {
  buildFranceLocalities,
  findFranceLocalityValue,
  matchFranceLocalities,
} from '@/utils/franceLocalities';

const localities = buildFranceLocalities(FR_AREAS);
const labels = (query: string) => matchFranceLocalities(localities, query).map((l) => l.label);

describe('buildFranceLocalities', () => {
  it('lists every (postcode, commune) pair once', () => {
    expect(localities).toHaveLength(35211);
    expect(new Set(localities.map((l) => l.value)).size).toBe(localities.length);
  });

  it('orders by postcode as text, so 01000 comes first', () => {
    expect(localities[0].label).toBe('Bourg-en-Bresse (01000)');
    const codes = localities.map((l) => l.postalCode);
    expect(codes).toEqual([...codes].sort());
  });

  it('writes the postcode as a 5-digit string, the commune and its région', () => {
    const bourg = localities.find((l) => l.value === '01000|01053')!;
    expect(bourg).toEqual({
      value: '01000|01053',
      label: 'Bourg-en-Bresse (01000)',
      sublabel: 'Ain',
      searchText: 'bourg en bresse',
      postalCode: '01000',
      city: 'Bourg-en-Bresse',
      region: 'Auvergne-Rhône-Alpes',
    });
    for (const locality of localities) expect(locality.postalCode).toMatch(/^\d{5}$/);
  });

  it('gives every locality a région, Corsica included', () => {
    expect(localities.every((l) => l.region !== '')).toBe(true);
    expect(localities.find((l) => l.value === '20000|2A004')?.region).toBe('Corse');
  });
});

describe('findFranceLocalityValue', () => {
  it('finds the picked commune back from the stored code and city', () => {
    expect(findFranceLocalityValue(FR_AREAS, '01000', 'Saint-Denis-lès-Bourg')).toBe('01000|01344');
    expect(findFranceLocalityValue(FR_AREAS, '75011', 'Paris')).toBe('75011|75056');
  });

  it('returns null when the code and city name no commune', () => {
    expect(findFranceLocalityValue(FR_AREAS, '75011', 'Lyon')).toBeNull();
    expect(findFranceLocalityValue(FR_AREAS, '99999', 'Paris')).toBeNull();
    expect(findFranceLocalityValue(FR_AREAS, null, 'Paris')).toBeNull();
  });
});

describe('matchFranceLocalities', () => {
  it('matches digits from the start of the postcode', () => {
    expect(labels('01000')).toEqual(['Bourg-en-Bresse (01000)', 'Saint-Denis-lès-Bourg (01000)']);
    expect(labels('750')[0]).toBe('Paris (75001)');
    expect(labels('750').every((label) => label.includes('(750'))).toBe(true);
    // "750" is inside 07500 and 17500, but never as their start.
    expect(labels('750').some((label) => /\((07500|17500)\)/.test(label))).toBe(false);
  });

  it('reads a spaced postcode as one', () => {
    expect(labels('75 011')).toEqual(['Paris (75011)']);
  });

  it('ranks the whole name first, then its start, then a word, then anywhere', () => {
    const lyon = labels('lyon');
    expect(lyon.slice(0, 9)).toEqual([
      'Lyon (69001)',
      'Lyon (69002)',
      'Lyon (69003)',
      'Lyon (69004)',
      'Lyon (69005)',
      'Lyon (69006)',
      'Lyon (69007)',
      'Lyon (69008)',
      'Lyon (69009)',
    ]);
    expect(lyon.indexOf('Lyons-la-Forêt (27480)')).toBeGreaterThan(8);
  });

  it('ignores accents, case, hyphens and apostrophes', () => {
    for (const query of ['saint etienne', 'saint-étienne', 'SAINT-ETIENNE', 'Saint Étienne']) {
      expect(labels(query)[0]).toBe('Saint-Étienne (42000)');
    }
    expect(labels("l'hay")).toContain("L'Haÿ-les-Roses (94240)");
  });

  it('combines a name and digits anywhere in the postcode', () => {
    // The whole name first; "Paris-l'Hôpital" only starts with it.
    expect(labels('paris 11')).toEqual([
      'Paris (75011)',
      'Paris (75116)',
      "Paris-l'Hôpital (71150)",
    ]);
  });

  it('returns nothing for a name no commune has', () => {
    expect(labels('atlantis')).toEqual([]);
  });
});
