import type { SupportedLocale } from '@/utils/i18n';

export const PLACARD_WORDS: Record<SupportedLocale, string[]> = {
  en: ['RISE', 'UNITE', 'ACT', 'VOICE'],
  fr: ['DEBOUT', 'UNIS', 'AGIR', 'VOIX'],
  nl: ['OPSTAAN', 'SAMEN', 'ACTIE', 'STEM'],
};

export function resolvePlacardWords(locale: string | undefined): string[] {
  const code = (locale ?? 'en') as SupportedLocale;
  return PLACARD_WORDS[code] ?? PLACARD_WORDS.en;
}
