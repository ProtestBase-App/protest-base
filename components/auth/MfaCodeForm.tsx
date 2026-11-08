import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TouchableOpacity } from 'react-native';
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography } from '@/constants/DesignTokens';
import type { MfaCodeMethod } from '@/types/mfa.types';
import { t } from '@/utils/i18n';
import { isMfaBlocked, isWellFormedMfaCode, normalizeMfaCode, type MfaFailure } from '@/utils/mfa';
import { getThemeColors } from '@/utils/themeColors';

// The lock countdown is shown in whole minutes.
const LOCK_TICK_MS = 15_000;

export interface MfaCodeFormProps {
  /** Offer the authenticator code; false for an account that only has a passkey. */
  allowAuthenticator: boolean;
  /** Offer recovery codes; false while confirming a new authenticator. */
  allowRecovery: boolean;
  /** Text above the field, for each kind of code. */
  intro?: Partial<Record<MfaCodeMethod, string>>;
  submitLabel: string;
  submitting: boolean;
  failure: MfaFailure | null;
  onSubmit: (method: MfaCodeMethod, code: string) => void;
  /** The user typed or switched codes: a stale failure can go. */
  onEdit?: () => void;
  testID: string;
}

function failureMessage(failure: MfaFailure | null, now: number): string | null {
  if (!failure) return null;
  switch (failure.kind) {
    case 'wrongCode':
      if (failure.attemptsRemaining === 0) return t('mfa.blocked');
      return failure.attemptsRemaining === null
        ? t('mfa.wrongCode')
        : `${t('mfa.wrongCode')} ${t('mfa.attemptsLeft', { count: failure.attemptsRemaining })}`;
    case 'locked': {
      if (failure.until === null) return t('mfa.blocked');
      const minutes = Math.ceil((failure.until - now) / 60_000);
      return minutes > 0 ? t('mfa.lockedFor', { count: minutes }) : null;
    }
    case 'rateLimited':
      return t('errors.rateLimit.message');
    case 'network':
      return t('errors.network');
    case 'other':
      return failure.message || t('errors.unknownError');
    case 'restart':
      return null;
  }
}

/** One code field for every second-factor step: sign-in, setup and step-up. */
export default function MfaCodeForm({
  allowAuthenticator,
  allowRecovery,
  intro,
  submitLabel,
  submitting,
  failure,
  onSubmit,
  onEdit,
  testID,
}: MfaCodeFormProps) {
  const themeColors = getThemeColors(useColorScheme());
  const [method, setMethod] = useState<MfaCodeMethod>(allowAuthenticator ? 'totp' : 'recovery');
  const [code, setCode] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const lockUntil = failure?.kind === 'locked' ? failure.until : null;
  useEffect(() => {
    if (lockUntil === null) return;
    const tick = () => setNow(Date.now());
    // The first tick right away: `now` may date from when the form opened.
    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, LOCK_TICK_MS);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [lockUntil]);

  // The field's label carries the message, but a screen reader only reads it on focus.
  useEffect(() => {
    const message = formatError ?? failureMessage(failure, Date.now());
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [failure, formatError]);

  const blocked = isMfaBlocked(failure, now);
  const message = formatError ?? failureMessage(failure, now);
  const isAuthenticator = method === 'totp';

  const handleChange = (text: string) => {
    setCode(text);
    setFormatError(null);
    onEdit?.();
  };

  const switchMethod = () => {
    setMethod(isAuthenticator ? 'recovery' : 'totp');
    setCode('');
    setFormatError(null);
    onEdit?.();
  };

  const submit = () => {
    if (submitting || blocked) return;
    // A malformed code would still cost one of the account's attempts.
    if (!isWellFormedMfaCode(method, code)) {
      setFormatError(isAuthenticator ? t('mfa.invalidCodeFormat') : t('mfa.invalidRecoveryFormat'));
      return;
    }
    onSubmit(method, normalizeMfaCode(method, code));
  };

  const introText = intro?.[method];

  return (
    <ThemedView style={styles.container}>
      {introText ? (
        <ThemedText style={[styles.intro, { color: themeColors.secondaryText }]}>
          {introText}
        </ThemedText>
      ) : null}
      <FormField
        title={isAuthenticator ? t('mfa.codeLabel') : t('mfa.recoveryCodeLabel')}
        value={code}
        placeholder={isAuthenticator ? t('mfa.codePlaceholder') : t('mfa.recoveryCodePlaceholder')}
        handleChangeText={handleChange}
        errorText={message ?? undefined}
        disabled={blocked}
        keyboardType={isAuthenticator ? 'number-pad' : 'default'}
        autoCapitalize={isAuthenticator ? 'none' : 'characters'}
        autoCorrect={false}
        autoComplete={isAuthenticator ? 'one-time-code' : 'off'}
        textContentType={isAuthenticator ? 'oneTimeCode' : 'none'}
        maxLength={isAuthenticator ? 8 : 16}
        returnKeyType="done"
        onSubmitEditing={submit}
        testID={`${testID}-input`}
      />
      <CustomButton
        title={submitLabel}
        handlePress={submit}
        isLoading={submitting}
        disabled={blocked}
        containerStyles={styles.submit}
        testID={`${testID}-submit`}
      />
      {/* Hidden while locked: switching would clear the lock text and enable Verify, and the
          backend refuses every code until the lock ends. */}
      {allowAuthenticator && allowRecovery && !blocked ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityHint={
            isAuthenticator ? t('a11y.hints.useRecoveryCode') : t('a11y.hints.useAuthenticatorCode')
          }
          onPress={switchMethod}
          style={styles.link}
          testID={`${testID}-switch`}
        >
          <ThemedText style={[styles.linkText, { color: themeColors.tint }]}>
            {isAuthenticator ? t('mfa.useRecoveryCode') : t('mfa.useAuthenticator')}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  intro: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  submit: {
    marginTop: Spacing.sm,
  },
  link: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  linkText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    textDecorationLine: 'underline',
  },
});
