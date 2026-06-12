import React from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface FilterChipProps {
  label: string;
  onPress: () => void;
  /** Highlighted (selected/applied) state. */
  active?: boolean;
  /** Compact variant used in summary rows and selected-value chips. */
  small?: boolean;
  /** Accent color when active. Defaults to the theme tint. */
  activeColor?: string;
  /** Background when active. Defaults to the tinted category badge background. */
  activeBackground?: string;
  /** Optional leading element (icon or color dot). */
  leading?: React.ReactNode;
  /** Show a trailing xmark, signalling the chip removes a filter when tapped. */
  removable?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Pill-shaped filter chip used by the calendar tab (filter sheet category
 * chips, active-filter summary row, selected location/organization chips).
 */
export function FilterChip({
  label,
  onPress,
  active = false,
  small = false,
  activeColor,
  activeBackground,
  leading,
  removable = false,
  disabled = false,
  accessibilityLabel,
  testID,
  containerStyle,
}: FilterChipProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const accent = activeColor ?? themeColors.tint;
  const backgroundColor = active
    ? (activeBackground ?? themeColors.categoryBadgeBg)
    : themeColors.surfaceAltBackground;
  const borderColor = active ? accent : themeColors.cardBorder;
  const textColor = active ? accent : themeColors.secondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        small ? styles.chipSmall : styles.chipRegular,
        { backgroundColor, borderColor, opacity: pressed || disabled ? 0.7 : 1 },
        containerStyle,
      ]}
    >
      {leading && <View style={styles.leading}>{leading}</View>}
      <ThemedText
        style={[
          styles.label,
          small ? styles.labelSmall : styles.labelRegular,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      {removable && <IconSymbol name="xmark" size={10} color={textColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 30,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipRegular: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSmall: {
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  leading: {
    flexShrink: 0,
  },
  label: {
    fontFamily: Typography.families.semiBold,
  },
  labelRegular: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
});

export default FilterChip;
