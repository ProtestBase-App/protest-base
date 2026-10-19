import {
  buildLocationUpdate,
  canonicalCountry,
  normalizeEventPostcode,
  resolveEventCityLabel,
  toPostalCodeString,
  type LocationValues,
} from '@/utils/eventLocation';

describe('toPostalCodeString', () => {
  it('keeps API strings, trimmed', () => {
    expect(toPostalCodeString('1000')).toBe('1000');
    expect(toPostalCodeString(' 1611 ')).toBe('1611');
  });

  it('keeps leading zeros and NL letters as sent', () => {
    expect(toPostalCodeString('0850')).toBe('0850');
    expect(toPostalCodeString('2514 AB')).toBe('2514 AB');
  });

  it('turns legacy numeric template postcodes into strings', () => {
    expect(toPostalCodeString(9000)).toBe('9000');
  });

  it('returns null for blank or non-text values', () => {
    expect(toPostalCodeString('')).toBeNull();
    expect(toPostalCodeString('   ')).toBeNull();
    expect(toPostalCodeString(null)).toBeNull();
    expect(toPostalCodeString(undefined)).toBeNull();
    expect(toPostalCodeString(Number.NaN)).toBeNull();
    expect(toPostalCodeString({})).toBeNull();
  });
});

describe('buildLocationUpdate', () => {
  const loaded: LocationValues = {
    street_address: 'Rue de la Loi 16',
    city: 'Brussels',
    region: 'Brussels-Capital',
    country: 'belgium',
    postal_code: '1000',
  };

  it('sends every filled field as is', () => {
    expect(buildLocationUpdate(loaded, loaded)).toEqual(loaded);
  });

  it("sends '' for a field that was filled when loaded and is now empty", () => {
    const current = { ...loaded, street_address: '', postal_code: null };
    expect(buildLocationUpdate(current, loaded)).toEqual({
      street_address: '',
      city: 'Brussels',
      region: 'Brussels-Capital',
      country: 'belgium',
      postal_code: '',
    });
  });

  it('omits a field that was already empty when loaded', () => {
    const blank: LocationValues = { street_address: '', city: '', postal_code: null };
    expect(buildLocationUpdate({ ...blank, country: 'belgium' }, blank)).toEqual({
      country: 'belgium',
    });
  });

  it('treats whitespace as empty on both sides', () => {
    expect(buildLocationUpdate({ city: '   ' }, { city: 'Gent' })).toEqual({ city: '' });
    expect(buildLocationUpdate({ city: '   ' }, { city: '  ' })).toEqual({});
  });

  it('clears the old address on a country switch with an emptied address', () => {
    const switched = {
      street_address: '',
      city: '',
      region: '',
      country: 'luxembourg',
      postal_code: null,
    };
    expect(buildLocationUpdate(switched, loaded)).toEqual({
      street_address: '',
      city: '',
      region: '',
      country: 'luxembourg',
      postal_code: '',
    });
  });

  it('never clears anything without a loaded baseline', () => {
    expect(buildLocationUpdate({ city: '', country: 'netherlands' }, null)).toEqual({
      country: 'netherlands',
    });
  });

  it('never outputs null', () => {
    const update = buildLocationUpdate(
      { street_address: null, city: null, region: null, country: null, postal_code: null },
      loaded
    );
    expect(Object.values(update)).not.toContain(null);
    expect(Object.values(update).every((value) => value === '')).toBe(true);
  });
});

describe('resolveEventCityLabel', () => {
  const resolveName = jest.fn((postalCode: string, _country: string, fallback?: string | null) =>
    postalCode === '9000' ? 'Gent' : (fallback ?? '')
  );

  beforeEach(() => resolveName.mockClear());

  it('uses the dataset name for a known postcode', () => {
    expect(
      resolveEventCityLabel({ postal_code: '9000', country: 'belgium', city: 'Ghent' }, resolveName)
    ).toBe('Gent');
    expect(resolveName).toHaveBeenCalledWith('9000', 'belgium', 'Ghent');
  });

  it('falls back to the stored city without a postcode', () => {
    expect(
      resolveEventCityLabel({ postal_code: null, country: 'belgium', city: 'Arlon' }, resolveName)
    ).toBe('Arlon');
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('falls back to the stored city without a country', () => {
    expect(resolveEventCityLabel({ postal_code: '1000', city: 'Brussels' }, resolveName)).toBe(
      'Brussels'
    );
  });

  it('falls back to the stored city when the lookup finds nothing', () => {
    expect(
      resolveEventCityLabel(
        { postal_code: '1611', country: 'luxembourg', city: 'Luxembourg' },
        () => ''
      )
    ).toBe('Luxembourg');
  });

  it('returns an empty string when nothing is known', () => {
    expect(resolveEventCityLabel({}, resolveName)).toBe('');
  });
});

describe('canonicalCountry', () => {
  it('maps every spelling the backend accepts to its country', () => {
    expect(canonicalCountry('belgium')).toBe('belgium');
    expect(canonicalCountry(' Belgique ')).toBe('belgium');
    expect(canonicalCountry('BE')).toBe('belgium');
    expect(canonicalCountry('Nederland')).toBe('netherlands');
    expect(canonicalCountry('the netherlands')).toBe('netherlands');
    expect(canonicalCountry('Luxemburg')).toBe('luxembourg');
    expect(canonicalCountry('lu')).toBe('luxembourg');
    expect(canonicalCountry('france')).toBe('france');
    expect(canonicalCountry('Frankrijk')).toBe('france');
    expect(canonicalCountry('FRANKREICH')).toBe('france');
    expect(canonicalCountry(' fr ')).toBe('france');
  });

  it('compares after NFC, so a decomposed accent still matches', () => {
    expect(canonicalCountry('Belgie\u0308')).toBe('belgium');
    expect(canonicalCountry('Le\u0308tzebuerg')).toBe('luxembourg');
  });

  it('returns null for an unknown or missing country', () => {
    expect(canonicalCountry('germany')).toBeNull();
    expect(canonicalCountry('')).toBeNull();
    expect(canonicalCountry(null)).toBeNull();
    expect(canonicalCountry(undefined)).toBeNull();
  });
});

describe('normalizeEventPostcode', () => {
  it('keeps the 4 digits the datasets key on', () => {
    expect(normalizeEventPostcode('1000', 'belgium')).toBe('1000');
    expect(normalizeEventPostcode('5611 EC', 'netherlands')).toBe('5611');
    expect(normalizeEventPostcode('L-1611', 'luxembourg')).toBe('1611');
    expect(normalizeEventPostcode(9000, 'Belgique')).toBe('9000');
  });

  it('returns null without a 4-digit code', () => {
    expect(normalizeEventPostcode('', 'belgium')).toBeNull();
    expect(normalizeEventPostcode('9', 'belgium')).toBeNull();
  });

  it('keeps the 4-digit rule when the country is unknown or missing', () => {
    expect(normalizeEventPostcode('1000', null)).toBe('1000');
    expect(normalizeEventPostcode('75011', 'germany')).toBe('7501');
  });

  describe('France', () => {
    it('keeps all 5 digits, leading zero included', () => {
      expect(normalizeEventPostcode('75011', 'france')).toBe('75011');
      expect(normalizeEventPostcode('01000', 'france')).toBe('01000');
      expect(normalizeEventPostcode('20090', 'france')).toBe('20090');
    });

    it('folds the spellings the backend canonicalises', () => {
      expect(normalizeEventPostcode('F-75011', 'france')).toBe('75011');
      expect(normalizeEventPostcode('FR-75011', 'france')).toBe('75011');
      expect(normalizeEventPostcode('fr 75011', 'france')).toBe('75011');
      expect(normalizeEventPostcode('75 011', 'france')).toBe('75011');
      expect(normalizeEventPostcode(' 01000 ', 'france')).toBe('01000');
    });

    it('pads a code whose leading zero was lost to a numeric parse, as the backend does', () => {
      expect(normalizeEventPostcode('1000', 'france')).toBe('01000');
      expect(normalizeEventPostcode(1000, 'france')).toBe('01000');
      expect(normalizeEventPostcode(75011, 'france')).toBe('75011');
    });

    it('applies to every spelling of France', () => {
      expect(normalizeEventPostcode('01000', 'Frankrijk')).toBe('01000');
      expect(normalizeEventPostcode('F-01000', 'FR')).toBe('01000');
    });

    it('returns null for anything that is no French code', () => {
      expect(normalizeEventPostcode('', 'france')).toBeNull();
      expect(normalizeEventPostcode('750', 'france')).toBeNull();
      expect(normalizeEventPostcode('750111', 'france')).toBeNull();
      expect(normalizeEventPostcode('2A004', 'france')).toBeNull();
      expect(normalizeEventPostcode('Paris', 'france')).toBeNull();
    });

    it('never truncates a French code to the 4-digit form', () => {
      expect(normalizeEventPostcode('75011', 'france')).not.toBe('7501');
      expect(normalizeEventPostcode('01000', 'france')).not.toBe('0100');
    });
  });
});
