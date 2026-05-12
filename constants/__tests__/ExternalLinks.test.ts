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

  describe('data integrity', () => {
    it('should have exactly 2 external link constants', () => {
      expect(Object.keys(ExternalLinks)).toHaveLength(2);
    });

    it('should have no duplicate URL values', () => {
      const values = Object.values(ExternalLinks);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have all URLs starting with https://', () => {
      for (const url of Object.values(ExternalLinks)) {
        expect(url).toMatch(/^https:\/\//);
      }
    });
  });
});
