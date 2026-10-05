import React from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { act, fireEvent, renderWithProviders } from '@/test-utils/render';
import { FormScreenScaffold, useFormKeyboard } from '@/components/FormScreenScaffold';
import { Spacing } from '@/constants/DesignTokens';
import { DROPDOWN_HEADROOM, DROPDOWN_LABEL_ROOM } from '@/utils/keyboardReveal';

type MeasureInWindowCallback = (x: number, y: number, width: number, height: number) => void;
type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput>;

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
      .spyOn(View.prototype, 'measureInWindow')
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
      .spyOn(View.prototype, 'measureInWindow')
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
