import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/DesignTokens';

import { ThemedText } from '@/components/ThemedText';

interface CustomButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: object;
  textStyles?: object;
  isLoading: boolean;
  disabled?: boolean;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

export default function CustomButton({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
  testID,
}: CustomButtonProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#F0405B' : '#FF4662';

  return (
    <>
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.touchableOpacity,
          { backgroundColor },
          containerStyles,
          isLoading && styles.opacity50,
        ]}
        disabled={isLoading}
      >
        <ThemedText
          type="defaultSemiBold"
          style={[styles.text, textStyles, isLoading && styles.opacity50]}
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
  text: {
    fontSize: Typography.sizes.base,
    color: 'white',
  },
  opacity50: {
    opacity: 0.5,
  },
});
