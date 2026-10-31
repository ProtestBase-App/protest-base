import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  type TouchableOpacityInstance,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FormErrorText } from '@/components/ui/FormErrorText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFocusOnChange } from '@/hooks/useOverlayFocus';
import { Colors } from '@/constants/Colors';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';
import { fieldAccessibilityLabel } from '@/utils/fieldAccessibility';
import { t } from '@/utils/i18n';

interface FormDateFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  hasError?: boolean;
  /** What is wrong, shown under the field. Marks the field too. */
  errorText?: string;
  /** Earliest pickable date. A time-only field has no use for it. */
  minDate?: Date;
  otherStyles?: object;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
  /** Pick a date and a time (the default), or only one of them. */
  pickerMode?: 'datetime' | 'date' | 'time';
  /** IANA zone the picker works in, instead of the device's. */
  timeZoneName?: string;
  /** The text for the value, when the device-local date and time would be wrong for it. */
  formatValue?: (value: string) => string;
  /**
   * Localised "All day". When passed it replaces the clock time in the field —
   * a date-only event has no time to show. The caller decides when that is
   * true, because the answer depends on the START value (still at Brussels
   * midnight?) while this field may be the end, which sits at 23:59:59.999.
   */
  allDayLabel?: string;
  /** Localised explanation shown under the field while `allDayLabel` is active. */
  allDayHint?: string;
  /** Where the picker opens while the field is empty, instead of now. */
  openAt?: string;
  /** The inline iOS picker opened or closed. It needs the full width. */
  onPickerToggle?: (open: boolean) => void;
}

/**
 * Device-local, deliberately: the picker below this field produces and consumes
 * device-local dates, so formatting only the display in Brussels would desync
 * the digits from the wheel the user is turning. On a non-Belgian device the
 * date shown can therefore be off by a day — pre-existing for timed events and
 * unchanged here.
 */
function formatDateForDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

/** Safely parse a date string, returning a valid Date or the fallback. */
function safeParseDate(dateString: string | undefined, fallback: Date = new Date()): Date {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

export default function FormDateField({
  title,
  value,
  placeholder,
  handleChangeText,
  hasError = false,
  errorText,
  minDate,
  otherStyles,
  testID,
  allDayLabel,
  allDayHint,
  pickerMode = 'datetime',
  timeZoneName,
  formatValue,
  openAt,
  onPickerToggle,
}: FormDateFieldProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const [date, setDate] = useState<Date>(safeParseDate(value || openAt));

  // An edit screen fills the form in after this field mounts: the picker has to open
  // on that value, not on the moment the field appeared.
  useEffect(() => {
    const shown = value || openAt;
    if (shown) setDate(safeParseDate(shown));
  }, [value, openAt]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  // Clearing an error reflows the form as the Android dialog closes, and TalkBack loses the
  // field. Without one it finds the field itself, and a second focus would read it twice.
  const fieldRef = useRef<TouchableOpacityInstance>(null);
  const [errorsCleared, setErrorsCleared] = useState(0);
  useFocusOnChange(errorsCleared || null, fieldRef);

  const commitFromDialog = (iso: string) => {
    handleChangeText(iso);
    if (errorText) setErrorsCleared((count) => count + 1);
  };

  const togglePicker = (open: boolean) => {
    setShowDatePicker(open);
    onPickerToggle?.(open);
  };

  // iOS: keep the picker open during intermediate selection steps. Only push
  // the value up and close on explicit 'set' / 'dismissed' events.
  const handleIOSChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      const currentDate = selectedDate;
      currentDate.setSeconds(0, 0);
      setDate(currentDate);

      if (event.type === 'dismissed') {
        togglePicker(false);
      } else if (event.type === 'set') {
        handleChangeText(currentDate.toISOString());
      }
    } else if (event.type === 'dismissed') {
      togglePicker(false);
    }
  };

  // Android uses the imperative DateTimePickerAndroid API.
  const showAndroidDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === 'set' && selectedDate) {
          const currentDate = new Date(selectedDate);
          setDate(currentDate);

          if (pickerMode === 'date') {
            commitFromDialog(currentDate.toISOString());
          } else {
            showAndroidTimePicker(currentDate);
          }
        }
      },
      mode: 'date',
      display: 'default',
      minimumDate: minDate,
      timeZoneName,
    });
  };

  const showAndroidTimePicker = (currentDate: Date) => {
    DateTimePickerAndroid.open({
      value: currentDate,
      onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
          // A time-only field runs in a named zone: the instant is the answer, and
          // the local getters below would read the device's clock instead.
          if (pickerMode === 'time') {
            setDate(selectedTime);
            commitFromDialog(selectedTime.toISOString());
            return;
          }

          const newDate = new Date(currentDate);
          newDate.setHours(selectedTime.getHours());
          newDate.setMinutes(selectedTime.getMinutes());
          newDate.setSeconds(0, 0);

          setDate(newDate);
          commitFromDialog(newDate.toISOString());
        }
      },
      mode: 'time',
      display: 'default',
      timeZoneName,
      // A time-only field holds a rule's HH:MM, shown in 24 hours everywhere else.
      is24Hour: pickerMode === 'time',
    });
  };

  const handleInputPress = () => {
    if (Platform.OS === 'android') {
      if (pickerMode === 'time') {
        showAndroidTimePicker(date);
      } else {
        showAndroidDatePicker();
      }
    } else {
      // iOS: toggle the picker. If it's already open, treat tap as "Done".
      if (showDatePicker) {
        handleChangeText(date.toISOString());
        togglePicker(false);
      } else {
        togglePicker(true);
        // The wheel already shows a time, and it is one turn away from being sent.
        if (pickerMode === 'time' && !value) handleChangeText(date.toISOString());
      }
    }

    setIsFocused(!isFocused);
  };

  const showingAllDay = !!allDayLabel && !!value;

  let displayValue = '';
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      if (formatValue) {
        displayValue = formatValue(value);
      } else {
        displayValue = showingAllDay
          ? `${formatDateForDisplay(parsed).split(' - ')[0]} - ${allDayLabel}`
          : formatDateForDisplay(parsed);
      }
    }
  }

  return (
    <ThemedView style={[styles.container, otherStyles]}>
      <ThemedText style={styles.label}>{title}</ThemedText>

      <TouchableOpacity
        ref={fieldRef}
        accessibilityRole="button"
        accessibilityLabel={[fieldAccessibilityLabel(title, errorText), displayValue]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={
          pickerMode === 'time' ? t('a11y.hints.pickTime') : t('a11y.hints.pickDate')
        }
        testID={testID}
        onPress={handleInputPress}
        activeOpacity={0.8}
      >
        <ThemedView
          style={[
            styles.inputWrapper,
            {
              backgroundColor: themeColors.cardBackground,
              borderColor: themeColors.inputBorder,
            },
            isFocused && styles.focused,
            (hasError || !!errorText) && { borderColor: themeColors.errorText },
          ]}
        >
          <TextInput
            accessibilityRole="none"
            style={[
              styles.textInput,
              isDark ? styles.textInputDark : styles.textInputLight,
              {
                fontFamily: displayValue
                  ? Typography.families.semiBold
                  : Typography.families.regular,
              },
            ]}
            value={displayValue}
            placeholder={placeholder}
            placeholderTextColor={themeColors.placeholder}
            editable={false}
            pointerEvents="none"
          />
          <IconSymbol
            size={24}
            name={pickerMode === 'time' ? 'clock' : 'calendar'}
            color={themeColors.text}
          />
        </ThemedView>
      </TouchableOpacity>

      {errorText ? <FormErrorText message={errorText} /> : null}

      {showingAllDay && !!allDayHint && (
        <ThemedText style={[styles.hint, { color: themeColors.subtleText }]}>
          {allDayHint}
        </ThemedText>
      )}

      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={date}
          mode={pickerMode}
          display={pickerMode === 'time' ? 'spinner' : 'inline'}
          onChange={handleIOSChange}
          minimumDate={minDate}
          timeZoneName={timeZoneName}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginBottom: 8,
  },
  inputWrapper: {
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
  textInputLight: {
    color: Colors.light.text,
  },
  textInputDark: {
    color: Colors.dark.text,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: 6,
  },
});
