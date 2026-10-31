import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  type TextInputProps,
  type TextInstance,
} from 'react-native';
import { useState, type Ref } from 'react';
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
  title: string | null;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  maxLength?: number;
  hasError?: boolean;
  /** What is wrong, shown under the field. Marks the field too. */
  errorText?: string;
  /** 'title' is the large, boxless field at the top of the event form. */
  variant?: 'boxed' | 'title';
  disabled?: boolean;
  otherStyles?: object;
  /**
   * Explicitly mark this field as a password field.
   * When true, enables secure text entry and shows the show/hide password toggle.
   * Use this instead of relying on title string matching for i18n compatibility.
   */
  isPassword?: boolean;
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
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
  /** For a screen reader to land on the label. */
  labelRef?: Ref<TextInstance>;
}

export default function FormField({
  title,
  value,
  placeholder,
  handleChangeText,
  maxLength,
  hasError = false,
  errorText,
  variant = 'boxed',
  disabled = false,
  otherStyles,
  isPassword,
  testID,
  labelRef,
  accessibilityHint,
  ...props
}: FormFieldProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Determine if this is a password field:
  // 1. Explicit isPassword prop takes precedence
  // 2. Fall back to legacy string matching for backward compatibility (will be removed in future)
  const isPasswordField = isPassword ?? (title === 'Password' || title === 'New password');
  const isTitle = variant === 'title';

  return (
    <ThemedView style={[!isTitle && styles.themedview1, otherStyles]}>
      <ThemedText
        ref={labelRef}
        style={
          isTitle ? [styles.titleLabel, { color: themeColors.secondaryText }] : styles.themedtext1
        }
      >
        {title}
      </ThemedText>
      <ThemedView
        style={
          isTitle
            ? styles.titleBox
            : [
                styles.themedview2,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.inputBorder,
                },
                isFocused && styles.focused,
                (hasError || !!errorText) && { borderColor: themeColors.errorText },
              ]
        }
      >
        <TextInput
          testID={testID}
          style={[
            styles.textInput,
            isDark ? styles.textInputDark : styles.textInputLight,
            { fontFamily: value ? Typography.families.semiBold : Typography.families.regular },
            isTitle && styles.titleInput,
          ]}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          onChangeText={handleChangeText}
          secureTextEntry={isPasswordField && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          editable={!disabled}
          multiline={isTitle}
          scrollEnabled={!isTitle}
          submitBehavior={isTitle ? 'blurAndSubmit' : undefined}
          returnKeyType={isTitle ? 'done' : undefined}
          accessibilityLabel={inputAccessibilityLabel(title, errorText)}
          accessibilityHint={accessibilityHint}
          {...props}
        />

        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityHint={t('a11y.hints.togglePassword')}
          >
            <IconSymbol
              size={28}
              name={showPassword ? 'eye.fill' : 'eye'}
              color={themeColors.text}
            />
          </TouchableOpacity>
        )}
      </ThemedView>
      {errorText ? <FormErrorText message={errorText} /> : null}
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
  },
  titleLabel: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
  titleBox: {
    minHeight: 44,
    justifyContent: 'center',
  },
  titleInput: {
    flex: 0,
    padding: 0,
    textAlignVertical: 'center',
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.families.bold,
  },
  textInputLight: {
    color: Colors.light.text,
  },
  textInputDark: {
    color: Colors.dark.text,
  },
});
