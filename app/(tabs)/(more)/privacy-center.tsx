import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PermissionStatusItem } from '@/components/ui/PermissionStatusItem';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import {
  getAllPermissionStatuses,
  openAppSettings,
  PermissionStatus,
} from '@/utils/permissionHelpers';
import { t } from '@/utils/i18n';

// Extracted semantic colors for consistency
const SemanticColors = {
  success: Colors.semantic.success,
  error: Colors.semantic.error,
};

interface PermissionStatuses {
  photoLibraryRead: PermissionStatus;
  calendar: PermissionStatus;
  notifications: PermissionStatus;
}

// Tab bar height constant for bottom padding
const TAB_BAR_HEIGHT = 80;

export default function PrivacyCenterScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [permissionStatuses, setPermissionStatuses] = useState<PermissionStatuses>({
    photoLibraryRead: 'undetermined',
    calendar: 'undetermined',
    notifications: 'undetermined',
  });

  // Load permission statuses
  const loadPermissionStatuses = useCallback(async () => {
    const statuses = await getAllPermissionStatuses();
    setPermissionStatuses(statuses);
  }, []);

  // Initial load
  useEffect(() => {
    loadPermissionStatuses();
  }, [loadPermissionStatuses]);

  // Reload when screen comes into focus (e.g., returning from Settings)
  useFocusEffect(
    useCallback(() => {
      loadPermissionStatuses();
    }, [loadPermissionStatuses])
  );

  const statusLabels = {
    granted: t('privacyCenter.statusGranted'),
    denied: t('privacyCenter.statusDenied'),
    undetermined: t('privacyCenter.statusUndetermined'),
    notUsed: '',
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ThemedView style={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }]}>
            {/* Header */}
            <ThemedView style={styles.headerSection}>
              <IconSymbol name="lock.shield.fill" size={48} color={SemanticColors.success} />
              <ThemedText style={styles.title}>{t('privacyCenter.title')}</ThemedText>
              <ThemedText style={styles.subtitle}>{t('privacyCenter.subtitle')}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* What We Don't Collect */}
            <View
              style={[
                styles.section,
                { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <IconSymbol name="xmark.shield" size={IconSizes.xl} color={SemanticColors.error} />
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyCenter.notCollectedTitle')}
                </ThemedText>
              </View>
              <View style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('privacyCenter.noIpAddresses')}
                </ThemedText>
              </View>
              <View style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('privacyCenter.noTrackingCookies')}
                </ThemedText>
              </View>
              <View style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('privacyCenter.noPersonalData')}
                </ThemedText>
              </View>
              <View style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('privacyCenter.noBehavioralData')}
                </ThemedText>
              </View>
            </View>

            {/* What Stays on Your Device */}
            <View
              style={[
                styles.section,
                { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <IconSymbol name="iphone" size={IconSizes.xl} color={themeColors.text} />
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyCenter.onDeviceTitle')}
                </ThemedText>
              </View>
              <ThemedText style={styles.paragraph}>
                {t('privacyCenter.onDeviceDescription')}
              </ThemedText>
              <ThemedText style={[styles.paragraph, styles.note]}>
                {t('privacyCenter.viewCounterNote')}
              </ThemedText>
            </View>

            {/* Transparency */}
            <View
              style={[
                styles.section,
                { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <IconSymbol name="eye" size={IconSizes.xl} color={themeColors.text} />
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyCenter.transparencyTitle')}
                </ThemedText>
              </View>
              <ThemedText style={styles.paragraph}>
                {t('privacyCenter.transparencyDescription')}
              </ThemedText>
            </View>

            {/* For Organizations */}
            <View
              style={[
                styles.section,
                { backgroundColor: themeColors.surfaceBackground, borderColor: themeColors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <IconSymbol name="person.2" size={IconSizes.xl} color={themeColors.text} />
                <ThemedText style={styles.sectionTitle}>
                  {t('privacyCenter.forOrgsTitle')}
                </ThemedText>
              </View>
              <ThemedText style={styles.paragraph}>
                {t('privacyCenter.forOrgsDescription')}
              </ThemedText>
            </View>

            <ThemedView style={styles.divider} />

            {/* App Permissions */}
            <ThemedView style={styles.permissionsSection}>
              <ThemedText style={styles.permissionsTitle}>
                {t('privacyCenter.permissionsTitle')}
              </ThemedText>
              <ThemedText style={styles.permissionsDescription}>
                {t('privacyCenter.permissionsDescription')}
              </ThemedText>

              {permissionStatuses.photoLibraryRead !== 'notUsed' && (
                <PermissionStatusItem
                  name={t('privacyCenter.photoReadPermission')}
                  description={t('privacyCenter.photoReadDescription')}
                  status={permissionStatuses.photoLibraryRead}
                  statusLabels={statusLabels}
                  onOpenSettings={openAppSettings}
                  openSettingsLabel={t('privacyCenter.openSettings')}
                />
              )}

              <PermissionStatusItem
                name={t('privacyCenter.calendarPermission')}
                description={t('privacyCenter.calendarDescription')}
                status={permissionStatuses.calendar}
                statusLabels={statusLabels}
                onOpenSettings={openAppSettings}
                openSettingsLabel={t('privacyCenter.openSettings')}
              />

              <PermissionStatusItem
                name={t('privacyCenter.notificationsPermission')}
                description={t('privacyCenter.notificationsDescription')}
                status={permissionStatuses.notifications}
                statusLabels={statusLabels}
                onOpenSettings={openAppSettings}
                openSettingsLabel={t('privacyCenter.openSettings')}
              />

              {/* Manage all permissions button */}
              <Pressable
                style={({ pressed }) => [
                  styles.manageButton,
                  { backgroundColor: themeColors.buttonSecondaryBackground },
                  pressed && styles.manageButtonPressed,
                ]}
                onPress={openAppSettings}
                accessibilityRole="button"
                accessibilityLabel={t('privacyCenter.manageAllPermissions')}
              >
                <IconSymbol name="gear" size={IconSizes.md} color={themeColors.text} />
                <ThemedText style={styles.manageButtonText}>
                  {t('privacyCenter.manageAllPermissions')}
                </ThemedText>
                <IconSymbol name="arrow.up.forward" size={IconSizes.sm} color={themeColors.text} />
              </Pressable>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    // paddingBottom is set dynamically based on tab bar height + safe area insets
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.families.semiBold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.8,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'grey',
    marginVertical: Spacing.lg,
    opacity: 0.3,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.semiBold,
    marginLeft: Spacing.md,
    flex: 1,
  },
  paragraph: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
    lineHeight: 24,
  },
  note: {
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  bullet: {
    width: 16,
    fontSize: Typography.sizes.base,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
    lineHeight: 22,
  },
  permissionsSection: {
    marginTop: Spacing.sm,
  },
  permissionsTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.sm,
  },
  permissionsDescription: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
    marginBottom: Spacing.lg,
    opacity: 0.8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  manageButtonPressed: {
    opacity: 0.7,
  },
  manageButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    flex: 1,
  },
});
