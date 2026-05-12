import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';
import { Colors } from '@/constants/Colors';

export interface StatusBadgeProps {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({
  active,
  activeText = 'Active',
  inactiveText = 'Inactive',
  style,
}: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: active ? Colors.semantic.success : Colors.semantic.error },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${active ? activeText : inactiveText}`}
    >
      <ThemedText style={styles.badgeText}>{active ? activeText : inactiveText}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.xl,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF', // White text for maximum contrast on colored badge backgrounds (not theme-dependent)
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
  },
});
