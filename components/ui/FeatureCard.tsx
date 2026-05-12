import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { getThemeColors } from '@/utils/themeColors';
import { Typography, Spacing } from '@/constants/DesignTokens';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: IconSymbolName;
  onPress: () => void;
}

export function FeatureCard({ title, description, icon, onPress }: FeatureCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const backgroundColor = themeColors.surfaceBackground;
  const borderColor = themeColors.border;
  const iconContainerBg = themeColors.highlightIconBackground;
  const iconColor = themeColors.text;
  const titleColor = themeColors.text;
  const descriptionColor = themeColors.secondaryText;
  const chevronColor = themeColors.chevron;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.featureCard,
        { backgroundColor, borderColor },
        pressed && styles.featureCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}: ${description}` : title}
    >
      <View style={[styles.featureCardIconContainer, { backgroundColor: iconContainerBg }]}>
        <IconSymbol name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.featureCardContent}>
        <ThemedText style={[styles.featureCardTitle, { color: titleColor }]}>{title}</ThemedText>
        {description && (
          <ThemedText style={[styles.featureCardDescription, { color: descriptionColor }]}>
            {description}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="chevron.forward" size={20} color={chevronColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  featureCardPressed: {
    opacity: 0.7,
  },
  featureCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    marginBottom: 2,
  },
  featureCardDescription: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
  },
});
