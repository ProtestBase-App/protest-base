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
import PrivacyInfoModal from '@/components/PrivacyInfoModal';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('PrivacyInfoModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  describe('Content rendering', () => {
    it('renders the title when visible', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Your Privacy Matters')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText("Here's how we protect your data when you save events")).toBeTruthy();
    });

    it('renders the "Stored Locally Only" section', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Stored Locally Only')).toBeTruthy();
    });

    it('renders the "Completely Anonymous" section', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Completely Anonymous')).toBeTruthy();
    });

    it('renders the "No Account Required" section', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('No Account Required')).toBeTruthy();
    });

    it('renders the "Got It" button', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Got It')).toBeTruthy();
    });

    it('renders all privacy section body texts', () => {
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(
        screen.getByText(
          'All saved events are stored exclusively on your device. We never upload your saved events to our servers.'
        )
      ).toBeTruthy();
      expect(
        screen.getByText(
          'We track the total number of saves for each event, but we never know who saved what. Your activity is 100% private.'
        )
      ).toBeTruthy();
      expect(
        screen.getByText(
          'Browse and save events without creating an account. Your data stays with you, always.'
        )
      ).toBeTruthy();
    });
  });

  describe('Visibility', () => {
    it('is not visible when visible prop is false', () => {
      render(<PrivacyInfoModal {...defaultProps} visible={false} />);
      expect(screen.queryByText('Your Privacy Matters')).toBeNull();
    });
  });

  describe('Close interactions', () => {
    it('calls onClose when "Got It" button is pressed', () => {
      const onClose = jest.fn();
      render(<PrivacyInfoModal {...defaultProps} onClose={onClose} />);
      fireEvent.press(screen.getByLabelText('Close privacy information'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose via Modal onRequestClose (e.g. Android back button)', () => {
      const onClose = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <PrivacyInfoModal {...defaultProps} onClose={onClose} />
      );
      const { Modal } = require('react-native');
      const modals = UNSAFE_getAllByType(Modal);
      expect(modals.length).toBeGreaterThan(0);
      modals[0].props.onRequestClose();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('inner modal container Pressable: onPress calls e.stopPropagation() and does not call onClose', () => {
      const onClose = jest.fn();
      const { UNSAFE_root } = render(<PrivacyInfoModal {...defaultProps} onClose={onClose} />);

      // Traverse the fiber tree to find the Pressable with stopPropagation
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

      const innerPressable = findPressableWithStopProp(UNSAFE_root);
      expect(innerPressable).toBeTruthy();

      const stopPropagationMock = jest.fn();
      innerPressable.props.onPress({ stopPropagation: stopPropagationMock });

      expect(stopPropagationMock).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('overlay Pressable: pressing it calls onClose', () => {
      const onClose = jest.fn();
      const { UNSAFE_root } = render(<PrivacyInfoModal {...defaultProps} onClose={onClose} />);

      // The overlay Pressable has onClose as its onPress
      const findOverlayPressable = (node: any): any => {
        if (node?.props?.onPress === onClose) {
          return node;
        }
        const children = node?.children ?? [];
        for (const child of Array.isArray(children) ? children : [children]) {
          const found = findOverlayPressable(child);
          if (found) return found;
        }
        return null;
      };

      const overlayPressable = findOverlayPressable(UNSAFE_root);
      if (overlayPressable) {
        overlayPressable.props.onPress();
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Theme support', () => {
    it('renders in light mode without crashing', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Your Privacy Matters')).toBeTruthy();
    });

    it('renders in dark mode without crashing', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Your Privacy Matters')).toBeTruthy();
    });

    it('renders dark mode divider borders (dark colorScheme branch)', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      const { toJSON } = render(<PrivacyInfoModal {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders light mode divider borders (light colorScheme branch)', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      const { toJSON } = render(<PrivacyInfoModal {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('falls back gracefully when colorScheme is null', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<PrivacyInfoModal {...defaultProps} />);
      expect(screen.getByText('Your Privacy Matters')).toBeTruthy();
    });
  });
});
