import React from 'react';
import { StyleSheet, StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary';
  actionLabel?: string;
  onActionPress?: () => void;
  /** Container style override (e.g. margins/padding when the screen owns the inset). */
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  variant = 'secondary',
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Primary variant: Prominent section titles (e.g., "UPCOMING EVENTS", "PAST EVENTS")
  // Secondary variant: Subtle section labels (e.g., "MY ORGANIZATION", "SETTINGS")
  const isPrimary = variant === 'primary';

  const titleColor = isPrimary ? themeColors.text : themeColors.chevron;
  const subtitleColor = themeColors.secondaryText;
  const actionColor = themeColors.tint;

  return (
    <ThemedView
      style={[isPrimary ? styles.sectionHeaderPrimary : styles.sectionHeader, style]}
      accessibilityRole="header"
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <ThemedText
            style={[isPrimary ? styles.primaryTitle : styles.secondaryTitle, { color: titleColor }]}
          >
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitleText, { color: subtitleColor }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        {actionLabel && onActionPress && (
          <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}>
            <ThemedText style={[styles.actionText, { color: actionColor }]}>
              {actionLabel}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeaderPrimary: {
    marginTop: 0,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.bold,
    letterSpacing: 0.5,
  },
  secondaryTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    marginTop: Spacing.xs,
  },
  actionText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
});
