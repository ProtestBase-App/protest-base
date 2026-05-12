import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface SectionContainerProps {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function SectionContainer({ title, children, style, contentStyle }: SectionContainerProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Use theme-aware border color for minimal design
  const borderColor = themeColors.cardBorder;

  return (
    <ThemedView style={[styles.section, style]}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedView style={[styles.sectionContent, { borderColor }, contentStyle]}>
        {children}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
});
