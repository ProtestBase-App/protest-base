import React from 'react';
import { StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface PrivacyInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PrivacyInfoModal({ visible, onClose }: PrivacyInfoModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Shield Icon */}
              <ThemedView style={styles.iconContainer}>
                <IconSymbol name="checkmark.shield" size={48} color={themeColors.tint} />
              </ThemedView>

              {/* Title */}
              <ThemedText style={styles.title}>{t('privacyInfo.title')}</ThemedText>

              {/* Subtitle */}
              <ThemedText style={[styles.subtitle, { color: themeColors.icon }]}>
                {t('privacyInfo.subtitle')}
              </ThemedText>

              {/* Section 1 */}
              <ThemedView style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{t('privacyInfo.localTitle')}</ThemedText>
                <ThemedText style={[styles.sectionBody, { color: themeColors.icon }]}>
                  {t('privacyInfo.localBody')}
                </ThemedText>
              </ThemedView>

              {/* Divider */}
              <ThemedView
                style={[
                  styles.divider,
                  {
                    borderBottomColor: themeColors.separator,
                  },
                ]}
              />

              {/* Section 2 */}
              <ThemedView style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyInfo.anonymousTitle')}
                </ThemedText>
                <ThemedText style={[styles.sectionBody, { color: themeColors.icon }]}>
                  {t('privacyInfo.anonymousBody')}
                </ThemedText>
              </ThemedView>

              {/* Divider */}
              <ThemedView
                style={[
                  styles.divider,
                  {
                    borderBottomColor: themeColors.separator,
                  },
                ]}
              />

              {/* Section 3 */}
              <ThemedView style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyInfo.noAccountTitle')}
                </ThemedText>
                <ThemedText style={[styles.sectionBody, { color: themeColors.icon }]}>
                  {t('privacyInfo.noAccountBody')}
                </ThemedText>
              </ThemedView>

              {/* Got It Button */}
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.tint }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('privacyInfo.closeAccessibility')}
              >
                <ThemedText style={styles.buttonText}>{t('privacyInfo.gotIt')}</ThemedText>
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
  divider: {
    borderBottomWidth: 1,
    marginVertical: Spacing.lg,
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
    color: 'white', // Always white on tint background - WCAG AA validated
  },
});
