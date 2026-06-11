import { useMemo, useCallback, useState } from 'react';
import { StyleSheet, Alert, Platform, View, ScrollView, RefreshControl } from 'react-native';
import Animated, { Easing, FadeIn, withTiming } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Event } from '@/types/event.types';
import CalendarHeader from '@/components/CalendarHeader';
import CalendarGrid from '@/components/CalendarGrid';
import CalendarActiveFilterChips from '@/components/CalendarActiveFilterChips';
import CalendarEventRow from '@/components/CalendarEventRow';
import { CalendarEmptyState } from '@/components/CalendarEmptyState';
import { CalendarFiltersSheet } from '@/components/CalendarFiltersSheet';
import MonthYearPicker from '@/components/MonthYearPicker';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { useHomeViewPreference } from '@/hooks/useHomeViewPreference';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes } from '@/constants/Routes';
import { getCategoryColors, getDisplayCategory } from '@/constants/CategoryColors';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getTodayDateKeyInBelgium, CalendarDay } from '@/utils/calendarUtils';
import {
  CalendarFilters,
  DEFAULT_CALENDAR_FILTERS,
  CalendarDayEntry,
  countActiveCalendarFilters,
  countUpcomingCalendarMatches,
  dateKeyToDate,
  expandEventsByDay,
  findNextEventDayKey,
  hasActiveCalendarFilters,
  matchesCalendarFilters,
} from '@/utils/calendarTabUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { hasEventEnded } from '@/utils/eventStatus';
import { logger } from '@/utils/logger';

const LOCALE_MAP: Record<string, string> = { en: 'en-US', fr: 'fr-FR', nl: 'nl-NL' };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Mercredi 10 juin" / "Wednesday, June 10" — heading above the day list. */
function formatSelectedDayHeading(dateKey: string, locale: string): string {
  const resolvedLocale = LOCALE_MAP[locale] || 'en-US';
  const formatted = dateKeyToDate(dateKey).toLocaleDateString(resolvedLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return capitalize(formatted);
}

/** "MER. 10 JUIN" / "WED, JUNE 10" — agenda day-group label (uppercased). */
function formatAgendaDayLabel(dateKey: string, locale: string): string {
  const resolvedLocale = LOCALE_MAP[locale] || 'en-US';
  return dateKeyToDate(dateKey)
    .toLocaleDateString(resolvedLocale, { weekday: 'short', day: 'numeric', month: 'long' })
    .toUpperCase();
}

/** Today's calendar date in Belgium time — all month math uses this, not the
 * device-local date, so floors/agenda stay correct for non-CET users. */
function getBelgiumToday(): Date {
  return dateKeyToDate(getTodayDateKeyInBelgium());
}

/** True when year/month is before the current Belgium month (the navigation
 * floor — the events cache only reaches ~20 days back). */
function isMonthBeforeCurrent(year: number, month: number): boolean {
  const belgiumToday = getBelgiumToday();
  return (
    year < belgiumToday.getFullYear() ||
    (year === belgiumToday.getFullYear() && month < belgiumToday.getMonth())
  );
}

/** The handoff's day-list entrance: fade + slide up 10pt over 0.28s. */
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

export default function HomeTab() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { userLanguage, eventsCache, eventsLoading, refetchEvents } = useGlobalContext();
  const { isSaved, saveEvent, unsaveEvent, loading: savedEventsLoading } = useSavedEvents();
  const {
    loading: postalCodesLoading,
    getSubMunicipalityName,
    expandLocationTokens,
    resolveLocationLabel,
  } = usePostalCodes();
  const { dropdownItems: organizationItems } = useOrganizations();
  const { viewMode, setViewMode, ready: viewPreferenceReady } = useHomeViewPreference();

  const todayKey = getTodayDateKeyInBelgium();
  const belgiumToday = dateKeyToDate(todayKey);

  // Clock value the ended-event cutoff is evaluated against. Refreshed when
  // the tab regains focus (and on pull-to-refresh) so events that ended in
  // the meantime drop off the list. The functional updater keeps the previous
  // Date when the time hasn't advanced (also protects tests, where the focus
  // callback runs during render under fake timers).
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow((prev) => {
        const next = new Date();
        return next.getTime() === prev.getTime() ? prev : next;
      });
    }, [])
  );
  const [displayYear, setDisplayYear] = useState(() => getBelgiumToday().getFullYear());
  const [displayMonth, setDisplayMonth] = useState(() => getBelgiumToday().getMonth());
  // Belgium-TZ selection key so the highlight lines up with event keys (also
  // Belgium TZ) for users outside CET.
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKeyInBelgium);
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allEvents = useMemo(() => Object.values(eventsCache), [eventsCache]);

  // Time-granular cutoff: an event is gone as soon as its effective end time
  // passes (a 6–7 PM event disappears at 7 PM, not at midnight), matching the
  // explore feed's includeEnded=false semantics.
  const upcomingEvents = useMemo(
    () => allEvents.filter((event) => !hasEventEnded(event, now)),
    [allEvents, now]
  );

  const postalCodeSet = useMemo(
    () =>
      filters.locations.length > 0 ? new Set(expandLocationTokens(filters.locations).codes) : null,
    [filters.locations, expandLocationTokens]
  );

  const filterContext = useMemo(() => ({ isSaved, postalCodeSet }), [isSaved, postalCodeSet]);

  const filteredEvents = useMemo(
    () => upcomingEvents.filter((event) => matchesCalendarFilters(event, filters, filterContext)),
    [upcomingEvents, filters, filterContext]
  );

  // One entry per Belgium-TZ day each event spans (multi-day events expand).
  const eventsByDay = useMemo(() => expandEventsByDay(filteredEvents), [filteredEvents]);

  // Category dot colors per day for the month grid markers (filter-matched
  // category when category filters are active, primary otherwise).
  const dayMarkers = useMemo(() => {
    const markers: Record<string, string[]> = {};
    for (const [dateKey, entries] of Object.entries(eventsByDay)) {
      markers[dateKey] = entries.map(
        (entry) =>
          getCategoryColors(getDisplayCategory(entry.event.categories, filters.categories)).color
      );
    }
    return markers;
  }, [eventsByDay, filters.categories]);

  const selectedDayEntries = useMemo(
    () => eventsByDay[selectedDateKey] ?? [],
    [eventsByDay, selectedDateKey]
  );

  const nextEventDayKey = useMemo(
    () => findNextEventDayKey(eventsByDay, selectedDateKey),
    [eventsByDay, selectedDateKey]
  );

  const monthPrefix = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;
  const isCurrentMonthDisplayed = todayKey.startsWith(monthPrefix);

  // Agenda is scoped to the displayed month; on the current month it starts
  // from today.
  const agendaDayKeys = useMemo(() => {
    return Object.keys(eventsByDay)
      .filter((key) => key.startsWith(monthPrefix) && (!isCurrentMonthDisplayed || key >= todayKey))
      .sort();
  }, [eventsByDay, monthPrefix, isCurrentMonthDisplayed, todayKey]);

  // Next event relative to the displayed month (agenda empty state).
  const agendaNextDayKey = useMemo(() => {
    const monthStartKey = `${monthPrefix}-01`;
    const fromKey = monthStartKey < todayKey ? todayKey : monthStartKey;
    return findNextEventDayKey(eventsByDay, fromKey, true);
  }, [eventsByDay, monthPrefix, todayKey]);

  const activeFilterCount = countActiveCalendarFilters(filters);
  const anyFilterActive = hasActiveCalendarFilters(filters);

  const isOnToday =
    selectedDateKey === todayKey &&
    displayYear === belgiumToday.getFullYear() &&
    displayMonth === belgiumToday.getMonth();

  const canGoPrev =
    displayYear > belgiumToday.getFullYear() ||
    (displayYear === belgiumToday.getFullYear() && displayMonth > belgiumToday.getMonth());

  const goToPrevMonth = useCallback(() => {
    const now = getBelgiumToday();
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

  const goToToday = useCallback(() => {
    const key = getTodayDateKeyInBelgium();
    const now = dateKeyToDate(key);
    setDisplayYear(now.getFullYear());
    setDisplayMonth(now.getMonth());
    setSelectedDateKey(key);
  }, []);

  const handleSelectDay = useCallback((day: CalendarDay) => {
    setSelectedDateKey(day.dateKey);
    if (!day.isCurrentMonth) {
      // Page to the tapped day's month, but never below the current-month
      // floor (the events cache only reaches ~20 days back).
      const target = day.date;
      if (!isMonthBeforeCurrent(target.getFullYear(), target.getMonth())) {
        setDisplayYear(target.getFullYear());
        setDisplayMonth(target.getMonth());
      }
    }
  }, []);

  const handleJumpToDate = useCallback((dateKey: string) => {
    const target = dateKeyToDate(dateKey);
    setSelectedDateKey(dateKey);
    if (!isMonthBeforeCurrent(target.getFullYear(), target.getMonth())) {
      setDisplayYear(target.getFullYear());
      setDisplayMonth(target.getMonth());
    }
  }, []);

  const handlePickerSelect = useCallback((year: number, month: number) => {
    setDisplayYear(year);
    setDisplayMonth(month);
  }, []);

  const onRefresh = useCallback(async () => {
    logger.info('[HomeTab] Pull to refresh triggered');
    setRefreshing(true);
    setNow(new Date());
    try {
      await refetchEvents();
    } catch (error) {
      logger.error('Failed to refresh events:', { error });
      Alert.alert(t('home.refreshFailed'), t('home.refreshFailedMessage'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEvents]);

  const handleEventPress = useCallback((eventId: string) => {
    router.push(DynamicRoutes.event(eventId));
  }, []);

  const handleToggleSave = useCallback(
    async (event: Event, currentlySaved: boolean) => {
      try {
        if (currentlySaved) {
          await unsaveEvent(event.$id);
        } else {
          const endsAt = event.end_time
            ? parseAsUTC(event.end_time).getTime()
            : parseAsUTC(event.start_time).getTime();
          await saveEvent(event.$id, endsAt);
        }
      } catch (error) {
        logger.warn('[HomeTab] Failed to toggle saved event', {
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert(t('common.error'), t('explore.saveError'));
      }
    },
    [saveEvent, unsaveEvent]
  );

  const resolveCityLabel = useCallback(
    (event: Event): string => {
      if (event.postal_code && event.country) {
        const resolved = getSubMunicipalityName(
          String(event.postal_code),
          event.country,
          event.city
        );
        if (resolved) return resolved;
      }
      return event.city ?? '';
    },
    [getSubMunicipalityName]
  );

  const resolveOrganizationLabel = useCallback(
    (id: string) => organizationItems.find((item) => item.value === id)?.label ?? id,
    [organizationItems]
  );

  const countMatchesForDraft = useCallback(
    (draft: CalendarFilters) => {
      const draftPostalCodes =
        draft.locations.length > 0 ? new Set(expandLocationTokens(draft.locations).codes) : null;
      // upcomingEvents (not allEvents) so the "See N protests" label matches
      // the time-granular cutoff applied to the rendered list.
      return countUpcomingCalendarMatches(
        upcomingEvents,
        draft,
        { isSaved, postalCodeSet: draftPostalCodes },
        getTodayDateKeyInBelgium()
      );
    },
    [upcomingEvents, isSaved, expandLocationTokens]
  );

  const removeCategoriesFilter = useCallback(
    () => setFilters((prev) => ({ ...prev, categories: [] })),
    []
  );
  const removeLocationFilter = useCallback(
    (token: string) =>
      setFilters((prev) => ({
        ...prev,
        locations: prev.locations.filter((value) => value !== token),
      })),
    []
  );
  const removeOrganizationFilter = useCallback(
    (id: string) =>
      setFilters((prev) => ({
        ...prev,
        organizations: prev.organizations.filter((value) => value !== id),
      })),
    []
  );
  const removeSavedOnlyFilter = useCallback(
    () => setFilters((prev) => ({ ...prev, savedOnly: false })),
    []
  );
  const removeHelpNeededFilter = useCallback(
    () => setFilters((prev) => ({ ...prev, helpNeeded: false })),
    []
  );

  // Splash only on the very first cache load; refetches keep the screen
  // visible and use the RefreshControl indicator instead.
  const isInitialEventsLoad = eventsLoading && Object.keys(eventsCache).length === 0;
  if (isInitialEventsLoad || savedEventsLoading || postalCodesLoading || !viewPreferenceReady) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  const renderDayEntries = (entries: CalendarDayEntry[]) => (
    <View style={styles.rowsContainer}>
      {entries.map((entry) => (
        <CalendarEventRow
          key={`${entry.event.$id}-${entry.dayIndex}`}
          entry={entry}
          todayKey={todayKey}
          isSaved={isSaved(entry.event.$id)}
          onPress={handleEventPress}
          onToggleSave={handleToggleSave}
          userLanguage={userLanguage}
          cityLabel={resolveCityLabel(entry.event)}
          displayCategory={getDisplayCategory(entry.event.categories, filters.categories)}
        />
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <CalendarHeader
            year={displayYear}
            month={displayMonth}
            userLanguage={userLanguage}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            isOnToday={isOnToday}
            onGoToToday={goToToday}
            onOpenPicker={() => setPickerVisible(true)}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            canGoPrev={canGoPrev}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <CalendarActiveFilterChips
            filters={filters}
            resolveLocationLabel={resolveLocationLabel}
            resolveOrganizationLabel={resolveOrganizationLabel}
            onRemoveCategories={removeCategoriesFilter}
            onRemoveLocation={removeLocationFilter}
            onRemoveOrganization={removeOrganizationFilter}
            onRemoveSavedOnly={removeSavedOnlyFilter}
            onRemoveHelpNeeded={removeHelpNeededFilter}
          />

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.tint}
              />
            }
          >
            {viewMode === 'month' ? (
              // Keyed by view mode so switching cross-fades per the handoff.
              <Animated.View key="month-view" entering={FadeIn.duration(280)}>
                <CalendarGrid
                  year={displayYear}
                  month={displayMonth}
                  selectedDateKey={selectedDateKey}
                  dayMarkers={dayMarkers}
                  onSelectDay={handleSelectDay}
                  onPrevMonth={goToPrevMonth}
                  onNextMonth={goToNextMonth}
                  canGoPrev={canGoPrev}
                  userLanguage={userLanguage}
                  showLegend={filters.categories.length === 0}
                />

                <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

                {/* Keyed by day so each selection re-runs the fade/slide-in. */}
                <Animated.View
                  key={selectedDateKey}
                  entering={fadeSlideIn}
                  style={styles.daySection}
                >
                  <View style={styles.dayHeadingRow}>
                    <ThemedText style={styles.dayHeading} numberOfLines={1}>
                      {formatSelectedDayHeading(selectedDateKey, userLanguage)}
                    </ThemedText>
                    {selectedDayEntries.length > 0 && (
                      <ThemedText style={[styles.dayCount, { color: themeColors.tint }]}>
                        {t('home.dayEventCount', { count: selectedDayEntries.length })}
                      </ThemedText>
                    )}
                  </View>

                  {selectedDayEntries.length === 0 ? (
                    <CalendarEmptyState
                      filtered={anyFilterActive}
                      nextDateKey={nextEventDayKey}
                      onJumpToDate={handleJumpToDate}
                      userLanguage={userLanguage}
                    />
                  ) : (
                    renderDayEntries(selectedDayEntries)
                  )}
                </Animated.View>
              </Animated.View>
            ) : (
              <Animated.View
                key="agenda-view"
                entering={fadeSlideIn}
                style={styles.agendaContainer}
              >
                {agendaDayKeys.length === 0 && (
                  <CalendarEmptyState
                    filtered={anyFilterActive}
                    nextDateKey={agendaNextDayKey}
                    onJumpToDate={handleJumpToDate}
                    userLanguage={userLanguage}
                  />
                )}
                {agendaDayKeys.map((dateKey) => {
                  const isTodayGroup = dateKey === todayKey;
                  const dayOfWeek = dateKeyToDate(dateKey).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const labelColor = isTodayGroup
                    ? themeColors.tint
                    : isWeekend
                    ? themeColors.text
                    : themeColors.secondaryText;
                  return (
                    <View key={dateKey}>
                      <View style={styles.agendaDayHeader}>
                        <ThemedText
                          style={[
                            styles.agendaDayLabel,
                            { color: labelColor },
                            !isTodayGroup && isWeekend && styles.agendaWeekendLabel,
                          ]}
                        >
                          {isTodayGroup ? `${t('filters.today').toUpperCase()} · ` : ''}
                          {formatAgendaDayLabel(dateKey, userLanguage)}
                        </ThemedText>
                        <View
                          style={[styles.agendaDayRule, { backgroundColor: themeColors.separator }]}
                        />
                      </View>
                      {renderDayEntries(eventsByDay[dateKey])}
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </ScrollView>

          <MonthYearPicker
            visible={pickerVisible}
            year={displayYear}
            month={displayMonth}
            userLanguage={userLanguage}
            minYear={belgiumToday.getFullYear()}
            minMonth={belgiumToday.getMonth()}
            onSelect={handlePickerSelect}
            onClose={() => setPickerVisible(false)}
          />

          <CalendarFiltersSheet
            visible={sheetOpen}
            initialFilters={filters}
            onApply={setFilters}
            onClose={() => setSheetOpen(false)}
            countMatches={countMatchesForDraft}
          />
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
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: Platform.OS === 'ios' ? Spacing.bottomTabOffset + Spacing.xl : Spacing.xl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginVertical: 14,
  },
  daySection: {
    paddingHorizontal: Spacing.lg,
  },
  dayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dayHeading: {
    fontFamily: Typography.families.bold,
    fontSize: 17,
    lineHeight: 24,
    flexShrink: 1,
  },
  dayCount: {
    fontFamily: Typography.families.semiBold,
    fontSize: 13,
  },
  rowsContainer: {
    gap: 10,
  },
  agendaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: 18,
  },
  agendaDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  agendaDayLabel: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.8,
  },
  agendaWeekendLabel: {
    opacity: 0.75,
  },
  agendaDayRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
