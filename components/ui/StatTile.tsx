import React from 'react';
import { Pressable, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

export interface StatTileProps {
  label: string;
  count: number;
  icon: IconSymbolName;
  /** Icon tint, also used as the visual accent of the tile. */
  accentColor: string;
  /** Soft (low-alpha) background behind the icon, derived from the accent. */
  chipBackground: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function StatTile({
  label,
  count,
  icon,
  accentColor,
  chipBackground,
  onPress,
  style,
  testID,
}: StatTileProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? themeColors.surfaceAltBackground : themeColors.cardBackground,
          borderColor: themeColors.cardBorder,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: chipBackground }]}>
          <IconSymbol name={icon} size={IconSizes.sm} color={accentColor} />
        </View>
        <IconSymbol name="chevron.right" size={14} color={themeColors.chevron} />
      </View>
      <View>
        <ThemedText style={styles.count}>{count}</ThemedText>
        <ThemedText style={[styles.label, { color: themeColors.secondaryText }]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 22 is a deliberate non-token size from the handoff (stat count hero number).
  count: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: Typography.families.extraBold,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.medium,
    marginTop: 2,
  },
});
