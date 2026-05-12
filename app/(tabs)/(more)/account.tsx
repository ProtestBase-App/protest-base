import React from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { CTAButton } from '@/components/ui/CTAButton';
import { Spacing } from '@/constants/DesignTokens';
import { Routes } from '@/constants/Routes';
import { t } from '@/utils/i18n';

export default function AccountScreen() {
  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ThemedView style={styles.container}>
          <CTAButton
            text={t('more.accountInfo')}
            leftIcon="doc.text"
            variant="secondary"
            onPress={() => router.push(Routes.ACCOUNT_INFO)}
          />

          <CTAButton
            text={t('more.deleteAccount')}
            leftIcon="trash"
            variant="secondary"
            onPress={() => router.push(Routes.DELETE_ACCOUNT)}
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
});
