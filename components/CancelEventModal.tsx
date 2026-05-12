import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

const MAX_REASON_LENGTH = 1000;

interface CancelEventModalProps {
  visible: boolean;
  onDismiss: () => void;
  /** Called with the trimmed reason (empty string when user left it blank). */
  onConfirm: (reason: string) => Promise<void> | void;
  /** When true, the confirm button shows a spinner and is disabled. */
  submitting?: boolean;
}

/**
 * Confirmation dialog for cancelling an event. Shows an optional reason
 * text area (≤1000 chars) and sends it to `onConfirm` as a trimmed string.
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
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    await onConfirm(reason.trim());
  };

  const handleDismiss = () => {
    if (submitting) return;
    setReason('');
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

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t('events.cancelReasonPlaceholder')}
              placeholderTextColor={themeColors.placeholder}
              multiline
              maxLength={MAX_REASON_LENGTH}
              editable={!submitting}
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text,
                },
              ]}
            />

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
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
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
