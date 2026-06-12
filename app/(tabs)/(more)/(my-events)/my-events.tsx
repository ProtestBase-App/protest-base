import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { usePastEvents } from '@/context/PastEventsProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { getOrganizationUpcomingEvents } from '@/services/event.service';
import { formatEventForList, FormattedEventListItem } from '@/utils/eventFormatters';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import EmptyMyUpcomingEvents from '@/components/EmptyMyUpcomingEvents';
import PastEventSummaryCard, { PastEventSummaryItem } from '@/components/PastEventSummaryCard';
import UpcomingEventsListItem from '@/components/UpcomingEventsListItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { logger } from '@/utils/logger';
import { RelativeRoutes } from '@/constants/Routes';
import { t } from '@/utils/i18n';

export default function MyEventsScreen() {
  const { user, isLogged, loading: authLoading, userLanguage } = useGlobalContext();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { section } = useLocalSearchParams<{ section?: 'upcoming' | 'past' }>();
  const { userOrganizations, loading: orgsLoading } = useUserOrganizations();

  const {
    pastEvents: cachedPastEvents,
    pastEventsTotal,
    loading: pastEventsLoading,
    error: pastEventsError,
    refreshPastEvents,
  } = usePastEvents();

  const scrollViewRef = useRef<ScrollView>(null);
  const pastSectionY = useRef<number>(0);
  const hasMountedRef = useRef(false);

  // Upcoming events change frequently — fetch fresh instead of caching.
  const [upcomingEventsSummary, setUpcomingEventsSummary] = useState<FormattedEventListItem[]>([]);
  const [totalUpcomingCount, setTotalUpcomingCount] = useState<number>(0);
  const [upcomingLoading, setUpcomingLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const pastEventsSummary: PastEventSummaryItem[] = useMemo(() => {
    return cachedPastEvents.slice(0, 3).map((event) => ({
      id: event.$id,
      title: event.title,
      startDateNoFormat: event.start_time.split('T')[0],
      view_count: event.view_count ?? 0,
    }));
  }, [cachedPastEvents]);

  // Memoized to avoid recreating the array each render — see other providers.
  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  const hasFetchedRef = useRef(false);
  // Guard against concurrent fetches on rapid focus changes.
  const isFetchingRef = useRef(false);

  const fetchUpcomingEvents = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!user?.$id || organizationIds.length === 0) {
      setUpcomingLoading(false);
      return;
    }

    isFetchingRef.current = true;
    try {
      setUpcomingError(null);
      const today = new Date().toISOString();

      const response = await getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: today,
        limit: 100,
      });

      const formattedEvents = response.events.map((event) =>
        formatEventForList(event, userLanguage)
      );

      // Soonest first.
      const sortedUpcoming = formattedEvents.sort((a, b) => {
        return new Date(a.startDateNoFormat).getTime() - new Date(b.startDateNoFormat).getTime();
      });

      setTotalUpcomingCount(sortedUpcoming.length);
      setUpcomingEventsSummary(sortedUpcoming.slice(0, 3));
    } catch (err: any) {
      logger.error('Error fetching upcoming events:', { error: err });
      setUpcomingError(err.message || 'Failed to fetch upcoming events');
    } finally {
      isFetchingRef.current = false;
      setUpcomingLoading(false);
    }
  }, [user?.$id, userLanguage, organizationIds]);

  // Initial fetch — past events come from the provider.
  useEffect(() => {
    if (
      isLogged &&
      user?.$id &&
      !orgsLoading &&
      organizationIds.length > 0 &&
      !hasFetchedRef.current
    ) {
      hasFetchedRef.current = true;
      fetchUpcomingEvents();
    }
  }, [fetchUpcomingEvents, isLogged, user?.$id, orgsLoading, organizationIds.length]);

  // Refetch on focus (e.g. after deleting an event). Skip the initial mount
  // to avoid a double-fetch race with the useEffect above.
  useFocusEffect(
    useCallback(() => {
      if (hasMountedRef.current) {
        fetchUpcomingEvents();
      } else {
        hasMountedRef.current = true;
      }
    }, [fetchUpcomingEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUpcomingEvents(), refreshPastEvents()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUpcomingEvents, refreshPastEvents]);

  const loading = (upcomingLoading || orgsLoading) && pastEventsLoading;
  const error = upcomingError || pastEventsError;

  // Scroll to the past section if requested via query param.
  useEffect(() => {
    if (section === 'past' && pastEventsSummary.length > 0 && !loading) {
      // Small delay to ensure the layout has settled.
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: pastSectionY.current, animated: true });
      }, 100);
    }
  }, [section, pastEventsSummary.length, loading]);

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (authLoading || loading) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <LoadingState color={themeColors.tint} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <ErrorState message={error} color={themeColors.tint} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const hasUpcomingEvents = upcomingEventsSummary.length > 0;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.tint}
            />
          }
        >
          <View style={[styles.section, styles.firstSection]}>
            <SectionHeader
              title={t('myEvents.listHeaderUpcoming')}
              subtitle={t('myEvents.eventsScheduled', { count: totalUpcomingCount })}
              variant="primary"
              actionLabel={hasUpcomingEvents ? t('common.viewAll') : undefined}
              onActionPress={
                hasUpcomingEvents ? () => router.push(RelativeRoutes.UPCOMING) : undefined
              }
            />
            {hasUpcomingEvents ? (
              <View style={styles.sectionContent}>
                {upcomingEventsSummary.map((event) => (
                  <UpcomingEventsListItem
                    key={event.id || event.$id}
                    event={event}
                    userLanguage={userLanguage}
                  />
                ))}
              </View>
            ) : (
              <EmptyMyUpcomingEvents />
            )}
          </View>

          <View
            style={styles.section}
            onLayout={(event) => {
              pastSectionY.current = event.nativeEvent.layout.y;
            }}
          >
            <SectionHeader
              title={t('myEvents.listHeaderPast')}
              subtitle={t('myEvents.completedEvents', { count: pastEventsTotal })}
              variant="primary"
              actionLabel={t('common.viewAll')}
              onActionPress={() => router.push(RelativeRoutes.PAST)}
            />
            <View style={styles.sectionContent}>
              {pastEventsSummary.map((event) => (
                <PastEventSummaryCard key={event.id} event={event} />
              ))}
            </View>
          </View>
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
    paddingBottom: Spacing['3xl'] + Spacing.bottomTabOffset,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  firstSection: {
    marginTop: Spacing.lg,
  },
  sectionContent: {
    paddingHorizontal: Spacing.md,
  },
});
