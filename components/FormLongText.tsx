import { StyleSheet, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FormErrorText } from '@/components/ui/FormErrorText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';
import { inputAccessibilityLabel } from '@/utils/fieldAccessibility';
import { t } from '@/utils/i18n';

interface FormFieldProps extends TextInputProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: object;
  maxLength?: number;
  /** The limit the counter shows, when the input must hold more than it (older text). */
  counterLimit?: number;
  hasError?: boolean;
  /** What is wrong, shown under the field. Marks the field too. */
  errorText?: string;
  isLongText?: boolean;
  /**
   * The return key type for the keyboard.
   * Use 'next' to move to next field, 'done' for last field.
   */
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
  /**
   * Callback when the return/submit key is pressed.
   */
  onSubmitEditing?: () => void;
  /**
   * Blur the input when return/submit is pressed.
   */
  blurOnSubmit?: boolean;
  /**
   * Optional callback called when the field receives focus.
   * Used to trigger scroll behavior for fields at the bottom of forms.
   */
  onFocusCallback?: () => void;
  /**
   * Whether the field should be expanded by default.
   * Only applies when isLongText is true.
   */
  defaultExpanded?: boolean;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

export default function FormLongText({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  maxLength,
  counterLimit,
  hasError = false,
  errorText,
  isLongText = false,
  onFocusCallback,
  defaultExpanded = false,
  testID,
  accessibilityHint,
  ...props
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded); // State to manage manual expansion
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const shownLimit = counterLimit ?? maxLength;

  return (
    <ThemedView style={[styles.themedview1, otherStyles]}>
      <ThemedText style={styles.themedtext1}>{title}</ThemedText>
      <ThemedView
        style={[
          styles.themedview2,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.inputBorder,
          },
          isFocused && styles.focused,
          isLongText && styles.longTextContainer,
          (hasError || !!errorText) && { borderColor: themeColors.errorText },
        ]}
      >
        <TextInput
          testID={testID}
          style={[
            styles.textInput,
            isDark ? styles.textInputDark : styles.textInputLight,
            { fontFamily: value ? Typography.families.semiBold : Typography.families.regular },
            isLongText && styles.longTextInput,
            isExpanded && styles.expandedTextInput, // Apply expanded styles if needed
          ]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          onChangeText={handleChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocusCallback?.();
          }}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          multiline={isLongText} // Enable multiline for long text
          numberOfLines={isLongText ? (isExpanded ? 10 : 4) : 1} // Control the number of lines
          accessibilityLabel={inputAccessibilityLabel(title, errorText)}
          accessibilityHint={accessibilityHint}
          {...props}
        />

        {isLongText && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? t('a11y.collapseField') : t('a11y.expandField')}
            accessibilityHint={t('a11y.hints.resizeField')}
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.icon}
          >
            <IconSymbol
              size={16}
              name={
                isExpanded
                  ? 'arrow.down.right.and.arrow.up.left'
                  : 'arrow.up.left.and.arrow.down.right'
              }
              color={themeColors.text}
            />
          </TouchableOpacity>
        )}
      </ThemedView>
      {errorText ? <FormErrorText message={errorText} /> : null}
      {/* Character count display for long text fields */}
      {isLongText && shownLimit && (
        <ThemedView style={styles.charCountContainer}>
          <ThemedText
            style={[
              styles.charCountText,
              { color: themeColors.secondaryText },
              value.length > shownLimit * 0.9 && styles.charCountWarning,
              value.length >= shownLimit && styles.charCountError,
            ]}
          >
            {value.length.toLocaleString()} / {shownLimit.toLocaleString()}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  themedview1: {
    marginBottom: 8,
  },
  themedtext1: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginBottom: 8,
  },
  themedview2: {
    width: '100%',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focused: {
    borderColor: '#F5A4B1',
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    padding: 4,
    marginRight: 6,
  },
  textInputLight: {
    color: Colors.light.text,
  },
  textInputDark: {
    color: Colors.dark.text,
  },
  longTextContainer: {
    height: 'auto',
    minHeight: 56,
  },
  longTextInput: {
    height: 'auto',
    textAlignVertical: 'top',
  },
  expandedTextInput: {
    height: 200,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
    paddingRight: 4,
  },
  charCountText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountError: {
    color: '#EF4444',
  },
});
