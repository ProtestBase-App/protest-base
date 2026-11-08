import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MfaCodeForm from '@/components/auth/MfaCodeForm';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import { Spacing, Typography } from '@/constants/DesignTokens';
import type { MfaCodeMethod } from '@/types/mfa.types';
import { t } from '@/utils/i18n';
import type { MfaFailure } from '@/utils/mfa';
import { getThemeColors } from '@/utils/themeColors';

export interface MfaReauthStepProps {
  submitting: boolean;
  failure: MfaFailure | null;
  onSubmit: (method: MfaCodeMethod, code: string) => void;
  onEdit: () => void;
  onCancel: () => void;
}

/** The second factor a sensitive action asks for after the password (deleting the account). */
export default function MfaReauthStep({
  submitting,
  failure,
  onSubmit,
  onEdit,
  onCancel,
}: MfaReauthStepProps) {
  const themeColors = getThemeColors(useColorScheme());
  const headingRef = useOverlayFocus();

  return (
    <ThemedView style={styles.container}>
      <View ref={headingRef} accessible accessibilityRole="header" style={styles.heading}>
        <ThemedText type="subtitleBold">{t('mfa.reauthTitle')}</ThemedText>
      </View>
      <MfaCodeForm
        allowAuthenticator
        allowRecovery
        intro={{ totp: t('mfa.reauthIntro'), recovery: t('mfa.reauthRecoveryIntro') }}
        submitLabel={t('account.confirmButton')}
        submitting={submitting}
        failure={failure}
        onSubmit={onSubmit}
        onEdit={onEdit}
        testID="mfa-reauth"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={t('a11y.hints.cancelCodeStep')}
        onPress={onCancel}
        disabled={submitting}
        style={[styles.cancel, submitting && styles.disabled]}
        testID="mfa-reauth-cancel"
      >
        <ThemedText style={[styles.cancelText, { color: themeColors.tint }]}>
          {t('common.cancel')}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  heading: {
    marginBottom: Spacing.sm,
  },
  cancel: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  disabled: {
    opacity: 0.5,
  },
});
