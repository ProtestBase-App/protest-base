import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface BrandHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders the floating accent "+" button when provided. */
  onCreatePress?: () => void;
  /** Defaults to router.back(). */
  onBackPress?: () => void;
}

/**
 * In-screen brand header from the C2 design system (upcoming/drafts
 * redesigns): circular back button, left-aligned bold title with an optional
 * subtitle, and an optional floating create button. Screens using it set
 * `headerShown: false` and include 'top' in their SafeAreaView edges.
 */
export function BrandHeader({ title, subtitle, onCreatePress, onBackPress }: BrandHeaderProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBackPress ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={t('common.goBack')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.cardBorder,
          },
          pressed && styles.pressed,
        ]}
      >
        <IconSymbol name="chevron.left" size={18} color={themeColors.text} />
      </Pressable>

      <View style={styles.titles}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText
            style={[styles.subtitle, { color: themeColors.secondaryText }]}
            numberOfLines={1}
          >
            {subtitle}
          </ThemedText>
        )}
      </View>

      {onCreatePress && (
        <Pressable
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel={t('more.createNewEvent')}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: themeColors.tint, shadowColor: themeColors.tint },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="plus" size={20} color="white" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: Spacing.md,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.families.bold,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 9,
    elevation: 6,
  },
  pressed: {
    opacity: 0.7,
  },
});
