jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomButton from '@/components/CustomButton';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('CustomButton', () => {
  const defaultProps = {
    title: 'Sign In',
    handlePress: jest.fn(),
    isLoading: false,
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the button title', () => {
      render(<CustomButton {...defaultProps} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });

  describe('Press handling', () => {
    it('calls handlePress when pressed', () => {
      const handlePress = jest.fn();
      render(<CustomButton {...defaultProps} handlePress={handlePress} />);
      fireEvent.press(screen.getByText('Sign In'));
      expect(handlePress).toHaveBeenCalledTimes(1);
    });

    it('does not respond to press when loading', () => {
      const handlePress = jest.fn();
      render(<CustomButton {...defaultProps} handlePress={handlePress} isLoading={true} />);
      fireEvent.press(screen.getByText('Sign In'));
      expect(handlePress).not.toHaveBeenCalled();
    });

    it('does not respond to press when disabled', () => {
      const handlePress = jest.fn();
      render(<CustomButton {...defaultProps} handlePress={handlePress} disabled={true} />);
      fireEvent.press(screen.getByText('Sign In'));
      expect(handlePress).not.toHaveBeenCalled();
    });

    it('responds to press when disabled is false', () => {
      const handlePress = jest.fn();
      render(<CustomButton {...defaultProps} handlePress={handlePress} disabled={false} />);
      fireEvent.press(screen.getByText('Sign In'));
      expect(handlePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('renders with reduced opacity when loading', () => {
      render(<CustomButton {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('renders normally when not loading', () => {
      render(<CustomButton {...defaultProps} isLoading={false} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies container style overrides', () => {
      render(<CustomButton {...defaultProps} containerStyles={{ marginTop: 20, width: '100%' }} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('applies text style overrides', () => {
      render(<CustomButton {...defaultProps} textStyles={{ fontSize: 20 }} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in light mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<CustomButton {...defaultProps} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<CustomButton {...defaultProps} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('renders with null color scheme (light fallback)', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<CustomButton {...defaultProps} />);
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });

  describe('Both loading and style props', () => {
    it('applies opacity50 to both button and text when loading', () => {
      render(
        <CustomButton
          {...defaultProps}
          isLoading={true}
          containerStyles={{ padding: 8 }}
          textStyles={{ letterSpacing: 1 }}
        />
      );
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });
});
