import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

// Accent alpha for the outline border. The tint (#F94460) is identical in both
// themes, so this stays theme-independent (same convention as the maps tab's
// ACCENT_* constants).
const ACCENT_OUTLINE_BORDER = 'rgba(249, 68, 96, 0.35)';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  /** 'filled' renders a solid accent pill, 'outline' a transparent accent-bordered one. */
  variant?: 'filled' | 'outline';
  leftIcon?: IconSymbolName;
  height?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PillButton({
  label,
  onPress,
  variant = 'filled',
  leftIcon,
  height = 50,
  disabled = false,
  style,
  testID,
}: PillButtonProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isFilled = variant === 'filled';
  const contentColor = isFilled ? 'white' : themeColors.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { height },
        isFilled
          ? [styles.filled, { backgroundColor: themeColors.tint, shadowColor: themeColors.tint }]
          : [styles.outline, { borderColor: ACCENT_OUTLINE_BORDER }],
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {leftIcon && <IconSymbol name={leftIcon} size={IconSizes.sm} color={contentColor} />}
      <ThemedText style={[styles.label, { color: contentColor }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
  },
  filled: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
});
