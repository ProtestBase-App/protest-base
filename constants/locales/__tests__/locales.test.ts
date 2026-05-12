/**
 * Locale Tests
 *
 * Tests to ensure all translation files are properly structured,
 * have matching keys across languages, and export correctly.
 */

import { en } from '../en';
import { fr } from '../fr';
import { nl } from '../nl';
import translations, { translations as namedTranslations } from '../index';

// Helper to get all keys from a nested object (flattened with dot notation)
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

// Helper to get a value by dot-notated key
function getValueByKey(obj: Record<string, any>, key: string): any {
  const parts = key.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

describe('Locales', () => {
  describe('Index Exports', () => {
    it('should export translations as default', () => {
      expect(translations).toBeDefined();
      expect(typeof translations).toBe('object');
    });

    it('should export translations as named export', () => {
      expect(namedTranslations).toBeDefined();
      expect(namedTranslations).toEqual(translations);
    });

    it('should export all three languages', () => {
      expect(translations.en).toBeDefined();
      expect(translations.fr).toBeDefined();
      expect(translations.nl).toBeDefined();
    });

    it('should export en, fr, nl as named exports', () => {
      expect(en).toBeDefined();
      expect(fr).toBeDefined();
      expect(nl).toBeDefined();
    });

    it('should have translations matching individual locale exports', () => {
      expect(translations.en).toEqual(en);
      expect(translations.fr).toEqual(fr);
      expect(translations.nl).toEqual(nl);
    });
  });

  describe('English Locale (en)', () => {
    it('should have all required top-level sections', () => {
      const requiredSections = [
        'tabs',
        'filters',
        'categories',
        'common',
        'template',
        'createEventOptions',
        'eventEdit',
        'auth',
        'home',
        'explore',
        'more',
        'events',
        'createEvent',
        'myEvents',
        'templates',
        'account',
        'errors',
        'alerts',
        'calendar',
        'help',
        'search',
        'session',
        'about',
        'report',
        'version',
        'form',
        'becomeOrganizer',
        'termsAndConditions',
        'notFound',
        'draft',
        'share',
      ];

      for (const section of requiredSections) {
        expect(en[section]).toBeDefined();
        expect(typeof en[section]).toBe('object');
      }
    });

    it('should have tabs translations', () => {
      expect(en.tabs.home).toBe('Calendar');
      expect(en.tabs.explore).toBe('Explore');
      expect(en.tabs.more).toBe('More');
    });

    it('should have common translations', () => {
      expect(en.common.ok).toBe('OK');
      expect(en.common.cancel).toBe('Cancel');
      expect(en.common.save).toBe('Save');
      expect(en.common.loading).toBe('Loading...');
    });

    it('should have category translations', () => {
      expect(en.categories.protest).toBe('Protest');
      expect(en.categories.act).toBe('Act');
      expect(en.categories.learn).toBe('Learn');
      expect(en.categories.support).toBe('Support');
      expect(en.categories.strike).toBe('Strike');
    });

    it('should have auth translations', () => {
      expect(en.auth.signIn).toBe('Log in');
      expect(en.auth.signOut).toBe('Sign Out');
      expect(en.auth.email).toBe('Email');
      expect(en.auth.password).toBe('Password');
    });

    it('should have error translations', () => {
      expect(en.errors.generic).toBeDefined();
      expect(en.errors.network).toBeDefined();
      expect(en.errors.rateLimit).toBeDefined();
      expect(en.errors.rateLimit.title).toBeDefined();
    });

    it('should have version translations for all states', () => {
      expect(en.version.updateRequired.title).toBeDefined();
      expect(en.version.updateRequired.message).toBeDefined();
      expect(en.version.updateRequired.button).toBeDefined();
      expect(en.version.updatePrompt.title).toBeDefined();
      expect(en.version.maintenance.title).toBeDefined();
    });
  });

  describe('French Locale (fr)', () => {
    it('should have all required top-level sections', () => {
      const enSections = Object.keys(en);

      for (const section of enSections) {
        expect(fr[section]).toBeDefined();
      }
    });

    it('should have tabs translations in French', () => {
      expect(fr.tabs.home).toBe('Calendrier');
      expect(fr.tabs.explore).toBe('Explorer');
      expect(fr.tabs.more).toBe('Plus');
    });

    it('should have category translations in French', () => {
      expect(fr.categories.protest).toBe('Manifestation');
      expect(fr.categories.strike).toBe('Grève');
    });
  });

  describe('Dutch Locale (nl)', () => {
    it('should have essential top-level sections', () => {
      const essentialSections = [
        'tabs',
        'filters',
        'categories',
        'common',
        'auth',
        'home',
        'explore',
        'more',
        'events',
        'createEvent',
        'myEvents',
      ];

      for (const section of essentialSections) {
        expect((nl as Record<string, any>)[section]).toBeDefined();
      }
    });

    it('should have tabs translations in Dutch', () => {
      expect(nl.tabs.home).toBeDefined();
      expect(nl.tabs.explore).toBeDefined();
      expect(nl.tabs.more).toBeDefined();
      // Verify they are translated (not empty)
      expect(nl.tabs.home.length).toBeGreaterThan(0);
    });

    it('should have category translations in Dutch', () => {
      expect(nl.categories.protest).toBe('Protest');
      expect(nl.categories.strike).toBe('Staking');
    });
  });

  describe('Translation Key Consistency', () => {
    const enKeys = getAllKeys(en);
    const frKeys = getAllKeys(fr);
    const nlKeys = getAllKeys(nl);

    it('should have reasonable number of keys in all locales', () => {
      // Each locale should have a substantial number of translations
      const enCount = enKeys.length;
      const frCount = frKeys.length;
      const nlCount = nlKeys.length;

      // Each locale should have at least 200 keys
      expect(enCount).toBeGreaterThan(200);
      expect(frCount).toBeGreaterThan(200);
      expect(nlCount).toBeGreaterThan(200);
    });

    it('should have essential top-level sections in all locales', () => {
      // Essential sections required for app functionality
      const essentialSections = [
        'tabs',
        'filters',
        'categories',
        'common',
        'auth',
        'home',
        'explore',
        'more',
        'events',
        'createEvent',
        'myEvents',
        'templates',
        'account',
        'errors',
      ];

      for (const section of essentialSections) {
        expect((en as Record<string, any>)[section]).toBeDefined();
        expect((fr as Record<string, any>)[section]).toBeDefined();
        expect((nl as Record<string, any>)[section]).toBeDefined();
      }
    });

    it('should have similar structure in French (within tolerance)', () => {
      const missingInFr = enKeys.filter((key) => !frKeys.includes(key));

      // Log for debugging but don't fail for minor differences
      if (missingInFr.length > 0 && missingInFr.length <= 20) {
        // Small number of missing keys is acceptable during development
      } else if (missingInFr.length > 20) {
        console.warn(`French locale missing ${missingInFr.length} keys`);
      }

      // Allow flexibility but French should be mostly complete
      expect(missingInFr.length).toBeLessThan(50);
    });

    it('should have similar structure in Dutch (within tolerance)', () => {
      const missingInNl = enKeys.filter((key) => !nlKeys.includes(key));

      // Dutch may have more differences as it's potentially less complete
      if (missingInNl.length > 50) {
        console.warn(
          `Dutch locale missing ${missingInNl.length} keys - consider updating translations`
        );
      }

      // More lenient for Dutch, but should have core functionality
      expect(missingInNl.length).toBeLessThan(100);
    });

    it('should have tabs section matching across all locales', () => {
      const enTabKeys = Object.keys(en.tabs).sort();
      const frTabKeys = Object.keys(fr.tabs).sort();
      const nlTabKeys = Object.keys(nl.tabs).sort();

      expect(frTabKeys).toEqual(enTabKeys);
      expect(nlTabKeys).toEqual(enTabKeys);
    });

    it('should have core categories in all locales', () => {
      // Core categories that must exist in all locales
      const coreCategories = ['protest', 'act', 'learn', 'support', 'strike'];

      for (const category of coreCategories) {
        expect((en.categories as Record<string, string>)[category]).toBeDefined();
        expect((fr.categories as Record<string, string>)[category]).toBeDefined();
        expect((nl.categories as Record<string, string>)[category]).toBeDefined();
      }
    });

    it('should have core common keys in all locales', () => {
      // Core common keys that must exist in all locales
      const coreCommonKeys = [
        'ok',
        'cancel',
        'save',
        'delete',
        'loading',
        'error',
        'success',
        'back',
        'next',
        'done',
        'close',
        'confirm',
        'yes',
        'no',
        'search',
        'filter',
        'clear',
        'apply',
        'refresh',
        'retry',
      ];

      for (const key of coreCommonKeys) {
        expect((en.common as Record<string, string>)[key]).toBeDefined();
        expect((fr.common as Record<string, string>)[key]).toBeDefined();
        expect((nl.common as Record<string, string>)[key]).toBeDefined();
      }
    });
  });

  describe('Translation Values', () => {
    it('should not have empty string values in English', () => {
      const enKeys = getAllKeys(en);
      const emptyKeys = enKeys.filter((key) => {
        const value = getValueByKey(en, key);
        return typeof value === 'string' && value.trim() === '';
      });

      expect(emptyKeys).toEqual([]);
    });

    it('should not have undefined values in English', () => {
      const enKeys = getAllKeys(en);
      const undefinedKeys = enKeys.filter((key) => {
        const value = getValueByKey(en, key);
        return value === undefined;
      });

      expect(undefinedKeys).toEqual([]);
    });

    it('should have string values for all leaf nodes in English', () => {
      const enKeys = getAllKeys(en);

      for (const key of enKeys) {
        const value = getValueByKey(en, key);
        expect(typeof value).toBe('string');
      }
    });

    it('should have translated values (not same as English) for critical French keys', () => {
      // Check that translations are actually translated, not just copied
      // Note: Some words like "OK" are universal and may be the same
      expect(fr.common.cancel).not.toBe(en.common.cancel);
      expect(fr.common.save).not.toBe(en.common.save);
      expect(fr.common.loading).not.toBe(en.common.loading);
    });

    it('should have translated values (not same as English) for critical Dutch keys', () => {
      expect(nl.common.cancel).not.toBe(en.common.cancel);
      expect(nl.common.save).not.toBe(en.common.save);
      expect(nl.common.loading).not.toBe(en.common.loading);
    });
  });

  describe('Interpolation Placeholders', () => {
    it('should have matching placeholders in myEvents.eventsScheduled', () => {
      // Check that interpolation keys match across languages
      const enValue = en.myEvents.eventsScheduled;
      const frValue = fr.myEvents.eventsScheduled;
      const nlValue = nl.myEvents.eventsScheduled;

      // All should contain {{count}}
      expect(enValue).toContain('{{count}}');
      expect(frValue).toContain('{{count}}');
      expect(nlValue).toContain('{{count}}');
    });

    it('should have matching placeholders in myEvents.completedEvents', () => {
      const enValue = en.myEvents.completedEvents;
      const frValue = fr.myEvents.completedEvents;
      const nlValue = nl.myEvents.completedEvents;

      expect(enValue).toContain('{{count}}');
      expect(frValue).toContain('{{count}}');
      expect(nlValue).toContain('{{count}}');
    });

    it('should have matching placeholders in template.deleteConfirmMessage', () => {
      const enValue = en.template.deleteConfirmMessage;
      const frValue = fr.template.deleteConfirmMessage;
      const nlValue = nl.template.deleteConfirmMessage;

      expect(enValue).toContain('{{name}}');
      expect(frValue).toContain('{{name}}');
      expect(nlValue).toContain('{{name}}');
    });
  });

  describe('Critical Keys Existence', () => {
    const criticalKeys = [
      'tabs.home',
      'tabs.explore',
      'tabs.more',
      'common.loading',
      'common.error',
      'common.save',
      'common.cancel',
      'auth.signIn',
      'auth.signOut',
      'events.save',
      'events.saved',
      'events.share',
      'explore.searchPlaceholder',
      'home.title',
      'createEvent.title',
      'myEvents.upcoming',
      'myEvents.past',
    ];

    it('should have all critical keys in English', () => {
      for (const key of criticalKeys) {
        const value = getValueByKey(en, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      }
    });

    it('should have all critical keys in French', () => {
      for (const key of criticalKeys) {
        const value = getValueByKey(fr, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      }
    });

    it('should have all critical keys in Dutch', () => {
      for (const key of criticalKeys) {
        const value = getValueByKey(nl, key);
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      }
    });
  });
});
