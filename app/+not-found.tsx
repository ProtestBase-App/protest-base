import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/utils/i18n';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t('notFound.headerTitle') }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('notFound.title')}</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">{t('notFound.goHome')}</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
