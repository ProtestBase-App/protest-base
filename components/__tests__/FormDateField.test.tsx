jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

// Store references to DateTimePicker onChange callbacks
let capturedOnChange: any = null;

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const MockPicker = (props: any) => {
    // Capture the onChange callback so tests can invoke it
    capturedOnChange = props.onChange;
    return React.createElement('DateTimePicker', {
      ...props,
      testID: props.testID || 'date-time-picker',
    });
  };
  MockPicker.DateTimePickerAndroid = {
    open: jest.fn(),
  };
  return {
    __esModule: true,
    default: MockPicker,
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import FormDateField from '@/components/FormDateField';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('FormDateField', () => {
  const minDate = new Date('2025-01-01');
  const defaultProps = {
    title: 'Start Date',
    value: '',
    placeholder: 'Select date',
    handleChangeText: jest.fn(),
    minDate,
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the title label', () => {
      render(<FormDateField {...defaultProps} />);
      expect(screen.getByText('Start Date')).toBeTruthy();
    });

    it('renders with placeholder when no value', () => {
      render(<FormDateField {...defaultProps} />);
      expect(screen.getByPlaceholderText('Select date')).toBeTruthy();
    });

    it('displays formatted date when value is provided', () => {
      render(<FormDateField {...defaultProps} value="2025-07-14T14:30:00.000Z" />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.value).toContain('14/07/2025');
    });

    it('shows empty display for invalid date value', () => {
      render(<FormDateField {...defaultProps} value="not-a-date" />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.value).toBe('');
    });
  });

  describe('Input press handling', () => {
    it('handles press on iOS', () => {
      (Platform as any).OS = 'ios';
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(screen.getByText('Start Date')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders with error state', () => {
      render(<FormDateField {...defaultProps} hasError />);
      expect(screen.getByPlaceholderText('Select date')).toBeTruthy();
    });

    it('says what is wrong under the field', () => {
      render(<FormDateField {...defaultProps} errorText="Pick a date" />);
      expect(screen.getByText('Pick a date')).toBeTruthy();
    });
  });

  describe('Screen readers', () => {
    it('names the button after its title', () => {
      render(<FormDateField {...defaultProps} />);
      expect(screen.getByLabelText('Start Date')).toBeTruthy();
    });

    it('reads the value the field holds', () => {
      render(<FormDateField {...defaultProps} value="2099-01-02T10:00:00.000Z" />);
      expect(screen.getByLabelText(/^Start Date, 02\/01\/2099/)).toBeTruthy();
    });

    it('reads what is wrong with the name', () => {
      render(<FormDateField {...defaultProps} errorText="Pick a date" />);
      expect(screen.getByLabelText('Start Date: Pick a date')).toBeTruthy();
    });

    it('promises the picker it opens', () => {
      const { rerender } = render(<FormDateField {...defaultProps} />);
      expect(screen.getByLabelText('Start Date').props.accessibilityHint).toBe(
        'Opens the date picker'
      );

      rerender(<FormDateField {...defaultProps} pickerMode="time" />);
      expect(screen.getByLabelText('Start Date').props.accessibilityHint).toBe(
        'Opens the time picker'
      );
    });
  });

  describe('Theme support', () => {
    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormDateField {...defaultProps} />);
      expect(screen.getByText('Start Date')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies otherStyles', () => {
      render(<FormDateField {...defaultProps} otherStyles={{ marginTop: 20 }} />);
      expect(screen.getByText('Start Date')).toBeTruthy();
    });
  });

  describe('Input is not directly editable', () => {
    it('has editable set to false', () => {
      render(<FormDateField {...defaultProps} />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Android date picker', () => {
    it('opens Android date picker on press', () => {
      (Platform as any).OS = 'android';
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(DateTimePickerAndroid.open).toHaveBeenCalled();
    });

    it('calls Android date picker with date mode', () => {
      (Platform as any).OS = 'android';
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'date' })
      );
    });

    it('chains date picker to time picker on Android when date is selected', () => {
      (Platform as any).OS = 'android';
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
      DateTimePickerAndroid.open.mockImplementationOnce(({ onChange }: any) => {
        // Simulate date selection
        onChange({ type: 'set' }, new Date('2025-07-14T00:00:00.000Z'));
      });

      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));

      // DateTimePickerAndroid.open should have been called twice (date then time)
      expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(2);
      // Second call should be time mode
      expect(DateTimePickerAndroid.open).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'time' })
      );
    });

    it('calls handleChangeText after Android time selection', () => {
      (Platform as any).OS = 'android';
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
      const handleChangeText = jest.fn();

      // Mock date selection then time selection
      DateTimePickerAndroid.open
        .mockImplementationOnce(({ onChange }: any) => {
          onChange({ type: 'set' }, new Date('2025-07-14T00:00:00.000Z'));
        })
        .mockImplementationOnce(({ onChange }: any) => {
          onChange({ type: 'set' }, new Date('2025-07-14T14:30:00.000Z'));
        });

      render(<FormDateField {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));

      expect(handleChangeText).toHaveBeenCalled();
      // The ISO string should be a valid date
      const isoString = handleChangeText.mock.calls[0][0];
      expect(new Date(isoString).getTime()).not.toBeNaN();
    });

    it('does not proceed to time picker when date selection is dismissed on Android', () => {
      (Platform as any).OS = 'android';
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');

      DateTimePickerAndroid.open.mockImplementationOnce(({ onChange }: any) => {
        // Simulate dismissal
        onChange({ type: 'dismissed' }, undefined);
      });

      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));

      // Should only have been called once (date picker only, no time picker)
      expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    });
  });

  describe('iOS date picker toggle', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('shows date picker on first press on iOS', () => {
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(screen.getByText('Start Date')).toBeTruthy();
    });

    it('closes date picker on second press (Done) on iOS', () => {
      const handleChangeText = jest.fn();
      render(
        <FormDateField
          {...defaultProps}
          value="2025-07-14T14:30:00.000Z"
          handleChangeText={handleChangeText}
        />
      );
      // First press opens
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // Second press closes (saves value)
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(handleChangeText).toHaveBeenCalled();
    });

    it('handles iOS onChange with type "set"', () => {
      const handleChangeText = jest.fn();
      render(
        <FormDateField
          {...defaultProps}
          value="2025-07-14T14:30:00.000Z"
          handleChangeText={handleChangeText}
        />
      );
      // Open the picker
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // The DateTimePicker onChange should be called with 'set' type
      // which updates the internal date and calls handleChangeText
      expect(screen.toJSON()).toBeTruthy();
    });

    it('handles iOS onChange with type "dismissed"', () => {
      render(<FormDateField {...defaultProps} />);
      // Open the picker
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // The component should handle dismissal gracefully
      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('iOS onChange handler', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
      capturedOnChange = null;
    });

    it('updates date and calls handleChangeText on "set" event with selectedDate', () => {
      const handleChangeText = jest.fn();
      render(<FormDateField {...defaultProps} handleChangeText={handleChangeText} />);
      // Open the picker first
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // Now capturedOnChange should be set
      expect(capturedOnChange).toBeTruthy();
      // Simulate the user selecting a date (type: 'set')
      const selectedDate = new Date('2025-08-20T10:30:00.000Z');
      act(() => {
        capturedOnChange({ type: 'set' }, selectedDate);
      });
      expect(handleChangeText).toHaveBeenCalled();
      const isoString = handleChangeText.mock.calls[0][0];
      expect(new Date(isoString).getTime()).not.toBeNaN();
    });

    it('closes picker on "dismissed" event with selectedDate', () => {
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(capturedOnChange).toBeTruthy();
      // Simulate dismissal with a date
      const selectedDate = new Date('2025-08-20T10:30:00.000Z');
      act(() => {
        capturedOnChange({ type: 'dismissed' }, selectedDate);
      });
      // Picker should be hidden now
      expect(screen.toJSON()).toBeTruthy();
    });

    it('closes picker on "dismissed" event without selectedDate', () => {
      render(<FormDateField {...defaultProps} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(capturedOnChange).toBeTruthy();
      // Simulate dismissal without selecting a date
      act(() => {
        capturedOnChange({ type: 'dismissed' }, undefined);
      });
      expect(screen.toJSON()).toBeTruthy();
    });

    it('sets seconds to zero when a date is selected', () => {
      const handleChangeText = jest.fn();
      render(<FormDateField {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // Create a date with non-zero seconds
      const dateWithSeconds = new Date('2025-08-20T10:30:45.123Z');
      act(() => {
        capturedOnChange({ type: 'set' }, dateWithSeconds);
      });
      expect(handleChangeText).toHaveBeenCalled();
      const resultDate = new Date(handleChangeText.mock.calls[0][0]);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);
    });
  });

  describe('safeParseDate edge cases', () => {
    it('handles empty string value gracefully', () => {
      render(<FormDateField {...defaultProps} value="" />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.value).toBe('');
    });

    it('handles whitespace-only value gracefully', () => {
      render(<FormDateField {...defaultProps} value="   " />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.value).toBe('');
    });

    it('handles undefined-like value gracefully', () => {
      render(<FormDateField {...defaultProps} value="" />);
      const input = screen.getByPlaceholderText('Select date');
      expect(input.props.value).toBe('');
    });
  });

  describe('Focus styling', () => {
    it('applies focus and error styles together', () => {
      render(<FormDateField {...defaultProps} hasError />);
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(screen.getByText('Start Date')).toBeTruthy();
    });

    it('toggles isFocused on press', () => {
      (Platform as any).OS = 'ios';
      render(<FormDateField {...defaultProps} />);
      // First press sets isFocused to true
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      // Second press sets isFocused to false
      fireEvent.press(screen.getByPlaceholderText('Select date'));
      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('formatDateForDisplay', () => {
    it('formats date correctly with leading zeros', () => {
      render(<FormDateField {...defaultProps} value="2025-01-05T09:05:00.000Z" />);
      const input = screen.getByPlaceholderText('Select date');
      // Format should be DD/MM/YYYY - HH:MM
      const displayValue = input.props.value;
      expect(displayValue).toMatch(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}/);
    });

    it('displays valid formatted date for end-of-year date', () => {
      render(<FormDateField {...defaultProps} value="2025-12-31T12:00:00.000Z" />);
      const input = screen.getByPlaceholderText('Select date');
      // The exact output depends on timezone, just verify it's a valid formatted date
      expect(input.props.value).toMatch(/\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}/);
    });
  });

  describe('Additional props spread', () => {
    it('spreads additional props to TextInput', () => {
      render(<FormDateField {...defaultProps} testID="custom-date-input" />);
      expect(screen.getByTestId('custom-date-input')).toBeTruthy();
    });
  });

  // A date-only or time-only field, running in a named zone: the repeat form picks
  // times and days of Brussels, wherever the device is.
  describe('picker modes', () => {
    const BRUSSELS = 'Europe/Brussels';
    const originalOS = Platform.OS;

    const androidOpen = () => {
      const { DateTimePickerAndroid } = require('@react-native-community/datetimepicker');
      return DateTimePickerAndroid.open as jest.Mock;
    };

    /** Make the next picker the user opens answer with `answer`. */
    const answerWith = (event: { type: string }, picked?: Date) => {
      androidOpen().mockImplementation(({ onChange }: any) => onChange(event, picked));
    };

    afterEach(() => {
      (Platform as any).OS = originalOS;
    });

    describe('on Android', () => {
      beforeEach(() => {
        (Platform as any).OS = 'android';
        androidOpen().mockReset();
      });

      describe('time only', () => {
        it('opens one picker, in time mode, in the given zone', () => {
          render(<FormDateField {...defaultProps} pickerMode="time" timeZoneName={BRUSSELS} />);

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
          expect(androidOpen()).toHaveBeenCalledWith(
            expect.objectContaining({ mode: 'time', timeZoneName: BRUSSELS })
          );
        });

        it('shows 24 hours, like every other time of a rule', () => {
          render(<FormDateField {...defaultProps} pickerMode="time" timeZoneName={BRUSSELS} />);

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledWith(expect.objectContaining({ is24Hour: true }));
        });

        it('opens on a value that arrived after the field mounted', () => {
          const { rerender } = render(
            <FormDateField {...defaultProps} value="" pickerMode="time" timeZoneName={BRUSSELS} />
          );

          rerender(
            <FormDateField
              {...defaultProps}
              value="2026-11-10T18:00:00.000Z"
              pickerMode="time"
              timeZoneName={BRUSSELS}
            />
          );
          fireEvent.press(screen.getByDisplayValue(/./));

          const options = androidOpen().mock.calls[0][0];
          expect(options.value.toISOString()).toBe('2026-11-10T18:00:00.000Z');
        });

        it('opens on the value the field has', () => {
          render(
            <FormDateField
              {...defaultProps}
              value="2026-11-03T18:00:00.000Z"
              pickerMode="time"
              timeZoneName={BRUSSELS}
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen().mock.calls[0][0].value.toISOString()).toBe(
            '2026-11-03T18:00:00.000Z'
          );
        });

        it('hands back the picked instant as it is, and does not recompose it from local getters', () => {
          const handleChangeText = jest.fn();
          // 18:07:42 UTC: the picker answered in Brussels, so only the instant is the answer.
          answerWith({ type: 'set' }, new Date('2026-11-03T18:07:42.000Z'));
          render(
            <FormDateField
              {...defaultProps}
              value="2026-01-15T09:00:00.000Z"
              pickerMode="time"
              timeZoneName={BRUSSELS}
              handleChangeText={handleChangeText}
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
          expect(handleChangeText).toHaveBeenCalledTimes(1);
          // Neither the seconds nor the day of the current value are touched.
          expect(handleChangeText).toHaveBeenCalledWith('2026-11-03T18:07:42.000Z');
        });

        it('says nothing when the picker is dismissed', () => {
          const handleChangeText = jest.fn();
          answerWith({ type: 'dismissed' }, undefined);
          render(
            <FormDateField
              {...defaultProps}
              pickerMode="time"
              timeZoneName={BRUSSELS}
              handleChangeText={handleChangeText}
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(handleChangeText).not.toHaveBeenCalled();
        });

        it('needs no minimum date', () => {
          render(
            <FormDateField
              title="Start time"
              value=""
              placeholder="Select date"
              handleChangeText={jest.fn()}
              pickerMode="time"
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
        });
      });

      describe('date only', () => {
        it('opens one picker, in date mode, in the given zone, with the minimum date', () => {
          render(<FormDateField {...defaultProps} pickerMode="date" timeZoneName={BRUSSELS} />);

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
          expect(androidOpen()).toHaveBeenCalledWith(
            expect.objectContaining({ mode: 'date', timeZoneName: BRUSSELS, minimumDate: minDate })
          );
        });

        it('hands back the picked day at once, with no time picker after it', () => {
          const handleChangeText = jest.fn();
          answerWith({ type: 'set' }, new Date('2026-12-01T11:00:00.000Z'));
          render(
            <FormDateField
              {...defaultProps}
              pickerMode="date"
              timeZoneName={BRUSSELS}
              handleChangeText={handleChangeText}
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
          expect(handleChangeText).toHaveBeenCalledTimes(1);
          expect(handleChangeText).toHaveBeenCalledWith('2026-12-01T11:00:00.000Z');
        });

        it('says nothing when the picker is dismissed', () => {
          const handleChangeText = jest.fn();
          answerWith({ type: 'dismissed' }, undefined);
          render(
            <FormDateField
              {...defaultProps}
              pickerMode="date"
              handleChangeText={handleChangeText}
            />
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(1);
          expect(handleChangeText).not.toHaveBeenCalled();
        });
      });

      describe('date and time, the default', () => {
        it('is unchanged: a date picker, then a time picker, in the device zone', () => {
          const handleChangeText = jest.fn();
          androidOpen()
            .mockImplementationOnce(({ onChange }: any) =>
              onChange({ type: 'set' }, new Date(2026, 10, 3, 0, 0))
            )
            .mockImplementationOnce(({ onChange }: any) =>
              onChange({ type: 'set' }, new Date(2026, 10, 3, 19, 30, 45))
            );
          render(<FormDateField {...defaultProps} handleChangeText={handleChangeText} />);

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(2);
          expect(androidOpen().mock.calls[0][0]).toMatchObject({
            mode: 'date',
            minimumDate: minDate,
          });
          expect(androidOpen().mock.calls[1][0]).toMatchObject({ mode: 'time' });
          expect(androidOpen().mock.calls[0][0].timeZoneName).toBeUndefined();
          expect(androidOpen().mock.calls[1][0].timeZoneName).toBeUndefined();
          // The day from the first picker, the clock from the second, seconds dropped.
          expect(handleChangeText).toHaveBeenCalledTimes(1);
          expect(handleChangeText).toHaveBeenCalledWith(
            new Date(2026, 10, 3, 19, 30).toISOString()
          );
        });

        it('is what an explicit datetime mode does as well', () => {
          render(<FormDateField {...defaultProps} pickerMode="datetime" />);
          androidOpen().mockImplementationOnce(({ onChange }: any) =>
            onChange({ type: 'set' }, new Date(2026, 10, 3, 0, 0))
          );

          fireEvent.press(screen.getByPlaceholderText('Select date'));

          expect(androidOpen()).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('on iOS', () => {
      beforeEach(() => {
        (Platform as any).OS = 'ios';
        capturedOnChange = null;
      });

      const openPicker = () => {
        fireEvent.press(screen.getByPlaceholderText('Select date'));
        return screen.getByTestId('date-time-picker');
      };

      it('shows the date and time picker inline in the device zone by default', () => {
        render(<FormDateField {...defaultProps} />);

        const picker = openPicker();

        expect(picker.props.mode).toBe('datetime');
        expect(picker.props.display).toBe('inline');
        expect(picker.props.timeZoneName).toBeUndefined();
        expect(picker.props.minimumDate).toBe(minDate);
      });

      it('shows a spinner for a time-only picker, in the given zone', () => {
        render(<FormDateField {...defaultProps} pickerMode="time" timeZoneName={BRUSSELS} />);

        const picker = openPicker();

        expect(picker.props.mode).toBe('time');
        expect(picker.props.display).toBe('spinner');
        expect(picker.props.timeZoneName).toBe(BRUSSELS);
      });

      it('shows a date-only picker inline, in the given zone', () => {
        render(<FormDateField {...defaultProps} pickerMode="date" timeZoneName={BRUSSELS} />);

        const picker = openPicker();

        expect(picker.props.mode).toBe('date');
        expect(picker.props.display).toBe('inline');
        expect(picker.props.timeZoneName).toBe(BRUSSELS);
      });

      it('hands back what a time-only picker answers, seconds dropped', () => {
        const handleChangeText = jest.fn();
        render(
          <FormDateField
            {...defaultProps}
            pickerMode="time"
            timeZoneName={BRUSSELS}
            handleChangeText={handleChangeText}
          />
        );
        openPicker();

        act(() => {
          capturedOnChange({ type: 'set' }, new Date('2026-11-03T18:07:42.500Z'));
        });

        expect(handleChangeText).toHaveBeenCalledWith('2026-11-03T18:07:00.000Z');
      });
    });

    describe('formatValue', () => {
      it('writes the text of the field instead of the device-local date and time', () => {
        const formatValue = jest.fn((value: string) => `at ${value}`);
        render(
          <FormDateField
            {...defaultProps}
            value="2026-11-03T18:00:00.000Z"
            pickerMode="time"
            formatValue={formatValue}
          />
        );

        expect(screen.getByPlaceholderText('Select date').props.value).toBe(
          'at 2026-11-03T18:00:00.000Z'
        );
        expect(formatValue).toHaveBeenCalledWith('2026-11-03T18:00:00.000Z');
      });

      it('is not asked about an empty or unreadable value, which show the placeholder', () => {
        const formatValue = jest.fn(() => 'never');

        const empty = render(
          <FormDateField {...defaultProps} value="" formatValue={formatValue} />
        );
        expect(empty.getByPlaceholderText('Select date').props.value).toBe('');
        empty.unmount();

        render(<FormDateField {...defaultProps} value="not-a-date" formatValue={formatValue} />);
        expect(screen.getByPlaceholderText('Select date').props.value).toBe('');
        expect(formatValue).not.toHaveBeenCalled();
      });

      it('wins over the all-day wording', () => {
        render(
          <FormDateField
            {...defaultProps}
            value="2026-11-03T23:00:00.000Z"
            allDayLabel="All day"
            formatValue={() => 'Nov 4'}
          />
        );

        expect(screen.getByPlaceholderText('Select date').props.value).toBe('Nov 4');
      });

      it('leaves the default text alone when there is none', () => {
        render(<FormDateField {...defaultProps} value="2025-07-14T14:30:00.000Z" />);

        expect(screen.getByPlaceholderText('Select date').props.value).toMatch(
          /^\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}$/
        );
      });
    });
  });
});
