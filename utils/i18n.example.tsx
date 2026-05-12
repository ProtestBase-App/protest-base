/**
 * i18n Usage Example
 *
 * This file demonstrates how to use the i18n configuration in components.
 * This is a reference file and should not be imported in the actual app.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { t, tScope, tPlural, getCurrentLocale, getDeviceLocale } from '@/utils/i18n';

// Example 1: Simple translation
export function WelcomeMessage() {
  return (
    <View>
      <Text>{t('common.welcome')}</Text>
      <Text>{t('common.subtitle')}</Text>
    </View>
  );
}

// Example 2: Translation with interpolation
export function UserGreeting({ userName }: { userName: string }) {
  return <Text>{t('auth.greeting', { name: userName })}</Text>;
}

// Example 3: Using scoped translations
export function AuthForm() {
  return (
    <View>
      <Text>{tScope('auth', 'signIn')}</Text>
      <Text>{tScope('auth', 'email')}</Text>
      <Text>{tScope('auth', 'password')}</Text>
    </View>
  );
}

// Example 4: Pluralization
export function EventCounter({ count }: { count: number }) {
  return (
    <View>
      <Text>{tPlural('events.count', count)}</Text>
      <Text>{tPlural('events.saved', count, { type: 'protest' })}</Text>
    </View>
  );
}

// Example 5: Locale display
export function LocaleInfo() {
  const currentLocale = getCurrentLocale();
  const deviceLocale = getDeviceLocale();

  return (
    <View>
      <Text>Current: {currentLocale}</Text>
      <Text>Device: {deviceLocale}</Text>
    </View>
  );
}

// Example 6: Conditional rendering based on locale
export function LocalizedContent() {
  const locale = getCurrentLocale();

  return (
    <View>
      {locale === 'nl' && <Text>{t('regional.belgium.info')}</Text>}
      {locale === 'fr' && <Text>{t('regional.france.info')}</Text>}
      <Text>{t('common.fallback')}</Text>
    </View>
  );
}

// Example 7: Using in event formatting (existing pattern)
export function EventDate({ date }: { date: Date }) {
  const locale = getCurrentLocale();

  return (
    <Text>
      {/* Can integrate with existing eventFormatters */}
      {t('events.dateLabel')}: {date.toLocaleDateString(locale)}
    </Text>
  );
}

// Example 8: Error messages with fallback
export function ErrorDisplay({ errorKey }: { errorKey: string }) {
  // If translation missing, shows the key itself
  const errorMessage = t(`errors.${errorKey}`);

  return <Text style={{ color: 'red' }}>{errorMessage}</Text>;
}
