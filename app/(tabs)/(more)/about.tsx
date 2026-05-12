import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ExternalLink } from '@/components/ExternalLink';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BetaInfo() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>{t('about.thankYou')}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.appDescription')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {`\u2022 ${t('about.helpActivists')}`}
            </ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {`\u2022 ${t('about.helpOrganizations')}`}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.howToJoin')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {t('about.howToJoinDescription')}{' '}
              <ExternalLink
                href={ExternalLinks.ONBOARDING_FORM}
                style={[styles.link, { color: themeColors.tint }]}
              >
                {t('about.onboardingForm')}
              </ExternalLink>{' '}
              {t('about.howToJoinDescriptionContinued')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.feedbackMatters')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {t('about.feedbackDescriptionStart')}{' '}
              <ExternalLink
                href={ExternalLinks.FEEDBACK_FORM}
                style={[styles.link, { color: themeColors.tint }]}
              >
                {t('about.feedbackForm')}
              </ExternalLink>{' '}
              {t('about.feedbackDescriptionEnd')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.privacyPriority')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {`\u2022 ${t('about.privacyOrganizations')}`}
            </ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {`\u2022 ${t('about.privacyUsers')}`}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.aboutCreators')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {t('about.creatorsDescription')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.featureContainer}>
            <ThemedText style={styles.featureTitle}>{t('about.joinUs')}</ThemedText>
            <ThemedText type="default" style={styles.featureText}>
              {t('about.joinUsDescription')}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: '100%',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 100,
  },
  sectionContainer: {
    marginTop: 14,
    marginBottom: 15,
  },
  sectionTitle: {
    fontFamily: Typography.families.semiBold,
    fontSize: 22,
    lineHeight: 32,
    textAlign: 'center',
  },
  featureContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featureTitle: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.lg,
    lineHeight: 26,
    marginBottom: 5,
  },
  featureText: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    paddingLeft: 20,
  },
  link: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
});
