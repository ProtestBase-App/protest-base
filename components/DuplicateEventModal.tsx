import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ConfirmDialogShell from '@/components/ui/ConfirmDialogShell';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { DuplicateSummary } from '@/types/event.types';
import {
  duplicateTitle,
  formatDuplicateMeta,
  relationshipMessageKey,
  relationshipOpenLabelKey,
} from '@/utils/duplicateEvents';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export type DuplicateEventMode = 'create' | 'publish';

export interface DuplicateEventModalProps {
  visible: boolean;
  /** Drives the title, the intro and the confirm label. */
  mode: DuplicateEventMode;
  /** The matches the backend refused on. Never empty — see useDuplicatePrompt. */
  duplicates: DuplicateSummary[];
  /** From the 409 body — when false, no confirm button is offered at all. */
  canOverride: boolean;
  /** UI language, for the matches' dates (`userLanguage` from GlobalProvider). */
  locale?: string;
  onDismiss: () => void;
  /** Re-send with duplicate_override. Never called when canOverride is false. */
  onConfirm: () => void;
  /** Open one match — the parent decides where (event detail vs draft editor). */
  onOpenDuplicate: (duplicate: DuplicateSummary) => void;
}

/**
 * Shown when the backend refuses a create or a publish with 409 DUPLICATE_EVENT.
 *
 * Lists the matching events so the organizer can see WHAT they are colliding
 * with, and offers exactly two ways out: open the existing event, or go through
 * anyway (which re-sends the identical request with `duplicate_override`). The
 * 409 is never retried automatically — that confirm button is the whole point.
 *
 * The explanatory line is per match rather than per dialog: one submission can
 * collide with the organizer's own draft AND with another organization's event,
 * and those need different copy.
 */
export default function DuplicateEventModal({
  visible,
  mode,
  duplicates,
  canOverride,
  locale,
  onDismiss,
  onConfirm,
  onOpenDuplicate,
}: DuplicateEventModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const introKey = mode === 'publish' ? 'duplicates.publishIntro' : 'duplicates.createIntro';
  const titleKey = mode === 'publish' ? 'duplicates.publishTitle' : 'duplicates.createTitle';
  const confirmKey = mode === 'publish' ? 'duplicates.publishAnyway' : 'duplicates.createAnyway';

  return (
    <ConfirmDialogShell
      visible={visible}
      title={t(titleKey)}
      message={t(introKey, { count: duplicates.length })}
      dismissLabel={t('common.goBack')}
      onDismiss={onDismiss}
      confirmLabel={canOverride ? t(confirmKey) : undefined}
      onConfirm={canOverride ? onConfirm : undefined}
    >
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {duplicates.map((duplicate) => {
          const meta = formatDuplicateMeta(duplicate, locale);
          return (
            <ThemedView
              key={duplicate.id}
              style={[
                styles.match,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <ThemedText style={styles.matchTitle} numberOfLines={2}>
                {duplicateTitle(duplicate)}
              </ThemedText>
              {!!meta && (
                <ThemedText style={[styles.matchMeta, { color: themeColors.secondaryText }]}>
                  {meta}
                </ThemedText>
              )}
              <ThemedText style={[styles.matchWhy, { color: themeColors.subtleText }]}>
                {t(relationshipMessageKey(duplicate.relationship))}
              </ThemedText>

              <TouchableOpacity
                onPress={() => onOpenDuplicate(duplicate)}
                style={styles.openButton}
                accessibilityRole="button"
                // Named, so a screen reader can tell three matches apart.
                accessibilityLabel={t('duplicates.accessibilityOpen', {
                  title: duplicateTitle(duplicate),
                })}
              >
                <ThemedText style={[styles.openButtonText, { color: themeColors.link }]}>
                  {t(relationshipOpenLabelKey(duplicate.relationship))}
                </ThemedText>
                <IconSymbol name="chevron.right" size={IconSizes.sm} color={themeColors.link} />
              </TouchableOpacity>
            </ThemedView>
          );
        })}
      </ScrollView>

      {!canOverride && (
        <ThemedText style={[styles.notOverridable, { color: themeColors.subtleText }]}>
          {t('duplicates.notOverridable')}
        </ThemedText>
      )}
    </ConfirmDialogShell>
  );
}

const styles = StyleSheet.create({
  // Capped so three or four matches stay scrollable instead of pushing the
  // buttons off a small screen.
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  match: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  matchTitle: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
  matchMeta: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  matchWhy: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  openButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
  notOverridable: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginTop: Spacing.md,
  },
});
