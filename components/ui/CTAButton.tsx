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
  badgeColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CTAButton({
  text,
  leftIcon,
  onPress,
  variant = 'secondary',
  badge,
  badgeColor,
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

  const defaultBadgeColor = themeColors.error;
  const finalBadgeColor = badgeColor || defaultBadgeColor;

  const badgeText = badge !== undefined ? formatBadgeText(badge) : '';
  const showBadge = badge !== undefined && badge !== '' && badge !== 0;

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
      <IconSymbol name="chevron.forward" size={IconSizes.md} color={chevronColor} />

      {showBadge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: finalBadgeColor },
            badgeText.length === 1 && styles.badgeCircle,
          ]}
        >
          <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
        </View>
      )}
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
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeCircle: {
    width: 20,
    borderRadius: 10,
    paddingHorizontal: 0,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
    lineHeight: Typography.sizes.xs,
  },
});
