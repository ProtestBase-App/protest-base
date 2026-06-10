import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FiltersSheetShellProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet title, e.g. t('filters.title'). */
  title: string;
  /** Body content, rendered inside the keyboard-aware ScrollView. */
  children: React.ReactNode;
  testID?: string;
}

/**
 * Shared bottom-sheet scaffold for filter editors (calendar + explore).
 * Owns the modal, scrim, slide-up entrance, drag handle, and header row;
 * callers render their filter sections as children.
 */
export function FiltersSheetShell({
  visible,
  onClose,
  title,
  children,
  testID,
}: FiltersSheetShellProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    // The modal fades (scrim) while the sheet itself slides up with the
    // handoff's 0.32s cubic-bezier curve.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} onPress={onClose}>
          {/* Sheet container doubles as the tap-catcher so inner taps don't close. */}
          <AnimatedPressable
            entering={SlideInDown.duration(320).easing(Easing.bezier(0.32, 0.72, 0, 1).factory())}
            style={[styles.sheet, { backgroundColor: themeColors.cardBackground }]}
            onPress={(e) => e.stopPropagation()}
            testID={testID}
          >
            <View style={[styles.handle, { backgroundColor: themeColors.separator }]} />

            {/* keyboardShouldPersistTaps is required so SheetSearchMultiSelect
                dropdown row taps land while the keyboard is up. flexShrink lets
                the ScrollView compress when the sheet hits its maxHeight clamp
                (RN defaults flexShrink to 0) — without it the ScrollView keeps
                its full content height and can never scroll. */}
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerRow}>
                <ThemedText style={styles.title}>{title}</ThemedText>
                <Pressable
                  style={[styles.closeButton, { backgroundColor: themeColors.badgeBg }]}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <IconSymbol name="xmark" size={14} color={themeColors.secondaryText} />
                </Pressable>
              </View>

              {children}
            </ScrollView>
          </AnimatedPressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
        style={[
          styles.applyButton,
          {
            backgroundColor: themeColors.tint,
            shadowColor: themeColors.tint,
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
    marginTop: Spacing.lg,
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
