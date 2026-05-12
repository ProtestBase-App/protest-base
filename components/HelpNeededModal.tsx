import React from 'react';
import { StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface HelpNeededModalProps {
  visible: boolean;
  onClose: () => void;
  helpDescription?: string;
}

export default function HelpNeededModal({
  visible,
  onClose,
  helpDescription,
}: HelpNeededModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const displayDescription = helpDescription?.trim() || t('help.noDetails');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Volunteer Icon */}
              <ThemedView style={styles.iconContainer}>
                <IconSymbol name="hand.raised.fill" size={48} color={colors.tint} />
              </ThemedView>

              {/* Title */}
              <ThemedText style={styles.title}>{t('help.title')}</ThemedText>

              {/* Subtitle */}
              <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                {t('help.subtitle')}
              </ThemedText>

              {/* Help Description Section */}
              <ThemedView style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('help.whatsNeeded')}</ThemedText>
                <ThemedText style={[styles.sectionBody, { color: colors.icon }]}>
                  {displayDescription}
                </ThemedText>
              </ThemedView>

              {/* Got It Button */}
              <Pressable
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('help.gotIt')}
              >
                <ThemedText style={styles.buttonText}>{t('help.gotIt')}</ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 480,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes['2xl'],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  button: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF', // Always white on tint background - WCAG AA validated
  },
});
