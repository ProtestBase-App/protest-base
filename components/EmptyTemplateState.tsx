import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface EmptyTemplateStateProps {
  onCreateTemplate: () => void;
  onFromPastEvent?: () => void;
  showFromPastEvent?: boolean;
}

export default function EmptyTemplateState({
  onCreateTemplate,
  onFromPastEvent,
  showFromPastEvent = true,
}: EmptyTemplateStateProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const iconContainerBg = useThemeColor({ light: '#F3F4F6', dark: '#27272A' }, 'background');
  const iconColor = useThemeColor({ light: '#9CA3AF', dark: '#71717A' }, 'icon');
  const subtitleColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D5DB', dark: '#3F3F46' }, 'background');
  const secondaryButtonBorder = useThemeColor({ light: '#D1D5DB', dark: '#52525B' }, 'background');
  const secondaryButtonText = useThemeColor({ light: '#374151', dark: '#E5E7EB' }, 'text');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: iconContainerBg }]}>
        <IconSymbol name="rectangle.stack" size={IconSizes['2xl']} color={iconColor} />
      </View>

      {/* Title */}
      <ThemedText type="subtitleBold" style={styles.title}>
        {t('templates.emptyTitle')}
      </ThemedText>

      {/* Description */}
      <ThemedText type="default" style={[styles.subtitle, { color: subtitleColor }]}>
        {t('templates.emptyDescription')}
      </ThemedText>

      {/* Primary CTA Button */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: themeColors.tint }]}
        onPress={onCreateTemplate}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('templates.createButton')}
        testID="btn-create-template"
      >
        <IconSymbol name="plus" size={18} color="#FFFFFF" />
        <ThemedText style={styles.primaryButtonText}>{t('templates.createButton')}</ThemedText>
      </TouchableOpacity>

      {/* Secondary Button */}
      {showFromPastEvent && onFromPastEvent && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: secondaryButtonBorder }]}
          onPress={onFromPastEvent}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('templates.fromPastEvent')}
        >
          <IconSymbol name="doc.on.doc" size={18} color={secondaryButtonText} />
          <ThemedText style={[styles.secondaryButtonText, { color: secondaryButtonText }]}>
            {t('templates.fromPastEvent')}
          </ThemedText>
        </TouchableOpacity>
      )}
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    minWidth: 260,
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    minWidth: 260,
  },
  secondaryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
});
