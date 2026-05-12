import { StyleSheet, TextInput } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

interface FormFieldNumericProps {
  title?: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: object;
  hasError?: boolean;
  maxLength?: number;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
  [key: string]: any;
}

export default function FormFieldNumeric({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  hasError = false,
  maxLength,
  testID,
  ...props
}: FormFieldNumericProps) {
  const [isFocused, setIsFocused] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const fieldMargin = title ? 8 : 0;

  const handleTextChange = (text: string) => {
    // Replace any non-numeric characters with an empty space
    const numericText = text.replace(/[^0-9]/g, '');
    handleChangeText(numericText);
  };

  const handleKeyPress = (e: any) => {
    // Prevent paste action
    if (e.nativeEvent.key === 'v' && (e.nativeEvent.metaKey || e.nativeEvent.ctrlKey)) {
      e.preventDefault();
    }
  };

  return (
    <ThemedView style={[styles.themedview1, { marginBottom: fieldMargin }, otherStyles]}>
      {title ? <ThemedText style={styles.themedtext1}>{title}</ThemedText> : null}
      <ThemedView
        style={[
          styles.themedview2,
          { borderColor: themeColors.inputBorder },
          isFocused && styles.focused,
          hasError && styles.errorField,
        ]}
      >
        <TextInput
          testID={testID}
          style={[
            styles.textInput,
            colorScheme === 'dark' ? styles.textInputDark : styles.textInputLight,
          ]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          keyboardType="numeric"
          contextMenuHidden={true}
          onKeyPress={handleKeyPress}
          {...props}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  themedview1: {},
  themedtext1: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginBottom: 8,
  },
  themedview2: {
    width: '100%',
    height: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focused: {
    borderColor: '#F5A4B1',
  },
  errorField: {
    borderColor: 'red',
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
  },
  textInputLight: {
    color: Colors.light.text,
  },
  textInputDark: {
    color: Colors.dark.text,
  },
});
