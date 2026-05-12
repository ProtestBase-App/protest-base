/**
 * i18n configuration.
 *
 * Configures i18n-js for internationalization support, detects device locale
 * and provides type-safe translation functions.
 *
 * Supported languages: English (en), French (fr), Dutch (nl).
 */

import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { logger } from '@/utils/logger';

export type SupportedLocale = 'en' | 'fr' | 'nl';

/**
 * Translation key type. String for now; intended to be replaced with generated
 * types once translation files settle.
 */
export type TranslationKey = string;

/** Translation scope for nested keys (e.g. 'common', 'auth', 'events'). */
export type TranslationScope = string;

/** Interpolation options for dynamic values in translations. */
export interface TranslationOptions {
  [key: string]: string | number | boolean | null | undefined;
}

export interface PluralOptions extends TranslationOptions {
  count: number;
}

/**
 * Get the device language code, with locale mapping and fallback.
 * Maps e.g. 'nl-BE' to 'nl' and falls back to 'en' for unsupported locales.
 */
export function getDeviceLocale(): SupportedLocale {
  const supportedLanguages: SupportedLocale[] = ['en', 'fr', 'nl'];
  const locales = getLocales();

  if (!locales || locales.length === 0) {
    return 'en';
  }

  const localeCode = locales[0]?.languageCode;

  // Belgium locales may arrive as 'nl-BE', 'fr-BE', etc.; we only key off the
  // language code, not the region.
  if (localeCode && supportedLanguages.includes(localeCode as SupportedLocale)) {
    return localeCode as SupportedLocale;
  }

  return 'en';
}

const i18n = new I18n();

function initializeI18n(): void {
  let translations: Record<SupportedLocale, any> = {
    en: {},
    fr: {},
    nl: {},
  };

  try {
    const locales = require('@/constants/locales');
    translations = {
      en: locales.en || {},
      fr: locales.fr || {},
      nl: locales.nl || {},
    };
  } catch (error) {
    logger.warn('Translation files not yet loaded. Using empty translations.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  i18n.translations = translations;
  i18n.defaultLocale = 'en';
  i18n.enableFallback = true;
  i18n.locale = getDeviceLocale();
}

initializeI18n();

/**
 * Type-safe translation function with interpolation and pluralization support
 *
 * @param key - Translation key (e.g., 'common.welcome', 'events.created')
 * @param options - Optional interpolation values or pluralization options
 * @returns Translated string
 *
 * @example
 * // Simple translation
 * t('common.welcome') // => "Welcome"
 *
 * @example
 * // With interpolation
 * t('auth.greeting', { name: 'Alice' }) // => "Hello, Alice!"
 *
 * @example
 * // With pluralization
 * t('events.count', { count: 5 }) // => "5 events"
 */
export function t(key: TranslationKey, options?: TranslationOptions): string {
  try {
    const result = i18n.t(key, options);
    // i18n-js returns "[missing ...]" for missing keys; return the key itself instead.
    if (result.startsWith('[missing ')) {
      return key;
    }
    return result;
  } catch (error) {
    logger.warn('Translation error', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return key;
  }
}

/**
 * Translation function with scope support
 *
 * @param scope - Translation scope (e.g., 'common', 'auth')
 * @param key - Translation key within the scope
 * @param options - Optional interpolation values
 * @returns Translated string
 *
 * @example
 * tScope('common', 'welcome') // => "Welcome"
 */
export function tScope(scope: TranslationScope, key: string, options?: TranslationOptions): string {
  return t(`${scope}.${key}`, options);
}

/**
 * Pluralization helper function
 *
 * @param key - Translation key
 * @param count - Count for pluralization
 * @param options - Additional interpolation values
 * @returns Translated string with proper plural form
 *
 * @example
 * tPlural('events.count', 1) // => "1 event"
 * tPlural('events.count', 5) // => "5 events"
 */
export function tPlural(key: TranslationKey, count: number, options?: TranslationOptions): string {
  return t(key, { count, ...options });
}

/** Get the current active locale. */
export function getCurrentLocale(): SupportedLocale {
  return i18n.locale as SupportedLocale;
}

/**
 * Set the active locale
 *
 * Note: Currently the app is device-dependent and this function is provided
 * for potential future use (e.g., manual language selection in settings).
 *
 * @param locale - Locale to set
 */
export function setLocale(locale: SupportedLocale): void {
  if (['en', 'fr', 'nl'].includes(locale)) {
    i18n.locale = locale;
  } else {
    logger.warn('Unsupported locale. Falling back to current locale.', { locale });
  }
}

/**
 * Check if a locale is supported
 *
 * @param locale - Locale to check
 * @returns True if locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return ['en', 'fr', 'nl'].includes(locale);
}

/**
 * Re-export the i18n instance for advanced usage
 * (custom formatters, direct access to locale data).
 */
export { i18n };

export default {
  t,
  tScope,
  tPlural,
  getCurrentLocale,
  setLocale,
  getDeviceLocale,
  isSupportedLocale,
};
