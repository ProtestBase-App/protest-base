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
import { StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/DesignTokens';

// Room for a picker's downward-expanding dropdown (~5 rows), so focusing it
// clears the keyboard for the panel, not just the input. Exported so dropdown
// fields (AddressAutocompleteField) can cap their list to the reserved band.
export const DROPDOWN_HEADROOM = 240;

interface FormKeyboardContextValue {
  /** Reserve (or release) DROPDOWN_HEADROOM below the focused input. */
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
}: FormScreenScaffoldProps) {
  const internalRef = useRef<KeyboardAwareScrollViewRef>(null);
  const scrollRef = scrollViewRef ?? internalRef;

  const [footerHeight, setFooterHeight] = useState(0);
  const [dropdownFocused, setDropdownFocused] = useState(false);

  const bottomOffset = footerHeight + (dropdownFocused ? DROPDOWN_HEADROOM : 0) + Spacing.md;

  // Re-assert visibility once the raised bottomOffset commits, so the dropdown
  // clears the keyboard even when it opens after focus (postal: 2nd keystroke).
  useEffect(() => {
    if (dropdownFocused) {
      // Optional-called: the Jest mock's ref is a plain ScrollView without it.
      scrollRef.current?.assureFocusedInputVisible?.();
    }
  }, [dropdownFocused, scrollRef]);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const keyboardContext = useMemo<FormKeyboardContextValue>(() => ({ setDropdownFocused }), []);

  return (
    <FormKeyboardContext.Provider value={keyboardContext}>
      {/* The scaffold must paint its own background: the scroll container's
          bottom padding (clearing the sticky footer) and the gap behind the
          keyboard-lifted footer belong to no screen view, so without this they
          show react-navigation's near-black theme background as a stray band
          above the footer. */}
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default FormScreenScaffold;
