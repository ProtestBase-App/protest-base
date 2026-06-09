import { useMemo, useCallback, useState } from 'react';
import { StyleSheet, Alert, Platform, View, ScrollView, RefreshControl } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { formatEventForList } from '@/utils/eventFormatters';
import { Event } from '@/services/event.service';
import { shareEventWithAlert } from '@/utils/shareHelpers';
import { isEventOngoing } from '@/utils/eventStatus';
import EventList from '@/components/EventList';
import EventListCard from '@/components/EventListCard';
import EmptyEvent from '@/components/EmptyEvent';
import CalendarHeader from '@/components/CalendarHeader';
import CalendarGrid from '@/components/CalendarGrid';
import MonthYearPicker from '@/components/MonthYearPicker';
import HomeViewToggle from '@/components/HomeViewToggle';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useHomeViewPreference } from '@/hooks/useHomeViewPreference';
import { usePreloadPostalCodes } from '@/hooks/usePreloadPostalCodes';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  buildEventDateSet,
  formatDayHeader,
  getTodayDateKeyInBelgium,
  getEventDateKeyInBelgium,
  CalendarDay,
} from '@/utils/calendarUtils';
import { logger } from '@/utils/logger';

export default function HomeTab() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { userLanguage, eventsCache, eventsLoading, refetchEvents } = useGlobalContext();
  const { savedEventIds, loading: savedEventsLoading } = useSavedEvents();
  const { loading: postalCodesLoading, getSubMunicipalityName } = usePostalCodes();
  const { viewMode, setViewMode, ready: viewPreferenceReady } = useHomeViewPreference();

  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  // Initial selection uses Belgium-TZ today so the highlight lines up with
  // event keys (also in Belgium TZ) for users outside CET.
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKeyInBelgium);
  const [selectedDate, setSelectedDate] = useState(today);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);

  const allSavedEvents = useMemo(() => {
    if (savedEventIds.length === 0) return [];
    return savedEventIds
      .map((id) => eventsCache[id] as Event | undefined)
      .filter((event): event is Event => event !== undefined);
  }, [savedEventIds, eventsCache]);

  // Calendar view shows ongoing events only.
  const ongoingSavedEvents = useMemo(
    () => allSavedEvents.filter((event) => isEventOngoing(event)),
    [allSavedEvents]
  );

  // Set of date keys with saved events, for dot indicators.
  const eventDateKeys = useMemo(() => buildEventDateSet(ongoingSavedEvents), [ongoingSavedEvents]);

  // Events for the currently selected day. Matches on the event's Belgium-TZ
  // start-day key — keeps the calendar's "one dot, one event" semantics
  // consistent with `buildEventDateSet`.
  const selectedDayEvents = useMemo(() => {
    const eventsForDay = ongoingSavedEvents.filter(
      (event) => getEventDateKeyInBelgium(event.start_time) === selectedDateKey
    );
    eventsForDay.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    return eventsForDay.map((event) => formatEventForList(event, userLanguage));
  }, [ongoingSavedEvents, selectedDateKey, userLanguage]);

  // List view: split saved events into upcoming (not yet started) and past
  // (already started — including currently in-progress events).
  const { upcomingFormatted, pastFormatted } = useMemo(() => {
    const now = Date.now();
    const upcoming: Event[] = [];
    const past: Event[] = [];
    for (const event of allSavedEvents) {
      if (new Date(event.start_time).getTime() > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    return {
      upcomingFormatted: upcoming.map((e) => formatEventForList(e, userLanguage)),
      pastFormatted: past.map((e) => formatEventForList(e, userLanguage)),
    };
  }, [allSavedEvents, userLanguage]);

  // List view renders cards directly via .map(); preload postal-code data so
  // city labels resolve without lazy-load gaps.
  usePreloadPostalCodes(viewMode === 'list' ? [...upcomingFormatted, ...pastFormatted] : []);

  const dayHeaderText = useMemo(
    () => formatDayHeader(selectedDate, userLanguage),
    [selectedDate, userLanguage]
  );

  const canGoPrev =
    displayYear > today.getFullYear() ||
    (displayYear === today.getFullYear() && displayMonth > today.getMonth());

  const goToPrevMonth = useCallback(() => {
    const now = new Date();
    if (displayYear < now.getFullYear()) return;
    if (displayYear === now.getFullYear() && displayMonth <= now.getMonth()) return;

    setDisplayMonth((prev) => {
      if (prev === 0) {
        setDisplayYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, [displayYear, displayMonth]);

  const goToNextMonth = useCallback(() => {
    setDisplayMonth((prev) => {
      if (prev === 11) {
        setDisplayYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  // Go to today. Use Belgium TZ for the selection key (consistent with the
  // initial selection on mount and with event keys). Display year/month still
  // come from the local Date — the calendar grid layout is driven by local
  // arithmetic, and that's only ever off-by-one for users outside CET right
  // around midnight; impact is purely cosmetic.
  const goToToday = useCallback(() => {
    const now = new Date();
    setDisplayYear(now.getFullYear());
    setDisplayMonth(now.getMonth());
    setSelectedDateKey(getTodayDateKeyInBelgium());
    setSelectedDate(now);
  }, []);

  const handleSelectDay = useCallback((day: CalendarDay) => {
    setSelectedDateKey(day.dateKey);
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      setDisplayYear(day.date.getFullYear());
      setDisplayMonth(day.date.getMonth());
    }
  }, []);

  const handlePickerSelect = useCallback((year: number, month: number) => {
    setDisplayYear(year);
    setDisplayMonth(month);
  }, []);

  const onRefresh = useCallback(async () => {
    logger.info('[HomeTab] Pull to refresh triggered');
    try {
      await refetchEvents();
    } catch (error) {
      logger.error('Failed to refresh events:', { error });
      Alert.alert(t('home.refreshFailed'), t('home.refreshFailedMessage'), [
        { text: t('common.ok') },
      ]);
    }
  }, [refetchEvents]);

  const onCalendarRefresh = useCallback(async () => {
    setCalendarRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setCalendarRefreshing(false);
    }
  }, [onRefresh]);

  const onListRefresh = useCallback(async () => {
    setListRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setListRefreshing(false);
    }
  }, [onRefresh]);

  const handleShareEvent = useCallback(
    async (eventId: string) => {
      const event = eventsCache[eventId] as Event | undefined;
      if (!event) {
        Alert.alert(t('share.errorTitle'), t('share.eventNotFound'));
        return;
      }

      const cityLabel =
        event.postal_code && event.country
          ? getSubMunicipalityName(String(event.postal_code), event.country, event.city) ||
            undefined
          : undefined;

      await shareEventWithAlert(event, userLanguage, cityLabel);
    },
    [eventsCache, userLanguage, getSubMunicipalityName]
  );

  // Loading state — show the splash only on the very first cache load (when the
  // events map is still empty). Subsequent refetches trigger eventsLoading=true
  // but should NOT replace the screen with a loader; the per-list RefreshControl
  // handles the indicator instead.
  const isInitialEventsLoad = eventsLoading && Object.keys(eventsCache).length === 0;
  if (isInitialEventsLoad || savedEventsLoading || postalCodesLoading || !viewPreferenceReady) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  const hasAnySaved = upcomingFormatted.length > 0 || pastFormatted.length > 0;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <HomeViewToggle value={viewMode} onChange={setViewMode} />

          {viewMode === 'calendar' && (
            <CalendarHeader
              year={displayYear}
              month={displayMonth}
              userLanguage={userLanguage}
              onOpenPicker={() => setPickerVisible(true)}
              onGoToToday={goToToday}
            />
          )}
          {viewMode === 'calendar' ? (
            <>
              <CalendarGrid
                year={displayYear}
                month={displayMonth}
                selectedDateKey={selectedDateKey}
                eventDateKeys={eventDateKeys}
                onSelectDay={handleSelectDay}
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                canGoPrev={canGoPrev}
                userLanguage={userLanguage}
              />

              <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

              <ThemedText style={[styles.dayHeader, { color: themeColors.calendarAccent }]}>
                {dayHeaderText}
              </ThemedText>

              <ThemedView style={styles.eventsContainer}>
                <EventList
                  events={selectedDayEvents}
                  refreshing={calendarRefreshing}
                  onRefresh={onCalendarRefresh}
                  onShare={handleShareEvent}
                  ListEmptyComponent={<EmptyEvent />}
                  loading={eventsLoading}
                  userLanguage={userLanguage}
                />
              </ThemedView>

              <MonthYearPicker
                visible={pickerVisible}
                year={displayYear}
                month={displayMonth}
                userLanguage={userLanguage}
                minYear={today.getFullYear()}
                minMonth={today.getMonth()}
                onSelect={handlePickerSelect}
                onClose={() => setPickerVisible(false)}
              />
            </>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={listRefreshing}
                  onRefresh={onListRefresh}
                  tintColor={themeColors.tint}
                />
              }
            >
              {!hasAnySaved ? (
                <ThemedView style={styles.listEmpty}>
                  <ThemedText type="subtitleBold" style={styles.listEmptyTitle}>
                    {t('home.listEmptyTitle')}
                  </ThemedText>
                  <ThemedText style={[styles.listEmptySubtitle, { color: themeColors.subtleText }]}>
                    {t('home.listEmptySubtitle')}
                  </ThemedText>
                </ThemedView>
              ) : (
                <>
                  {upcomingFormatted.length > 0 && (
                    <View style={styles.listSection}>
                      <ThemedText
                        type="subtitleBold"
                        accessibilityRole="header"
                        style={styles.listSectionHeader}
                      >
                        {t('home.listSectionUpcoming')}
                      </ThemedText>
                      {upcomingFormatted.map((item) => (
                        <EventListCard
                          key={item.$id || `upcoming-${item.id}`}
                          item={item}
                          onShare={handleShareEvent}
                        />
                      ))}
                    </View>
                  )}
                  {pastFormatted.length > 0 && (
                    <View style={styles.listSection}>
                      <ThemedText
                        type="subtitleBold"
                        accessibilityRole="header"
                        style={styles.listSectionHeader}
                      >
                        {t('home.listSectionPast')}
                      </ThemedText>
                      {pastFormatted.map((item) => (
                        <EventListCard
                          key={item.$id || `past-${item.id}`}
                          item={item}
                          onShare={handleShareEvent}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
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
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  dayHeader: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  eventsContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    marginBottom: Platform.OS === 'ios' ? Spacing.bottomTabOffset : 0,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
    marginTop: Spacing.sm,
  },
  listScrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.bottomTabOffset : Spacing.lg,
  },
  listSection: {
    marginTop: Spacing.md,
  },
  listSectionHeader: {
    marginBottom: Spacing.lg,
  },
  listEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  listEmptyTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  listEmptySubtitle: {
    textAlign: 'center',
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
  },
});
