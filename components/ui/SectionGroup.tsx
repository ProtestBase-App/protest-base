import React from 'react';
import { StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from '@/components/ThemedView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Spacing } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

interface SectionGroupProps {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'highlight';
}

export function SectionGroup({ title, children, variant = 'default' }: SectionGroupProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const highlightBackgroundColor = themeColors.highlightBackground;
  const highlightBorderColor = themeColors.highlightBorder;

  return (
    <ThemedView style={styles.sectionGroup}>
      <SectionHeader title={title} />
      <ThemedView
        style={[
          styles.sectionContent,
          variant === 'highlight' && {
            backgroundColor: highlightBackgroundColor,
            borderColor: highlightBorderColor,
            borderRadius: 12,
            padding: Spacing.lg,
            borderWidth: 1,
          },
        ]}
      >
        {children}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionGroup: {
    marginBottom: Spacing.xl,
  },
  sectionContent: {
    // No background for default sections
  },
});
