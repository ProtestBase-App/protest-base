import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import MfaCodeForm from '@/components/auth/MfaCodeForm';
import RecoveryCodesPanel from '@/components/auth/RecoveryCodesPanel';
import CustomButton from '@/components/CustomButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PillButton } from '@/components/ui/PillButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { storeSession } from '@/services/auth.service';
import {
  clearPendingEnrollment,
  confirmTotpEnrollment,
  startTotpEnrollment,
} from '@/services/mfa.service';
import type { User } from '@/types/auth.types';
import type { MfaEnrollment, MfaSignInData, TotpSetup } from '@/types/mfa.types';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { describeMfaFailure, type MfaFailure } from '@/utils/mfa';
import { getThemeColors } from '@/utils/themeColors';
import { openTotpSetupUri } from '@/utils/urlSafety';

export interface MfaEnrollmentStepProps {
  enrollment: MfaEnrollment;
  onSignedIn: (user: User) => void;
  /** Back to the password: the user chose to, or the enrolment can't go on. */
  onRestart: () => void;
  /** True while the new recovery codes are on screen, when nothing may leave the step. */
  onCodesShownChange: (shown: boolean) => void;
}

type Stage = 'loading' | 'setupFailed' | 'setup' | 'codes';

/**
 * Enrolment the backend demands at sign-in: add the account to an authenticator app, confirm
 * with its first code, then save the recovery codes. The session is stored only once the codes
 * are saved, so leaving before that leaves no half-signed-in state behind.
 */
export default function MfaEnrollmentStep({
  enrollment,
  onSignedIn,
  onRestart,
  onCodesShownChange,
}: MfaEnrollmentStepProps) {
  const themeColors = getThemeColors(useColorScheme());
  const [expiresAt] = useState(() => Date.now() + enrollment.expiresIn * 1000);
  const [stage, setStage] = useState<Stage>('loading');
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [signIn, setSignIn] = useState<MfaSignInData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<MfaFailure | null>(null);

  // Read through a ref so a new callback from the parent doesn't fetch the setup again.
  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  });

  const restart = useCallback((reason: 'expired' | 'alreadyEnrolled') => {
    Alert.alert(
      t('mfa.expiredTitle'),
      reason === 'alreadyEnrolled' ? t('mfa.alreadyEnrolledMessage') : t('mfa.expiredMessage')
    );
    onRestartRef.current();
  }, []);

  // Bumped by "Try again" to fetch the setup once more.
  const [setupAttempt, setSetupAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    startTotpEnrollment(enrollment.enrollmentToken).then(
      (next) => {
        if (!active) return;
        setSetup(next);
        setStage('setup');
      },
      (error) => {
        if (!active) return;
        const next = describeMfaFailure(error);
        if (next.kind === 'restart') {
          restart(next.reason);
        } else {
          setStage('setupFailed');
        }
      }
    );
    return () => {
      active = false;
    };
  }, [enrollment.enrollmentToken, restart, setupAttempt]);

  const retrySetup = () => {
    setStage('loading');
    setSetupAttempt((attempt) => attempt + 1);
  };

  const finish = async (data: MfaSignInData) => {
    setSaving(true);
    try {
      const user = await storeSession(data);
      onCodesShownChange(false);
      onSignedIn(user);
    } catch (error) {
      logger.warn('[MFA] Could not store the new session', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t('common.error'), t('errors.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  const confirm = async (_method: 'totp' | 'recovery', code: string) => {
    if (!setup) return;
    if (Date.now() >= expiresAt) {
      restart('expired');
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      const data = await confirmTotpEnrollment(enrollment.enrollmentToken, setup.methodId, code);
      // The token is used up now: a restart from here on must not try to resume it.
      void clearPendingEnrollment();
      if (data.recoveryCodes?.length) {
        setSignIn(data);
        setStage('codes');
        onCodesShownChange(true);
      } else {
        await finish(data);
      }
    } catch (error) {
      const next = describeMfaFailure(error);
      if (next.kind === 'restart') {
        restart(next.reason);
      } else {
        setFailure(next);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openAuthenticator = async () => {
    if (!setup) return;
    if (!(await openTotpSetupUri(setup.otpauthUri))) {
      Alert.alert(t('mfa.noAuthenticatorTitle'), t('mfa.noAuthenticatorMessage'));
    }
  };

  if (stage === 'codes' && signIn?.recoveryCodes) {
    return (
      <RecoveryCodesPanel
        codes={signIn.recoveryCodes}
        saving={saving}
        onSaved={() => finish(signIn)}
      />
    );
  }

  return (
    <SetupView
      stage={stage}
      setup={setup}
      submitting={submitting}
      failure={failure}
      onRetry={retrySetup}
      onOpenAuthenticator={openAuthenticator}
      onConfirm={confirm}
      onEdit={() => setFailure(null)}
      onRestart={onRestart}
      themeColors={themeColors}
    />
  );
}

interface SetupViewProps {
  stage: Stage;
  setup: TotpSetup | null;
  submitting: boolean;
  failure: MfaFailure | null;
  onRetry: () => void;
  onOpenAuthenticator: () => void;
  onConfirm: (method: 'totp' | 'recovery', code: string) => void;
  onEdit: () => void;
  onRestart: () => void;
  themeColors: ReturnType<typeof getThemeColors>;
}

// Its own component so the heading takes the screen reader's focus when the step opens.
function SetupView({
  stage,
  setup,
  submitting,
  failure,
  onRetry,
  onOpenAuthenticator,
  onConfirm,
  onEdit,
  onRestart,
  themeColors,
}: SetupViewProps) {
  const headingRef = useOverlayFocus();

  return (
    <ThemedView style={styles.container}>
      <View ref={headingRef} accessible accessibilityRole="header" style={styles.heading}>
        <ThemedText type="title">{t('mfa.enrollTitle')}</ThemedText>
      </View>
      <ThemedText style={[styles.text, { color: themeColors.secondaryText }]}>
        {t('mfa.enrollIntro')}
      </ThemedText>

      {stage === 'loading' ? (
        <ActivityIndicator style={styles.loader} color={themeColors.tint} />
      ) : null}

      {stage === 'setupFailed' ? (
        <ThemedView style={styles.section}>
          <ThemedText style={styles.text}>{t('mfa.setupFailed')}</ThemedText>
          <CustomButton
            title={t('common.tryAgain')}
            handlePress={onRetry}
            isLoading={false}
            containerStyles={styles.retry}
            testID="mfa-setup-retry"
          />
        </ThemedView>
      ) : null}

      {/* No QR code: the authenticator app is on this same phone, so there's nothing to scan with. */}
      {stage === 'setup' && setup ? (
        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold" accessibilityRole="header" style={styles.stepTitle}>
            {t('mfa.stepAddTitle')}
          </ThemedText>
          <PillButton
            label={t('mfa.openAuthenticator')}
            onPress={onOpenAuthenticator}
            variant="outline"
            leftIcon="key"
            accessibilityHint={t('a11y.hints.openAuthenticator')}
            testID="mfa-open-authenticator"
          />
          <ThemedText style={[styles.help, { color: themeColors.subtleText }]}>
            {t('mfa.openAuthenticatorHelp')}
          </ThemedText>

          <ThemedText style={styles.label}>{t('mfa.manualKeyLabel')}</ThemedText>
          <ThemedView
            style={[
              styles.keyBox,
              { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
            ]}
          >
            {/* One unbroken word: Android's press and hold selects a single word, so a key in
                groups of four would copy only one group. */}
            <ThemedText selectable style={styles.key} testID="mfa-manual-key">
              {setup.manualKey}
            </ThemedText>
          </ThemedView>
          <ThemedText style={[styles.help, { color: themeColors.subtleText }]}>
            {t('mfa.manualKeyHelp')}
          </ThemedText>

          <ThemedText
            type="defaultSemiBold"
            accessibilityRole="header"
            style={[styles.stepTitle, styles.codeStepTitle]}
          >
            {t('mfa.stepCodeTitle')}
          </ThemedText>
          <MfaCodeForm
            allowAuthenticator
            allowRecovery={false}
            submitLabel={t('mfa.confirm')}
            submitting={submitting}
            failure={failure}
            onSubmit={onConfirm}
            onEdit={onEdit}
            testID="mfa-enroll"
          />
        </ThemedView>
      ) : null}

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
  text: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  section: {
    marginTop: Spacing.lg,
  },
  stepTitle: {
    marginBottom: Spacing.sm,
  },
  codeStepTitle: {
    marginTop: Spacing.xl,
  },
  retry: {
    marginTop: Spacing.md,
  },
  label: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  keyBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  key: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    letterSpacing: 2,
    textAlign: 'center',
  },
  help: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
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
