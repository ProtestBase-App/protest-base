import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BorderRadius, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

import { ThemedText } from '@/components/ThemedText';

interface CustomButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: object;
  textStyles?: object;
  isLoading: boolean;
  disabled?: boolean;
  /** The slimmer pill of the event forms. */
  pill?: boolean;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

export default function CustomButton({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
  disabled = false,
  pill = false,
  testID,
}: CustomButtonProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = getThemeColors(colorScheme).cta;

  // A loading button is also non-interactive; both states dim it.
  const isDimmed = isLoading || disabled;

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading }}
        testID={testID}
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.touchableOpacity,
          { backgroundColor },
          pill && styles.pill,
          containerStyles,
          isDimmed && styles.opacity50,
        ]}
        disabled={isDimmed}
      >
        <ThemedText
          type="defaultSemiBold"
          style={[styles.text, textStyles, isDimmed && styles.opacity50]}
        >
          {title}
        </ThemedText>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  touchableOpacity: {
    borderRadius: 10,
    minHeight: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    minHeight: 48,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontSize: Typography.sizes.base,
    color: 'white',
  },
  opacity50: {
    opacity: 0.5,
  },
});
