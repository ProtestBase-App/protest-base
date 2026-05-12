import React from 'react';
import { TouchableOpacity, TextInput, View, StyleSheet, TouchableOpacityProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Typography, Spacing } from '@/constants/DesignTokens';

interface FiltersInputBoxArrayProps extends Omit<TouchableOpacityProps, 'style'> {
  value?: any[];
  defaultValue?: any[];
  containerStyle?: object;
  inputStyle?: object;
  borderColor?: string;
  placeholderText?: string;
}

const FiltersInputBoxArray: React.FC<FiltersInputBoxArrayProps> = ({
  value = [],
  defaultValue = [],
  containerStyle,
  inputStyle,
  borderColor,
  onPress,
  placeholderText = '',
  ...touchableProps
}) => {
  // Use value if provided, otherwise use defaultValue
  const displayValue = value.length > 0 ? value : defaultValue;
  const isApplied = displayValue.length > 0;
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const defaultBorderColor = themeColors.inputBorder;

  // Format the array value for display
  const formatArrayValue = (arr: any[]): string => {
    if (!arr || arr.length === 0) return '';
    return arr.join(', ');
  };

  const resolvedBorderColor = borderColor ?? (isApplied ? themeColors.tint : defaultBorderColor);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: resolvedBorderColor,
          backgroundColor: isApplied ? themeColors.categoryBadgeBg : 'transparent',
        },
        containerStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...touchableProps}
    >
      <View style={styles.content}>
        {isApplied && <View style={[styles.leadingDot, { backgroundColor: themeColors.tint }]} />}
        <TextInput
          style={[
            styles.input,
            {
              color: isApplied ? themeColors.text : themeColors.placeholder,
              fontFamily: isApplied ? Typography.families.semiBold : Typography.families.regular,
            },
            inputStyle,
          ]}
          value={formatArrayValue(displayValue)}
          placeholder={placeholderText}
          editable={false}
          pointerEvents="none"
          placeholderTextColor={themeColors.placeholder}
        />
        {isApplied && displayValue.length > 1 && (
          <View style={[styles.countBadge, { backgroundColor: themeColors.tint }]}>
            <ThemedText style={styles.countBadgeText}>{displayValue.length}</ThemedText>
          </View>
        )}
        <IconSymbol
          name="arrow.right"
          size={22}
          color={isApplied ? themeColors.tint : themeColors.text}
          style={styles.icon}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 8,
    marginVertical: Spacing.sm,
    height: 44,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    height: '100%',
  },
  leadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    padding: 0,
    margin: 0,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  countBadgeText: {
    fontFamily: Typography.families.bold,
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  icon: {
    marginLeft: Spacing.sm,
  },
});

export default FiltersInputBoxArray;
