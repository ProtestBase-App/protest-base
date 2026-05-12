/**
 * Version Screen Translations
 *
 * @deprecated This file is deprecated. Use the main i18n system instead.
 *
 * Translations have been migrated to:
 * - constants/locales/en.ts (version namespace)
 * - constants/locales/fr.ts (version namespace)
 * - constants/locales/nl.ts (version namespace)
 *
 * Components should use:
 * import { t } from '@/utils/i18n';
 * t('version.updateRequired.title')
 * t('version.updateRequired.message')
 * t('version.updateRequired.button')
 * t('version.updatePrompt.title')
 * t('version.updatePrompt.message')
 * t('version.updatePrompt.updateButton')
 * t('version.updatePrompt.laterButton')
 * t('version.maintenance.title')
 * t('version.maintenance.message')
 *
 * This file is kept temporarily for backwards compatibility.
 * It will be removed in a future release.
 *
 * Original description:
 * Translations for version-related screens (UpdateRequired, UpdatePrompt, Maintenance).
 * Supports English (default), French, and Dutch (Belgium).
 *
 * These components render OUTSIDE GlobalProvider, so they cannot access userLanguage
 * from GlobalContext. Instead, they detect language directly from device locale.
 */

import { getLocales } from 'expo-localization';

interface VersionScreenStrings {
  // Update Required screen (blocking).
  updateRequired: {
    title: string;
    defaultMessage: string;
    buttonText: string;
  };
  // Update Prompt (dismissible modal).
  updatePrompt: {
    title: string;
    defaultMessage: string;
    buttonText: string;
    laterText: string;
  };
  // Maintenance screen (blocking).
  maintenance: {
    title: string;
    defaultMessage: string;
  };
}

type SupportedLanguage = 'en' | 'fr' | 'nl';

const translations: Record<SupportedLanguage, VersionScreenStrings> = {
  en: {
    updateRequired: {
      title: 'Update Required',
      defaultMessage:
        'A new version of ProtestBase is available. Please update to continue using the app.',
      buttonText: 'Update Now',
    },
    updatePrompt: {
      title: 'Update Available',
      defaultMessage: 'A new version of ProtestBase is available with improvements and bug fixes.',
      buttonText: 'Update Now',
      laterText: 'Later',
    },
    maintenance: {
      title: 'Under Maintenance',
      defaultMessage: "We're performing scheduled maintenance. Please check back soon.",
    },
  },
  fr: {
    updateRequired: {
      title: 'Mise à jour requise',
      defaultMessage:
        "Une nouvelle version de ProtestBase est disponible. Veuillez mettre à jour pour continuer à utiliser l'application.",
      buttonText: 'Mettre à jour',
    },
    updatePrompt: {
      title: 'Mise à jour disponible',
      defaultMessage:
        'Une nouvelle version de ProtestBase est disponible avec des améliorations et des corrections de bugs.',
      buttonText: 'Mettre à jour',
      laterText: 'Plus tard',
    },
    maintenance: {
      title: 'En maintenance',
      defaultMessage: 'Nous effectuons une maintenance planifiée. Veuillez réessayer plus tard.',
    },
  },
  nl: {
    updateRequired: {
      title: 'Update vereist',
      defaultMessage:
        'Er is een nieuwe versie van ProtestBase beschikbaar. Gelieve te updaten om de app te blijven gebruiken.',
      buttonText: 'Nu updaten',
    },
    updatePrompt: {
      title: 'Update beschikbaar',
      defaultMessage:
        'Er is een nieuwe versie van ProtestBase beschikbaar met verbeteringen en bugfixes.',
      buttonText: 'Nu updaten',
      laterText: 'Later',
    },
    maintenance: {
      title: 'In onderhoud',
      defaultMessage: 'We voeren gepland onderhoud uit. Probeer het later opnieuw.',
    },
  },
};

/**
 * Get the device language code, falling back to 'en' if unsupported.
 *
 * @deprecated Use getDeviceLocale() from '@/utils/i18n' instead.
 */
export function getDeviceLanguage(): SupportedLanguage {
  const supportedLanguages: SupportedLanguage[] = ['en', 'fr', 'nl'];
  const localeCode = getLocales()[0]?.languageCode;

  if (localeCode && supportedLanguages.includes(localeCode as SupportedLanguage)) {
    return localeCode as SupportedLanguage;
  }

  return 'en';
}

/**
 * Get translated strings for version screens based on device language.
 *
 * @deprecated Use t() from '@/utils/i18n' instead.
 * Example: t('version.updateRequired.title')
 */
export function getVersionScreenStrings(): VersionScreenStrings {
  const language = getDeviceLanguage();
  return translations[language];
}
