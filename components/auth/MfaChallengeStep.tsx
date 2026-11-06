import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import MfaCodeForm from '@/components/auth/MfaCodeForm';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { verifyMfaCode } from '@/services/mfa.service';
import type { User } from '@/types/auth.types';
import type { MfaChallenge, MfaCodeMethod } from '@/types/mfa.types';
import { t } from '@/utils/i18n';
import { acceptsAuthenticatorCode, describeMfaFailure, type MfaFailure } from '@/utils/mfa';
import { getThemeColors } from '@/utils/themeColors';

export interface MfaChallengeStepProps {
  challenge: MfaChallenge;
  onSignedIn: (result: { user: User; recoveryCodesRemaining?: number }) => void;
  /** Back to the password: the user chose to, or the challenge can't be answered any more. */
  onRestart: () => void;
}

/** The second step of a sign-in: a code from the authenticator app, or a recovery code. */
export default function MfaChallengeStep({
  challenge,
  onSignedIn,
  onRestart,
}: MfaChallengeStepProps) {
  const themeColors = getThemeColors(useColorScheme());
  const headingRef = useOverlayFocus();
  const [expiresAt] = useState(() => Date.now() + challenge.expiresIn * 1000);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<MfaFailure | null>(null);
  const allowAuthenticator = acceptsAuthenticatorCode(challenge.methods);

  const expire = () => {
    Alert.alert(t('mfa.expiredTitle'), t('mfa.expiredMessage'));
    onRestart();
  };

  const submit = async (method: MfaCodeMethod, code: string) => {
    if (Date.now() >= expiresAt) {
      expire();
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      onSignedIn(await verifyMfaCode(challenge.challengeId, method, code));
    } catch (error) {
      const next = describeMfaFailure(error);
      if (next.kind === 'restart') {
        expire();
      } else {
        setFailure(next);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View ref={headingRef} accessible accessibilityRole="header" style={styles.heading}>
        <ThemedText type="title">{t('mfa.challengeTitle')}</ThemedText>
      </View>
      {allowAuthenticator ? null : (
        <ThemedText style={[styles.note, { color: themeColors.secondaryText }]}>
          {t('mfa.passkeyOnly')}
        </ThemedText>
      )}
      <MfaCodeForm
        allowAuthenticator={allowAuthenticator}
        allowRecovery
        intro={{
          totp: t('mfa.challengeIntro'),
          recovery: allowAuthenticator ? t('mfa.recoveryIntro') : undefined,
        }}
        submitLabel={t('mfa.verify')}
        submitting={submitting}
        failure={failure}
        onSubmit={submit}
        onEdit={() => setFailure(null)}
        testID="mfa-challenge"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={t('a11y.hints.backToSignIn')}
        onPress={onRestart}
        style={styles.back}
        testID="mfa-back-to-sign-in"
      >
        <ThemedText style={[styles.backText, { color: themeColors.tint }]}>
          {t('mfa.backToSignIn')}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: Spacing.sm,
  },
  heading: {
    marginBottom: Spacing.md,
  },
  note: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  back: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  backText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
});
