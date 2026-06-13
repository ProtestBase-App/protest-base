import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import UpcomingNextUp from '@/components/UpcomingNextUp';
import UpcomingTimelineRow from '@/components/UpcomingTimelineRow';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { DashedEmptyState } from '@/components/ui/DashedEmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GroupLabelRow } from '@/components/ui/GroupLabelRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { API_LIMITS } from '@/constants/ApiConfig';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { Routes } from '@/constants/Routes';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';
import { getOrganizationUpcomingEvents } from '@/services/event.service';
import { Event } from '@/types/event.types';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { getThemeColors } from '@/utils/themeColors';
import {
  buildUpcomingSections,
  formatGroupDateLabel,
  isStartedAndOngoing,
  splitUpcomingEvents,
  UpcomingSection,
  UpcomingSectionRow,
} from '@/utils/upcomingTimelineUtils';

/** While focused, re-derive the clock so NOW / Next-Up countdowns stay live. */
const CLOCK_TICK_MS = 30 * 1000;

export default function UpcomingEventsScreen() {
  const { isLogged, loading: authLoading, userLanguage } = useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasMountedRef = useRef(false);

  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  // Paginated not-yet-started events. The startDate baseline is captured once
  // per refresh cycle (offset 0) and reused for load-more pages — a per-page
  // `new Date()` would shrink the server window as events start, shifting
  // offsets and silently skipping still-future events. The state mirror is
  // for render-time reads (header count); the ref is for the fetch path.
  const [paginatedBaseline, setPaginatedBaseline] = useState(() => new Date().toISOString());
  const startDateRef = useRef(paginatedBaseline);
  const {
    events: futureEvents,
    loading,
    refreshing,
    loadingMore,
    error,
    total,
    handleRefresh,
    handleEndReached,
  } = usePaginatedEvents<Event, Event>({
    fetchFn: async (pageSize, offset, orgIds) => {
      if (orgIds.length === 0) {
        return { events: [], total: 0, limit: pageSize, offset };
      }
      if (offset === 0) {
        startDateRef.current = new Date().toISOString();
        setPaginatedBaseline(startDateRef.current);
      }
      const response = await getOrganizationUpcomingEvents(orgIds[0], {
        startDate: startDateRef.current,
        limit: pageSize,
        offset,
      });
      return { events: response.events, total: response.total, limit: pageSize, offset };
    },
    formatFn: (events) => events,
    pageSize: 10,
  });

  // Ongoing events started up to 20 days back (same lookback the More tab's
  // counts use) — the paginated query above can't see them. Best-effort: a
  // failure (null) keeps the previous list and never blocks the timeline.
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const loadOngoing = useCallback(async (): Promise<Event[] | null> => {
    if (organizationIds.length === 0) return null;
    try {
      const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();
      const response = await getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: lookbackDate,
        limit: API_LIMITS.EVENTS_DEFAULT,
      });
      const now = new Date();
      return response.events.filter((event) => isStartedAndOngoing(event, now));
    } catch (err) {
      logger.warn('[UpcomingEvents] Failed to fetch ongoing events', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, [organizationIds]);

  useEffect(() => {
    let cancelled = false;
    loadOngoing().then((events) => {
      if (!cancelled && events) setOngoingEvents(events);
    });
    return () => {
      cancelled = true;
    };
  }, [loadOngoing]);

  // Clock driving NOW / Next-Up / countdown states. Refreshes reset it; a 30s
  // tick while focused keeps transitions (event starts, event ends) live per
  // the design's behavior rules without waiting for a manual refresh.
  const [now, setNow] = useState(() => new Date());

  const refreshAll = useCallback(() => {
    setNow(new Date());
    loadOngoing().then((events) => {
      if (events) setOngoingEvents(events);
    });
    handleRefresh();
  }, [loadOngoing, handleRefresh]);

  // Refetch when the screen regains focus (e.g. after editing or deleting an
  // event). Latest-ref pattern so callback identity churn while focused
  // (org refreshes) can't re-fire the effect — same gotcha as more.tsx.
  const refreshOnFocusRef = useRef(refreshAll);
  useEffect(() => {
    refreshOnFocusRef.current = refreshAll;
  });
  useFocusEffect(
    useCallback(() => {
      if (hasMountedRef.current) {
        refreshOnFocusRef.current();
      } else {
        hasMountedRef.current = true;
      }
      const intervalId = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
      return () => clearInterval(intervalId);
    }, [])
  );

  const timeline = useMemo(() => {
    const allLoaded = [...ongoingEvents, ...futureEvents];
    const todayKey = getTodayDateKeyInBelgium();
    const { ongoing, nextUp, rest } = splitUpcomingEvents(allLoaded, now);
    // Header count: the server total covers events starting on/after the
    // paginated baseline, so only add ongoing events from before it —
    // an event that started seconds ago can briefly live in both sets.
    const baselineMs = parseAsUTC(paginatedBaseline).getTime();
    const ongoingExtra = ongoing.filter(
      (event) => parseAsUTC(event.start_time).getTime() < baselineMs
    ).length;
    return { todayKey, ongoing, nextUp, rest, ongoingExtra };
  }, [ongoingEvents, futureEvents, now, paginatedBaseline]);

  const sections = useMemo(
    () => buildUpcomingSections(timeline.ongoing, timeline.rest, timeline.todayKey),
    [timeline]
  );

  const totalCount = total + timeline.ongoingExtra;
  const isEmpty = !loading && !error && timeline.nextUp.length === 0 && sections.length === 0;

  const renderItem = useCallback(
    ({ item }: { item: UpcomingSectionRow }) => (
      <UpcomingTimelineRow
        event={item.event}
        ongoing={item.ongoing}
        todayKey={timeline.todayKey}
        userLanguage={userLanguage}
      />
    ),
    [timeline.todayKey, userLanguage]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: UpcomingSection }) => {
      const dateLabel = formatGroupDateLabel(section.dayKey, userLanguage);
      return (
        <GroupLabelRow
          label={section.isToday ? `${t('myEvents.today')} · ${dateLabel}` : dateLabel}
          color={section.isToday ? themeColors.tint : undefined}
        />
      );
    },
    [themeColors.tint, userLanguage]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={themeColors.tint} />
      </View>
    );
  }, [loadingMore, themeColors.tint]);

  // Redirect if not logged in
  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  const showLoading = authLoading || loading;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.container}>
          <BrandHeader
            title={t('myEvents.upcoming')}
            subtitle={
              !showLoading && !error ? t('myEvents.eventCount', { count: totalCount }) : undefined
            }
            // Positive gate so the button neither flashes during the initial
            // load of an empty account nor renders on the empty artboard,
            // which has no header create button (the card CTA is the entry).
            onCreatePress={
              timeline.nextUp.length > 0 || sections.length > 0
                ? () => router.push(Routes.CREATE_EVENT_OPTIONS)
                : undefined
            }
          />

          {showLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <SectionList<UpcomingSectionRow, UpcomingSection>
              sections={sections}
              keyExtractor={(item) => item.event.$id}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                timeline.nextUp.length > 0 ? (
                  <UpcomingNextUp events={timeline.nextUp} now={now} userLanguage={userLanguage} />
                ) : null
              }
              ListEmptyComponent={
                isEmpty ? (
                  <DashedEmptyState
                    icon="calendar"
                    title={t('myEvents.emptyUpcoming')}
                    helper={t('myEvents.emptyUpcomingHelp')}
                    ctaLabel={`+ ${t('more.createNewEvent')}`}
                    onCtaPress={() => router.push(Routes.CREATE_EVENT_OPTIONS)}
                    linkLabel={t('myEvents.viewPastEvents')}
                    onLinkPress={() => router.push(Routes.MY_EVENTS_PAST)}
                  />
                ) : null
              }
              ListFooterComponent={renderFooter}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshAll}
                  tintColor={themeColors.tint}
                />
              }
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
            />
          )}
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
  },
  listContent: {
    paddingBottom: Spacing['3xl'] + Spacing.bottomTabOffset,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
