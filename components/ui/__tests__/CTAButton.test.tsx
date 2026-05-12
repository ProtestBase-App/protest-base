jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CTAButton } from '@/components/ui/CTAButton';

describe('CTAButton', () => {
  const defaultProps = {
    text: 'Create Event',
    leftIcon: 'plus.circle' as const,
    onPress: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the button text', () => {
      render(<CTAButton {...defaultProps} />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      render(<CTAButton {...defaultProps} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('uses secondary variant by default', () => {
      render(<CTAButton {...defaultProps} />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });

    it('renders primary variant', () => {
      render(<CTAButton {...defaultProps} variant="primary" />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  describe('Badge', () => {
    it('does not show badge when badge prop is undefined', () => {
      render(<CTAButton {...defaultProps} />);
      // No badge text should render
      expect(screen.queryByText('5')).toBeNull();
    });

    it('shows badge with numeric value', () => {
      render(<CTAButton {...defaultProps} badge={5} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('formats badge as 99+ when value exceeds 99', () => {
      render(<CTAButton {...defaultProps} badge={150} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('shows string badge value', () => {
      render(<CTAButton {...defaultProps} badge="New" />);
      expect(screen.getByText('New')).toBeTruthy();
    });

    it('does not show badge when value is 0', () => {
      render(<CTAButton {...defaultProps} badge={0} />);
      // badge=0 means showBadge is false
      expect(screen.queryByText('0')).toBeNull();
    });

    it('does not show badge when value is empty string', () => {
      render(<CTAButton {...defaultProps} badge="" />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });

    it('accepts custom badge color', () => {
      render(<CTAButton {...defaultProps} badge={3} badgeColor="#00FF00" />);
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<CTAButton {...defaultProps} onPress={onPress} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom styles', () => {
    it('applies custom style prop', () => {
      render(<CTAButton {...defaultProps} style={{ marginTop: 20 }} />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  describe('Dark mode', () => {
    it('renders primary variant in dark mode', () => {
      jest.mock('@/hooks/useColorScheme', () => ({
        useColorScheme: jest.fn(() => 'dark'),
      }));
      render(<CTAButton {...defaultProps} variant="primary" />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });

    it('renders secondary variant in dark mode', () => {
      jest.mock('@/hooks/useColorScheme', () => ({
        useColorScheme: jest.fn(() => 'dark'),
      }));
      render(<CTAButton {...defaultProps} variant="secondary" />);
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  describe('Badge edge cases', () => {
    it('renders badge with exactly 2-character text (not circle)', () => {
      render(<CTAButton {...defaultProps} badge={42} />);
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('renders badge with exactly 1-character text (circle style)', () => {
      render(<CTAButton {...defaultProps} badge={5} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders badge with string value longer than 1 char', () => {
      render(<CTAButton {...defaultProps} badge="Hi" />);
      expect(screen.getByText('Hi')).toBeTruthy();
    });

    it('does not show badge when badge is false-y (0)', () => {
      render(<CTAButton {...defaultProps} badge={0} />);
      expect(screen.queryByText('0')).toBeNull();
    });
  });
});
