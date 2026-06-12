// Mock dependencies BEFORE imports
jest.mock('expo-router/js-tabs', () => ({
  useBottomTabBarHeight: jest.fn(() => 80),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 34, left: 0, right: 0 })),
}));

jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: (props: any) => React.createElement('BlurView', props),
  };
});

// Import the iOS variant directly from the .ios.tsx file so TypeScript resolves
// the correct types (BlurTabBarBackground as default, useBottomTabOverflow as named export).
// The jest-expo iOS environment maps this to the same file at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: TabBarBackgroundIos, useBottomTabOverflow: useBottomTabOverflowIos } =
  require('../TabBarBackground.ios') as typeof import('../TabBarBackground.ios');

// Import the Android/web fallback directly with explicit .tsx extension to
// bypass jest-expo's defaultPlatform='ios' haste resolution.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TabBarBackgroundAndroid = require('../TabBarBackground.tsx');

import React from 'react';
import { render } from '@testing-library/react-native';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

describe('TabBarBackground', () => {
  afterEach(() => jest.clearAllMocks());

  describe('iOS variant (BlurView)', () => {
    it('renders the iOS BlurView component without crashing', () => {
      const { toJSON } = render(<TabBarBackgroundIos />);
      expect(toJSON()).toBeTruthy();
    });

    it('useBottomTabOverflow (iOS) returns tabHeight minus bottom inset', () => {
      jest.mocked(useBottomTabBarHeight).mockReturnValue(80);
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 0,
        bottom: 34,
        left: 0,
        right: 0,
      });
      const result = useBottomTabOverflowIos();
      expect(result).toBe(46); // 80 - 34
    });

    it('useBottomTabOverflow (iOS) returns 0 when tabHeight equals bottom inset', () => {
      jest.mocked(useBottomTabBarHeight).mockReturnValue(34);
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 0,
        bottom: 34,
        left: 0,
        right: 0,
      });
      const result = useBottomTabOverflowIos();
      expect(result).toBe(0);
    });

    it('useBottomTabOverflow (iOS) handles zero insets', () => {
      jest.mocked(useBottomTabBarHeight).mockReturnValue(50);
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
      const result = useBottomTabOverflowIos();
      expect(result).toBe(50);
    });
  });

  describe('Android/web variant (no-op)', () => {
    it('default export is undefined on Android/web', () => {
      expect(TabBarBackgroundAndroid.default).toBeUndefined();
    });

    it('useBottomTabOverflow (Android/web) always returns 0', () => {
      const result = TabBarBackgroundAndroid.useBottomTabOverflow();
      expect(result).toBe(0);
    });

    it('useBottomTabOverflow (Android/web) returns a number type', () => {
      const result = TabBarBackgroundAndroid.useBottomTabOverflow();
      expect(typeof result).toBe('number');
    });
  });
});
