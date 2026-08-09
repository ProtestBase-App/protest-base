import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PUBLISH_PILL_TEXT } from '@/components/ui/ActionPill';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface DraftBatchBarProps {
  /** Number of drafts that would be published. Zero hides the publish row. */
  readyCount: number;
  onPublishAll: () => void;
  /**
   * Past-dated drafts, which can be removed in one go. Zero hides that row.
   * Counted over the loaded set; the confirmation re-counts authoritatively.
   */
  pastCount?: number;
  onRemovePast?: () => void;
  /** True while either sequential runner is working. */
  running?: boolean;
  /** Progress copy while running, e.g. "3 / 12". */
  progressLabel?: string;
}

/** Height + gap the list must add to its bottom padding while the bar is up. */
export const BATCH_BAR_CLEARANCE = 66;
/** Extra clearance when the destructive second row is also showing. */
export const BATCH_BAR_ROW_CLEARANCE = 50;

/**
 * Floating bar over the drafts list offering the two actions that need no
 * per-draft decision: publish everything already complete and future-dated, and
 * remove the past-dated ones.
 *
 * The destructive action lives on its OWN row with its own label and colour.
 * Never fold it into the publish row: a permanent, un-undoable delete must never
 * be one mis-tap away from a button captioned "Publish".
 */
export default function DraftBatchBar({
  readyCount,
  onPublishAll,
  pastCount = 0,
  onRemovePast,
  running = false,
  progressLabel,
}: DraftBatchBarProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        { borderColor: themeColors.cardBorder, shadowOpacity: isDark ? 0.45 : 0.14 },
      ]}
      testID="draft-batch-bar"
    >
      <BlurView
        intensity={22}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blur,
          { backgroundColor: isDark ? 'rgba(37,37,55,0.94)' : 'rgba(255,255,255,0.94)' },
        ]}
      >
        {readyCount > 0 && (
          <View style={styles.row}>
            <View style={styles.copy}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {progressLabel ?? t('drafts.batchReady', { count: readyCount })}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
                {t('drafts.batchSubtitle')}
              </ThemedText>
            </View>

            <Pressable
              onPress={onPublishAll}
              disabled={running}
              accessibilityRole="button"
              accessibilityLabel={t('drafts.batchPublishAll')}
              accessibilityState={{ disabled: running }}
              testID="draft-batch-publish"
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: themeColors.live, opacity: pressed || running ? 0.7 : 1 },
              ]}
            >
              {running ? (
                <ActivityIndicator size="small" color={PUBLISH_PILL_TEXT} />
              ) : (
                <IconSymbol name="checkmark" size={16} color={PUBLISH_PILL_TEXT} />
              )}
              <ThemedText style={styles.pillLabel}>{t('drafts.batchPublishAll')}</ThemedText>
            </Pressable>
          </View>
        )}

        {pastCount > 0 && !!onRemovePast && (
          <View
            style={[
              styles.row,
              readyCount > 0 && { borderTopWidth: 1, borderTopColor: themeColors.cardBorder },
            ]}
          >
            <View style={styles.copy}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {t('drafts.batchPastDated', { count: pastCount })}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
                {t('drafts.batchPastSubtitle')}
              </ThemedText>
            </View>

            <Pressable
              onPress={onRemovePast}
              disabled={running}
              accessibilityRole="button"
              accessibilityLabel={t('drafts.batchRemovePast')}
              accessibilityState={{ disabled: running }}
              testID="draft-batch-remove-past"
              style={({ pressed }) => [
                styles.pill,
                styles.destructivePill,
                {
                  borderColor: themeColors.destructive,
                  opacity: pressed || running ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="trash" size={15} color={themeColors.destructive} />
              <ThemedText style={[styles.pillLabel, { color: themeColors.destructive }]}>
                {t('drafts.batchRemovePast')}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 95,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  blur: {
    // Height comes from the rows, so the bar can carry one or two of them.
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    gap: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Typography.families.regular,
    lineHeight: 15,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  destructivePill: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  pillLabel: {
    color: PUBLISH_PILL_TEXT,
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
});
