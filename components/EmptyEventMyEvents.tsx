import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, IconSizes, BorderRadius, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

export default function EmptyEventMyEvents() {
  const borderColor = useThemeColor({ light: '#d1d1d1', dark: '#3E3E42' }, 'icon');
  const iconColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <IconSymbol name="calendar" size={IconSizes['3xl']} color={iconColor} style={styles.icon} />
      <ThemedText type="subtitleBold" style={styles.title}>
        {t('explore.emptyTitle')}
      </ThemedText>
      <ThemedText type="default" style={styles.subtitle}>
        {t('explore.emptySubtitle')}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    marginRight: 6,
    marginVertical: Spacing.xl,
  },
  icon: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
});
