/**
 * ExternalLinks Tests
 *
 * Validates all external URL constants are correctly defined and
 * point to well-formed URLs.
 */

import { ExternalLinks } from '@/constants/ExternalLinks';

describe('ExternalLinks', () => {
  afterEach(() => jest.clearAllMocks());

  describe('ONBOARDING_FORM', () => {
    it('should be defined', () => {
      expect(ExternalLinks.ONBOARDING_FORM).toBeDefined();
    });

    it('should be a non-empty string', () => {
      expect(typeof ExternalLinks.ONBOARDING_FORM).toBe('string');
      expect(ExternalLinks.ONBOARDING_FORM.length).toBeGreaterThan(0);
    });

    it('should start with https://', () => {
      expect(ExternalLinks.ONBOARDING_FORM).toMatch(/^https:\/\//);
    });

    it('should point to the cryptpad.fr domain', () => {
      expect(ExternalLinks.ONBOARDING_FORM).toContain('cryptpad.fr');
    });

    it('should have the expected URL value', () => {
      expect(ExternalLinks.ONBOARDING_FORM).toBe(
        'https://cryptpad.fr/form/#/2/form/view/-SUEa5882qMtG5vrU9IvAOT3KcGffF3CU8TBLRsbKHg/'
      );
    });
  });

  describe('FEEDBACK_FORM', () => {
    it('should be defined', () => {
      expect(ExternalLinks.FEEDBACK_FORM).toBeDefined();
    });

    it('should be a non-empty string', () => {
      expect(typeof ExternalLinks.FEEDBACK_FORM).toBe('string');
      expect(ExternalLinks.FEEDBACK_FORM.length).toBeGreaterThan(0);
    });

    it('should start with https://', () => {
      expect(ExternalLinks.FEEDBACK_FORM).toMatch(/^https:\/\//);
    });

    it('should point to the tally.so domain', () => {
      expect(ExternalLinks.FEEDBACK_FORM).toContain('tally.so');
    });

    it('should have the expected URL value', () => {
      expect(ExternalLinks.FEEDBACK_FORM).toBe('https://tally.so/r/wgr7EP/');
    });
  });

  describe('OPEN_METEO', () => {
    it('should be defined', () => {
      expect(ExternalLinks.OPEN_METEO).toBeDefined();
    });

    it('should be a non-empty string', () => {
      expect(typeof ExternalLinks.OPEN_METEO).toBe('string');
      expect(ExternalLinks.OPEN_METEO.length).toBeGreaterThan(0);
    });

    it('should start with https://', () => {
      expect(ExternalLinks.OPEN_METEO).toMatch(/^https:\/\//);
    });

    it('should point to the open-meteo.com domain', () => {
      expect(ExternalLinks.OPEN_METEO).toContain('open-meteo.com');
    });

    it('should have the expected URL value', () => {
      expect(ExternalLinks.OPEN_METEO).toBe('https://open-meteo.com/');
    });
  });

  describe('PRIVACY_POLICY', () => {
    // French is the website's default language, so its page has no prefix; the trailing
    // slash is part of each page's address.
    it.each([
      ['fr', 'https://protestbase.be/privacy/'],
      ['en', 'https://protestbase.be/en/privacy/'],
      ['nl', 'https://protestbase.be/nl/privacy/'],
    ] as const)('links the %s page of the website', (locale, url) => {
      expect(ExternalLinks.PRIVACY_POLICY[locale]).toBe(url);
    });

    it('has a page for every app language', () => {
      expect(Object.keys(ExternalLinks.PRIVACY_POLICY).sort()).toEqual(['en', 'fr', 'nl']);
    });
  });

  describe('data integrity', () => {
    // Every URL, with the per-language pages flattened out.
    const allUrls = (): string[] =>
      Object.values(ExternalLinks).flatMap((value) =>
        typeof value === 'string' ? [value] : Object.values(value)
      );

    it('should have exactly 4 external link constants', () => {
      expect(Object.keys(ExternalLinks)).toHaveLength(4);
    });

    it('should have no duplicate URL values', () => {
      const values = allUrls();
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have all URLs starting with https://', () => {
      for (const url of allUrls()) {
        expect(url).toMatch(/^https:\/\//);
      }
    });
  });
});
