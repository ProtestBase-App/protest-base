import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import { PublishCheckSurface } from '@/components/event-form/PublishCheckSurface';
import { Spacing } from '@/constants/DesignTokens';
import { fireEvent, renderWithProviders } from '@/test-utils/render';

// The safe area test-utils gives every render.
const BOTTOM_INSET = 34;

describe('PublishCheckSurface', () => {
  const realOS = Platform.OS;

  afterEach(() => {
    Platform.OS = realOS;
  });

  const renderCheck = (inSheet: boolean, tabBarHeight?: number, onClose = jest.fn()) =>
    renderWithProviders(
      <BottomTabBarHeightContext.Provider value={tabBarHeight}>
        <PublishCheckSurface
          when={{ title: 'Saturday 14 November 2026', subtitle: '14:00' }}
          where={{ title: 'Place Poelaert', subtitle: '1000 Brussels' }}
          pin={null}
          statusBarHeight={0}
          inSheet={inSheet}
          onConfirm={jest.fn()}
          onClose={onClose}
        />
      </BottomTabBarHeightContext.Provider>
    );

  const bottomPadding = (utils: ReturnType<typeof renderCheck>) =>
    StyleSheet.flatten(utils.getByTestId('surface-publish').props.style).paddingBottom;

  it('names the time zone of the date it shows', () => {
    const { getByText } = renderCheck(false);

    expect(getByText('14:00, Brussels time')).toBeTruthy();
  });

  it('closes from a scrim TalkBack cannot land on', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByProps } = renderCheck(false, undefined, onClose);

    fireEvent.press(UNSAFE_getAllByProps({ 'aria-hidden': true })[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves the inset to the tab bar when it sits above one', () => {
    Platform.OS = 'android';

    expect(bottomPadding(renderCheck(true, 80))).toBe(Spacing.lg);
  });

  it('clears the home indicator in an iOS sheet, which covers the tab bar', () => {
    Platform.OS = 'ios';

    expect(bottomPadding(renderCheck(true, 80))).toBe(BOTTOM_INSET + Spacing.lg);
  });

  it('clears the inset on a screen with no tab bar', () => {
    Platform.OS = 'android';

    expect(bottomPadding(renderCheck(false))).toBe(BOTTOM_INSET + Spacing.lg);
  });
});
