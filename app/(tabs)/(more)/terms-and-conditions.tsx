import React from 'react';
import { ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Typography, Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';

export default function TermsAndConditionsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <ThemedView style={styles.content}>
            <ThemedText style={styles.title}>{t('termsAndConditions.title')}</ThemedText>
            <ThemedText style={styles.lastUpdated}>
              {t('termsAndConditions.lastUpdated')}
            </ThemedText>

            <ThemedText style={styles.paragraph}>{t('termsAndConditions.intro1')}</ThemedText>

            <ThemedText style={styles.paragraph}>{t('termsAndConditions.intro2')}</ThemedText>

            <ThemedView style={styles.divider} />

            {/* Section 1: Acceptance of Terms */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section1Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section1Intro')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section1Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section1Bullet2')}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 2: Your Rights as an EU Citizen */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section2Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section2Intro')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section2Article11Title')}
                  {'\n'}
                  {t('termsAndConditions.section2Article11Text')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section2Article12Title')}
                  {'\n'}
                  {t('termsAndConditions.section2Article12Text')}
                </ThemedText>
              </ThemedView>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section2Conclusion')}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 3: For Users (Without Log-In) */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section3Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section3Intro')}
              </ThemedText>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section3_1Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_1Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_1Bullet2')}
                </ThemedText>
              </ThemedView>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section3_2Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_2Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_2Bullet2')}
                </ThemedText>
              </ThemedView>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section3_3Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_3Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section3_3Bullet2')}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 4: For Organisations (With Log-In) */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section4Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section4Intro')}
              </ThemedText>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section4_1Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_1Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_1Bullet2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_1Bullet3')}
                </ThemedText>
              </ThemedView>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section4_2Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_2Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_2Bullet2')}
                </ThemedText>
              </ThemedView>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section4_3Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Bullet1')}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Bullet2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Nested1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Nested2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Nested3')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_3Bullet3')}
                </ThemedText>
              </ThemedView>

              <ThemedText style={styles.subSectionTitle}>
                {t('termsAndConditions.section4_4Title')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_4Bullet1')}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_4Bullet2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_4Nested1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_4Nested2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.nestedBulletPoint}>
                <ThemedText style={styles.nestedBullet}>○</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section4_4Nested3')}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 5: Disclaimer of Responsibility */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section5Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section5Intro')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section5Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section5Bullet2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section5Bullet3')}
                </ThemedText>
              </ThemedView>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section5Conclusion')}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 6: Safety First */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section6Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section6Intro')}
              </ThemedText>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section6Bullet1')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section6Bullet2')}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.bulletPoint}>
                <ThemedText style={styles.bullet}>•</ThemedText>
                <ThemedText style={styles.bulletText}>
                  {t('termsAndConditions.section6Bullet3')}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 7: Changes to These Terms */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section7Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section7Text')}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 8: Governing Law */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section8Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section8Text')}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            {/* Section 9: Contact Us */}
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {t('termsAndConditions.section9Title')}
              </ThemedText>
              <ThemedText style={styles.paragraph}>
                {t('termsAndConditions.section9Intro')}
              </ThemedText>
              <ThemedText
                style={[styles.link, { color: themeColors.link }]}
                onPress={() => Linking.openURL('mailto:info@protestbase.be')}
              >
                info@protestbase.be
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.divider} />

            <ThemedText style={styles.conclusion}>{t('termsAndConditions.conclusion')}</ThemedText>
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
    padding: 20,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'center',
    lineHeight: 30,
  },
  lastUpdated: {
    fontSize: Typography.sizes.sm,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    marginBottom: 10,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingLeft: 0,
  },
  nestedBulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  nestedBullet: {
    width: 15,
    fontSize: Typography.sizes.sm,
    marginRight: Spacing.xs,
    opacity: 0.7,
  },
  bullet: {
    width: 15,
    fontSize: Typography.sizes.base,
  },
  bulletText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'grey',
    marginVertical: 15,
  },
  link: {
    fontSize: Typography.sizes.base,
    textDecorationLine: 'underline',
    marginVertical: 5,
  },
  conclusion: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 40,
  },
});
