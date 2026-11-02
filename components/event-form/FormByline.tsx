import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export function FormByline({ name }: { name?: string }) {
  const themeColors = getThemeColors(useColorScheme());
  if (!name) return null;

  return (
    <ThemedText style={[styles.byline, { color: themeColors.secondaryText }]}>
      {t('createEvent.byOrganization', { name })}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  byline: {
    fontSize: 13,
    lineHeight: 18,
  },
});
