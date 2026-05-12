/**
 * VersionScreenTranslations Tests
 *
 * Validates getDeviceLanguage() and getVersionScreenStrings() return
 * correct translations for each supported locale, including fallback
 * to English for unsupported languages.
 */

import { getDeviceLanguage, getVersionScreenStrings } from '@/constants/VersionScreenTranslations';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(),
}));

import { getLocales } from 'expo-localization';
const mockGetLocales = getLocales as jest.Mock;

describe('VersionScreenTranslations', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getDeviceLanguage', () => {
    it('should return "en" when device language is English', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
      expect(getDeviceLanguage()).toBe('en');
    });

    it('should return "fr" when device language is French', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'fr' }]);
      expect(getDeviceLanguage()).toBe('fr');
    });

    it('should return "nl" when device language is Dutch', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'nl' }]);
      expect(getDeviceLanguage()).toBe('nl');
    });

    it('should return "en" as fallback for an unsupported language', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'de' }]);
      expect(getDeviceLanguage()).toBe('en');
    });

    it('should return "en" as fallback for Spanish', () => {
      mockGetLocales.mockReturnValue([{ languageCode: 'es' }]);
      expect(getDeviceLanguage()).toBe('en');
    });

    it('should return "en" as fallback when languageCode is null', () => {
      mockGetLocales.mockReturnValue([{ languageCode: null }]);
      expect(getDeviceLanguage()).toBe('en');
    });

    it('should return "en" as fallback when locale list is empty', () => {
      mockGetLocales.mockReturnValue([]);
      expect(getDeviceLanguage()).toBe('en');
    });

    it('should return "en" as fallback when languageCode is undefined', () => {
      mockGetLocales.mockReturnValue([{ languageCode: undefined }]);
      expect(getDeviceLanguage()).toBe('en');
    });
  });

  describe('getVersionScreenStrings', () => {
    describe('English strings', () => {
      beforeEach(() => {
        mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
      });

      it('should return updateRequired.title in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.title).toBe('Update Required');
      });

      it('should return updateRequired.defaultMessage in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.defaultMessage).toContain('ProtestBase');
        expect(strings.updateRequired.defaultMessage).toContain('update');
      });

      it('should return updateRequired.buttonText in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.buttonText).toBe('Update Now');
      });

      it('should return updatePrompt.title in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.title).toBe('Update Available');
      });

      it('should return updatePrompt.defaultMessage in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.defaultMessage).toContain('ProtestBase');
      });

      it('should return updatePrompt.buttonText in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.buttonText).toBe('Update Now');
      });

      it('should return updatePrompt.laterText in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.laterText).toBe('Later');
      });

      it('should return maintenance.title in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.maintenance.title).toBe('Under Maintenance');
      });

      it('should return maintenance.defaultMessage in English', () => {
        const strings = getVersionScreenStrings();
        expect(strings.maintenance.defaultMessage).toBeTruthy();
      });
    });

    describe('French strings', () => {
      beforeEach(() => {
        mockGetLocales.mockReturnValue([{ languageCode: 'fr' }]);
      });

      it('should return updateRequired.title in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.title).toBe('Mise à jour requise');
      });

      it('should return updateRequired.defaultMessage in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.defaultMessage).toContain('ProtestBase');
      });

      it('should return updateRequired.buttonText in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.buttonText).toBe('Mettre à jour');
      });

      it('should return updatePrompt.title in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.title).toBe('Mise à jour disponible');
      });

      it('should return updatePrompt.laterText in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.laterText).toBe('Plus tard');
      });

      it('should return maintenance.title in French', () => {
        const strings = getVersionScreenStrings();
        expect(strings.maintenance.title).toBe('En maintenance');
      });
    });

    describe('Dutch strings', () => {
      beforeEach(() => {
        mockGetLocales.mockReturnValue([{ languageCode: 'nl' }]);
      });

      it('should return updateRequired.title in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.title).toBe('Update vereist');
      });

      it('should return updateRequired.defaultMessage in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.defaultMessage).toContain('ProtestBase');
      });

      it('should return updateRequired.buttonText in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.buttonText).toBe('Nu updaten');
      });

      it('should return updatePrompt.title in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.title).toBe('Update beschikbaar');
      });

      it('should return updatePrompt.laterText in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.updatePrompt.laterText).toBe('Later');
      });

      it('should return maintenance.title in Dutch', () => {
        const strings = getVersionScreenStrings();
        expect(strings.maintenance.title).toBe('In onderhoud');
      });
    });

    describe('Fallback to English', () => {
      it('should return English strings for unsupported language', () => {
        mockGetLocales.mockReturnValue([{ languageCode: 'pt' }]);
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.title).toBe('Update Required');
      });

      it('should return English strings when locale list is empty', () => {
        mockGetLocales.mockReturnValue([]);
        const strings = getVersionScreenStrings();
        expect(strings.updateRequired.title).toBe('Update Required');
        expect(strings.maintenance.title).toBe('Under Maintenance');
      });
    });

    describe('String structure', () => {
      it('should return an object with all required sections for each language', () => {
        for (const lang of ['en', 'fr', 'nl']) {
          mockGetLocales.mockReturnValue([{ languageCode: lang }]);
          const strings = getVersionScreenStrings();

          expect(strings).toHaveProperty('updateRequired');
          expect(strings).toHaveProperty('updatePrompt');
          expect(strings).toHaveProperty('maintenance');
        }
      });

      it('should have all updateRequired fields for each language', () => {
        for (const lang of ['en', 'fr', 'nl']) {
          mockGetLocales.mockReturnValue([{ languageCode: lang }]);
          const strings = getVersionScreenStrings();

          expect(typeof strings.updateRequired.title).toBe('string');
          expect(strings.updateRequired.title.length).toBeGreaterThan(0);
          expect(typeof strings.updateRequired.defaultMessage).toBe('string');
          expect(strings.updateRequired.defaultMessage.length).toBeGreaterThan(0);
          expect(typeof strings.updateRequired.buttonText).toBe('string');
          expect(strings.updateRequired.buttonText.length).toBeGreaterThan(0);
        }
      });

      it('should have all updatePrompt fields for each language', () => {
        for (const lang of ['en', 'fr', 'nl']) {
          mockGetLocales.mockReturnValue([{ languageCode: lang }]);
          const strings = getVersionScreenStrings();

          expect(typeof strings.updatePrompt.title).toBe('string');
          expect(strings.updatePrompt.title.length).toBeGreaterThan(0);
          expect(typeof strings.updatePrompt.defaultMessage).toBe('string');
          expect(strings.updatePrompt.defaultMessage.length).toBeGreaterThan(0);
          expect(typeof strings.updatePrompt.buttonText).toBe('string');
          expect(strings.updatePrompt.buttonText.length).toBeGreaterThan(0);
          expect(typeof strings.updatePrompt.laterText).toBe('string');
          expect(strings.updatePrompt.laterText.length).toBeGreaterThan(0);
        }
      });

      it('should have all maintenance fields for each language', () => {
        for (const lang of ['en', 'fr', 'nl']) {
          mockGetLocales.mockReturnValue([{ languageCode: lang }]);
          const strings = getVersionScreenStrings();

          expect(typeof strings.maintenance.title).toBe('string');
          expect(strings.maintenance.title.length).toBeGreaterThan(0);
          expect(typeof strings.maintenance.defaultMessage).toBe('string');
          expect(strings.maintenance.defaultMessage.length).toBeGreaterThan(0);
        }
      });

      it('should have different translations across languages', () => {
        mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
        const enStrings = getVersionScreenStrings();

        mockGetLocales.mockReturnValue([{ languageCode: 'fr' }]);
        const frStrings = getVersionScreenStrings();

        mockGetLocales.mockReturnValue([{ languageCode: 'nl' }]);
        const nlStrings = getVersionScreenStrings();

        expect(frStrings.updateRequired.title).not.toBe(enStrings.updateRequired.title);
        expect(nlStrings.updateRequired.title).not.toBe(enStrings.updateRequired.title);
        expect(frStrings.maintenance.title).not.toBe(enStrings.maintenance.title);
        expect(nlStrings.maintenance.title).not.toBe(enStrings.maintenance.title);
      });
    });
  });
});
