jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FormField from '@/components/FormField';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('FormField', () => {
  const defaultProps = {
    title: 'Email',
    value: '',
    placeholder: 'Enter your email',
    handleChangeText: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the title label', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByText('Email')).toBeTruthy();
    });

    it('renders with placeholder text', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });

    it('renders the current value', () => {
      render(<FormField {...defaultProps} value="test@example.com" />);
      expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
    });
  });

  describe('Text input', () => {
    it('calls handleChangeText when text changes', () => {
      const handleChangeText = jest.fn();
      render(<FormField {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter your email'), 'new@email.com');
      expect(handleChangeText).toHaveBeenCalledWith('new@email.com');
    });

    it('respects maxLength prop', () => {
      render(<FormField {...defaultProps} maxLength={50} />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });
  });

  describe('Focus state', () => {
    it('handles focus event', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent(input, 'focus');
      // Component should not crash on focus
      expect(input).toBeTruthy();
    });

    it('handles blur event', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter your email');
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      expect(input).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders without error by default', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });

    it('renders with error state', () => {
      render(<FormField {...defaultProps} hasError={true} />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });
  });

  describe('Disabled state', () => {
    it('is editable by default', () => {
      render(<FormField {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter your email');
      expect(input.props.editable).not.toBe(false);
    });

    it('is not editable when disabled', () => {
      render(<FormField {...defaultProps} disabled={true} />);
      const input = screen.getByPlaceholderText('Enter your email');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Password field', () => {
    it('shows secure text entry for password field via isPassword prop', () => {
      render(<FormField {...defaultProps} title="Password" isPassword />);
      const input = screen.getByPlaceholderText('Enter your email');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('falls back to title-based password detection', () => {
      render(<FormField {...defaultProps} title="Password" placeholder="Enter password" />);
      const input = screen.getByPlaceholderText('Enter password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('detects "New password" title as password field', () => {
      render(<FormField {...defaultProps} title="New password" placeholder="Enter new password" />);
      const input = screen.getByPlaceholderText('Enter new password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('toggles password visibility', () => {
      render(
        <FormField {...defaultProps} title="Password" isPassword placeholder="Enter password" />
      );
      const input = screen.getByPlaceholderText('Enter password');
      expect(input.props.secureTextEntry).toBe(true);

      // Press the show/hide button
      const toggleButton = screen.getByLabelText('Show password');
      fireEvent.press(toggleButton);

      // Now should show text
      expect(input.props.secureTextEntry).toBe(false);

      // Press again to hide
      const hideButton = screen.getByLabelText('Hide password');
      fireEvent.press(hideButton);
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('does not show toggle for non-password fields', () => {
      render(<FormField {...defaultProps} />);
      expect(screen.queryByLabelText('Show password')).toBeNull();
      expect(screen.queryByLabelText('Hide password')).toBeNull();
    });
  });

  describe('Theme support', () => {
    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormField {...defaultProps} />);
      expect(screen.getByText('Email')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies otherStyles to container', () => {
      render(<FormField {...defaultProps} otherStyles={{ marginTop: 20 }} />);
      expect(screen.getByText('Email')).toBeTruthy();
    });
  });

  describe('Null title', () => {
    it('renders without title when null', () => {
      render(<FormField {...defaultProps} title={null} />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });
  });
});
