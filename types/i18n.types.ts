/**
 * i18n type definitions.
 *
 * String-based for now; intended to be replaced with generated unions once
 * translation files settle.
 */

export type SupportedLocale = 'en' | 'fr' | 'nl';

/**
 * Base translation structure. Placeholder index signature today; intended to
 * narrow to a literal-key union once translations stabilize.
 */
export interface TranslationStructure {
  [key: string]: any;
}

/**
 * Translation key, e.g. 'common.welcome' | 'auth.signIn'.
 * Will be replaced with a union of valid keys once translations are defined.
 */
export type TranslationKey = string;

/** Top-level translation scope, e.g. 'common', 'auth', 'events'. */
export type TranslationScope = string;

/** Interpolation values for dynamic substitutions in translations. */
export interface TranslationOptions {
  [key: string]: string | number | boolean | null | undefined;
}

export interface PluralOptions extends TranslationOptions {
  count: number;
}

export type LocaleData = Record<string, any>;

export type Translations = Record<SupportedLocale, LocaleData>;
