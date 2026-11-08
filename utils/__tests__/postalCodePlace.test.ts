import { POSTAL_CODES_EN } from '@/constants/PostalCodes_BE_EN';
import { POSTAL_CODES_FR } from '@/constants/PostalCodes_BE_FR';
import { POSTAL_CODES_NL } from '@/constants/PostalCodes_BE_NL';
import { pickPostalCodePlace } from '@/utils/postalCodePlace';

const row = (place: string, municipality: string) => ({
  post_code: 1,
  sub_municipality_name_english: place,
  municipality_name_english: municipality,
});

const leuven = [row('Heverlee', 'Leuven'), row('Leuven', 'Leuven')];
const ixellesAndSaintGilles = [row('Saint-Gilles', 'Saint-Gilles'), row('Ixelles', 'Ixelles')];

describe('pickPostalCodePlace', () => {
  it('returns the only place of a postcode, whatever the stored city says', () => {
    expect(pickPostalCodePlace([row('Brussels', 'Brussels')], 'Bruxelles')).toBe('Brussels');
  });

  it('falls back to the stored city when the postcode has no row', () => {
    expect(pickPostalCodePlace([], '  Namur ')).toBe('Namur');
    expect(pickPostalCodePlace([], null)).toBe('');
  });

  it('prefers the place the stored city names', () => {
    expect(pickPostalCodePlace(leuven, 'Heverlee')).toBe('Heverlee');
    expect(pickPostalCodePlace(ixellesAndSaintGilles, 'Ixelles - Elsene')).toBe('Ixelles');
  });

  it('matches the stored city without accents, case or hyphens', () => {
    const liege = [row('Angleur', 'Liège'), row('Liège', 'Liège')];
    expect(pickPostalCodePlace(liege, 'liege')).toBe('Liège');
    expect(pickPostalCodePlace(ixellesAndSaintGilles, 'saint gilles')).toBe('Saint-Gilles');
  });

  it('matches whole words only', () => {
    const rows = [row('Ath', 'Ath'), row('Lath', 'Elsewhere')];
    expect(pickPostalCodePlace(rows, 'Lath')).toBe('Lath');
  });

  it('shows the municipality when every place belongs to it', () => {
    expect(pickPostalCodePlace(leuven, '')).toBe('Leuven');
    // A city in another language names no row, but the municipality still applies.
    expect(pickPostalCodePlace(leuven, 'Louvain')).toBe('Leuven');
  });

  it('keeps the stored city when the places belong to different municipalities', () => {
    expect(pickPostalCodePlace(ixellesAndSaintGilles, 'Elsene')).toBe('Elsene');
  });

  it('never returns empty while a row exists', () => {
    expect(pickPostalCodePlace(ixellesAndSaintGilles, undefined)).toBe('Saint-Gilles');
    const dutchRows = [{ sub_municipality_name: 'A' }, { sub_municipality_name: 'B' }];
    expect(pickPostalCodePlace(dutchRows, '')).toBe('A');
  });
});

describe('pickPostalCodePlace on the bundled Belgian data', () => {
  const rowsFor = (data: readonly { post_code: number }[], code: number) =>
    data.filter((entry) => entry.post_code === code);

  it.each([
    ['en', POSTAL_CODES_EN, 'Leuven', 'Liège', 'Brussels'],
    ['fr', POSTAL_CODES_FR, 'Leuven', 'Liège', 'Bruxelles'],
    ['nl', POSTAL_CODES_NL, 'Leuven', 'Liège', 'Brussel'],
  ])(
    '%s: a town shows under its own name, not one of its districts',
    (_lang, data, leuvenName, liegeName, brusselsName) => {
      expect(pickPostalCodePlace(rowsFor(data, 3000), '')).toBe(leuvenName);
      expect(pickPostalCodePlace(rowsFor(data, 4000), '')).toBe(liegeName);
      expect(pickPostalCodePlace(rowsFor(data, 1000), '')).toBe(brusselsName);
    }
  );

  it('picks Ixelles for 1050 from an address-suggestion city, in each language', () => {
    expect(pickPostalCodePlace(rowsFor(POSTAL_CODES_EN, 1050), 'Ixelles - Elsene')).toBe('Ixelles');
    expect(pickPostalCodePlace(rowsFor(POSTAL_CODES_NL, 1050), 'Ixelles - Elsene')).toBe('Elsene');
  });
});
