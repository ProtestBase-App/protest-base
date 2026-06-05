import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Spacing, BorderRadius, IconSizes, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

interface CTAButtonProps {
  text: string;
  leftIcon: IconSymbolName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  badge?: number | string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CTAButton({
  text,
  leftIcon,
  onPress,
  variant = 'secondary',
  badge,
  style,
  testID,
}: CTAButtonProps) {
  const isPrimary = variant === 'primary';
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Primary variant uses brand primary color (tint: #F94460 pink/red)
  // Secondary variant uses theme-aware background and borders
  const backgroundColor = isPrimary ? themeColors.tint : themeColors.buttonSecondaryBackground;
  const borderColor = isPrimary ? themeColors.tint : themeColors.buttonSecondaryBorder;

  // Primary: white text/icons for contrast on pink/red background
  // Secondary: uses theme text color
  const iconColor = isPrimary ? '#FFFFFF' : themeColors.text;
  const chevronColor = isPrimary ? '#FFFFFF' : themeColors.chevron;
  const textColor = isPrimary ? '#FFFFFF' : themeColors.text;

  // Badge formatting and styling
  const formatBadgeText = (value: number | string): string => {
    if (typeof value === 'number') {
      return value > 99 ? '99+' : value.toString();
    }
    return value.toString();
  };

  const badgeText = badge !== undefined ? formatBadgeText(badge) : '';
  const showBadge = badge !== undefined && badge !== '' && badge !== 0;

  // Neutral count chip: a subtle, theme-aware pill with a high-contrast number,
  // sitting inline (vertically centered) just before the chevron.
  const badgeBackground = isPrimary ? 'rgba(255, 255, 255, 0.22)' : themeColors.badgeBg;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.ctaButton,
        { backgroundColor, borderColor },
        pressed && styles.ctaButtonPressed,
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
    >
      <IconSymbol name={leftIcon} size={IconSizes.md} color={iconColor} />
      <ThemedText style={[styles.ctaButtonText, { color: textColor }]}>{text}</ThemedText>

      {showBadge && (
        <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
          <ThemedText style={[styles.badgeText, { color: textColor }]}>{badgeText}</ThemedText>
        </View>
      )}

      <IconSymbol name="chevron.forward" size={IconSizes.md} color={chevronColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    position: 'relative',
  },
  ctaButtonPressed: {
    opacity: 0.7,
  },
  ctaButtonText: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
  badge: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  badgeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
});
