import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

import { setLocale } from '@/utils/i18n';
import TabLayout from '../(tabs)/_layout';

jest.mock('expo-router', () => {
  const { createElement, Fragment } = jest.requireActual('react');
  const Tabs = ({ children }: { children?: unknown }) => createElement(Fragment, null, children);
  Tabs.Screen = jest.fn(() => null);
  return { Tabs };
});

jest.mock('@/components/HapticTab', () => ({ HapticTab: () => null }));
jest.mock('@/components/ui/TabBarBackground', () => () => null);

type TabOptions = { tabBarButtonTestID?: string; tabBarAccessibilityLabel?: string };

const tabOptions = (): TabOptions[] =>
  jest
    .requireMock('expo-router')
    .Tabs.Screen.mock.calls.map(([props]: [{ options: TabOptions }]) => props.options);

describe('Tab bar', () => {
  const realOS = Platform.OS;

  afterEach(() => {
    Platform.OS = realOS;
    setLocale('en');
    jest.clearAllMocks();
  });

  it('reads each tab by its title on Android, and keeps the test handles out of it', () => {
    Platform.OS = 'android';
    render(<TabLayout />);

    expect(
      tabOptions().map((options) => [options.tabBarButtonTestID, options.tabBarAccessibilityLabel])
    ).toEqual([
      ['tab-explore', 'Explore'],
      ['tab-maps', 'Map'],
      ['tab-home', 'Calendar'],
      ['tab-more', 'More'],
    ]);
  });

  it('names each tab and its place on iOS, in the app language', () => {
    Platform.OS = 'ios';
    render(<TabLayout />);

    expect(tabOptions().map((options) => options.tabBarAccessibilityLabel)).toEqual([
      'Explore, tab, 1 of 4',
      'Map, tab, 2 of 4',
      'Calendar, tab, 3 of 4',
      'More, tab, 4 of 4',
    ]);
  });

  it('follows the app language', () => {
    Platform.OS = 'ios';
    setLocale('fr');
    render(<TabLayout />);

    expect(tabOptions()[0].tabBarAccessibilityLabel).toBe('Explorer, onglet, 1 sur 4');
  });
});
