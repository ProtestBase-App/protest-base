jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { RemovableChip } from '@/components/RemovableChip';
import * as Haptics from 'expo-haptics';

describe('RemovableChip', () => {
  const defaultProps = {
    label: 'Brussels',
    value: 'brussels',
    onRemove: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Rendering', () => {
    it('renders the label text', () => {
      render(<RemovableChip {...defaultProps} />);
      expect(screen.getByText('Brussels')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      render(<RemovableChip {...defaultProps} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('sets default accessibility label', () => {
      render(<RemovableChip {...defaultProps} />);
      expect(screen.getByLabelText('Remove Brussels from selection')).toBeTruthy();
    });

    it('uses custom accessibility context', () => {
      render(<RemovableChip {...defaultProps} accessibilityContext="co-organizers" />);
      expect(screen.getByLabelText('Remove Brussels from co-organizers')).toBeTruthy();
    });
  });

  describe('Removal', () => {
    it('calls onRemove with value when pressed', () => {
      const onRemove = jest.fn();
      render(<RemovableChip {...defaultProps} onRemove={onRemove} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onRemove).toHaveBeenCalledWith('brussels');
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback on press', () => {
      render(<RemovableChip {...defaultProps} />);
      fireEvent.press(screen.getByRole('button'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Disabled state', () => {
    it('is not disabled by default', () => {
      render(<RemovableChip {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('does not respond to press when disabled', () => {
      const onRemove = jest.fn();
      render(<RemovableChip {...defaultProps} onRemove={onRemove} disabled />);
      fireEvent.press(screen.getByRole('button'));
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('Default accessibility context', () => {
    it('uses "selection" when accessibilityContext is undefined', () => {
      render(<RemovableChip {...defaultProps} />);
      expect(screen.getByLabelText('Remove Brussels from selection')).toBeTruthy();
    });

    it('uses custom accessibilityContext string', () => {
      render(<RemovableChip {...defaultProps} accessibilityContext="filters" />);
      expect(screen.getByLabelText('Remove Brussels from filters')).toBeTruthy();
    });
  });

  describe('Long label truncation', () => {
    it('renders with a very long label without crashing', () => {
      render(
        <RemovableChip
          label="Very long organization name that might overflow the chip container"
          value="long-org"
          onRemove={jest.fn()}
        />
      );
      expect(
        screen.getByText('Very long organization name that might overflow the chip container')
      ).toBeTruthy();
    });
  });

  describe('Dark mode', () => {
    it('renders correctly in dark mode (covers isDark=true color branches)', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<RemovableChip {...defaultProps} />);
      expect(screen.getByText('Brussels')).toBeTruthy();
    });

    it('renders disabled chip in dark mode', () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      render(<RemovableChip {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });
});
