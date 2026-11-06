import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import CustomButton from '@/components/CustomButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PillButton } from '@/components/ui/PillButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { getThemeColors } from '@/utils/themeColors';

export interface RecoveryCodesPanelProps {
  codes: string[];
  /** The session is being stored. */
  saving: boolean;
  onSaved: () => void;
}

/** New recovery codes, shown once: the user leaves only by saying they saved them. */
export default function RecoveryCodesPanel({ codes, saving, onSaved }: RecoveryCodesPanelProps) {
  const themeColors = getThemeColors(useColorScheme());
  const headingRef = useOverlayFocus();

  const share = async () => {
    try {
      await Share.share({
        title: t('mfa.recoveryCodesShareTitle'),
        message: `${t('mfa.recoveryCodesShareTitle')}\n\n${codes.join('\n')}`,
      });
    } catch (error) {
      logger.warn('[MFA] The share sheet failed', {
        error: error instanceof Error ? error.name : 'unknown',
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View ref={headingRef} accessible accessibilityRole="header" style={styles.heading}>
        <ThemedText type="title">{t('mfa.recoveryCodesTitle')}</ThemedText>
      </View>
      <ThemedText style={[styles.intro, { color: themeColors.secondaryText }]}>
        {t('mfa.recoveryCodesIntro')}
      </ThemedText>
      <ThemedView
        style={[
          styles.codes,
          { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
        ]}
        testID="mfa-recovery-codes"
      >
        {codes.map((code) => (
          <ThemedText key={code} selectable style={styles.code}>
            {code}
          </ThemedText>
        ))}
      </ThemedView>
      <PillButton
        label={t('mfa.shareRecoveryCodes')}
        onPress={share}
        variant="outline"
        leftIcon="square.and.arrow.up"
        accessibilityHint={t('a11y.hints.shareRecoveryCodes')}
        style={styles.share}
        testID="mfa-share-recovery-codes"
      />
      <CustomButton
        title={t('mfa.savedRecoveryCodes')}
        handlePress={onSaved}
        isLoading={saving}
        testID="mfa-recovery-codes-saved"
      />
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
  intro: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  codes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  code: {
    width: '48%',
    textAlign: 'center',
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    letterSpacing: 1,
  },
  share: {
    marginBottom: Spacing.md,
  },
});
