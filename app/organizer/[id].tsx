import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { OrganizerAvatar } from '@/components/OrganizerAvatar';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useFollowedOrgs } from '@/context/FollowedOrgsProvider';
import { DEFAULT_EXPLORE_FILTERS, useExploreTabContext } from '@/context/ExploreTabProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { getEventsBackend } from '@/services/event.service';
import { getOrganizationById } from '@/services/organizer.service';
import { OrganizationDetail } from '@/types/organization.types';
import { formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import { getThemeColors } from '@/utils/themeColors';
import { openExternalUrlSafely } from '@/utils/urlSafety';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { useLogoScheme } from '@/hooks/useLogoScheme';

const UPCOMING_PREVIEW_COUNT = 3;

// Rotating palette for the event card icon — cycled by index so consecutive
// events look distinct. Values are intentionally bright enough to read on dark
// and light backgrounds.
const EVENT_CARD_PALETTE = [
  { bg: 'rgba(76, 175, 80, 0.18)', border: 'rgba(76, 175, 80, 0.45)', dot: '#4CAF50' },
  { bg: 'rgba(33, 150, 243, 0.18)', border: 'rgba(33, 150, 243, 0.45)', dot: '#2196F3' },
  { bg: 'rgba(156, 39, 176, 0.2)', border: 'rgba(156, 39, 176, 0.5)', dot: '#B35CC9' },
  { bg: 'rgba(255, 152, 0, 0.18)', border: 'rgba(255, 152, 0, 0.45)', dot: '#FF9800' },
  { bg: 'rgba(233, 30, 99, 0.18)', border: 'rgba(233, 30, 99, 0.45)', dot: '#E91E63' },
];

export default function OrganizerProfile() {
  const { id } = useLocalSearchParams();
  const orgId = Array.isArray(id) ? id[0] : id;

  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const logo = useLogoScheme();

  const { organizations } = useOrganizations();
  const { userLanguage } = useGlobalContext();
  const {
    followOrganization,
    unfollowOrganization,
    isFollowing: isFollowingOrg,
  } = useFollowedOrgs();
  const { getSubMunicipalityName } = usePostalCodes();
  const { setAppliedFilters, setSearchQuery, setShouldScrollToTop } = useExploreTabContext();

  // Listing cache supplies Name/$createdAt without waiting for the detail fetch.
  const cachedOrg = organizations.find((o) => o.$id === orgId);

  const [detail, setDetail] = useState<OrganizationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number>(0);

  const [upcomingEvents, setUpcomingEvents] = useState<FormattedEvent[]>([]);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [organizerAvatar, setOrganizerAvatar] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  const isFollowing = orgId ? isFollowingOrg(orgId) : false;

  // Load rich organization detail. Silently falls back to the cached listing
  // entry if the detail endpoint fails (keeps Name rendering even without bio).
  useEffect(() => {
    if (!orgId) return;
    setDetailLoading(true);
    getOrganizationById(orgId)
      .then((data) => {
        setDetail(data);
        setFollowerCount(data.follower_count ?? 0);
        if (data.avatar) setOrganizerAvatar(data.avatar);
      })
      .catch((err) => {
        logger.warn('[OrganizerProfile] Failed to load detail', { error: err });
      })
      .finally(() => setDetailLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    setEventsLoading(true);
    getEventsBackend({
      organizationId: orgId,
      startDate: new Date().toISOString(),
      limit: UPCOMING_PREVIEW_COUNT,
    })
      .then((res) => {
        const formatted = res.events.map((e) => formatEventForDisplay(e, userLanguage));
        setUpcomingEvents(formatted);
        setEventCount(res.total);
        // The organization endpoint doesn't carry an avatar — fall back to the
        // first event's organizer_avatar (same org because we filtered by orgId).
        // Only set from events if the detail fetch didn't already provide one.
        setOrganizerAvatar((existing) => {
          if (existing) return existing;
          const firstWithAvatar = res.events.find((e) => !!e.organizer_avatar)?.organizer_avatar;
          return firstWithAvatar ?? null;
        });
      })
      .catch((err) => {
        logger.warn('[OrganizerProfile] Failed to load events', { error: err });
      })
      .finally(() => {
        setEventsLoading(false);
      });
  }, [orgId, userLanguage]);

  const handleFollow = async () => {
    if (!orgId) return;
    // Optimistic counter update; provider also optimistically flips isFollowing.
    const prevCount = followerCount;
    const wasFollowing = isFollowing;
    setFollowerCount(wasFollowing ? Math.max(0, prevCount - 1) : prevCount + 1);

    const newCount = wasFollowing
      ? await unfollowOrganization(orgId)
      : await followOrganization(orgId);

    if (newCount !== null) {
      setFollowerCount(newCount);
    } else {
      // Server call failed; provider already rolled back isFollowing.
      setFollowerCount(prevCount);
    }
  };

  const handleShare = () => {
    Alert.alert(t('events.comingSoon'), '');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(Routes.HOME);
    }
  };

  // Navigate to the Explore tab scoped to this organizer's events. Other filters
  // are reset to avoid an empty list if the user had narrowed before. `push`
  // (not `replace`) so the user can swipe back to the organizer page.
  const handleSeeAllEvents = () => {
    if (!orgId) return;
    const orgArr = [orgId];
    setAppliedFilters({ ...DEFAULT_EXPLORE_FILTERS, organizations: orgArr });
    setSearchQuery('');
    setShouldScrollToTop(true);
    router.push(Routes.EXPLORE);
  };

  // Prefer detail fields (richer); fall back to the cached listing entry when
  // detail hasn't loaded or 404'd. createdAt is the same on both by design.
  const name = detail?.Name ?? cachedOrg?.Name ?? '—';
  const memberSinceSource = detail?.$createdAt ?? cachedOrg?.$createdAt;
  const memberSince = memberSinceSource
    ? new Date(memberSinceSource).toLocaleDateString(userLanguage, {
        year: 'numeric',
        month: 'long',
      })
    : '—';
  const bio = detail?.bio ?? null;
  const location = detail?.location ?? null;
  const websiteUrl = detail?.website_url ?? null;
  const isVerified = detail?.is_verified === true;
  // Detail endpoint returns event_count for the whole org; fall back to the
  // "upcoming" total we already fetched when it's missing.
  const totalEventCount = detail?.event_count ?? eventCount;

  const formatEventLocation = (ev: FormattedEvent): string => {
    const city =
      ev.postal_code && ev.country
        ? getSubMunicipalityName(String(ev.postal_code), ev.country, ev.city)
        : ev.city;
    return ev.street_address || city || '';
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={[styles.navBar, { borderBottomColor: themeColors.separator }]}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.navBack}
              accessibilityRole="button"
            >
              <IconSymbol name="arrow.backward" size={IconSizes.xl} color={themeColors.text} />
            </TouchableOpacity>
            <RNImage source={logo} style={styles.navLogo} resizeMode="contain" />
            <View style={styles.navRight}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.navIconButton}
                accessibilityRole="button"
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={IconSizes.lg}
                  color={themeColors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.identity}>
              <OrganizerAvatar avatarUrl={organizerAvatar} name={name} size={88} />
              <View style={styles.orgNameRow}>
                <ThemedText style={styles.orgName}>{name}</ThemedText>
                {isVerified && (
                  <IconSymbol
                    name="checkmark.shield"
                    size={IconSizes.md}
                    color={themeColors.tint}
                    style={styles.verifiedIcon}
                  />
                )}
              </View>
              <ThemedText style={[styles.memberSinceText, { color: themeColors.subtleText }]}>
                {t('organizer.memberSince')} {memberSince}
              </ThemedText>
            </View>

            <View
              style={[
                styles.statsRow,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              <StatItem
                label={t('organizer.events')}
                value={
                  totalEventCount === null || totalEventCount === undefined
                    ? '…'
                    : String(totalEventCount)
                }
              />
              <View style={[styles.statDivider, { backgroundColor: themeColors.separator }]} />
              <StatItem label={t('organizer.followers')} value={String(followerCount)} />
              {typeof detail?.member_count === 'number' && (
                <>
                  <View style={[styles.statDivider, { backgroundColor: themeColors.separator }]} />
                  <StatItem label={t('organizer.members')} value={String(detail.member_count)} />
                </>
              )}
            </View>

            {/* Follow button. Backend handles auth-gated behaviour (guest: direct
                ±1; signed-in: 24h dedup per user). */}
            <TouchableOpacity
              style={[
                styles.followButton,
                {
                  backgroundColor: isFollowing
                    ? themeColors.buttonSecondaryBackground
                    : themeColors.tint,
                  borderColor: isFollowing ? themeColors.cardBorder : 'transparent',
                  borderWidth: isFollowing ? 1 : 0,
                },
              ]}
              onPress={handleFollow}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <ThemedText
                style={[
                  styles.followButtonText,
                  { color: isFollowing ? themeColors.text : 'white' },
                ]}
              >
                {isFollowing ? t('organizer.following') : t('organizer.follow')}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>{t('organizer.upcomingEvents')}</ThemedText>
                {!eventsLoading && eventCount !== null && eventCount > 0 && (
                  <TouchableOpacity
                    onPress={handleSeeAllEvents}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ThemedText style={[styles.seeAllText, { color: themeColors.tint }]}>
                      {t('organizer.seeAll')}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {eventsLoading ? (
                <ActivityIndicator
                  size="small"
                  color={themeColors.tint}
                  style={styles.eventsLoader}
                />
              ) : upcomingEvents.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: themeColors.subtleText }]}>
                  {t('organizer.noUpcomingEvents')}
                </ThemedText>
              ) : (
                upcomingEvents.slice(0, UPCOMING_PREVIEW_COUNT).map((ev, index) => {
                  const palette = EVENT_CARD_PALETTE[index % EVENT_CARD_PALETTE.length];
                  const location = formatEventLocation(ev);
                  return (
                    <TouchableOpacity
                      key={ev.$id}
                      style={[
                        styles.eventCard,
                        {
                          backgroundColor: themeColors.cardBackground,
                          borderColor: themeColors.cardBorder,
                        },
                      ]}
                      onPress={() => router.push(DynamicRoutes.event(ev.$id))}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.eventIconBox,
                          { backgroundColor: palette.bg, borderColor: palette.border },
                        ]}
                      >
                        <View style={[styles.eventIconDot, { backgroundColor: palette.dot }]} />
                      </View>
                      <View style={styles.eventCardText}>
                        <ThemedText style={styles.eventCardTitle} numberOfLines={2}>
                          {ev.title}
                        </ThemedText>
                        <ThemedText
                          style={[styles.eventCardMeta, { color: themeColors.subtleText }]}
                          numberOfLines={1}
                        >
                          {ev.start_date}
                          {ev.start_time ? ` · ${ev.start_time}` : ''}
                        </ThemedText>
                        {location ? (
                          <ThemedText
                            style={[styles.eventCardMeta, { color: themeColors.subtleText }]}
                            numberOfLines={1}
                          >
                            {location}
                          </ThemedText>
                        ) : null}
                      </View>
                      <IconSymbol
                        name="chevron.right"
                        size={IconSizes.md}
                        color={themeColors.chevron}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, styles.aboutTitle]}>
                {t('organizer.about')}
              </ThemedText>
              <View
                style={[
                  styles.aboutCard,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                {detailLoading && !detail ? (
                  <ActivityIndicator
                    size="small"
                    color={themeColors.tint}
                    style={styles.aboutLoader}
                  />
                ) : (
                  <>
                    <ThemedText style={[styles.bioText, { color: themeColors.text }]}>
                      {bio?.trim() ? bio : t('organizer.noBio')}
                    </ThemedText>

                    {(location || websiteUrl || isVerified || memberSinceSource) && (
                      <View
                        style={[styles.aboutSeparator, { backgroundColor: themeColors.separator }]}
                      />
                    )}

                    {location ? (
                      <View style={styles.aboutRow}>
                        <IconSymbol
                          name="location.fill"
                          size={IconSizes.md}
                          color={themeColors.subtleText}
                        />
                        <ThemedText
                          style={[styles.aboutText, { color: themeColors.secondaryText }]}
                        >
                          {location}
                        </ThemedText>
                      </View>
                    ) : null}

                    {websiteUrl ? (
                      <TouchableOpacity
                        style={styles.aboutRow}
                        onPress={() => {
                          if (!websiteUrl) return;
                          // website_url is organizer-supplied (untrusted); only
                          // open plain http(s) links so a crafted value cannot
                          // trigger arbitrary scheme handling on the device.
                          void openExternalUrlSafely(websiteUrl, 'organizer-website');
                        }}
                        accessibilityRole="link"
                      >
                        <IconSymbol
                          name="globe.europe.africa"
                          size={IconSizes.md}
                          color={themeColors.tint}
                        />
                        <ThemedText
                          style={[styles.aboutText, { color: themeColors.tint }]}
                          numberOfLines={1}
                        >
                          {websiteUrl}
                        </ThemedText>
                      </TouchableOpacity>
                    ) : null}

                    {isVerified ? (
                      <View style={styles.aboutRow}>
                        <IconSymbol
                          name="checkmark.shield"
                          size={IconSizes.md}
                          color={themeColors.tint}
                        />
                        <ThemedText
                          style={[styles.aboutText, { color: themeColors.secondaryText }]}
                        >
                          {t('organizer.verifiedOrganizer')}
                        </ThemedText>
                      </View>
                    ) : null}

                    {memberSinceSource ? (
                      <View style={styles.aboutRow}>
                        <IconSymbol
                          name="calendar"
                          size={IconSizes.md}
                          color={themeColors.subtleText}
                        />
                        <ThemedText
                          style={[styles.aboutText, { color: themeColors.secondaryText }]}
                        >
                          {t('organizer.memberSince')} {memberSince}
                        </ThemedText>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

interface StatItemProps {
  label: string;
  value: string;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
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
  },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  navBack: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  navLogo: {
    width: 44,
    height: 44,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  navIconButton: {
    padding: Spacing.xs,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  identity: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  orgName: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes['2xl'],
    textAlign: 'center',
  },
  verifiedIcon: {
    marginTop: 2,
  },
  memberSinceText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xl,
  },
  statLabel: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xxs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  followButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  followButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },

  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.families.bold,
    fontSize: 17,
  },
  aboutTitle: {
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
  eventsLoader: {
    marginVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  eventIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  eventCardText: {
    flex: 1,
  },
  eventCardTitle: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    marginBottom: 2,
  },
  eventCardMeta: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },

  aboutCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  aboutLoader: {
    marginVertical: Spacing.sm,
  },
  aboutSeparator: {
    height: 0.5,
    marginVertical: Spacing.xs,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aboutText: {
    flex: 1,
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
  },
  bioText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },

  bottomPadding: {
    height: 32,
  },
});
