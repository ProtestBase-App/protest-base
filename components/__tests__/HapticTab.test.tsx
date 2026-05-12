jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

jest.mock('@react-navigation/elements', () => ({
  PlatformPressable: ({ onPressIn, children, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { ...props, onPressIn, testID: 'platform-pressable' },
      children
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HapticTab } from '@/components/HapticTab';
import * as Haptics from 'expo-haptics';

// NOTE: babel-preset-expo inlines process.env.EXPO_OS at compile time using
// the Jest preset platform ('ios'). This means runtime assignment to
// process.env.EXPO_OS does NOT affect the compiled code — the branch
// `if (process.env.EXPO_OS === 'ios')` is compiled to always-true in tests.
// We therefore test the observable behavior: haptic fires on pressIn in all cases.

describe('HapticTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    render(<HapticTab>{null}</HapticTab>);
    expect(screen.getByTestId('platform-pressable')).toBeTruthy();
  });

  it('calls the original onPressIn callback', () => {
    const onPressIn = jest.fn();
    render(<HapticTab onPressIn={onPressIn}>{null}</HapticTab>);
    fireEvent(screen.getByTestId('platform-pressable'), 'pressIn', {});
    expect(onPressIn).toHaveBeenCalledTimes(1);
  });

  it('passes through additional props', () => {
    render(<HapticTab accessibilityLabel="Tab button">{null}</HapticTab>);
    expect(screen.getByLabelText('Tab button')).toBeTruthy();
  });

  it('triggers haptic feedback on press (jest-expo preset compiles with ios platform)', () => {
    render(<HapticTab>{null}</HapticTab>);
    fireEvent(screen.getByTestId('platform-pressable'), 'pressIn', {});
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('fires both haptic feedback and onPressIn callback when pressed', () => {
    const onPressIn = jest.fn();
    render(<HapticTab onPressIn={onPressIn}>{null}</HapticTab>);
    fireEvent(screen.getByTestId('platform-pressable'), 'pressIn', {});
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(onPressIn).toHaveBeenCalledTimes(1);
  });

  it('renders with children', () => {
    const { Text } = require('react-native');
    render(
      <HapticTab>
        <Text testID="child-text">Tab</Text>
      </HapticTab>
    );
    expect(screen.getByTestId('child-text')).toBeTruthy();
  });
});
