import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

interface SectionHeaderProps {
  title: string;
  isDark: boolean;
}

interface HelperTextProps {
  text: string;
  isDark: boolean;
}

// Helper component for section headers
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, isDark }) => {
  const themeColors = getThemeColors(isDark ? 'dark' : 'light');
  return (
    <ThemedView style={styles.sectionHeaderContainer}>
      <ThemedText style={[styles.sectionHeader, { color: themeColors.tint }]}>{title}</ThemedText>
      <ThemedView style={[styles.sectionDivider, { backgroundColor: themeColors.border }]} />
    </ThemedView>
  );
};

// Helper component for field helper text
export const HelperText: React.FC<HelperTextProps> = ({ text, isDark }) => {
  const themeColors = getThemeColors(isDark ? 'dark' : 'light');
  return (
    <ThemedText style={[styles.helperText, { color: themeColors.subtleText }]}>{text}</ThemedText>
  );
};

const styles = StyleSheet.create({
  // Section Header Styles
  sectionHeaderContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.semiBold,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    opacity: 0.3,
  },

  // Helper Text Styles
  helperText: {
    fontSize: 13,
    fontFamily: Typography.families.regular,
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 4,
    lineHeight: 18,
  },
});
