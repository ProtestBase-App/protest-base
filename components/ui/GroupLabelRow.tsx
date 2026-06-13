import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface GroupLabelRowProps {
  label: string;
  /** Label color override (e.g. tint for "today"); defaults to secondaryText. */
  color?: string;
}

/**
 * Uppercase group header with a trailing hairline rule, from the C2 design
 * system (upcoming timeline date groups, templates "reuse a past event").
 */
export function GroupLabelRow({ label, color }: GroupLabelRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={styles.row}>
      <ThemedText
        style={[styles.label, { color: color ?? themeColors.secondaryText }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      <View style={[styles.rule, { backgroundColor: themeColors.separator }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 12.5,
    fontFamily: Typography.families.bold,
    letterSpacing: 1.2,
    lineHeight: 17,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
