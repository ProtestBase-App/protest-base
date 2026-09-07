import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface ConfirmDialogShellProps {
  visible: boolean;
  title: string;
  /** Supporting line under the title. */
  message?: string;
  /** Dialog body between the message and the buttons. */
  children?: ReactNode;
  /** The way out. Always shown — a dialog must never trap. */
  dismissLabel: string;
  onDismiss: () => void;
  /** The action. Omit for a dialog that only offers the way out. */
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Paint the confirm button as destructive rather than brand-tinted. */
  destructive?: boolean;
  /** Spinner on confirm; also blocks dismissal while the work is in flight. */
  submitting?: boolean;
}

/**
 * The centered-card confirmation dialog: scrim, card, title, optional body, and
 * a one-or-two button row.
 *
 * Extracted because every dialog of this shape was carrying its own copy of the
 * same scrim, card and button styles. Callers supply only what differs — the
 * copy and the body — the way `FiltersSheetShell` does for the bottom sheets.
 *
 * Info modals with no action row (PrivacyInfoModal, HelpNeededModal) are a
 * different component and deliberately not folded in here.
 */
export default function ConfirmDialogShell({
  visible,
  title,
  message,
  children,
  dismissLabel,
  onDismiss,
  confirmLabel,
  onConfirm,
  destructive,
  submitting,
}: ConfirmDialogShellProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const handleDismiss = () => {
    if (submitting) return;
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.scrim} onPress={handleDismiss}>
        <Pressable style={styles.cardWrapper} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={[styles.card, { backgroundColor: themeColors.surfaceBackground }]}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            {!!message && (
              <ThemedText style={[styles.message, { color: themeColors.subtleText }]}>
                {message}
              </ThemedText>
            )}

            {children}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleDismiss}
                disabled={submitting}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: themeColors.buttonSecondaryBackground,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
              >
                <ThemedText style={styles.secondaryButtonText}>{dismissLabel}</ThemedText>
              </TouchableOpacity>

              {!!confirmLabel && !!onConfirm && (
                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={submitting}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: destructive ? themeColors.destructive : themeColors.tint },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={confirmLabel}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>{confirmLabel}</ThemedText>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    // md, not lg: with the message's own md bottom margin this reproduces the
    // 24px the childless dialogs had before the shell was extracted. A dialog
    // with a body adds its own trailing space instead.
    marginTop: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
  primaryButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    color: 'white',
  },
});
