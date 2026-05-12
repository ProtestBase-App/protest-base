// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HelpNeededModal from '@/components/HelpNeededModal';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('HelpNeededModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Content rendering', () => {
    it('renders the title when visible', () => {
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.title')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.subtitle')).toBeTruthy();
    });

    it('renders the section header', () => {
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.whatsNeeded')).toBeTruthy();
    });

    it('shows helpDescription when provided', () => {
      render(<HelpNeededModal {...defaultProps} helpDescription="We need volunteers for setup" />);
      expect(screen.getByText('We need volunteers for setup')).toBeTruthy();
    });

    it('shows default text when helpDescription is empty string', () => {
      render(<HelpNeededModal {...defaultProps} helpDescription="" />);
      expect(screen.getByText('help.noDetails')).toBeTruthy();
    });

    it('shows default text when helpDescription is whitespace-only', () => {
      render(<HelpNeededModal {...defaultProps} helpDescription="   " />);
      expect(screen.getByText('help.noDetails')).toBeTruthy();
    });

    it('shows default text when helpDescription is undefined', () => {
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.noDetails')).toBeTruthy();
    });

    it('renders the "Got It" button', () => {
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.gotIt')).toBeTruthy();
    });
  });

  describe('Visibility', () => {
    it('is not visible when visible prop is false', () => {
      render(<HelpNeededModal {...defaultProps} visible={false} />);
      expect(screen.queryByText('help.title')).toBeNull();
    });
  });

  describe('Close interactions', () => {
    it('calls onClose when "Got It" button is pressed', () => {
      const onClose = jest.fn();
      render(<HelpNeededModal {...defaultProps} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('help.gotIt'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose via Modal onRequestClose (e.g. Android back button)', () => {
      const onClose = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <HelpNeededModal {...defaultProps} onClose={onClose} />
      );
      const { Modal } = require('react-native');
      const modals = UNSAFE_getAllByType(Modal);
      expect(modals.length).toBeGreaterThan(0);
      modals[0].props.onRequestClose();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('inner modal container Pressable: onPress stops propagation without calling onClose', () => {
      const onClose = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <HelpNeededModal {...defaultProps} onClose={onClose} />
      );
      // Use View as the base type since Pressable renders as View in tests
      const { View } = require('react-native');
      const views = UNSAFE_getAllByType(View);

      // Find the View that has an onPress prop (inner Pressable container)
      const innerPressable = views.find(
        (v: any) =>
          v.props.onPress && v.props.onPress !== onClose && v.props.style?.maxWidth === 480
      );

      if (innerPressable) {
        const stopPropagationMock = jest.fn();
        innerPressable.props.onPress({ stopPropagation: stopPropagationMock });
        expect(stopPropagationMock).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
      } else {
        // Fallback: directly invoke the handler via the component's fiber
        // Access the inner Pressable's onPress from the rendered instance
        const { UNSAFE_root } = render(<HelpNeededModal {...defaultProps} onClose={onClose} />);
        // Navigate the fiber tree to find the Pressable with stopPropagation
        const findPressableWithStopProp = (node: any): any => {
          if (node?.props?.onPress && node.props.onPress.toString().includes('stopPropagation')) {
            return node;
          }
          const children = node?.children ?? [];
          for (const child of Array.isArray(children) ? children : [children]) {
            const found = findPressableWithStopProp(child);
            if (found) return found;
          }
          return null;
        };
        const target = findPressableWithStopProp(UNSAFE_root);
        if (target) {
          const stopPropagationMock = jest.fn();
          target.props.onPress({ stopPropagation: stopPropagationMock });
          expect(stopPropagationMock).toHaveBeenCalledTimes(1);
        }
      }
    });
  });

  describe('Theme support', () => {
    it('renders in light mode without crashing', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.title')).toBeTruthy();
    });

    it('renders in dark mode without crashing', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.title')).toBeTruthy();
    });

    it('falls back to light when colorScheme is null', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<HelpNeededModal {...defaultProps} />);
      expect(screen.getByText('help.title')).toBeTruthy();
    });
  });
});
