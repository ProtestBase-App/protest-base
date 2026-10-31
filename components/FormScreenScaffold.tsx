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
  type ViewInstance,
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
// Space left above a field the form jumps to, so its label isn't against the edge.
const FIELD_JUMP_HEADROOM = Spacing.xl;

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

interface FormFieldJumpContextValue {
  registerField: (field: string, view: ViewInstance | null) => void;
  /** Scroll the form to a field wrapped in a `FormFieldAnchor`. */
  scrollToField: (field: string) => void;
}

// No-op default so a form rendered outside a scaffold doesn't throw.
const FormFieldJumpContext = createContext<FormFieldJumpContextValue>({
  registerField: () => {},
  scrollToField: () => {},
});

export function useFormFieldJump(): FormFieldJumpContextValue {
  return useContext(FormFieldJumpContext);
}

export interface FormFieldAnchorProps {
  field: string;
  children: ReactNode;
}

/** Marks where a field sits, so a refused submit can jump to it. */
export function FormFieldAnchor({ field, children }: FormFieldAnchorProps) {
  const { registerField } = useFormFieldJump();
  const anchorRef = useCallback(
    (view: ViewInstance | null) => registerField(field, view),
    [field, registerField]
  );

  return (
    <View ref={anchorRef} collapsable={false}>
      {children}
    </View>
  );
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
  const viewportRef = useRef<ViewInstance>(null);
  const contentRef = useRef<ViewInstance>(null);
  const fieldsRef = useRef(new Map<string, ViewInstance>());
  const viewportHeightRef = useRef(0);
  const footerHeightRef = useRef(0);

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
    footerHeightRef.current = event.nativeEvent.layout.height;
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleDropdownFocused = useCallback((focused: boolean) => {
    setDropdownFocused(focused);
    if (!focused) setDropdownHeadroom(0);
  }, []);

  const keyboardContext = useMemo<FormKeyboardContextValue>(
    () => ({ setDropdownFocused: handleDropdownFocused }),
    [handleDropdownFocused]
  );

  const registerField = useCallback((field: string, view: ViewInstance | null) => {
    if (view) {
      fieldsRef.current.set(field, view);
    } else {
      fieldsRef.current.delete(field);
    }
  }, []);

  const scrollToField = useCallback(
    (field: string) => {
      const jump = () => {
        const target = fieldsRef.current.get(field);
        const content = contentRef.current;
        if (!target || !content) return;

        target.measureLayout(
          content,
          (_x, y, _width, height) => {
            // A field that fits from the top stays there, with the form's summary in view.
            const visibleHeight = viewportHeightRef.current - footerHeightRef.current;
            const fitsFromTop = y + height + Spacing.md <= visibleHeight;
            scrollRef.current?.scrollTo({
              y: fitsFromTop ? 0 : Math.max(0, y - FIELD_JUMP_HEADROOM),
              animated: true,
            });
          },
          // The field left the form while the jump was on its way: nowhere to go.
          () => {}
        );
      };

      if (!Keyboard.isVisible()) {
        jump();
        return;
      }

      // As it hides, the keyboard takes back the scrolling it asked for, which would
      // undo a jump made now.
      const subscription = Keyboard.addListener('keyboardDidHide', () => {
        subscription.remove();
        jump();
      });
      Keyboard.dismiss();
    },
    [scrollRef]
  );

  const fieldJumpContext = useMemo<FormFieldJumpContextValue>(
    () => ({ registerField, scrollToField }),
    [registerField, scrollToField]
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
          <View
            ref={viewportRef}
            collapsable={false}
            style={styles.viewport}
            onLayout={handleViewportLayout}
          >
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
              {/* The frame field jumps measure against: it scrolls with the fields. */}
              <View ref={contentRef} collapsable={false} style={styles.content}>
                <FormFieldJumpContext.Provider value={fieldJumpContext}>
                  {children}
                </FormFieldJumpContext.Provider>
              </View>
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
  content: {
    flexGrow: 1,
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default FormScreenScaffold;
