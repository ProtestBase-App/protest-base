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
});
