jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterChip } from '@/components/ui/FilterChip';

describe('FilterChip', () => {
  const defaultProps = {
    label: 'Climate',
    onPress: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the label text', () => {
      render(<FilterChip {...defaultProps} />);
      expect(screen.getByText('Climate')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      render(<FilterChip {...defaultProps} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('uses the label as default accessibility label', () => {
      render(<FilterChip {...defaultProps} />);
      expect(screen.getByLabelText('Climate')).toBeTruthy();
    });

    it('prefers a custom accessibility label when provided', () => {
      render(<FilterChip {...defaultProps} accessibilityLabel="Remove Climate" />);
      expect(screen.getByLabelText('Remove Climate')).toBeTruthy();
    });
  });

  describe('Press handling', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<FilterChip {...defaultProps} onPress={onPress} />);

      fireEvent.press(screen.getByRole('button'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(<FilterChip {...defaultProps} onPress={onPress} disabled />);

      fireEvent.press(screen.getByRole('button'));

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility state', () => {
    it('reports selected=true when active', () => {
      render(<FilterChip {...defaultProps} active />);

      const chip = screen.getByRole('button');
      expect(chip.props.accessibilityState.selected).toBe(true);
    });

    it('reports selected=false when inactive', () => {
      render(<FilterChip {...defaultProps} />);

      const chip = screen.getByRole('button');
      expect(chip.props.accessibilityState.selected).toBe(false);
    });

    it('reports disabled state', () => {
      render(<FilterChip {...defaultProps} disabled />);

      const chip = screen.getByRole('button');
      expect(chip.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Removable variant', () => {
    it('renders a trailing xmark icon without crashing', () => {
      const { UNSAFE_getAllByProps } = render(<FilterChip {...defaultProps} removable />);

      // IconSymbol receives the SF Symbol name 'xmark' for the trailing icon.
      expect(UNSAFE_getAllByProps({ name: 'xmark' }).length).toBeGreaterThan(0);
      expect(screen.getByText('Climate')).toBeTruthy();
    });

    it('does not render the xmark icon when not removable', () => {
      const { UNSAFE_queryAllByProps } = render(<FilterChip {...defaultProps} />);

      expect(UNSAFE_queryAllByProps({ name: 'xmark' })).toHaveLength(0);
    });
  });
});
