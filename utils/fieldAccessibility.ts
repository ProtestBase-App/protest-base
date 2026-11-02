import { Platform } from 'react-native';

import { t } from '@/utils/i18n';

/**
 * What a screen reader calls a form field: its title, with the required mark read as a
 * word, and what is wrong with it when something is.
 */
export function fieldAccessibilityLabel(
  title: string | null,
  errorText?: string
): string | undefined {
  if (!title) return errorText;
  const required = title.endsWith('*');
  const name = required ? title.slice(0, -1).trimEnd() : title;
  if (errorText) return `${name}: ${errorText}`;
  return required ? `${name}, ${t('a11y.required')}` : name;
}

/**
 * The name for a text input. On Android a label becomes the input's content description,
 * which TalkBack can read in place of what was typed, so there the placeholder stays
 * its name and the error is the next thing read.
 */
export function inputAccessibilityLabel(
  title: string | null,
  errorText?: string
): string | undefined {
  return Platform.OS === 'android' ? undefined : fieldAccessibilityLabel(title, errorText);
}
