/**
 * Validation utility functions for form inputs
 */

import { t } from '@/utils/i18n';

/**
 * Validates an email address using comprehensive rules:
 *
 * - Must match RFC 5322 compliant email regex pattern
 * - Length must be between 5 and 254 characters (RFC 5321 maximum)
 * - Must contain a valid domain extension (at least 2 characters after the dot)
 *
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 *
 * @example
 * isValidEmail('user@example.com') // returns true
 * isValidEmail('invalid-email') // returns false
 * isValidEmail('user@domain') // returns false (no domain extension)
 * isValidEmail('a@b.c') // returns false (too short)
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();

  // RFC 5322 compliant email regex
  const emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  // Email length must be between 5 and 254 characters (RFC 5321)
  const isValidLength = trimmed.length >= 5 && trimmed.length <= 254;

  // Must have a domain extension of at least 2 characters
  const hasDomainExtension = /\.[a-zA-Z]{2,}$/.test(trimmed);

  return emailRegex.test(trimmed) && isValidLength && hasDomainExtension;
};

/**
 * Validates an email and returns an error message if invalid
 *
 * @param email - The email address to validate
 * @returns Error message string if invalid, null if valid
 *
 * @example
 * getEmailValidationError('user@example.com') // returns null
 * getEmailValidationError('invalid') // returns 'Please enter a valid email address'
 */
export const getEmailValidationError = (email: string): string | null => {
  if (!email || email.trim().length === 0) {
    return null; // Don't show error for empty field
  }

  if (!isValidEmail(email)) {
    return t('auth.invalidEmail');
  }

  return null;
};
