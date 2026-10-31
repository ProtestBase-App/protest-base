import React from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewInstance,
} from 'react-native';
import { act, fireEvent, renderWithProviders } from '@/test-utils/render';
import {
  FormFieldAnchor,
  FormScreenScaffold,
  useFormFieldJump,
  useFormKeyboard,
} from '@/components/FormScreenScaffold';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

import { Spacing } from '@/constants/DesignTokens';
import { DROPDOWN_HEADROOM, DROPDOWN_LABEL_ROOM } from '@/utils/keyboardReveal';

type MeasureInWindowCallback = (x: number, y: number, width: number, height: number) => void;
type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput>;
// The jest preset mocks View as a class, so its instances measure through the prototype.
const viewPrototype = View.prototype as unknown as ViewInstance;

const VIEWPORT_TOP = 100;
const INPUT_HEIGHT = 40;

function DropdownProbe() {
  const { setDropdownFocused } = useFormKeyboard();
  return (
    <>
      <Pressable testID="focus-dropdown" onPress={() => setDropdownFocused(true)} />
      <Pressable testID="blur-dropdown" onPress={() => setDropdownFocused(false)} />
    </>
  );
}

function renderScaffold() {
  const utils = renderWithProviders(
    <FormScreenScaffold>
      <Text>Form body</Text>
      <DropdownProbe />
    </FormScreenScaffold>
  );
  // The keyboard-controller mock renders KeyboardAwareScrollView as a ScrollView.
  const bottomOffset = () => utils.UNSAFE_getByType(ScrollView).props.bottomOffset;
  return { ...utils, bottomOffset };
}

function mockKeyboard({ visible, top }: { visible: boolean; top: number }) {
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(visible);
  jest
    .spyOn(Keyboard, 'metrics')
    .mockReturnValue(visible ? { screenX: 0, screenY: top, width: 375, height: 300 } : undefined);
}

describe('FormScreenScaffold dropdown room', () => {
  let keyboardDidShow: (() => void) | undefined;

  beforeEach(() => {
    keyboardDidShow = undefined;
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      listener: () => void
    ) => {
      if (event === 'keyboardDidShow') keyboardDidShow = listener;
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);
    jest
      .spyOn(viewPrototype, 'measureInWindow')
      .mockImplementation((callback: MeasureInWindowCallback) =>
        callback(0, VIEWPORT_TOP, 375, 600)
      );
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
      measureInWindow: (callback: MeasureInWindowCallback) => callback(16, 400, 343, INPUT_HEIGHT),
    } as unknown as FocusedInput);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('only keeps the input clear of the keyboard while no dropdown is focused', () => {
    mockKeyboard({ visible: true, top: 900 });
    const { bottomOffset } = renderScaffold();

    expect(bottomOffset()).toBe(Spacing.md);
  });

  it('reserves the full dropdown room when the screen has space for it', () => {
    mockKeyboard({ visible: true, top: 900 });
    const { getByTestId, bottomOffset } = renderScaffold();

    fireEvent.press(getByTestId('focus-dropdown'));

    expect(bottomOffset()).toBe(DROPDOWN_HEADROOM + Spacing.md);
  });

  it('shrinks the room on a short screen so the input itself stays in view', () => {
    const keyboardTop = 400;
    mockKeyboard({ visible: true, top: keyboardTop });
    const { getByTestId, bottomOffset } = renderScaffold();

    fireEvent.press(getByTestId('focus-dropdown'));

    const room = keyboardTop - Spacing.md - INPUT_HEIGHT - VIEWPORT_TOP - DROPDOWN_LABEL_ROOM;
    expect(room).toBeLessThan(DROPDOWN_HEADROOM);
    expect(bottomOffset()).toBe(room + Spacing.md);
  });

  it('waits for the keyboard to show before reserving any room', () => {
    mockKeyboard({ visible: false, top: 0 });
    const { getByTestId, bottomOffset } = renderScaffold();

    fireEvent.press(getByTestId('focus-dropdown'));
    expect(bottomOffset()).toBe(Spacing.md);

    mockKeyboard({ visible: true, top: 900 });
    act(() => {
      keyboardDidShow?.();
    });

    expect(bottomOffset()).toBe(DROPDOWN_HEADROOM + Spacing.md);
  });

  it('releases the room when the dropdown blurs', () => {
    mockKeyboard({ visible: true, top: 900 });
    const { getByTestId, bottomOffset } = renderScaffold();

    fireEvent.press(getByTestId('focus-dropdown'));
    fireEvent.press(getByTestId('blur-dropdown'));

    expect(bottomOffset()).toBe(Spacing.md);
  });

  it('drops a measurement that lands after the dropdown blurred', () => {
    mockKeyboard({ visible: true, top: 900 });
    let finishMeasuring: (() => void) | undefined;
    jest
      .spyOn(viewPrototype, 'measureInWindow')
      .mockImplementation((callback: MeasureInWindowCallback) => {
        finishMeasuring = () => callback(0, VIEWPORT_TOP, 375, 600);
      });
    const { getByTestId, bottomOffset } = renderScaffold();

    fireEvent.press(getByTestId('focus-dropdown'));
    fireEvent.press(getByTestId('blur-dropdown'));
    act(() => {
      finishMeasuring?.();
    });

    expect(bottomOffset()).toBe(Spacing.md);
  });
});

describe('FormScreenScaffold field jumps', () => {
  type MeasureLayoutCallback = (x: number, y: number, width: number, height: number) => void;

  const VIEWPORT_HEIGHT = 700;

  function JumpProbe({ field }: { field: string }) {
    const { scrollToField } = useFormFieldJump();
    return <Pressable testID="jump" onPress={() => scrollToField(field)} />;
  }

  function mockFieldAt(y: number, height: number) {
    return jest
      .spyOn(viewPrototype, 'measureLayout')
      .mockImplementation((_relativeTo: unknown, onSuccess: MeasureLayoutCallback) => {
        onSuccess(0, y, 375, height);
      });
  }

  function renderForm(field: string, footer?: React.ReactNode) {
    const utils = renderWithProviders(
      <FormScreenScaffold footer={footer}>
        <FormFieldAnchor field="title">
          <Text>Title</Text>
        </FormFieldAnchor>
        <JumpProbe field={field} />
      </FormScreenScaffold>
    );
    const scrollView = utils.UNSAFE_getByType(ScrollView);
    // The mock's scrollTo is shared between instances, so it needs clearing.
    const scrollTo = jest.spyOn(scrollView.instance, 'scrollTo').mockImplementation(() => {});
    scrollTo.mockClear();
    // The viewport is the scroll view's parent.
    act(() => {
      scrollView.parent?.props.onLayout?.({
        nativeEvent: { layout: { x: 0, y: 0, width: 375, height: VIEWPORT_HEIGHT } },
      });
    });
    return { ...utils, scrollTo };
  }

  afterEach(() => jest.restoreAllMocks());

  it('scrolls a field further down the form into view, with room above it', () => {
    mockFieldAt(1200, 90);
    const { getByTestId, scrollTo } = renderForm('title');

    fireEvent.press(getByTestId('jump'));

    expect(scrollTo).toHaveBeenCalledWith({ y: 1200 - Spacing.xl, animated: true });
  });

  it('goes to the top when the field fits there, so the summary stays in view', () => {
    mockFieldAt(300, 90);
    const { getByTestId, scrollTo } = renderForm('title');

    fireEvent.press(getByTestId('jump'));

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('does not count a field hidden behind the footer as fitting', () => {
    mockFieldAt(600, 90);
    const { getByTestId, getByText, scrollTo } = renderForm('title', <Text>Footer</Text>);
    // The footer's text sits in the safe area of the view that measures it.
    fireEvent(getByText('Footer').parent!.parent!, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 120 } },
    });

    fireEvent.press(getByTestId('jump'));

    expect(scrollTo).toHaveBeenCalledWith({ y: 600 - Spacing.xl, animated: true });
  });

  it('waits for the keyboard to hide, which would otherwise undo the jump', () => {
    mockFieldAt(1200, 90);
    let keyboardHidden: (() => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      event: string,
      listener: () => void
    ) => {
      if (event === 'keyboardDidHide') keyboardHidden = listener;
      return { remove };
    }) as never);
    const { getByTestId, scrollTo } = renderForm('title');

    fireEvent.press(getByTestId('jump'));

    expect(dismiss).toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();

    keyboardHidden?.();

    expect(scrollTo).toHaveBeenCalledWith({ y: 1200 - Spacing.xl, animated: true });
    expect(remove).toHaveBeenCalled();
  });

  it('ignores a field that is not on the form', () => {
    mockFieldAt(300, 90);
    const { getByTestId, scrollTo } = renderForm('disclaimer');

    fireEvent.press(getByTestId('jump'));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('forgets a field once it leaves the form', () => {
    mockFieldAt(300, 90);
    const { getByTestId, rerender, scrollTo } = renderForm('title');

    rerender(
      <FormScreenScaffold>
        <JumpProbe field="title" />
      </FormScreenScaffold>
    );
    fireEvent.press(getByTestId('jump'));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps a form working outside a scaffold', () => {
    const { getByTestId } = renderWithProviders(
      <>
        <FormFieldAnchor field="title">
          <Text>Title</Text>
        </FormFieldAnchor>
        <JumpProbe field="title" />
      </>
    );

    expect(() => fireEvent.press(getByTestId('jump'))).not.toThrow();
  });
});

describe('FormScreenScaffold footer in a sheet', () => {
  const realOS = Platform.OS;
  const realKeyboard = useReanimatedKeyboardAnimation();

  afterEach(() => {
    Platform.OS = realOS;
    jest.mocked(useReanimatedKeyboardAnimation).mockReturnValue(realKeyboard);
  });

  const renderFooter = (inSheet: boolean, tabBarHeight?: number, keyboardHeight = -300) => {
    jest.mocked(useReanimatedKeyboardAnimation).mockReturnValue({
      height: { value: keyboardHeight },
      progress: { value: 1 },
    } as unknown as ReturnType<typeof useReanimatedKeyboardAnimation>);

    const utils = renderWithProviders(
      <BottomTabBarHeightContext.Provider value={tabBarHeight}>
        <FormScreenScaffold inSheet={inSheet} footer={<Text>Footer</Text>}>
          <Text>Form body</Text>
        </FormScreenScaffold>
      </BottomTabBarHeightContext.Provider>
    );
    const safeArea = utils.getByText('Footer').parent?.parent;
    return {
      marginBottom: StyleSheet.flatten(safeArea?.props.style)?.marginBottom,
      bottomEdge: safeArea?.props.edges.bottom,
      lift: StyleSheet.flatten(utils.getByTestId('form-footer').props.style).transform[0]
        .translateY,
    };
  };

  it('clears the home indicator on iOS, and lands on the keyboard without the inset', () => {
    Platform.OS = 'ios';
    expect(renderFooter(true, 80)).toEqual({
      marginBottom: 34,
      bottomEdge: 'additive',
      lift: -266,
    });
  });

  it('lets the tab bar clear the inset on Android, and rides the keyboard from there', () => {
    Platform.OS = 'android';
    expect(renderFooter(true, 80)).toEqual({ marginBottom: 0, bottomEdge: 'off', lift: -220 });
  });

  it('stays above the tab bar when an open keyboard takes no height', () => {
    Platform.OS = 'android';
    expect(renderFooter(true, 80, 0).lift).toBe(0);
  });

  it('leaves full screens to SafeAreaView', () => {
    Platform.OS = 'ios';
    expect(renderFooter(false)).toEqual({ marginBottom: 0, bottomEdge: 'additive', lift: -300 });
  });
});
