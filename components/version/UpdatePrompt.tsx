/**
 * Update Prompt
 *
 * DISMISSIBLE modal displayed when the user's app version is below
 * the minimum required version BUT forceUpdate is false.
 * User can choose to update or skip and continue to the app.
 */

import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import CustomButton from '@/components/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, IconSizes, Shadows } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface UpdatePromptProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Message from backend, or null for default message */
  message: string | null;
  /** Callback to open the store URL */
  onUpdate: () => void;
  /** Callback to dismiss the prompt */
  onDismiss: () => void;
}

/**
 * Dismissible update prompt modal
 */
export function UpdatePrompt({
  visible,
  message,
  onUpdate,
  onDismiss,
}: UpdatePromptProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint;
  const overlayBg = colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

  const shadowStyle = Platform.OS === 'ios' ? Shadows.modal.ios : Shadows.modal.android;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
        <ThemedView style={[styles.modal, shadowStyle]}>
          <Ionicons name="download-outline" size={IconSizes['3xl']} color={iconColor} />
          <ThemedText type="subtitleBold" style={styles.title}>
            {t('version.updatePrompt.title')}
          </ThemedText>
          <ThemedText style={styles.message}>
            {message || t('version.updatePrompt.message')}
          </ThemedText>
          <View style={styles.buttons}>
            <CustomButton
              title={t('version.updatePrompt.updateButton')}
              handlePress={onUpdate}
              containerStyles={styles.updateButton}
              isLoading={false}
            />
            <TouchableOpacity onPress={onDismiss} style={styles.laterButton}>
              <ThemedText style={styles.laterText}>
                {t('version.updatePrompt.laterButton')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing.xl,
  },
  buttons: {
    width: '100%',
    gap: Spacing.md,
  },
  updateButton: {
    width: '100%',
  },
  laterButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  laterText: {
    opacity: 0.7,
  },
});
