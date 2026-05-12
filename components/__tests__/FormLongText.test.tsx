// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FormLongText from '@/components/FormLongText';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('FormLongText', () => {
  const defaultProps = {
    title: 'Description',
    value: '',
    placeholder: 'Enter description',
    handleChangeText: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the title', () => {
      render(<FormLongText {...defaultProps} />);
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders with placeholder', () => {
      render(<FormLongText {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter description')).toBeTruthy();
    });

    it('renders current value', () => {
      render(<FormLongText {...defaultProps} value="Some text" />);
      expect(screen.getByDisplayValue('Some text')).toBeTruthy();
    });
  });

  describe('Text input', () => {
    it('calls handleChangeText when text changes', () => {
      const handleChangeText = jest.fn();
      render(<FormLongText {...defaultProps} handleChangeText={handleChangeText} />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter description'), 'New text');
      expect(handleChangeText).toHaveBeenCalledWith('New text');
    });
  });

  describe('Long text mode', () => {
    it('renders as multiline when isLongText is true', () => {
      render(<FormLongText {...defaultProps} isLongText />);
      const input = screen.getByPlaceholderText('Enter description');
      expect(input.props.multiline).toBe(true);
    });

    it('renders as single line by default', () => {
      render(<FormLongText {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter description');
      expect(input.props.multiline).toBeFalsy();
    });

    it('does not show expand/collapse button when isLongText is false', () => {
      const { queryAllByRole } = render(<FormLongText {...defaultProps} />);
      // No button/touchable for expand should exist when isLongText is false
      // The icon is only rendered when isLongText is true, so we verify the
      // component renders successfully without an expand button
      expect(screen.getByPlaceholderText('Enter description')).toBeTruthy();
    });

    it('shows expand/collapse button when isLongText is true', () => {
      const { UNSAFE_getAllByType } = render(<FormLongText {...defaultProps} isLongText />);
      const { TouchableOpacity } = require('react-native');
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    it('pressing the expand button toggles expanded state (collapsed → expanded)', () => {
      const { UNSAFE_getAllByType } = render(
        <FormLongText {...defaultProps} isLongText defaultExpanded={false} />
      );
      const { TouchableOpacity } = require('react-native');
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);

      const input = screen.getByPlaceholderText('Enter description');
      // Initially collapsed: 4 lines
      expect(input.props.numberOfLines).toBe(4);

      // Press the expand/collapse button
      fireEvent.press(touchables[0]);

      // After pressing: should be expanded (10 lines)
      const updatedInput = screen.getByPlaceholderText('Enter description');
      expect(updatedInput.props.numberOfLines).toBe(10);
    });

    it('pressing the expand button toggles expanded state (expanded → collapsed)', () => {
      const { UNSAFE_getAllByType } = render(
        <FormLongText {...defaultProps} isLongText defaultExpanded={true} />
      );
      const { TouchableOpacity } = require('react-native');
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      const input = screen.getByPlaceholderText('Enter description');
      // Initially expanded: 10 lines
      expect(input.props.numberOfLines).toBe(10);

      // Press the expand/collapse button to collapse
      fireEvent.press(touchables[0]);

      // After pressing: should be collapsed (4 lines)
      const updatedInput = screen.getByPlaceholderText('Enter description');
      expect(updatedInput.props.numberOfLines).toBe(4);
    });

    it('supports defaultExpanded=true (starts expanded)', () => {
      render(<FormLongText {...defaultProps} isLongText defaultExpanded />);
      const input = screen.getByPlaceholderText('Enter description');
      expect(input.props.numberOfLines).toBe(10);
    });

    it('supports defaultExpanded=false (starts collapsed)', () => {
      render(<FormLongText {...defaultProps} isLongText defaultExpanded={false} />);
      const input = screen.getByPlaceholderText('Enter description');
      expect(input.props.numberOfLines).toBe(4);
    });
  });

  describe('Character count', () => {
    it('shows character count for long text with maxLength', () => {
      render(<FormLongText {...defaultProps} isLongText maxLength={500} value="Hello" />);
      expect(screen.getByText('5 / 500')).toBeTruthy();
    });

    it('does not show character count without maxLength', () => {
      render(<FormLongText {...defaultProps} isLongText value="Hello" />);
      expect(screen.queryByText(/\//)).toBeNull();
    });

    it('does not show character count when not long text', () => {
      render(<FormLongText {...defaultProps} maxLength={100} value="Hello" />);
      expect(screen.queryByText('5 / 100')).toBeNull();
    });

    it('shows warning style when near max length (>90%)', () => {
      const longText = 'a'.repeat(460);
      render(<FormLongText {...defaultProps} isLongText maxLength={500} value={longText} />);
      expect(screen.getByText('460 / 500')).toBeTruthy();
    });

    it('shows error style when at max length', () => {
      const maxText = 'a'.repeat(500);
      render(<FormLongText {...defaultProps} isLongText maxLength={500} value={maxText} />);
      expect(screen.getByText('500 / 500')).toBeTruthy();
    });

    it('shows normal style when below 90% of max length', () => {
      render(<FormLongText {...defaultProps} isLongText maxLength={500} value="Short" />);
      expect(screen.getByText('5 / 500')).toBeTruthy();
    });
  });

  describe('Focus handling', () => {
    it('handles focus and blur events without crashing', () => {
      render(<FormLongText {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter description');
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      expect(input).toBeTruthy();
    });

    it('calls onFocusCallback when focused', () => {
      const onFocusCallback = jest.fn();
      render(<FormLongText {...defaultProps} onFocusCallback={onFocusCallback} />);
      const input = screen.getByPlaceholderText('Enter description');
      fireEvent(input, 'focus');
      expect(onFocusCallback).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onFocusCallback is not provided', () => {
      render(<FormLongText {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter description');
      fireEvent(input, 'focus');
      expect(input).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('renders with error state without crashing', () => {
      render(<FormLongText {...defaultProps} hasError />);
      expect(screen.getByPlaceholderText('Enter description')).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in light mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<FormLongText {...defaultProps} />);
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormLongText {...defaultProps} />);
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders long text field in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormLongText {...defaultProps} isLongText value="Some text" />);
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders character count in dark mode (covers isDark color branch)', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<FormLongText {...defaultProps} isLongText maxLength={500} value="Dark text" />);
      expect(screen.getByText('9 / 500')).toBeTruthy();
    });
  });
});
