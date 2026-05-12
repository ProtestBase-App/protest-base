/**
 * Theme-aware back button for navigation headers with consistent platform-specific styling.
 *
 * @example
 * // Defaults to router.back()
 * <HeaderBackButton />
 *
 * @example
 * <HeaderBackButton color="#FF0000" />
 *
 * @example
 * <HeaderBackButton onPress={() => router.navigate('/home')} />
 */

import React, { memo, useMemo } from 'react';
import { TouchableOpacity, Platform, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, IconSizes } from '@/constants/DesignTokens';

interface HeaderBackButtonProps {
  /**
   * Custom press handler. Defaults to router.back() if not provided.
   */
  onPress?: () => void;
  /**
   * Icon color. Defaults to theme-aware color (white in dark mode, black in light mode).
   */
  color?: string;
  /**
   * Custom container styles to override default styling.
   */
  containerStyles?: StyleProp<ViewStyle>;
  /**
   * Accessibility label for screen readers. Defaults to "Go back".
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint for screen readers. Defaults to "Navigates to the previous screen".
   */
  accessibilityHint?: string;
  /**
   * Allow additional props to be passed through.
   */
  [key: string]: any;
}

function HeaderBackButtonComponent({
  onPress,
  color,
  containerStyles,
  accessibilityLabel = 'Go back',
  accessibilityHint = 'Navigates to the previous screen',
  ...props
}: HeaderBackButtonProps) {
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  const iconColor = useMemo(() => {
    if (color) return color;
    return isDark ? Colors.dark.text : Colors.light.text;
  }, [color, isDark]);

  // iOS has default spacing; Android needs extra margin.
  const platformMargin = useMemo(() => {
    return Platform.OS === 'ios' ? 0 : Spacing.sm;
  }, []);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, { marginLeft: platformMargin }, containerStyles]}
      hitSlop={styles.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...props}
    >
      <IconSymbol name="chevron.left" size={IconSizes.xl} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
  },
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  },
});

export const HeaderBackButton = memo(HeaderBackButtonComponent);
