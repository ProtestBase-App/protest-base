import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface TriageEntryCardProps {
  /** Drafts needing a decision (past-dated or incomplete). */
  queueCount: number;
  /** How many of those are past-dated. */
  pastCount: number;
  /** Drafts already ready to publish (not part of the queue). */
  readyCount: number;
  onStartTriage: () => void;
  onPublishReady: () => void;
}

/**
 * Entry point for triage mode, shown above the drafts list whenever the backlog
 * is non-empty. Names the two shapes of work — decisions to make, and drafts
 * that need none — so the user can pick the cheap one.
 */
export default function TriageEntryCard({
  queueCount,
  pastCount,
  readyCount,
  onStartTriage,
  onPublishReady,
}: TriageEntryCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <LinearGradient
      colors={
        isDark
          ? ['rgba(249,68,96,0.16)', 'rgba(179,92,201,0.10)']
          : ['rgba(249,68,96,0.10)', 'rgba(179,92,201,0.07)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: 'rgba(249,68,96,0.3)' }]}
      testID="triage-entry-card"
    >
      <View style={styles.labelRow}>
        <IconSymbol name="bolt" size={19} color={themeColors.tint} />
        <ThemedText style={[styles.label, { color: themeColors.tint }]}>
          {t('drafts.triageTitle')}
        </ThemedText>
      </View>

      <ThemedText style={styles.headline}>
        {t('drafts.triageHeadline', { count: queueCount })}
      </ThemedText>

      <ThemedText style={[styles.helper, { color: themeColors.secondaryText }]}>
        {t('drafts.triageHelper', { past: pastCount, ready: readyCount })}
      </ThemedText>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onStartTriage}
          accessibilityRole="button"
          accessibilityLabel={t('drafts.triageStart')}
          testID="triage-start"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: themeColors.tint, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText style={styles.primaryLabel}>{t('drafts.triageStart')}</ThemedText>
        </Pressable>

        {readyCount > 0 && (
          <Pressable
            onPress={onPublishReady}
            accessibilityRole="button"
            accessibilityLabel={t('drafts.triagePublishReady', { count: readyCount })}
            testID="triage-publish-ready"
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: themeColors.liveText, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <IconSymbol name="checkmark" size={15} color={themeColors.liveText} />
            <ThemedText style={[styles.secondaryLabel, { color: themeColors.liveText }]}>
              {t('drafts.triagePublishReady', { count: readyCount })}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 19,
    fontFamily: Typography.families.bold,
    lineHeight: 26,
  },
  helper: {
    fontSize: 12.5,
    fontFamily: Typography.families.regular,
    lineHeight: 18,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: Typography.families.semiBold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1,
  },
  secondaryLabel: {
    fontSize: 13.5,
    fontFamily: Typography.families.semiBold,
  },
});
