import { StyleSheet } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import CustomButton from './CustomButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, IconSizes, BorderRadius, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

export default function EmptyEvent() {
  const [isSubmitting, setSubmitting] = useState(false);
  const borderColor = useThemeColor({ light: '#d1d1d1', dark: '#3E3E42' }, 'icon');
  const iconColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');

  const submit = async () => {
    setSubmitting(true);
    try {
      router.push('/(tabs)/(explore)/explore' as any);
    } catch (error) {
      logger.warn('Failed to navigate to explore', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <IconSymbol name="calendar" size={IconSizes['2xl']} color={iconColor} style={styles.icon} />
      <ThemedText type="subtitleBold" style={styles.title}>
        {t('home.emptyTitle')}
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        {t('home.emptySubtitle')}
      </ThemedText>
      <CustomButton
        title={t('home.emptyButton')}
        handlePress={submit}
        containerStyles={styles.button}
        isLoading={isSubmitting}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginRight: 6,
  },
  icon: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    opacity: 0.7,
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
});
