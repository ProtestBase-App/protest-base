import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Typography, Spacing } from '@/constants/DesignTokens';

interface DateRadioButtonProps {
  label: string;
  value: string;
  isChecked?: boolean;
  onSelectionChange: (value: string, isChecked: boolean) => void;
}

export default function DateRadioButton({
  label,
  value,
  isChecked = false,
  onSelectionChange,
}: DateRadioButtonProps) {
  const handlePress = () => {
    const newCheckedState = !isChecked;
    onSelectionChange(value, newCheckedState);
  };
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const uncheckedBorderColor =
    colorScheme === 'dark' ? themeColors.cardBackground : themeColors.chevron;
  const checkedColor = themeColors.text;

  return (
    <ThemedView>
      <TouchableOpacity style={styles.rowContainer} onPress={handlePress}>
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
        <ThemedView
          style={[
            styles.customBox,
            { borderColor: uncheckedBorderColor },
            isChecked && {
              backgroundColor: checkedColor,
              borderColor: checkedColor,
            },
          ]}
        />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
    marginVertical: 1,
  },
  label: {
    marginHorizontal: Spacing.sm,
    marginVertical: 1,
    fontSize: Typography.sizes.sm,
  },
  customBox: {
    width: 18,
    height: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    marginHorizontal: 10,
    marginVertical: 1,
    backgroundColor: 'transparent',
  },
});
