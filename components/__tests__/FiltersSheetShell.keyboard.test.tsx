jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

// Unlike the shared stateful mock, this one records the modal's props and the
// imperative calls, so the shell's keyboard config and its dismiss bridge can
// be asserted directly.
const mockModalRender = jest.fn();
const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockScrollTo = jest.fn();
// Window top of the sheet's scroll viewport, as the native scroll view reports it.
const mockViewportTop = 100;

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheetModal = React.forwardRef((props: any, ref: any) => {
    mockModalRender(props);
    React.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
    return React.createElement(View, null, props.children);
  });
  const BottomSheetScrollView = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollTo: mockScrollTo,
      getNativeScrollRef: () => ({
        measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
          callback(0, mockViewportTop, 375, 400),
      }),
    }));
    return React.createElement(View, props, children);
  });

  return {
    __esModule: true,
    BottomSheetModal,
    BottomSheetScrollView,
    BottomSheetBackdrop: (props: any) => React.createElement(View, props),
  };
});

import React from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { act, fireEvent, renderWithProviders } from '@/test-utils/render';
import { FiltersSheetShell, useFiltersSheetKeyboard } from '@/components/FiltersSheetShell';
import { Spacing } from '@/constants/DesignTokens';
import { DROPDOWN_HEADROOM, DROPDOWN_LABEL_ROOM } from '@/utils/keyboardReveal';

function RevealProbe() {
  const { revealFocusedInput } = useFiltersSheetKeyboard();
  return <Pressable testID="reveal-probe" onPress={revealFocusedInput} />;
}

type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput>;

const latestModalProps = () => mockModalRender.mock.lastCall?.[0];

// Focuses an input at content offset `y` while the sheet is scrolled to `scrollY`.
function focusInputAt(y: number, height: number, scrollY = 0) {
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
    measureLayout: (
      _relativeTo: unknown,
      onSuccess: (x: number, y: number, width: number, height: number) => void
    ) => onSuccess(0, y, 300, height),
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(0, mockViewportTop + y - scrollY, 300, height),
  } as unknown as FocusedInput);
}

describe('FiltersSheetShell keyboard handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('lets the sheet lift itself over the keyboard', () => {
    renderWithProviders(
      <FiltersSheetShell visible onClose={jest.fn()} title="Sheet Title">
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );

    // "adjustResize" would zero the keyboard height: edge-to-edge Android never
    // resizes the window, so the inputs ended up under the keyboard.
    expect(latestModalProps()).toMatchObject({
      keyboardBehavior: 'interactive',
      keyboardBlurBehavior: 'restore',
      android_keyboardInputMode: 'adjustPan',
      topInset: 44,
    });
  });

  it('reopens after the sheet dismissed itself (swipe-down, backdrop)', () => {
    const onClose = jest.fn();
    const renderShell = (visible: boolean) => (
      <FiltersSheetShell visible={visible} onClose={onClose} title="Sheet Title">
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );
    const { rerender } = renderWithProviders(renderShell(true));
    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(() => {
      latestModalProps().onDismiss();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    // A second dismiss() on the already-dismissed modal wedges gorhom, and the
    // next present() never shows the sheet.
    rerender(renderShell(false));
    expect(mockDismiss).not.toHaveBeenCalled();

    rerender(renderShell(true));
    expect(mockPresent).toHaveBeenCalledTimes(2);
  });

  it('dismisses the sheet when the parent closes it', () => {
    const renderShell = (visible: boolean) => (
      <FiltersSheetShell visible={visible} onClose={jest.fn()} title="Sheet Title">
        <Text>Sheet body</Text>
      </FiltersSheetShell>
    );
    const { rerender } = renderWithProviders(renderShell(true));

    rerender(renderShell(false));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  describe('revealing the focused input', () => {
    function renderSheet(viewportHeight: number) {
      const utils = renderWithProviders(
        <FiltersSheetShell visible onClose={jest.fn()} title="Sheet Title" testID="sheet-scroll">
          <RevealProbe />
        </FiltersSheetShell>
      );
      fireEvent(utils.getByTestId('sheet-scroll'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 375, height: viewportHeight } },
      });
      return utils;
    }

    it('scrolls just far enough to fit the input and its dropdown room', () => {
      focusInputAt(600, 20);
      const { getByTestId } = renderSheet(400);

      fireEvent.press(getByTestId('reveal-probe'));

      expect(mockScrollTo).toHaveBeenCalledWith({
        y: 600 + 20 + Spacing.md + DROPDOWN_HEADROOM - 400,
        animated: true,
      });
    });

    it('keeps the input and its label in view when the dropdown room does not fit', () => {
      focusInputAt(600, 20);
      const { getByTestId } = renderSheet(200);

      fireEvent.press(getByTestId('reveal-probe'));

      expect(mockScrollTo).toHaveBeenCalledWith({ y: 600 - DROPDOWN_LABEL_ROOM, animated: true });
    });

    it('leaves the scroll alone when the input and its room are already visible', () => {
      focusInputAt(600, 20, 500);
      const { getByTestId } = renderSheet(400);

      fireEvent.press(getByTestId('reveal-probe'));

      expect(mockScrollTo).not.toHaveBeenCalled();
    });

    it('scrolls back up to an input above the visible area', () => {
      // Only the on-screen measurement knows the sheet sits at 500: gorhom can
      // reset the scroll without reporting it in scroll events.
      focusInputAt(200, 20, 500);
      const { getByTestId } = renderSheet(400);

      fireEvent.press(getByTestId('reveal-probe'));

      expect(mockScrollTo).toHaveBeenCalledWith({ y: 200 - DROPDOWN_LABEL_ROOM, animated: true });
    });

    it('ignores a focused input that is not inside the sheet', () => {
      jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
        measureLayout: (_relativeTo: unknown, _onSuccess: unknown, onFail: () => void) => onFail(),
      } as unknown as FocusedInput);
      const { getByTestId } = renderSheet(400);

      fireEvent.press(getByTestId('reveal-probe'));

      expect(mockScrollTo).not.toHaveBeenCalled();
    });

    it('reveals once the sheet has settled after a resize', () => {
      jest.useFakeTimers();
      focusInputAt(600, 20);
      renderSheet(400);

      expect(mockScrollTo).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockScrollTo).toHaveBeenCalledTimes(1);
    });
  });
});
