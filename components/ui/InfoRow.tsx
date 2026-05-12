import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing, Typography } from '@/constants/DesignTokens';

export interface InfoRowProps {
  label: string;
  value?: string;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  /** Allow text selection for copying (useful for emails) */
  selectable?: boolean;
  /** Number of lines before truncating (default: 1) */
  numberOfLines?: number;
}

export function InfoRow({
  label,
  value,
  valueColor,
  style,
  labelStyle,
  valueStyle,
  selectable = false,
  numberOfLines = 1,
}: InfoRowProps) {
  return (
    <ThemedView style={[styles.infoRow, style]}>
      <ThemedText style={[styles.label, labelStyle]}>{label}</ThemedText>
      <ThemedText
        selectable={selectable}
        style={[styles.value, valueStyle, valueColor && { color: valueColor }]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {value || 'N/A'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    minHeight: 44, // Touch target minimum
  },
  label: {
    fontSize: Typography.sizes.sm,
    opacity: 0.7,
    flex: 0.4,
    marginRight: Spacing.sm,
  },
  value: {
    fontSize: Typography.sizes.sm,
    flex: 0.6,
    textAlign: 'right',
    fontFamily: Typography.families.medium,
  },
});
