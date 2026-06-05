import React from 'react';
import { ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useAuth } from '@/hooks/useAuth';
import { CTAButton } from '@/components/ui/CTAButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { logout } from '@/services/auth.service';
import { createEventBackend } from '@/services/event.service';
import { eventCategories } from '@/constants/EventCategories';
import { Spacing } from '@/constants/DesignTokens';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { Routes } from '@/constants/Routes';
import { t } from '@/utils/i18n';

export default function MoreScreen() {
  const { userEventCounts, clearAuthState } = useGlobalContext();
  const { selectedOrganizationId } = useUserOrganizations();
  const { isLogged, loading } = useAuth();
  const [isCreatingFake, setCreatingFake] = React.useState(false);

  // null means counts haven't loaded yet.
  const eventCounts = userEventCounts ?? { upcoming: 0, past: 0, draft: 0 };

  // __DEV__ ensures dev tools are stripped from production builds.
  const showDevTools = __DEV__;

  const createFakeEvent = async () => {
    if (isCreatingFake) return;
    setCreatingFake(true);
    try {
      if (!selectedOrganizationId) {
        Alert.alert(
          t('common.error'),
          'No organization selected. Please join an organization first.'
        );
        return;
      }

      const now = new Date();
      // Today + 1 year at 10:00 (start) and the following day at 10:00 (end).
      const startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() + 1);
      startDate.setHours(10, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const fakeEvent = {
        organization_id: selectedOrganizationId,
        title: `Fake Event ${new Date().getTime().toString().slice(-4)}`,
        description:
          'This is a generated fake event for testing purposes. Join us for a peaceful public demonstration at Gare du Nord (Brussels) as we stand together to raise awareness about ongoing social and humanitarian challenges affecting communities both locally and globally. During the event, our volunteers will be present to provide information, distribute materials, and help guide participants. We encourage a respectful, inclusive atmosphere and ask all attendees to follow safety guidelines and instructions from organizers.',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        street_address: 'Gare du Nord',
        city: undefined,
        region: undefined,
        country: 'belgium',
        postal_code: 1000,
        website_url: 'https://protestbase.be',
        categories: eventCategories[0].value,
        disclaimer: 'This event is fictional and created for testing purposes only.',
        help_needed: true,
        help_description:
          'Yes. We request assistance in ensuring participant safety, managing pedestrian flow around Gare du Nord, and providing coordination support for accessibility and first-aid needs.',
        co_organizers: [],
      };

      await createEventBackend(fakeEvent);
      Alert.alert(t('common.success'), t('alerts.fakeEventCreated'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setCreatingFake(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      await clearAuthState();
      Alert.alert(t('common.success'), t('more.logoutSuccess'));
      router.replace(Routes.EXPLORE);
    } catch {
      Alert.alert(t('common.error'), t('more.logoutError'));
    }
  };

  const handleGiveFeedback = async () => {
    const feedbackUrl = ExternalLinks.FEEDBACK_FORM;
    try {
      const supported = await Linking.canOpenURL(feedbackUrl);
      if (supported) {
        await Linking.openURL(feedbackUrl);
      } else {
        Alert.alert(t('common.error'), t('alerts.feedbackFormError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('alerts.feedbackFormOpenError'));
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  // Show the splash only on first load; counts are cached on subsequent visits.
  if (isLogged && userEventCounts === null) {
    return <LoadingState />;
  }

  if (!isLogged) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedView style={styles.container}>
              <ThemedText type="title" style={styles.pageTitle}>
                {t('tabs.more')}
              </ThemedText>

              <SectionHeader title={t('more.accountResources').toUpperCase()} />
              <CTAButton
                testID="btn-more-sign-in"
                text={t('more.signInToManageEvents')}
                leftIcon="person.crop.circle"
                variant="secondary"
                onPress={() => router.push(Routes.SIGN_IN)}
              />
              <CTAButton
                text={t('more.becomeOrganizer')}
                leftIcon="megaphone"
                variant="secondary"
                onPress={() => router.push(Routes.BECOME_ORGANIZER)}
              />
              <CTAButton
                text={t('more.giveFeedback')}
                leftIcon="exclamationmark.bubble"
                variant="secondary"
                onPress={handleGiveFeedback}
              />

              <SectionHeader title={t('more.settings').toUpperCase()} />
              <CTAButton
                text={t('more.privacyCenter')}
                leftIcon="lock.shield"
                variant="secondary"
                onPress={() => router.push(Routes.PRIVACY_CENTER)}
              />
              <CTAButton
                text={t('more.termsPrivacy')}
                leftIcon="checkmark.shield"
                variant="secondary"
                onPress={() => router.push(Routes.TERMS_AND_CONDITIONS)}
              />
              <CTAButton
                text={t('more.about')}
                leftIcon="info.circle"
                variant="secondary"
                onPress={() => router.push(Routes.ABOUT)}
              />
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.pageTitle}>
              {t('tabs.more')}
            </ThemedText>

            <SectionHeader title={t('more.myOrganization').toUpperCase()} />
            <CTAButton
              testID="btn-create-event"
              text={t('more.createNewEvent')}
              leftIcon="plus.circle"
              variant="secondary"
              onPress={() => router.push(Routes.CREATE_EVENT_OPTIONS)}
            />
            <CTAButton
              text={t('more.myUpcomingEvents')}
              leftIcon="calendar"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: Routes.MY_EVENTS, params: { section: 'upcoming' } })
              }
              badge={eventCounts.upcoming}
            />
            <CTAButton
              text={t('more.myPastEvents')}
              leftIcon="clock"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: Routes.MY_EVENTS, params: { section: 'past' } })
              }
              badge={eventCounts.past}
            />
            <CTAButton
              testID="btn-draft-events"
              text={t('more.draftEvents')}
              leftIcon="square.and.pencil"
              variant="secondary"
              onPress={() => router.push(Routes.DRAFT_EVENTS)}
              badge={eventCounts.draft}
            />
            <CTAButton
              text={t('more.account')}
              leftIcon="key"
              variant="secondary"
              onPress={() => router.push(Routes.ACCOUNT)}
            />

            <SectionHeader title={t('more.tools').toUpperCase()} />
            <CTAButton
              testID="btn-event-templates"
              text={t('more.eventTemplates')}
              leftIcon="doc.text"
              variant="secondary"
              onPress={() => router.push(Routes.EVENT_TEMPLATES)}
            />

            <SectionHeader title={t('more.resources').toUpperCase()} />
            <CTAButton
              text={t('more.giveFeedback')}
              leftIcon="exclamationmark.bubble"
              variant="secondary"
              onPress={handleGiveFeedback}
            />

            <SectionHeader title={t('more.settings').toUpperCase()} />
            <CTAButton
              text={t('more.privacyCenter')}
              leftIcon="lock.shield"
              variant="secondary"
              onPress={() => router.push(Routes.PRIVACY_CENTER)}
            />
            <CTAButton
              text={t('more.termsPrivacy')}
              leftIcon="checkmark.shield"
              variant="secondary"
              onPress={() => router.push(Routes.TERMS_AND_CONDITIONS)}
            />
            <CTAButton
              text={t('more.about')}
              leftIcon="info.circle"
              variant="secondary"
              onPress={() => router.push(Routes.ABOUT)}
            />
            <CTAButton
              testID="btn-more-logout"
              text={t('more.logout')}
              leftIcon="rectangle.portrait.and.arrow.right"
              variant="secondary"
              onPress={handleLogout}
            />

            {showDevTools && (
              <>
                <SectionHeader title={t('more.devTools').toUpperCase()} />
                <CTAButton
                  text={isCreatingFake ? t('more.creating') : t('more.createFakeEventDev')}
                  leftIcon="ladybug"
                  variant="secondary"
                  onPress={createFakeEvent}
                />
              </>
            )}
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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  pageTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
