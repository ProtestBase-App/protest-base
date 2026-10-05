import { LU_CANTONS, LU_COMMUNES, LU_LOCALITIES } from '@/constants/PostalCodes_LU';
import { AREA_TOKEN_PATTERN, MAX_AREA_TOKEN_LENGTH } from '@/utils/locationFilterOptions';

// The generator cross-checks this module against the backend's area data; these
// pin its shape in CI, where that data is not available.
describe('PostalCodes_LU', () => {
  const codesOf = (slug: string) => LU_COMMUNES.find((commune) => commune.slug === slug)?.codes;

  it('has the 12 cantons, 100 communes and 559 picker localities of the register', () => {
    expect(LU_CANTONS).toHaveLength(12);
    expect(LU_COMMUNES).toHaveLength(100);
    expect(LU_LOCALITIES).toHaveLength(559);
  });

  it('matches the backend vectors for the capital and the country', () => {
    expect(codesOf('luxembourg')).toHaveLength(792);
    const cantonLuxembourg = new Set(
      LU_COMMUNES.filter((commune) => commune.canton === 'luxembourg').flatMap((c) => c.codes)
    );
    expect(cantonLuxembourg.size).toBe(1315);
    expect(new Set(LU_COMMUNES.flatMap((commune) => commune.codes)).size).toBe(4272);
  });

  it('builds tokens the backend accepts', () => {
    const tokens = [
      ...LU_CANTONS.map((canton) => `p:lu:${canton.slug}`),
      ...LU_COMMUNES.map((commune) => `m:lu:${commune.slug}`),
    ];
    expect(new Set(tokens).size).toBe(tokens.length);
    for (const token of tokens) {
      expect(token).toMatch(AREA_TOKEN_PATTERN);
      expect(token.length).toBeLessThanOrEqual(MAX_AREA_TOKEN_LENGTH);
    }
  });

  it('puts every commune in a known canton', () => {
    const cantons = new Set(LU_CANTONS.map((canton) => canton.slug));
    for (const commune of LU_COMMUNES) expect(cantons.has(commune.canton)).toBe(true);
  });

  it('gives every locality a representative code from its own commune', () => {
    for (const locality of LU_LOCALITIES) {
      expect(codesOf(locality.commune)).toContain(locality.postCode);
    }
  });

  it('identifies each picker entry by name and commune', () => {
    const keys = LU_LOCALITIES.map((locality) => `${locality.name}|${locality.commune}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
