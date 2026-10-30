import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

interface FormDateFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  hasError?: boolean;
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
  minDate,
  otherStyles,
  testID,
  allDayLabel,
  allDayHint,
  pickerMode = 'datetime',
  timeZoneName,
  formatValue,
}: FormDateFieldProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const initialDate = safeParseDate(value);
  const [date, setDate] = useState<Date>(initialDate);

  // An edit screen fills the form in after this field mounts: the picker has to open
  // on that value, not on the moment the field appeared.
  useEffect(() => {
    if (value) setDate(safeParseDate(value));
  }, [value]);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // iOS: keep the picker open during intermediate selection steps. Only push
  // the value up and close on explicit 'set' / 'dismissed' events.
  const handleIOSChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      const currentDate = selectedDate;
      currentDate.setSeconds(0, 0);
      setDate(currentDate);

      if (event.type === 'dismissed') {
        setShowDatePicker(false);
      } else if (event.type === 'set') {
        handleChangeText(currentDate.toISOString());
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
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
            handleChangeText(currentDate.toISOString());
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
            handleChangeText(selectedTime.toISOString());
            return;
          }

          const newDate = new Date(currentDate);
          newDate.setHours(selectedTime.getHours());
          newDate.setMinutes(selectedTime.getMinutes());
          newDate.setSeconds(0, 0);

          setDate(newDate);
          handleChangeText(newDate.toISOString());
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
        setShowDatePicker(false);
      } else {
        setShowDatePicker(true);
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
        accessibilityRole="button"
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
            hasError && styles.errorField,
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
          <IconSymbol size={24} name="calendar" color={themeColors.text} />
        </ThemedView>
      </TouchableOpacity>

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
  errorField: {
    borderColor: 'red',
    borderWidth: 1,
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
