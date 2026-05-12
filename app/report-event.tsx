import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { t } from '@/utils/i18n';
import { Typography } from '@/constants/DesignTokens';

export default function ReportEventScreen() {
  return (
    <ThemedView style={styles.wrapper}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {t('report.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{t('report.underConstruction')}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
  },
});
