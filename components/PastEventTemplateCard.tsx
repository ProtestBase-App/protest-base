import React from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { PastEventForTemplate } from '@/types/template.types';

interface PastEventTemplateCardProps {
  event: PastEventForTemplate;
  onCreateTemplate: (event: PastEventForTemplate) => void;
}

export default function PastEventTemplateCard({
  event,
  onCreateTemplate,
}: PastEventTemplateCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    onCreateTemplate(event);
  };

  return (
    <ThemedView
      style={[styles.card, { borderColor: themeColors.cardBorder }]}
      lightColor="#FFFFFF"
      darkColor="#1C1C1E"
    >
      {/* Title */}
      <ThemedText style={styles.title} numberOfLines={2} ellipsizeMode="tail">
        {event.title}
      </ThemedText>

      {/* Date row */}
      <View style={styles.infoRow}>
        <IconSymbol name="calendar" size={IconSizes.sm} color={themeColors.subtleText} />
        <ThemedText style={[styles.infoText, { color: themeColors.subtleText }]}>
          {event.formattedDate}
        </ThemedText>
      </View>

      {/* City row (if available) */}
      {event.city && (
        <View style={styles.infoRow}>
          <IconSymbol name="mappin" size={IconSizes.sm} color={themeColors.subtleText} />
          <ThemedText
            style={[styles.infoText, { color: themeColors.subtleText }]}
            numberOfLines={1}
          >
            {event.city}
          </ThemedText>
        </View>
      )}

      {/* Category badge (if available) */}
      {event.firstCategory && (
        <View style={[styles.categoryBadge, { backgroundColor: themeColors.categoryBadgeBg }]}>
          <ThemedText style={[styles.categoryText, { color: colors.tint }]}>
            {event.firstCategory}
          </ThemedText>
        </View>
      )}

      {/* Spacer to push button to bottom */}
      <View style={styles.spacer} />

      {/* Use as Template button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
          pressed && styles.buttonPressed,
        ]}
        onPress={handlePress}
        accessibilityLabel={`Create template from ${event.title}, held on ${event.formattedDate}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to create a template based on this event"
      >
        <ThemedText style={[styles.buttonText, { color: colors.tint }]}>Use as Template</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginRight: Spacing.md,
    minHeight: 200,
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
  title: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.lineHeights.normal,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  infoText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  categoryText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
  },
  spacer: {
    flex: 1,
  },
  button: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
  },
});
