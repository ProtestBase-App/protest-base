/**
 * France area data: the app's copy of the backend's datasets, and the tokens it
 * builds from them. For France the backend is the source, so these tests pin the
 * copies by sha256 and check that every France token the app can send, save or
 * match on the device is the backend's token with the backend's members
 * (backend-protest-base docs/plans/HANDOFF_mobile_france_2026-10-19.md §1.5–§1.6).
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

import { HOME_AREA_CENTROIDS, homeAreaZoomForToken } from '@/constants/HomeAreaCentroids';
import { FR_AREAS } from '@/constants/PostalCodes_FR';
import { POSTAL_CODES_EN } from '@/constants/PostalCodes_BE_EN';
import { createMockEvent } from '@/test-utils/render';
import { buildHomeAreaMatch, rankEventByHomeArea, resolveHomeAreaCenter } from '@/utils/homeArea';
import {
  AREA_TOKEN_PATTERN,
  MAX_AREA_TOKEN_LENGTH,
  buildLocationFilterOptions,
  buildLocationMatch,
  countryOfLocationToken,
  expandLocationTokens,
  matchesLocationFilter,
} from '@/utils/locationFilterOptions';

// The handoff's pins: fr-areas-client.v1.json and areas.fr.v1.json.
const CLIENT_DATASET_SHA256 = 'b444b4d61a383dab9658ef2831115caa5997048086458576b75046fd1b520f95';
const AREAS_FILE_SHA256 = '7d5099cc7e01789fd72d79a3afdca12a2a22c55f0d387dfb76013205db8988ca';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

// The backend's token table (src/data/areas.fr.v1.json), vendored. Prettier
// reformats the fixture, so its sha256 is checked on the form the backend writes.
const areasFile: { areas: Record<string, { country: string; codes: string[] }> } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'areas.fr.v1.json'), 'utf8')
);
const tableTokens = Object.keys(areasFile.areas);

const { options, tokenToCodes, tokenToLabel } = buildLocationFilterOptions({
  france: FR_AREAS,
  lang: 'en',
});
const expand = (values: string[]) => expandLocationTokens(values, tokenToCodes);

describe('France data copies', () => {
  it('is a verbatim copy of the backend client dataset (sha256 b444b4d6…)', () => {
    expect(sha256(`${JSON.stringify(FR_AREAS)}\n`)).toBe(CLIENT_DATASET_SHA256);
  });

  it('checks against a verbatim copy of the backend token table (sha256 7d5099cc…)', () => {
    expect(sha256(`${JSON.stringify(areasFile, null, 1)}\n`)).toBe(AREAS_FILE_SHA256);
  });
});

describe('France tokens equal the backend table', () => {
  it('builds exactly its 110 tokens: the country, 13 régions and 96 départements', () => {
    expect(options.map((option) => option.value).sort()).toEqual([...tableTokens].sort());
    expect(options.filter((option) => option.tier === 'country')).toHaveLength(1);
    expect(options.filter((option) => option.tier === 'region')).toHaveLength(13);
    expect(options.filter((option) => option.tier === 'province')).toHaveLength(96);
  });

  it('gives every région and département exactly the table’s postcodes', () => {
    for (const token of tableTokens.filter((t) => t !== 'c:fr')) {
      expect([token, tokenToCodes.get(token)]).toEqual([token, areasFile.areas[token].codes]);
    }
  });

  it('matches c:fr on the country alone, as the table (no codes) says', () => {
    expect(areasFile.areas['c:fr'].codes).toEqual([]);
    const france = buildLocationMatch(['c:fr'], tokenToCodes);
    expect(matchesLocationFilter({ country: 'Frankrijk', postal_code: null }, france)).toBe(true);
    expect(matchesLocationFilter({ country: 'belgium', postal_code: '1000' }, france)).toBe(false);
  });

  it('only builds tokens the backend grammar accepts, for France', () => {
    for (const token of tableTokens) {
      expect(token).toMatch(AREA_TOKEN_PATTERN);
      expect(token.length).toBeLessThanOrEqual(MAX_AREA_TOKEN_LENGTH);
      expect(countryOfLocationToken(token)).toBe('france');
      expect(areasFile.areas[token].country).toBe('france');
    }
  });

  it('keeps every postcode a 5-digit string, leading zero included', () => {
    for (const code of Object.keys(FR_AREAS.postcodes)) expect(code).toMatch(/^\d{5}$/);
    for (const codes of tokenToCodes.values()) {
      for (const code of codes) expect(typeof code === 'string' && /^\d{5}$/.test(code)).toBe(true);
    }
    expect(tokenToCodes.get('p:fr:01')).toContain('01000');
  });

  it('builds membership from communes, as the server does: shared codes in both départements', () => {
    expect(tokenToCodes.get('p:fr:04')).toContain('05110');
    expect(tokenToCodes.get('p:fr:05')).toContain('05110');
    // Corsica's 20xxx codes split by commune, not by prefix.
    expect(tokenToCodes.get('p:fr:2a')).toContain('20000');
    expect(tokenToCodes.get('p:fr:2b')).toContain('20200');
  });

  it('matches an event on the device exactly as the backend table would', () => {
    const ain = buildLocationMatch(['p:fr:01'], tokenToCodes);
    const event = (postalCode: string) => ({ country: 'france', postal_code: postalCode });
    for (const code of areasFile.areas['p:fr:01'].codes) {
      expect(matchesLocationFilter(event(code), ain)).toBe(true);
    }
    expect(matchesLocationFilter(event('69003'), ain)).toBe(false);
  });

  it('never collides with a Belgian, Dutch or Luxembourg token', () => {
    const benelux = buildLocationFilterOptions({
      belgiumRows: POSTAL_CODES_EN as unknown as Record<string, unknown>[],
      lang: 'en',
    });
    for (const token of tableTokens) expect(benelux.tokenToCodes.has(token)).toBe(false);
  });
});

describe('France options', () => {
  const option = (token: string) => options.find((o) => o.value === token)!;

  it('labels départements with their number, régions with their official name', () => {
    expect(tokenToLabel.get('p:fr:75')).toBe('Paris (75)');
    expect(tokenToLabel.get('p:fr:01')).toBe('Ain (01)');
    expect(tokenToLabel.get('p:fr:2a')).toBe('Corse-du-Sud (2A)');
    expect(tokenToLabel.get('r:fr:ile-de-france')).toBe('Île-de-France');
  });

  it('names the country in the app language', () => {
    const label = (lang: 'en' | 'fr' | 'nl') =>
      buildLocationFilterOptions({ france: FR_AREAS, lang }).tokenToLabel.get('c:fr');
    expect([label('en'), label('fr'), label('nl')]).toEqual(['France', 'France', 'Frankrijk']);
  });

  it('gives each département its région, from the data', () => {
    for (const departement of FR_AREAS.departements) {
      expect(option(departement.token).parentToken).toBe(departement.region);
    }
    expect(option('p:fr:75').provinceLabel).toBe('Île-de-France');
  });

  it('finds an area however its name is accented or hyphenated', () => {
    expect(option('p:fr:34').searchText).toContain('herault');
    expect(option('r:fr:ile-de-france').searchText).toContain('ile de france');
    expect(option('r:fr:ile-de-france').searchText).toContain('île-de-france');
    expect(option('p:fr:75').searchText).toContain('(75)');
  });

  it('lists the country first', () => {
    expect(options[0].value).toBe('c:fr');
  });
});

describe('France home area', () => {
  it('resolves each département to its own région, never a neighbour sharing a code', () => {
    for (const departement of FR_AREAS.departements) {
      const match = buildHomeAreaMatch(departement.token, options, expand)!;
      expect([departement.token, match.country, match.provinceToken, match.regionToken]).toEqual([
        departement.token,
        'france',
        departement.token,
        departement.region,
      ]);
    }
  });

  it('ranks events by département, then région, and never outside France', () => {
    const rhone = buildHomeAreaMatch('p:fr:69', options, expand)!;
    const event = (country: string, postalCode: string) =>
      createMockEvent({ country, postal_code: postalCode });
    expect(rankEventByHomeArea(event('france', '69003'), rhone)).toBe(1); // Lyon
    expect(rankEventByHomeArea(event('france', '38000'), rhone)).toBe(2); // Grenoble
    expect(rankEventByHomeArea(event('france', '75011'), rhone)).toBe(3);
    expect(rankEventByHomeArea(event('belgium', '6900'), rhone)).toBe(3);
  });

  it('has the dataset center of every région and département, and recenters on it', () => {
    for (const area of [...FR_AREAS.regions, ...FR_AREAS.departements]) {
      expect([area.token, HOME_AREA_CENTROIDS[area.token]]).toEqual([area.token, area.center]);
    }
    const paris = FR_AREAS.departements.find((d) => d.token === 'p:fr:75')!;
    expect(resolveHomeAreaCenter(buildHomeAreaMatch('p:fr:75', options, expand)!)).toEqual(
      paris.center
    );
  });

  it('zooms out far for a région, less for a département, close for Paris', () => {
    expect(homeAreaZoomForToken('r:fr:occitanie')).toBe(6.5);
    expect(homeAreaZoomForToken('r:fr:ile-de-france')).toBe(8);
    expect(homeAreaZoomForToken('p:fr:34')).toBe(8.5);
    expect(homeAreaZoomForToken('p:fr:75')).toBe(11);
    expect(homeAreaZoomForToken('p:fr:93')).toBe(10);
    // Below a Belgian province's 9: a région is several provinces wide.
    expect(homeAreaZoomForToken('r:fr:occitanie')!).toBeLessThan(
      homeAreaZoomForToken('p:be:hainaut')!
    );
  });
});
