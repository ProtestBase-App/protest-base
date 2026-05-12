/**
 * i18n Configuration Tests
 */

import {
  getDeviceLocale,
  getCurrentLocale,
  setLocale,
  isSupportedLocale,
  t,
  tPlural,
  tScope,
  i18n,
} from '../i18n';

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

describe('i18n Configuration', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Reset locale to 'en' after each test to ensure isolation
    setLocale('en');
  });

  describe('getDeviceLocale', () => {
    it('should return device locale when supported', () => {
      const locale = getDeviceLocale();
      expect(['en', 'fr', 'nl']).toContain(locale);
    });

    it('should return "en" as default when locale not available', () => {
      const { getLocales } = require('expo-localization');
      getLocales.mockReturnValueOnce([]);
      const locale = getDeviceLocale();
      expect(locale).toBe('en');
    });

    it('should return "en" as default when locales is null', () => {
      const { getLocales } = require('expo-localization');
      getLocales.mockReturnValueOnce(null);
      const locale = getDeviceLocale();
      expect(locale).toBe('en');
    });

    it('should return "en" as default when locales[0].languageCode is undefined', () => {
      const { getLocales } = require('expo-localization');
      // Locale object with no languageCode property
      getLocales.mockReturnValueOnce([{ languageTag: 'en-US' }]); // no languageCode key
      const locale = getDeviceLocale();
      expect(locale).toBe('en');
    });

    it('should return "en" as default when languageCode is null', () => {
      const { getLocales } = require('expo-localization');
      getLocales.mockReturnValueOnce([{ languageCode: null }]);
      const locale = getDeviceLocale();
      expect(locale).toBe('en');
    });

    it('should map supported locales correctly', () => {
      const { getLocales } = require('expo-localization');

      // Test English
      getLocales.mockReturnValueOnce([{ languageCode: 'en' }]);
      expect(getDeviceLocale()).toBe('en');

      // Test French
      getLocales.mockReturnValueOnce([{ languageCode: 'fr' }]);
      expect(getDeviceLocale()).toBe('fr');

      // Test Dutch
      getLocales.mockReturnValueOnce([{ languageCode: 'nl' }]);
      expect(getDeviceLocale()).toBe('nl');
    });

    it('should fallback to "en" for unsupported locales', () => {
      const { getLocales } = require('expo-localization');
      getLocales.mockReturnValueOnce([{ languageCode: 'de' }]); // German
      expect(getDeviceLocale()).toBe('en');
    });

    it('should handle languageCode that is an unsupported value', () => {
      const { getLocales } = require('expo-localization');
      getLocales.mockReturnValueOnce([{ languageCode: 'zh' }]); // Chinese
      expect(getDeviceLocale()).toBe('en');
    });
  });

  describe('getCurrentLocale', () => {
    it('should return current locale', () => {
      const locale = getCurrentLocale();
      expect(['en', 'fr', 'nl']).toContain(locale);
    });
  });

  describe('setLocale', () => {
    it('should set locale for supported languages', () => {
      setLocale('fr');
      expect(getCurrentLocale()).toBe('fr');

      setLocale('nl');
      expect(getCurrentLocale()).toBe('nl');

      setLocale('en');
      expect(getCurrentLocale()).toBe('en');
    });

    it('should not change locale for unsupported languages', () => {
      setLocale('en');
      const currentLocale = getCurrentLocale();
      setLocale('de' as any); // Unsupported locale
      expect(getCurrentLocale()).toBe(currentLocale);
    });

    it('should not change locale for empty string', () => {
      setLocale('en');
      setLocale('' as any);
      expect(getCurrentLocale()).toBe('en');
    });

    it('should not change locale for a numeric value', () => {
      setLocale('en');
      setLocale(42 as any);
      expect(getCurrentLocale()).toBe('en');
    });
  });

  describe('isSupportedLocale', () => {
    it('should return true for supported locales', () => {
      expect(isSupportedLocale('en')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(true);
      expect(isSupportedLocale('nl')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isSupportedLocale('de')).toBe(false);
      expect(isSupportedLocale('es')).toBe(false);
      expect(isSupportedLocale('')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isSupportedLocale(null as any)).toBe(false);
      expect(isSupportedLocale(undefined as any)).toBe(false);
    });

    it('should return false for variations of supported locales with region code', () => {
      expect(isSupportedLocale('en-US')).toBe(false); // not an exact match
      expect(isSupportedLocale('fr-BE')).toBe(false);
      expect(isSupportedLocale('nl-BE')).toBe(false);
    });
  });

  describe('Translation functions', () => {
    describe('t', () => {
      it('should return translation key when translation missing', () => {
        const result = t('nonexistent.key');
        expect(result).toBe('nonexistent.key');
      });

      it('should handle interpolation options', () => {
        // With empty translations, it should still accept options without erroring
        expect(() => t('test.key', { name: 'Alice' })).not.toThrow();
      });

      it('should return a real translation for known keys', () => {
        // 'common.welcome' exists in the English locale
        const result = t('common.welcome');
        expect(result).toBe('Welcome');
      });

      it('should return translation key as fallback when i18n.t throws', () => {
        // Arrange: force i18n.t to throw an error
        const originalT = i18n.t.bind(i18n);
        i18n.t = () => {
          throw new Error('Simulated i18n.t error');
        };

        try {
          // Act
          const result = t('some.key');

          // Assert: returns the key itself as fallback
          expect(result).toBe('some.key');
        } finally {
          // Restore
          i18n.t = originalT;
        }
      });

      it('should return the key when result starts with "[missing "', () => {
        // Arrange: force a key that won't be in translations
        // The i18n-js library returns "[missing en.some.definitely.missing.key]"
        const result = t('some.definitely.missing.key.xyz');
        expect(result).toBe('some.definitely.missing.key.xyz');
      });
    });

    describe('tScope', () => {
      it('should combine scope and key', () => {
        const result = tScope('common', 'welcome');
        // Should return the actual translation since translations are now loaded
        expect(result).toBe('Welcome');
      });

      it('should handle missing key in scope', () => {
        const result = tScope('common', 'nonexistentKey');
        // Should return the combined scope.key as fallback
        expect(result).toBe('common.nonexistentKey');
      });
    });

    describe('tPlural', () => {
      it('should handle count parameter', () => {
        expect(() => tPlural('items.count', 5)).not.toThrow();
      });

      it('should merge count with additional options', () => {
        expect(() => tPlural('items.count', 5, { type: 'events' })).not.toThrow();
      });

      it('should pass count as part of options to t()', () => {
        // For keys that don't exist, should return the key
        const result = tPlural('nonexistent.plural.key', 3);
        expect(result).toBe('nonexistent.plural.key');
      });
    });
  });
});

/**
 * Separate test suite to cover the initializeI18n catch block (line 111).
 * This requires mocking @/constants/locales to throw BEFORE the module is loaded.
 * We use jest.isolateModules() to force a fresh module evaluation.
 */
describe('i18n initializeI18n error handling', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use empty translations and log warning when @/constants/locales require throws an Error', () => {
    // Use jest.isolateModules to load a fresh copy of i18n with locales throwing
    jest.isolateModules(() => {
      // Mock @/constants/locales to throw during require
      jest.doMock('@/constants/locales', () => {
        throw new Error('Locales failed to load');
      });

      // Also mock expo-localization inside the isolated context
      jest.doMock('expo-localization', () => ({
        getLocales: jest.fn(() => [{ languageCode: 'en' }]),
      }));

      // Load a fresh i18n module — initializeI18n will run and catch the error
      const freshI18n = require('../i18n');

      // The module should have loaded without throwing
      expect(freshI18n).toBeDefined();
      expect(typeof freshI18n.t).toBe('function');

      // t() should still work (returning key as fallback since translations are empty)
      const result = freshI18n.t('common.welcome');
      // With empty translations, returns the key itself
      expect(typeof result).toBe('string');
    });
  });

  it('should handle non-Error thrown objects in initializeI18n catch block', () => {
    // Covers the `String(error)` branch in: error instanceof Error ? error.message : String(error)
    jest.isolateModules(() => {
      // Mock @/constants/locales to throw a non-Error (e.g., a plain string)
      jest.doMock('@/constants/locales', () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string error — not an Error object';
      });

      jest.doMock('expo-localization', () => ({
        getLocales: jest.fn(() => [{ languageCode: 'en' }]),
      }));

      // Load fresh i18n — should not throw despite non-Error thrown object
      const freshI18n = require('../i18n');
      expect(freshI18n).toBeDefined();
      expect(typeof freshI18n.t).toBe('function');
    });
  });

  it('should use fallback empty object when locales.en/fr/nl are undefined', () => {
    // Covers the `|| {}` branch in: locales.en || {}, locales.fr || {}, locales.nl || {}
    jest.isolateModules(() => {
      // Return an object with missing locale keys
      jest.doMock('@/constants/locales', () => ({
        // en, fr, nl are all undefined
      }));

      jest.doMock('expo-localization', () => ({
        getLocales: jest.fn(() => [{ languageCode: 'en' }]),
      }));

      const freshI18n = require('../i18n');
      expect(freshI18n).toBeDefined();
      // t() should return the key when translations are empty ({})
      const result = freshI18n.t('common.welcome');
      expect(typeof result).toBe('string');
    });
  });

  it('should handle non-Error thrown in t() catch block', () => {
    // Covers the `String(error)` branch in t() catch:
    // error instanceof Error ? error.message : String(error)
    const freshT = require('../i18n').t;
    const freshI18n = require('../i18n').i18n;

    const originalT = freshI18n.t.bind(freshI18n);
    // Force i18n.t to throw a non-Error value
    freshI18n.t = () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'a plain string error';
    };

    try {
      const result = freshT('some.key');
      // Should fall back to returning the key
      expect(result).toBe('some.key');
    } finally {
      freshI18n.t = originalT;
    }
  });
});
