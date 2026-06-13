import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

// Text on the green publish pill — constant by design (dark text on the live
// green regardless of theme, same exception class as white-on-tint).
const PUBLISH_PILL_TEXT = '#0E1117';

export type ActionPillVariant = 'primary' | 'ghost' | 'publish' | 'disabled';

export interface ActionPillProps {
  label: string;
  icon?: IconSymbolName;
  /**
   * 'primary' = filled accent, 'ghost' = subtle bordered, 'publish' = filled
   * live-green with dark text, 'disabled' = faint non-actionable.
   */
  variant?: ActionPillVariant;
  /** Omit for a purely informational (non-pressable) pill. */
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Compact quick-action pill from the C2 design system (upcoming/drafts card
 * action rows). For full-size CTAs use `PillButton` instead.
 */
export function ActionPill({
  label,
  icon,
  variant = 'ghost',
  onPress,
  disabled = false,
  testID,
}: ActionPillProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const palette = {
    primary: { container: { backgroundColor: themeColors.tint }, content: 'white' },
    ghost: {
      container: {
        backgroundColor: themeColors.badgeBg,
        borderWidth: 1,
        borderColor: themeColors.cardBorder,
      },
      content: themeColors.text,
    },
    publish: { container: { backgroundColor: themeColors.live }, content: PUBLISH_PILL_TEXT },
    disabled: {
      container: {
        backgroundColor: themeColors.badgeBg,
        borderWidth: 1,
        borderColor: themeColors.cardBorder,
      },
      content: themeColors.subtleText,
    },
  }[variant];

  const content = (
    <>
      {icon && <IconSymbol name={icon} size={14} color={palette.content} />}
      <ThemedText style={[styles.label, { color: palette.content }]}>{label}</ThemedText>
    </>
  );

  if (!onPress || variant === 'disabled') {
    // A disabled action must still announce itself ("Publish, dimmed") to
    // screen readers; purely informational pills stay plain text.
    const disabledA11y =
      variant === 'disabled'
        ? ({
            accessible: true,
            accessibilityRole: 'button' as const,
            accessibilityLabel: label,
            accessibilityState: { disabled: true },
          } as const)
        : undefined;
    return (
      <View style={[styles.pill, palette.container]} testID={testID} {...disabledA11y}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        palette.container,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 12.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 17,
  },
});
