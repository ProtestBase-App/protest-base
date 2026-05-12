import React from 'react';
import { StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ExternalLink } from '@/components/ExternalLink';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';

export default function BecomeOrganizerScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Determine if user was redirected from create-event or create-template
  const isRedirected = params.from === 'create-event' || params.from === 'create-template';

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            {t('becomeOrganizer.title')}
          </ThemedText>

          {isRedirected && (
            <ThemedText style={[styles.contextMessage, { color: themeColors.warning }]}>
              {t('becomeOrganizer.createEventRequirement')}
            </ThemedText>
          )}

          <ThemedText style={styles.subtitle}>
            {t('becomeOrganizer.descriptionStart')}{' '}
            <ExternalLink
              href={ExternalLinks.ONBOARDING_FORM}
              style={[styles.link, { color: themeColors.tint }]}
            >
              {t('becomeOrganizer.applicationForm')}
            </ExternalLink>{' '}
            {t('becomeOrganizer.descriptionEnd')}
          </ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  contextMessage: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
  },
  link: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    textDecorationLine: 'underline',
  },
});
