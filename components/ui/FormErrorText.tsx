import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface FormErrorTextProps {
  message: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** What is wrong with a field, under it. The icon keeps it from reading by color alone. */
export function FormErrorText({ message, style, testID }: FormErrorTextProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={[styles.row, style]}>
      <IconSymbol name="exclamationmark.circle" size={IconSizes.sm} color={themeColors.errorText} />
      <ThemedText testID={testID} style={[styles.message, { color: themeColors.errorText }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  message: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: Typography.families.medium,
    lineHeight: 18,
  },
});
