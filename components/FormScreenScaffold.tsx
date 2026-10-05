import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/DesignTokens';
import { getDropdownHeadroom } from '@/utils/keyboardReveal';

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

interface FormKeyboardContextValue {
  /** Reserve (or release) room for a dropdown below the focused input. */
  setDropdownFocused: (focused: boolean) => void;
}

// No-op default so a picker rendered outside a scaffold doesn't throw.
const FormKeyboardContext = createContext<FormKeyboardContextValue>({
  setDropdownFocused: () => {},
});

export function useFormKeyboard(): FormKeyboardContextValue {
  return useContext(FormKeyboardContext);
}

export interface FormScreenScaffoldProps {
  children: ReactNode;
  /** Optional sticky footer (e.g. Cancel/Save); rides above the keyboard. */
  footer?: ReactNode;
  scrollViewRef?: RefObject<KeyboardAwareScrollViewRef | null>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Safe-area edges to pad; drop 'top' on screens under a navigation header. */
  edges?: Edge[];
}

/**
 * Keyboard-aware shell for the form screens: auto-scrolls the focused input
 * clear of the keyboard and keeps the footer above it. Owns keyboard, scroll and
 * the footer slot only — guards, loaders and footer contents stay per-screen.
 */
export function FormScreenScaffold({
  children,
  footer,
  scrollViewRef,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
}: FormScreenScaffoldProps) {
  const internalRef = useRef<KeyboardAwareScrollViewRef>(null);
  const scrollRef = scrollViewRef ?? internalRef;
  const viewportRef = useRef<View>(null);

  const [footerHeight, setFooterHeight] = useState(0);
  const [dropdownFocused, setDropdownFocused] = useState(false);
  // Room reserved below a focused dropdown, cut down on short screens so the
  // input itself stays in view. Sizing it needs the keyboard's height, so it is
  // only reserved once the keyboard is up.
  const [dropdownHeadroom, setDropdownHeadroom] = useState(0);

  const bottomOffset = footerHeight + dropdownHeadroom + Spacing.md;

  useEffect(() => {
    if (!dropdownFocused) return;

    let active = true;
    const fitHeadroom = () => {
      const keyboard = Keyboard.metrics();
      const input = TextInput.State.currentlyFocusedInput();
      const viewport = viewportRef.current;
      if (!keyboard || !input || !viewport) return;

      viewport.measureInWindow((_x, viewportTop) => {
        input.measureInWindow((_inputX, _inputY, _width, inputHeight) => {
          // The field may have blurred while the measurements were in flight.
          if (!active) return;
          setDropdownHeadroom(
            getDropdownHeadroom({
              keyboardTop: keyboard.screenY,
              viewportTop,
              bottomInset: footerHeight + Spacing.md,
              inputHeight,
            })
          );
        });
      });
    };

    // Moving between fields keeps the keyboard up, so fit straight away;
    // otherwise wait until it has shown and its height is known.
    if (Keyboard.isVisible()) fitHeadroom();
    const subscription = Keyboard.addListener('keyboardDidShow', fitHeadroom);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [dropdownFocused, footerHeight]);

  // Re-assert visibility once the reserved room commits, so the dropdown clears
  // the keyboard even when it opens after focus (postal: 2nd keystroke).
  useEffect(() => {
    if (dropdownHeadroom > 0) {
      // Optional-called: the Jest mock's ref is a plain ScrollView without it.
      scrollRef.current?.assureFocusedInputVisible?.();
    }
  }, [dropdownHeadroom, scrollRef]);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const handleDropdownFocused = useCallback((focused: boolean) => {
    setDropdownFocused(focused);
    if (!focused) setDropdownHeadroom(0);
  }, []);

  const keyboardContext = useMemo<FormKeyboardContextValue>(
    () => ({ setDropdownFocused: handleDropdownFocused }),
    [handleDropdownFocused]
  );

  return (
    <FormKeyboardContext.Provider value={keyboardContext}>
      {/* The scaffold must paint its own background: the scroll container's
          bottom padding (clearing the sticky footer) and the gap behind the
          keyboard-lifted footer belong to no screen view, so without this they
          show react-navigation's near-black theme background as a stray band
          above the footer. */}
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {/* Measured to size the dropdown room: same frame as the scroll view. */}
          <View ref={viewportRef} collapsable={false} style={styles.viewport}>
            <KeyboardAwareScrollView
              ref={scrollRef}
              bottomOffset={bottomOffset}
              contentContainerStyle={[
                contentContainerStyle,
                // Clear the overlaying sticky footer.
                { paddingBottom: footerHeight + Spacing.xl },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </KeyboardAwareScrollView>
          </View>

          {footer ? (
            // No `offset`: the default lands the bar flush on the keyboard. Adding
            // the safe-area inset leaves a transparent gap the form shows through.
            <KeyboardStickyView style={styles.footerWrapper}>
              <ThemedView onLayout={handleFooterLayout}>
                <SafeAreaView edges={['bottom']}>{footer}</SafeAreaView>
              </ThemedView>
            </KeyboardStickyView>
          ) : null}
        </SafeAreaView>
      </ThemedView>
    </FormKeyboardContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default FormScreenScaffold;
