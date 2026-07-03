import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { StyleSheet, Image, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExploreTabContext } from '@/context/ExploreTabProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useHomeArea } from '@/context/HomeAreaProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { useLogoScheme } from '@/hooks/useLogoScheme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useExplorePagination } from '@/hooks/useExplorePagination';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FilterChip } from '@/components/ui/FilterChip';
import SearchInput from '@/components/SearchInput';
import ExploreEventCard from '@/components/ExploreEventCard';
import { ExploreFiltersSheet } from '@/components/ExploreFiltersSheet';
import { ExploreActiveFilterChips } from '@/components/ExploreActiveFilterChips';
import EmptyEventMyEvents from '@/components/EmptyEventMyEvents';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

import { Spacing, Typography } from '@/constants/DesignTokens';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { shareEventWithAlert } from '@/utils/shareHelpers';
import { Event, getEventByIdBackend } from '@/services/event.service';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { getThemeColors } from '@/utils/themeColors';

function LoadingFooter() {
  return (
    <ThemedView style={styles.loadingFooter}>
      <BrandLoader size={28} speed="fast" />
    </ThemedView>
  );
}

export default function ExploreTab() {
  const logo = useLogoScheme();
  const { userLanguage, eventsCache } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const { saveEvent, unsaveEvent, isSaved, savedEventIds } = useSavedEvents();
  const {
    getSubMunicipalityName,
    loading: postalCodesLoading,
    expandLocationTokens,
    resolveLocationLabel,
    isLocationSelectionTooBroad,
  } = usePostalCodes();
  const { dropdownItems: organizationItems } = useOrganizations();
  const { homeAreaToken } = useHomeArea();
  const {
    searchQuery,
    setSearchQuery,
    appliedFilters,
    setAppliedFilters,
    shouldScrollToTop,
    setShouldScrollToTop,
  } = useExploreTabContext();

  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  // Filter-button badge: categories/date count 1 each, locations and
  // organizations count one per selection (same rule as the calendar tab).
  const activeFilterCount =
    (appliedFilters.category ? 1 : 0) +
    (appliedFilters.dateFilter ? 1 : 0) +
    appliedFilters.locations.length +
    appliedFilters.organizations.length;

  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const flatListRef = useRef<FlatList>(null);

  // Recomputed on every render, like the calendar tab — the value only
  // changes when the Belgium-TZ day flips.
  const todayKey = getTodayDateKeyInBelgium();

  // Hierarchy tokens (e.g. r:be:brussels) are expanded to their member postal
  // codes here; the backend receives the comma-joined code list. Raw codes pass
  // through unchanged.
  const expandedPostalCodes = useMemo(
    () => expandLocationTokens(appliedFilters.locations).codes,
    [expandLocationTokens, appliedFilters.locations]
  );

  const {
    events: displayedEvents,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    handleRefresh,
    handleEndReached,
  } = useExplorePagination({
    pageSize: 20,
    isOffline,
    filters: {
      dateFilter: appliedFilters.dateFilter,
      postalCodes: expandedPostalCodes,
      organizers: appliedFilters.organizations,
      category: appliedFilters.category,
      search: searchQuery,
    },
  });

  // Refs for stable callbacks — updated during render so FlatList items read latest values.
  const eventsCacheRef = useRef(eventsCache);
  const isSavedRef = useRef(isSaved);
  const saveEventRef = useRef(saveEvent);
  const unsaveEventRef = useRef(unsaveEvent);
  const getSubMunicipalityNameRef = useRef(getSubMunicipalityName);
  const userLanguageRef = useRef(userLanguage);

  eventsCacheRef.current = eventsCache;
  isSavedRef.current = isSaved;
  saveEventRef.current = saveEvent;
  unsaveEventRef.current = unsaveEvent;
  getSubMunicipalityNameRef.current = getSubMunicipalityName;
  userLanguageRef.current = userLanguage;

  useEffect(() => {
    if (shouldScrollToTop) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setShouldScrollToTop(false);
    }
  }, [shouldScrollToTop, setShouldScrollToTop]);

  // Stable handler avoids resetting SearchInput's internal debounce timer.
  const handleTextInputSearch = useCallback(
    (searchValue: string) => {
      setSearchQuery(searchValue);
    },
    [setSearchQuery]
  );

  const resolveOrganizationLabel = useCallback(
    (id: string) => organizationItems.find((item) => item.value === id)?.label ?? id,
    [organizationItems]
  );

  // Every applied-filter mutation (sheet apply or chip removal) refetches page
  // 1 server-side, so the list must also reset to the top.
  const mutateAppliedFilters = useCallback(
    (updater: (prev: typeof appliedFilters) => typeof appliedFilters) => {
      setAppliedFilters(updater);
      setShouldScrollToTop(true);
    },
    [setAppliedFilters, setShouldScrollToTop]
  );

  const handleApplyFilters = useCallback(
    (next: typeof appliedFilters) => {
      setAppliedFilters(next);
      setShouldScrollToTop(true);
    },
    [setAppliedFilters, setShouldScrollToTop]
  );

  // "My area" quick-scope: append the home token to the existing location
  // filter (reusing the server-side postcode expansion). Once applied it shows
  // as a normal removable location chip, so no separate clear is needed.
  const showMyAreaChip = !!homeAreaToken && !appliedFilters.locations.includes(homeAreaToken);

  const applyMyArea = useCallback(() => {
    if (!homeAreaToken) return;
    const next = [...appliedFilters.locations, homeAreaToken];
    if (isLocationSelectionTooBroad(next)) {
      Alert.alert(t('common.error'), t('filters.selectionTooBroad'));
      return;
    }
    mutateAppliedFilters((prev) => ({ ...prev, locations: [...prev.locations, homeAreaToken] }));
  }, [homeAreaToken, appliedFilters.locations, isLocationSelectionTooBroad, mutateAppliedFilters]);

  const removeCategoryFilter = useCallback(
    () => mutateAppliedFilters((prev) => ({ ...prev, category: null })),
    [mutateAppliedFilters]
  );
  const removeDateFilter = useCallback(
    () => mutateAppliedFilters((prev) => ({ ...prev, dateFilter: null })),
    [mutateAppliedFilters]
  );
  const removeLocationFilter = useCallback(
    (token: string) =>
      mutateAppliedFilters((prev) => ({
        ...prev,
        locations: prev.locations.filter((value) => value !== token),
      })),
    [mutateAppliedFilters]
  );
  const removeOrganizationFilter = useCallback(
    (id: string) =>
      mutateAppliedFilters((prev) => ({
        ...prev,
        organizations: prev.organizations.filter((value) => value !== id),
      })),
    [mutateAppliedFilters]
  );

  const handleSaveEvent = useCallback(async (eventId: string, endsAt: number) => {
    try {
      if (isSavedRef.current(eventId)) {
        await unsaveEventRef.current(eventId);
      } else {
        await saveEventRef.current(eventId, endsAt);
      }
    } catch (err) {
      logger.error('Failed to update saved events:', { error: err });
      Alert.alert(t('common.error'), t('explore.saveError'));
    }
  }, []);

  const handleShareEvent = useCallback(async (eventId: string) => {
    try {
      let event = eventsCacheRef.current[eventId] as Event | undefined;

      if (!event) {
        event = await getEventByIdBackend(eventId);
      }

      const cityLabel =
        event.postal_code && event.country
          ? getSubMunicipalityNameRef.current(String(event.postal_code), event.country, event.city)
          : undefined;

      await shareEventWithAlert(event, userLanguageRef.current, cityLabel);
    } catch (err) {
      logger.error('Failed to share event:', { error: err, eventId });
      Alert.alert(t('share.errorTitle'), t('share.eventNotFound'));
    }
  }, []);

  const renderEventCard = useCallback(
    ({ item }: { item: FormattedEventListItem }) => {
      const eventForCard: Event = {
        $id: item.$id,
        id: item.$id,
        title: item.title,
        description: item.description,
        image: item.image,
        city: item.city,
        country: item.country || '',
        start_time: item.startDateFull,
        end_time: item.endDateFull || undefined,
        categories: item.categories,
        organizer_name: item.organizer_name || '',
        organization_id: item.organization_id,
        co_organizers: item.co_organizers,
        postal_code: item.postal_code || undefined,
        view_count: item.view_count,
        help_needed: item.help_needed,
      };

      const cityLabel =
        item.postal_code && item.country
          ? getSubMunicipalityNameRef.current(String(item.postal_code), item.country, item.city)
          : '';

      return (
        <ExploreEventCard
          event={eventForCard}
          todayKey={todayKey}
          isSaved={isSavedRef.current(item.$id)}
          onSave={handleSaveEvent}
          onShare={handleShareEvent}
          userLanguage={userLanguageRef.current}
          cityLabel={cityLabel}
        />
      );
    },
    // todayKey is a dep (not a ref) so a day flip invalidates renderItem and
    // re-renders the memoized cards; within a day it's a stable string.
    [handleSaveEvent, handleShareEvent, todayKey]
  );

  const keyExtractor = useCallback((item: FormattedEventListItem, index: number) => {
    return item.$id || `${index}-${item.start_time}`;
  }, []);

  if (loading || postalCodesLoading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} />
        </ThemedView>

        <ThemedView style={styles.searchContainer}>
          <SearchInput onSearch={handleTextInputSearch} styleProps={styles.searchInput} />

          <TouchableOpacity
            onPress={() => setFiltersSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0
                ? `${t('filters.title')} (${activeFilterCount})`
                : t('filters.title')
            }
          >
            <ThemedView
              style={[
                styles.burguerIcon,
                {
                  borderColor: activeFilterCount > 0 ? themeColors.tint : themeColors.cardBorder,
                },
              ]}
            >
              <IconSymbol name="slider.horizontal.3" size={20} color={themeColors.text} />
              {activeFilterCount > 0 && (
                <ThemedView
                  style={[
                    styles.filterBadge,
                    {
                      backgroundColor: themeColors.tint,
                      borderColor: themeColors.background,
                    },
                  ]}
                >
                  <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>

        {showMyAreaChip && (
          <ThemedView style={styles.myAreaRow}>
            <FilterChip
              small
              label={t('homeArea.scopeChip')}
              accessibilityLabel={t('homeArea.scopeChip')}
              onPress={applyMyArea}
              leading={<IconSymbol name="mappin.and.ellipse" size={11} color={themeColors.tint} />}
            />
          </ThemedView>
        )}

        <ExploreActiveFilterChips
          filters={appliedFilters}
          resolveLocationLabel={resolveLocationLabel}
          resolveOrganizationLabel={resolveOrganizationLabel}
          onRemoveCategory={removeCategoryFilter}
          onRemoveDate={removeDateFilter}
          onRemoveLocation={removeLocationFilter}
          onRemoveOrganization={removeOrganizationFilter}
        />

        <ThemedView style={styles.calendarContainer}>
          {error && !displayedEvents.length ? (
            <ThemedView style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle" size={40} color={themeColors.warning} />
              <ThemedText type="subtitleBold" style={styles.errorTitle}>
                {t('explore.refreshFailed')}
              </ThemedText>
              <ThemedText style={[styles.errorMessage, { color: themeColors.secondaryText }]}>
                {t('explore.refreshFailedMessage')}
              </ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: themeColors.tint }]}
                onPress={handleRefresh}
              >
                <ThemedText style={styles.retryButtonText}>{t('common.retry')}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayedEvents}
              keyExtractor={keyExtractor}
              renderItem={renderEventCard}
              extraData={savedEventIds}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              keyboardDismissMode="on-drag"
              ListEmptyComponent={<EmptyEventMyEvents />}
              ListFooterComponent={loadingMore && hasMore ? <LoadingFooter /> : null}
              contentContainerStyle={styles.listContentContainer}
              maxToRenderPerBatch={10}
              windowSize={7}
              initialNumToRender={7}
              updateCellsBatchingPeriod={100}
            />
          )}
        </ThemedView>

        <ExploreFiltersSheet
          visible={filtersSheetOpen}
          initialFilters={appliedFilters}
          searchQuery={searchQuery}
          onApply={handleApplyFilters}
          onClose={() => setFiltersSheetOpen(false)}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '98%',
    marginLeft: 4,
    justifyContent: 'center',
  },
  searchInput: {
    width: '80%',
    marginRight: 8,
  },
  burguerIcon: {
    alignContent: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    height: 48,
    width: 48,
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: Typography.families.bold,
    fontSize: 11,
    color: '#FFFFFF',
    lineHeight: 14,
  },
  myAreaRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  calendarContainer: {
    marginHorizontal: 8,
    flex: 1,
  },
  listContentContainer: {
    paddingTop: 2,
    paddingBottom: 100,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: Typography.families.semiBold,
  },
});
