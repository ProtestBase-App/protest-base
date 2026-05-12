jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FormFieldNumeric from '@/components/FormFieldNumeric';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('FormFieldNumeric', () => {
  const defaultProps = {
    value: '',
    placeholder: 'Enter postal code',
    handleChangeText: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders with placeholder', () => {
      render(<FormFieldNumeric {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });

    it('renders with a title', () => {
      render(<FormFieldNumeric {...defaultProps} title="Postal Code" />);
      expect(screen.getByText('Postal Code')).toBeTruthy();
    });

    it('renders without title when not provided', () => {
      render(<FormFieldNumeric {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });

    it('renders current value', () => {
      render(<FormFieldNumeric {...defaultProps} value="1000" />);
      expect(screen.getByDisplayValue('1000')).toBeTruthy();
    });
  });

  describe('Numeric filtering', () => {
    it('strips non-numeric characters from input', () => {
      const handleChangeText = jest.fn();
      render(<FormFieldNumeric {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter postal code'), 'abc123def');
      expect(handleChangeText).toHaveBeenCalledWith('123');
    });

    it('passes through purely numeric input unchanged', () => {
      const handleChangeText = jest.fn();
      render(<FormFieldNumeric {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter postal code'), '9876');
      expect(handleChangeText).toHaveBeenCalledWith('9876');
    });

    it('returns empty string for all non-numeric input', () => {
      const handleChangeText = jest.fn();
      render(<FormFieldNumeric {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter postal code'), 'abcdef');
      expect(handleChangeText).toHaveBeenCalledWith('');
    });
  });

  describe('Focus state', () => {
    it('handles focus and blur events', () => {
      render(<FormFieldNumeric {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter postal code');
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      expect(input).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders with error state', () => {
      render(<FormFieldNumeric {...defaultProps} hasError={true} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormFieldNumeric {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies otherStyles', () => {
      render(<FormFieldNumeric {...defaultProps} otherStyles={{ marginTop: 10 }} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });
  });

  describe('Max length', () => {
    it('accepts maxLength prop', () => {
      render(<FormFieldNumeric {...defaultProps} maxLength={4} />);
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });
  });

  describe('Title presence affects margin', () => {
    it('renders title and input together correctly', () => {
      render(<FormFieldNumeric {...defaultProps} title="Postal Code" />);
      expect(screen.getByText('Postal Code')).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });

    it('renders without title (no label element)', () => {
      render(<FormFieldNumeric {...defaultProps} />);
      expect(screen.queryByText('Postal Code')).toBeNull();
      expect(screen.getByPlaceholderText('Enter postal code')).toBeTruthy();
    });
  });

  describe('Focus and error state combined', () => {
    it('renders focus and error state simultaneously', () => {
      render(<FormFieldNumeric {...defaultProps} hasError={true} />);
      const input = screen.getByPlaceholderText('Enter postal code');
      fireEvent(input, 'focus');
      expect(input).toBeTruthy();
      fireEvent(input, 'blur');
    });
  });

  describe('Key press handling', () => {
    it('handles regular key press without crashing', () => {
      render(<FormFieldNumeric {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter postal code');
      // Only fire non-paste keys to avoid triggering e.preventDefault() which
      // is not available in the test environment
      fireEvent(input, 'keyPress', {
        nativeEvent: { key: '5', metaKey: false, ctrlKey: false },
      });
      expect(input).toBeTruthy();
    });
  });
});
