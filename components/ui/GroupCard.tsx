import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

export interface GroupCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Rounded card that groups a list of GroupRow items with hairline separators. */
export function GroupCard({ children, style }: GroupCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface GroupRowProps {
  label: string;
  icon: IconSymbolName;
  onPress: () => void;
  /** Suppresses the bottom separator; set on the last row of a GroupCard. */
  isLast?: boolean;
  testID?: string;
}

export function GroupRow({ label, icon, onPress, isLast = false, testID }: GroupRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: themeColors.surfaceAltBackground },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: themeColors.separator,
        },
      ]}
    >
      <View style={[styles.iconChip, { backgroundColor: themeColors.badgeBg }]}>
        <IconSymbol name={icon} size={IconSizes.sm} color={themeColors.secondaryText} />
      </View>
      <ThemedText style={styles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      <IconSymbol name="chevron.right" size={IconSizes.sm} color={themeColors.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 15 is a deliberate non-token size from the handoff (row label).
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
  },
});
