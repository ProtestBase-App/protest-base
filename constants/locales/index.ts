/**
 * Locales Index
 *
 * Central export point for all translation files.
 * Import this in utils/i18n.ts to load translations.
 */

import { en } from './en';
import { fr } from './fr';
import { nl } from './nl';

// Export individual locales
export { en, fr, nl };

// Export combined translations object for i18n-js
export const translations = {
  en,
  fr,
  nl,
};

// Export default as translations object
export default translations;
