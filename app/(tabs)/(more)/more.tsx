import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { Easing, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { OrganizerAvatar } from '@/components/OrganizerAvatar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { StatTile } from '@/components/ui/StatTile';
import { GroupCard, GroupRow } from '@/components/ui/GroupCard';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useTemplates } from '@/context/TemplatesProvider';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { logout } from '@/services/auth.service';
import { createEventBackend } from '@/services/event.service';
import { eventCategories } from '@/constants/EventCategories';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { Routes } from '@/constants/Routes';
import { getThemeColors } from '@/utils/themeColors';
import { getInstalledAppVersion } from '@/utils/appVersion';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';

// Stat-tile accents from the More-tab handoff. Theme-independent accent
// constants like constants/CategoryColors.ts; purple uses the app's lightened
// #B35CC9 variant for readability (see CategoryColors.ts). The "upcoming" tile
// uses themeColors.tint / categoryBadgeBg instead.
const TILE_ACCENTS = {
  past: { color: '#B35CC9', chipBg: 'rgba(179, 92, 201, 0.12)' },
  drafts: { color: '#FF9800', chipBg: 'rgba(255, 152, 0, 0.12)' },
  templates: { color: '#2196F3', chipBg: 'rgba(33, 150, 243, 0.12)' },
} as const;

// Accent-tinted hero surface; the tint (#F94460) is identical in both themes,
// so these stay theme-independent (maps-tab ACCENT_* convention).
const HERO_GRADIENT: [string, string] = ['rgba(249, 68, 96, 0.16)', 'rgba(249, 68, 96, 0.04)'];
const HERO_BORDER = 'rgba(249, 68, 96, 0.3)';

/** The handoff's content entrance: fade + slide up 10pt over 0.28s. */
function fadeSlideIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }] },
    animations: {
      opacity: withTiming(1, { duration: 280, easing: Easing.ease }),
      transform: [{ translateY: withTiming(0, { duration: 280, easing: Easing.ease }) }],
    },
  };
}

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { user, userEventCounts, refreshUserEventCounts, clearAuthState } = useGlobalContext();
  const { userOrganizations, selectedOrganizationId, hasOrganizations } = useUserOrganizations();
  const { templates, isStale: isTemplatesStale, refreshTemplates } = useTemplates();
  const { isLogged, loading } = useAuth();
  const [isCreatingFake, setCreatingFake] = React.useState(false);

  // null means counts haven't loaded yet.
  const eventCounts = userEventCounts ?? { upcoming: 0, past: 0, draft: 0 };

  // __DEV__ ensures dev tools are stripped from production builds.
  const showDevTools = __DEV__;

  const appVersion = getInstalledAppVersion();

  const selectedOrganization =
    userOrganizations.find((org) => org.$id === selectedOrganizationId) ?? userOrganizations[0];
  const identityName = selectedOrganization?.Name ?? user?.name ?? '';

  // Refresh stat-tile counts when the user returns to this screen; cached
  // values render immediately while the refresh happens in the background.
  // The focus callback reads through a ref and keeps a stable identity:
  // useFocusEffect re-runs whenever the callback identity changes even while
  // the screen stays focused, which would duplicate fetches on dep changes.
  const hasFocusedRef = useRef(false);
  const refreshOnFocusRef = useRef(() => {});
  useEffect(() => {
    refreshOnFocusRef.current = () => {
      if (!isLogged) {
        return;
      }
      if (userOrganizations.length > 0) {
        refreshUserEventCounts(userOrganizations.map((org) => org.$id));
      }
      if (isTemplatesStale()) {
        refreshTemplates();
      }
    };
  });
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      refreshOnFocusRef.current();
    }, [])
  );

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
      logger.warn('[MoreScreen] Failed to create fake event', { error: errorMessage });
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setCreatingFake(false);
    }
  };

  const performLogout = async () => {
    try {
      await logout();
      await clearAuthState();
      Alert.alert(t('common.success'), t('more.logoutSuccess'));
      router.replace(Routes.EXPLORE);
    } catch (error) {
      logger.warn('[MoreScreen] Logout failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t('common.error'), t('more.logoutError'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('more.logoutConfirmTitle'), t('more.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.logout'),
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);
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
    } catch (error) {
      logger.warn('[MoreScreen] Failed to open feedback form', {
        error: error instanceof Error ? error.message : String(error),
      });
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

  // Resources + Settings groups are identical in both states.
  const staticSections = (
    <>
      <SectionHeader title={t('more.resources')} style={styles.sectionLabel} />
      <GroupCard>
        <GroupRow
          icon="exclamationmark.bubble"
          label={t('more.giveFeedback')}
          onPress={handleGiveFeedback}
          isLast
        />
      </GroupCard>

      <SectionHeader title={t('more.settings')} style={styles.sectionLabel} />
      <GroupCard>
        <GroupRow
          icon="mappin.and.ellipse"
          label={t('homeArea.settingsRow')}
          onPress={() => router.push(Routes.HOME_AREA)}
        />
        <GroupRow
          icon="lock.shield"
          label={t('more.privacyCenter')}
          onPress={() => router.push(Routes.PRIVACY_CENTER)}
        />
        <GroupRow
          icon="checkmark.shield"
          label={t('more.termsPrivacy')}
          onPress={() => router.push(Routes.TERMS_AND_CONDITIONS)}
        />
        <GroupRow
          icon="info.circle"
          label={t('more.about')}
          onPress={() => router.push(Routes.ABOUT)}
          isLast
        />
      </GroupCard>
    </>
  );

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedText style={styles.pageTitle}>{t('tabs.more')}</ThemedText>

            <Animated.View key={isLogged ? 'organizer' : 'guest'} entering={fadeSlideIn}>
              {isLogged ? (
                <>
                  <Pressable
                    testID="btn-more-account"
                    accessibilityRole="button"
                    accessibilityLabel={t('more.account')}
                    onPress={() => router.push(Routes.ACCOUNT)}
                    style={({ pressed }) => [
                      styles.identityCard,
                      {
                        backgroundColor: pressed
                          ? themeColors.surfaceAltBackground
                          : themeColors.cardBackground,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                  >
                    <OrganizerAvatar
                      avatarUrl={selectedOrganization?.avatar}
                      name={identityName}
                      size={48}
                    />
                    <View style={styles.identityText}>
                      <ThemedText style={styles.identityName} numberOfLines={1}>
                        {identityName}
                      </ThemedText>
                      <ThemedText
                        style={[styles.identitySubtitle, { color: themeColors.secondaryText }]}
                      >
                        {hasOrganizations
                          ? t('more.identitySubtitleOrganizer')
                          : t('more.identitySubtitle')}
                      </ThemedText>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={IconSizes.sm}
                      color={themeColors.chevron}
                    />
                  </Pressable>

                  <PillButton
                    testID="btn-create-event"
                    label={t('more.createNewEvent')}
                    leftIcon="plus"
                    onPress={() => router.push(Routes.CREATE_EVENT_OPTIONS)}
                    style={styles.createButton}
                  />

                  <SectionHeader title={t('more.myEvents')} style={styles.sectionLabel} />
                  <View style={styles.tileGrid}>
                    <View style={styles.tileRow}>
                      <StatTile
                        testID="btn-upcoming-events"
                        label={t('more.upcoming')}
                        count={eventCounts.upcoming}
                        icon="calendar"
                        accentColor={themeColors.tint}
                        chipBackground={themeColors.categoryBadgeBg}
                        onPress={() => router.push(Routes.MY_EVENTS_UPCOMING)}
                        style={styles.tile}
                      />
                      <StatTile
                        testID="btn-past-events"
                        label={t('more.past')}
                        count={eventCounts.past}
                        icon="clock"
                        accentColor={TILE_ACCENTS.past.color}
                        chipBackground={TILE_ACCENTS.past.chipBg}
                        onPress={() => router.push(Routes.MY_EVENTS_PAST)}
                        style={styles.tile}
                      />
                    </View>
                    <View style={styles.tileRow}>
                      <StatTile
                        testID="btn-draft-events"
                        label={t('more.drafts')}
                        count={eventCounts.draft}
                        icon="square.and.pencil"
                        accentColor={TILE_ACCENTS.drafts.color}
                        chipBackground={TILE_ACCENTS.drafts.chipBg}
                        onPress={() => router.push(Routes.DRAFT_EVENTS)}
                        style={styles.tile}
                      />
                      <StatTile
                        testID="btn-event-templates"
                        label={t('more.templates')}
                        count={templates.length}
                        icon="doc.text"
                        accentColor={TILE_ACCENTS.templates.color}
                        chipBackground={TILE_ACCENTS.templates.chipBg}
                        onPress={() => router.push(Routes.EVENT_TEMPLATES)}
                        style={styles.tile}
                      />
                    </View>
                  </View>

                  {staticSections}

                  <PillButton
                    testID="btn-more-logout"
                    variant="outline"
                    height={48}
                    label={t('more.logout')}
                    leftIcon="rectangle.portrait.and.arrow.right"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                  />

                  {showDevTools && (
                    <>
                      <SectionHeader title={t('more.devTools')} style={styles.sectionLabel} />
                      <GroupCard>
                        <GroupRow
                          icon="ladybug"
                          label={isCreatingFake ? t('more.creating') : t('more.createFakeEventDev')}
                          onPress={createFakeEvent}
                          isLast
                        />
                      </GroupCard>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View style={[styles.heroCard, { borderColor: HERO_BORDER }]}>
                    <LinearGradient
                      colors={HERO_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.6, y: 1 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                    <View
                      style={[
                        styles.heroIconChip,
                        { backgroundColor: themeColors.tint, shadowColor: themeColors.tint },
                      ]}
                    >
                      <IconSymbol name="megaphone" size={IconSizes.lg} color="white" />
                    </View>
                    <ThemedText style={styles.heroTitle}>{t('more.becomeOrganizer')}</ThemedText>
                    <ThemedText style={[styles.heroBody, { color: themeColors.secondaryText }]}>
                      {t('more.becomeOrganizerBody')}
                    </ThemedText>
                    <PillButton
                      height={46}
                      label={t('common.getStarted')}
                      onPress={() => router.push(Routes.BECOME_ORGANIZER)}
                    />
                    <ThemedText style={[styles.heroSignIn, { color: themeColors.secondaryText }]}>
                      {t('more.alreadyOrganizing')}{' '}
                      <ThemedText
                        testID="btn-more-sign-in"
                        accessibilityRole="link"
                        onPress={() => router.push(Routes.SIGN_IN)}
                        style={[styles.heroSignInLink, { color: themeColors.tint }]}
                      >
                        {t('more.signIn')}
                      </ThemedText>
                    </ThemedText>
                  </View>

                  {staticSections}
                </>
              )}

              {appVersion && (
                <ThemedText style={[styles.versionFooter, { color: themeColors.subtleText }]}>
                  {t('more.versionLabel', { version: appVersion })}
                </ThemedText>
              )}
            </Animated.View>
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
    paddingBottom: Spacing['2xl'] + Spacing.bottomTabOffset,
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  // 28 is a deliberate non-token size from the handoff (maps-tab title precedent).
  pageTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: Typography.families.extraBold,
    letterSpacing: -0.3,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
  },
  identityText: {
    flex: 1,
  },
  identityName: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.bold,
  },
  identitySubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: 2,
  },
  createButton: {
    marginTop: Spacing.md,
  },
  sectionLabel: {
    marginTop: Spacing.xl,
    marginBottom: 10,
    paddingHorizontal: Spacing.xs,
  },
  tileGrid: {
    gap: 10,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  heroIconChip: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 9,
    elevation: 6,
  },
  heroTitle: {
    fontSize: Typography.sizes.xl,
    lineHeight: 26,
    fontFamily: Typography.families.extraBold,
    letterSpacing: -0.2,
  },
  heroBody: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    lineHeight: 21,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroSignIn: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  heroSignInLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
});
