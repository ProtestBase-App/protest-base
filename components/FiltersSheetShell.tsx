import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import {
  DROPDOWN_HEADROOM,
  DROPDOWN_LABEL_ROOM,
  getRevealScrollOffset,
} from '@/utils/keyboardReveal';
import { getThemeColors } from '@/utils/themeColors';

export interface FiltersSheetShellProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet title, e.g. t('filters.title'). */
  title: string;
  /** Body content, rendered inside the keyboard-aware ScrollView. */
  children: React.ReactNode;
  /** Pinned to the bottom of the sheet, above the home indicator, e.g. FiltersSheetFooter. */
  footer?: React.ReactNode;
  testID?: string;
}

// gorhom resizes the sheet over several frames once the keyboard is up; the
// settled reveal waits until the sheet layout has been still this long.
const REVEAL_SETTLE_MS = 120;

interface PinnedFooterState {
  footer: React.ReactNode;
  onClose: () => void;
  bottomInset: number;
}

interface PinnedFooterStore {
  get: () => PinnedFooterState;
  set: (next: PinnedFooterState) => void;
  subscribe: (listener: () => void) => () => void;
}

function createPinnedFooterStore(initial: PinnedFooterState): PinnedFooterStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

interface FiltersSheetKeyboardContextValue {
  /** Scroll the focused input, plus room for its dropdown, into the visible area. */
  revealFocusedInput: () => void;
}

// No-op default so inputs rendered outside a sheet need no guard.
const FiltersSheetKeyboardContext = createContext<FiltersSheetKeyboardContextValue>({
  revealFocusedInput: () => {},
});

export function useFiltersSheetKeyboard(): FiltersSheetKeyboardContextValue {
  return useContext(FiltersSheetKeyboardContext);
}

/**
 * Shared bottom-sheet scaffold for filter editors (calendar + explore + maps).
 * Wraps @gorhom/bottom-sheet's BottomSheetModal: owns the modal host, scrim,
 * native drag handle, slide-up animation and header row; callers render their
 * filter sections as children.
 *
 * The public API stays declarative (`visible` / `onClose`); internally a ref
 * bridges it onto gorhom's imperative present()/dismiss(), and `onDismiss`
 * funnels swipe-down / backdrop-tap dismissals back through `onClose`.
 *
 * Keyboard: the sheet rides up above the soft keyboard and the body keeps the
 * focused input, plus room for its dropdown, inside the visible area.
 *
 * The footer is pinned: it stays on screen, above the home indicator or the
 * keyboard, however long the body is.
 */
export function FiltersSheetShell({
  visible,
  onClose,
  title,
  children,
  footer,
  testID,
}: FiltersSheetShellProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hasFooter = footer !== undefined;
  const footerBottomInset = Math.max(insets.bottom, Spacing.lg);

  // gorhom memoizes its footer container: a footerComponent with a new identity
  // would remount the footer, and drop screen-reader focus, on every chip tap.
  // The component stays stable and reads the latest footer from this store.
  const [footerStore] = useState(() =>
    createPinnedFooterStore({ footer, onClose, bottomInset: footerBottomInset })
  );
  useLayoutEffect(() => {
    footerStore.set({ footer, onClose, bottomInset: footerBottomInset });
  }, [footerStore, footer, onClose, footerBottomInset]);

  // The pinned footer covers the bottom of the scroll viewport.
  const footerHeightRef = useRef(0);
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <FiltersSheetPinnedFooter {...props} store={footerStore} heightRef={footerHeightRef} />
    ),
    [footerStore]
  );

  const sheetRef = useRef<BottomSheetModal>(null);
  // Only dismiss a sheet that was actually presented, so the first mount with
  // visible=false can't fire a spurious onDismiss → onClose.
  const presentedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      presentedRef.current = true;
    } else if (presentedRef.current) {
      sheetRef.current?.dismiss();
      presentedRef.current = false;
    }
  }, [visible]);

  // Swipe-down and backdrop taps dismiss the sheet inside gorhom. The effect
  // must then skip its own dismiss(): on an already-dismissed modal it leaves
  // gorhom stuck mid-dismiss and the next present() never shows.
  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        // VoiceOver activates an element by tapping its centre, which lands on
        // the sheet once it covers the middle of the screen. Close and the
        // escape gesture leave the sheet instead.
        accessible={Platform.OS !== 'ios'}
        accessibilityRole={Platform.OS === 'ios' ? 'none' : undefined}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={handleDismiss}
      // gorhom makes the whole sheet one accessible element by default, which on
      // iOS hides every chip and button in it from VoiceOver.
      accessible={false}
      enableDynamicSizing
      // Preserve the old 78% max-height clamp; the sheet shrinks to its content
      // below that and the inner ScrollView scrolls once it hits the cap.
      maxDynamicContentSize={windowHeight * 0.78}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: themeColors.separator }}
      backgroundStyle={{
        backgroundColor: themeColors.cardBackground,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      // Android is edge-to-edge, so the OS never resizes the window for the
      // keyboard: "adjustPan" makes the sheet offset itself by the keyboard
      // height ("adjustResize" zeroes it, leaving the inputs under the keyboard).
      // "interactive" lifts the sheet above the keyboard; when it no longer fits
      // it stops below the status bar and its content shrinks to the space left.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      topInset={insets.top}
      footerComponent={hasFooter ? renderFooter : undefined}
    >
      <FiltersSheetBody
        title={title}
        onClose={onClose}
        hasFooter={hasFooter}
        footerHeightRef={footerHeightRef}
        testID={testID}
      >
        {children}
      </FiltersSheetBody>
    </BottomSheetModal>
  );
}

interface FiltersSheetPinnedFooterProps extends BottomSheetFooterProps {
  store: PinnedFooterStore;
  heightRef: React.RefObject<number>;
}

/** The footer, on the sheet's bottom edge or on top of the keyboard. */
function FiltersSheetPinnedFooter({
  animatedFooterPosition,
  store,
  heightRef,
}: FiltersSheetPinnedFooterProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { footer, onClose, bottomInset } = useSyncExternalStore(store.subscribe, store.get);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      heightRef.current = event.nativeEvent.layout.height;
    },
    [heightRef]
  );

  return (
    <BottomSheetFooter animatedFooterPosition={animatedFooterPosition}>
      <View
        testID="filters-sheet-footer"
        onLayout={handleLayout}
        // Outside the body, so focus on Reset or Apply needs its own escape.
        onAccessibilityEscape={onClose}
        style={[
          styles.pinnedFooter,
          {
            backgroundColor: themeColors.cardBackground,
            borderTopColor: themeColors.separator,
            paddingBottom: bottomInset,
          },
        ]}
      >
        {footer}
      </View>
    </BottomSheetFooter>
  );
}

interface FiltersSheetBodyProps {
  title: string;
  onClose: () => void;
  hasFooter: boolean;
  footerHeightRef: React.RefObject<number>;
  children: React.ReactNode;
  testID?: string;
}

/** Scrollable sheet content; gorhom mounts it per presentation. */
function FiltersSheetBody({
  title,
  onClose,
  hasFooter,
  footerHeightRef,
  children,
  testID,
}: FiltersSheetBodyProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const scrollRef = useRef<
    BottomSheetScrollViewMethods & Pick<ScrollViewInstance, 'getNativeScrollRef'>
  >(null);
  const contentRef = useRef<ViewInstance>(null);
  const viewportHeightRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const content = contentRef.current;
    const viewport = scrollRef.current?.getNativeScrollRef?.();
    const viewportHeight = viewportHeightRef.current - (hasFooter ? footerHeightRef.current : 0);
    if (!input || !content || !viewport || viewportHeight <= 0) return;

    input.measureLayout(
      content,
      (_x, y, _width, height) => {
        // Read the current offset off the screen rather than from scroll events:
        // gorhom resets the scroll while it re-settles the sheet and still
        // reports the stale offset. Both measures share the sheet's transform.
        viewport.measureInWindow((_viewportX, viewportTop) => {
          input.measureInWindow((_inputX, inputTop) => {
            const current = y - (inputTop - viewportTop);
            // The input with its label above and its dropdown's room below.
            const next = getRevealScrollOffset(
              current,
              viewportHeight,
              y - DROPDOWN_LABEL_ROOM,
              y + height + Spacing.md + DROPDOWN_HEADROOM
            );
            if (Math.abs(next - current) >= 1) {
              scrollRef.current?.scrollTo({ y: next, animated: true });
            }
          });
        });
      },
      // The focused input lives outside this sheet: nothing to reveal.
      () => {}
    );
  }, [hasFooter, footerHeightRef]);

  const scheduleReveal = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      reveal();
    }, REVEAL_SETTLE_MS);
  }, [reveal]);

  useEffect(() => {
    // iOS announces the keyboard before animating it, Android once it is up.
    const subscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      scheduleReveal
    );
    return () => {
      subscription.remove();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [scheduleReveal]);

  // The viewport shrinks while the sheet settles onto the keyboard and the
  // content grows when a dropdown opens; both can push the input out of view.
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      scheduleReveal();
    },
    [scheduleReveal]
  );

  // Immediate: on focus the input is revealed before the keyboard animates in;
  // the settled pass after the sheet resizes then fine-tunes it.
  const keyboardContext = useMemo<FiltersSheetKeyboardContextValue>(
    () => ({ revealFocusedInput: reveal }),
    [reveal]
  );

  return (
    <FiltersSheetKeyboardContext.Provider value={keyboardContext}>
      {/* keyboardShouldPersistTaps keeps SheetSearchMultiSelect dropdown row
          taps landing while the keyboard is up. */}
      <BottomSheetScrollView
        ref={scrollRef}
        testID={testID}
        onLayout={handleLayout}
        onContentSizeChange={scheduleReveal}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Pads the content by the footer's height, so its end scrolls clear of
        // the footer and the dynamic size counts the footer in.
        enableFooterMarginAdjustment={hasFooter}
      >
        {/* Inputs are measured against this view: plain layout, unaffected by
            the sheet's animated position or the scroll offset. */}
        <View
          ref={contentRef}
          collapsable={false}
          onAccessibilityEscape={onClose}
          style={[styles.content, hasFooter && styles.contentAboveFooter]}
        >
          <View style={styles.headerRow}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <Pressable
              testID="filters-close"
              style={[styles.closeButton, { backgroundColor: themeColors.badgeBg }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              accessibilityHint={t('a11y.hints.closeDialog')}
            >
              <IconSymbol name="xmark" size={14} color={themeColors.secondaryText} />
            </Pressable>
          </View>

          {children}
        </View>
      </BottomSheetScrollView>
    </FiltersSheetKeyboardContext.Provider>
  );
}

export interface FiltersSheetSectionLabelProps {
  label: string;
}

/** Uppercase section heading shared by the filter sheets. */
export function FiltersSheetSectionLabel({ label }: FiltersSheetSectionLabelProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <ThemedText style={[styles.sectionLabel, { color: themeColors.secondaryText }]}>
      {label}
    </ThemedText>
  );
}

export interface FiltersSheetWarningBannerProps {
  message: string;
}

/** Amber inline warning shared by the filter sheets (e.g. too-broad location). */
export function FiltersSheetWarningBanner({ message }: FiltersSheetWarningBannerProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={[styles.warningBanner, { backgroundColor: themeColors.warningBg }]}>
      <IconSymbol name="exclamationmark.triangle" size={16} color={themeColors.warning} />
      <ThemedText style={[styles.warningText, { color: themeColors.warning }]}>
        {message}
      </ThemedText>
    </View>
  );
}

export interface FiltersSheetFooterProps {
  onReset: () => void;
  resetDisabled: boolean;
  onApply: () => void;
  applyDisabled: boolean;
  applyLabel: string;
}

/** Reset/Apply footer shared by the filter sheets. */
export function FiltersSheetFooter({
  onReset,
  resetDisabled,
  onApply,
  applyDisabled,
  applyLabel,
}: FiltersSheetFooterProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={styles.footer}>
      <Pressable
        testID="filters-reset"
        style={[
          styles.resetButton,
          {
            backgroundColor: themeColors.surfaceAltBackground,
            borderColor: themeColors.cardBorder,
          },
        ]}
        onPress={onReset}
        disabled={resetDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('common.reset')}
        accessibilityHint={t('a11y.hints.resetFilters')}
        accessibilityState={{ disabled: resetDisabled }}
      >
        <ThemedText
          style={[
            styles.footerButtonLabel,
            { color: resetDisabled ? themeColors.placeholder : themeColors.text },
          ]}
        >
          {t('common.reset')}
        </ThemedText>
      </Pressable>

      <Pressable
        testID="filters-apply"
        style={[
          styles.applyButton,
          {
            backgroundColor: themeColors.cta,
            shadowColor: themeColors.cta,
            opacity: applyDisabled ? 0.5 : 1,
          },
        ]}
        onPress={onApply}
        disabled={applyDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: applyDisabled }}
      >
        <ThemedText style={[styles.footerButtonLabel, styles.applyLabel]}>{applyLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  contentAboveFooter: {
    paddingBottom: Spacing.sm,
  },
  pinnedFooter: {
    paddingHorizontal: 20,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '78%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingHorizontal: 20,
    paddingBottom: Spacing['2xl'],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  scroll: {
    flexShrink: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 19,
    fontFamily: Typography.families.extraBold,
    lineHeight: 26,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  footerButtonLabel: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
  },
  applyLabel: {
    color: 'white',
  },
});

export default FiltersSheetShell;
