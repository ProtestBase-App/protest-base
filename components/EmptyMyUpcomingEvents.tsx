import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function EmptyMyUpcomingEvents() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const iconContainerBg = useThemeColor({ light: '#F3F4F6', dark: '#27272A' }, 'background');
  const iconColor = useThemeColor({ light: '#9CA3AF', dark: '#71717A' }, 'icon');
  const subtitleColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D5DB', dark: '#3F3F46' }, 'background');

  const handleCreateEvent = () => {
    router.push('/(tabs)/(more)/create-event');
  };

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      {/* Calendar Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: iconContainerBg }]}>
        <IconSymbol name="calendar" size={IconSizes['2xl']} color={iconColor} />
      </View>

      {/* Title */}
      <ThemedText type="subtitleBold" style={styles.title}>
        No upcoming events
      </ThemedText>

      {/* Subtitle */}
      <ThemedText type="default" style={[styles.subtitle, { color: subtitleColor }]}>
        Ready to organize your next event? Create one now and start engaging with your community.
      </ThemedText>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: themeColors.tint }]}
        onPress={handleCreateEvent}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={18} color="#FFFFFF" />
        <ThemedText style={styles.ctaButtonText}>Create your next event</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    marginVertical: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    opacity: 0.9,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    minWidth: 260,
  },
  ctaButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
});
