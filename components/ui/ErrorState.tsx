import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/DesignTokens';

/**
 * Centered error message display.
 *
 * @example
 * <ErrorState message="Failed to load events" />
 *
 * @example
 * <ErrorState message="Network error" containerStyles={{ paddingHorizontal: 32 }} />
 */

interface ErrorStateProps {
  /** The error message to display */
  message: string;
  /** Color of the error text. Defaults to the theme tint color. */
  color?: string;
  /** Style overrides for the container */
  containerStyles?: object;
  /** Style overrides for the text */
  textStyles?: object;
  /** Accessibility label for screen readers. Defaults to the message. */
  accessibilityLabel?: string;
  /** Additional props to pass through */
  [key: string]: any;
}

function ErrorStateComponent({
  message,
  color,
  containerStyles,
  textStyles,
  accessibilityLabel,
  ...props
}: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const textColor = color ?? Colors[colorScheme ?? 'light'].tint;

  return (
    <ThemedView
      style={[styles.container, containerStyles]}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel ?? message}
      accessibilityLiveRegion="polite"
      {...props}
    >
      <ThemedText style={[styles.errorText, { color: textColor }, textStyles]}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

export const ErrorState = memo(ErrorStateComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
  },
});
