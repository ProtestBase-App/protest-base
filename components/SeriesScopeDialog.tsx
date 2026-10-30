import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import ConfirmDialogShell from '@/components/ui/ConfirmDialogShell';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { SeriesScope } from '@/types/eventSeries.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface SeriesScopeDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Said under "Only this event". */
  onlyHint?: string;
  /** Said under "This and all following events". */
  followingHint?: string;
  /**
   * Why "This and all following events" cannot be chosen. Set, the option stays visible
   * and greyed out with this reason, and the dialog can only act on the one event.
   */
  followingDisabledReason?: string;
  dismissLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  submitting?: boolean;
  onDismiss: () => void;
  onConfirm: (scope: SeriesScope) => void;
  /** Prefix for E2E ids: `${testID}-only`, `${testID}-following` and the shell's own. */
  testID?: string;
}

interface ScopeOptionProps {
  label: string;
  hint?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

function ScopeOption({ label, hint, selected, disabled, onPress, testID }: ScopeOptionProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[styles.option, disabled && styles.optionDisabled]}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <IconSymbol
        name={selected ? 'checkmark.circle.fill' : 'circle'}
        size={IconSizes.md}
        color={selected ? themeColors.tint : themeColors.icon}
      />
      <View style={styles.optionText}>
        <ThemedText style={styles.optionLabel}>{label}</ThemedText>
        {!!hint && (
          <ThemedText style={[styles.optionHint, { color: themeColors.subtleText }]}>
            {hint}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

/**
 * "Only this event / This and all following events", in front of an action on one date
 * of a series. The confirm hands the choice back; the parent makes the call, since only
 * it knows which endpoint "only this" means.
 */
export default function SeriesScopeDialog({
  visible,
  title,
  message,
  onlyHint,
  followingHint,
  followingDisabledReason,
  dismissLabel,
  confirmLabel,
  destructive,
  submitting,
  onDismiss,
  onConfirm,
  testID,
}: SeriesScopeDialogProps) {
  const [scope, setScope] = useState<SeriesScope>('only');
  const followingDisabled = !!followingDisabledReason;

  // Back to the narrow choice every time it opens: the wide one is the expensive mistake.
  useEffect(() => {
    if (visible) setScope('only');
  }, [visible]);

  return (
    <ConfirmDialogShell
      visible={visible}
      title={title}
      message={message}
      dismissLabel={dismissLabel}
      onDismiss={onDismiss}
      confirmLabel={confirmLabel}
      onConfirm={() => onConfirm(followingDisabled ? 'only' : scope)}
      destructive={destructive}
      submitting={submitting}
      testID={testID}
    >
      <View style={styles.options} accessibilityRole="radiogroup">
        <ScopeOption
          testID={testID ? `${testID}-only` : undefined}
          label={t('series.scope.only')}
          hint={onlyHint}
          selected={followingDisabled || scope === 'only'}
          onPress={() => setScope('only')}
        />
        <ScopeOption
          testID={testID ? `${testID}-following` : undefined}
          label={t('series.scope.following')}
          hint={followingDisabledReason ?? followingHint}
          selected={!followingDisabled && scope === 'following'}
          disabled={followingDisabled}
          onPress={() => setScope('following')}
        />
      </View>
    </ConfirmDialogShell>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.sm,
  },
  optionHint: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginTop: 2,
  },
});
