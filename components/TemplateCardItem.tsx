import React from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { ParsedEventTemplate } from '@/types/template.types';

export interface TemplateCardItemProps {
  template: ParsedEventTemplate;
  onPress: (template: ParsedEventTemplate) => void;
}

export default function TemplateCardItem({ template, onPress }: TemplateCardItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Extract summary info from event_data
  const { event_data } = template;
  const city = event_data.city;
  const categories = Array.isArray(event_data.categories)
    ? event_data.categories
    : event_data.categories
    ? [event_data.categories]
    : [];
  const firstCategory = categories[0];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        { borderColor: themeColors.cardBorder },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(template)}
      accessibilityRole="button"
      accessibilityLabel={`Template: ${template.name}${
        template.description ? `, ${template.description}` : ''
      }`}
    >
      <ThemedView style={styles.cardContent}>
        {/* Icon Container */}
        <View
          style={[styles.iconContainer, { backgroundColor: themeColors.highlightIconBackground }]}
        >
          <IconSymbol name="text.document" size={IconSizes.xl} color={themeColors.text} />
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          {/* Template Name */}
          <ThemedText type="defaultSemiBold" style={styles.templateName} numberOfLines={1}>
            {template.name}
          </ThemedText>

          {/* Description */}
          {template.description && (
            <ThemedText
              style={[styles.description, { color: themeColors.subtleText }]}
              numberOfLines={1}
            >
              {template.description}
            </ThemedText>
          )}

          {/* Summary badges (city / category) */}
          {(city || firstCategory) && (
            <View style={styles.badgeRow}>
              {city && (
                <View style={[styles.badge, { backgroundColor: themeColors.badgeBg }]}>
                  <ThemedText style={[styles.badgeText, { color: themeColors.subtleText }]}>
                    {city}
                  </ThemedText>
                </View>
              )}
              {firstCategory && (
                <View style={[styles.badge, { backgroundColor: themeColors.categoryBadgeBg }]}>
                  <ThemedText style={[styles.badgeText, { color: themeColors.tint }]}>
                    {firstCategory}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Chevron */}
        <IconSymbol name="chevron.forward" size={20} color={themeColors.chevron} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Shadows.card.ios.shadowColor,
        shadowOffset: Shadows.card.ios.shadowOffset,
        shadowOpacity: Shadows.card.ios.shadowOpacity,
        shadowRadius: Shadows.card.ios.shadowRadius,
      },
      android: {
        elevation: Shadows.card.android.elevation,
      },
    }),
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  templateName: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
  },
});
