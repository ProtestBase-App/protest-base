import React from 'react';
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
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface CancelEventModalProps {
  visible: boolean;
  onDismiss: () => void;
  /** Confirm the cancellation. */
  onConfirm: () => Promise<void> | void;
  /** When true, the confirm button shows a spinner and is disabled. */
  submitting?: boolean;
}

/**
 * Confirmation dialog for cancelling an event.
 *
 * Kept deliberately simple — renders a centered card, not a full-screen route,
 * so the parent can handle the 409 "already cancelled" path without stacking
 * navigation state.
 */
export default function CancelEventModal({
  visible,
  onDismiss,
  onConfirm,
  submitting,
}: CancelEventModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleDismiss = () => {
    if (submitting) return;
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.scrim} onPress={handleDismiss}>
        <Pressable style={styles.cardWrapper} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={[styles.card, { backgroundColor: themeColors.surfaceBackground }]}>
            <ThemedText style={styles.title}>{t('events.cancelConfirmTitle')}</ThemedText>
            <ThemedText style={[styles.message, { color: themeColors.subtleText }]}>
              {t('events.cancelConfirmMessage')}
            </ThemedText>

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
                accessibilityLabel={t('events.keepActive')}
              >
                <ThemedText style={styles.secondaryButtonText}>{t('events.keepActive')}</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={submitting}
                style={[styles.primaryButton, { backgroundColor: themeColors.destructive }]}
                accessibilityRole="button"
                accessibilityLabel={t('events.cancelAction')}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    {t('events.cancelAction')}
                  </ThemedText>
                )}
              </TouchableOpacity>
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
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
