import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TurboModuleRegistry,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapEventCard, { MAP_CARD_GAP, MAP_CARD_WIDTH } from '@/components/MapEventCard';
import MapEventPin, { PIN_HEIGHT, PIN_TIP_Y } from '@/components/MapEventPin';
import { MapFiltersSheet } from '@/components/MapFiltersSheet';
import { MapQuickChipsRow } from '@/components/MapQuickChipsRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { getCategoryColors, getDisplayCategory } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import {
  countActiveMapFilters,
  DEFAULT_MAP_FILTERS,
  hasActiveMapFilters,
  hasMapCoordinates,
  isNotEnded,
  MapFilters,
  MapTimeFilter,
  matchesMapFilters,
  matchesTimeWindow,
  sortEventsChronologically,
} from '@/utils/mapTabUtils';
import { getThemeColors } from '@/utils/themeColors';

// Dynamically load MapLibre: v11 calls TurboModuleRegistry.getEnforcing at
// import time, which throws when the native modules are missing (Expo Go,
// Jest) — so probe non-throwingly first and require behind a guard
// (same pattern as EventDetailed.tsx).
let MapLibreMap: any = null;
let Camera: any = null;
let Marker: any = null;
let isMapAvailable = false;

if (TurboModuleRegistry.get('MLRNMapViewModule')) {
  try {
    const MC = require('@/components/MapComponents');
    MapLibreMap = MC.MapLibreMap;
    Camera = MC.Camera;
    Marker = MC.Marker;
    isMapAvailable = !!(MapLibreMap && Camera && Marker);
    logger.info('[MapsTab] Map components loaded', { isMapAvailable });
  } catch (error) {
    logger.warn('[MapsTab] MapLibre failed to load', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
} else {
  logger.info('[MapsTab] MapLibre native module not available — map hidden');
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// Default camera: Brussels. The app never uses geolocation, so this is the
// only recentering anchor (product constraint — no locate-me affordance).
const BRUSSELS_CENTER = [4.3528, 50.8466];
const DEFAULT_ZOOM = 11.5;
/** Selecting an event zooms in to at least this level. */
const SELECT_MIN_ZOOM = 12;
/** Camera offset so a selected pin lands clear of the card carousel. */
const CAROUSEL_CAMERA_PADDING_BOTTOM = 110;

const CARD_STEP = MAP_CARD_WIDTH + MAP_CARD_GAP;
/** Ignore carousel scroll events for this long after a programmatic scroll. */
const PROGRAMMATIC_SCROLL_MS = 650;

// Accent tints shared with the quick chips (tint #F94460 at handoff alphas).
const ACCENT_ACTIVE_BG = 'rgba(249, 68, 96, 0.22)';
const ACCENT_ACTIVE_BORDER = 'rgba(249, 68, 96, 0.5)';
const ACCENT_MUTED_BG = 'rgba(249, 68, 96, 0.12)';
const ACCENT_MUTED_BORDER = 'rgba(249, 68, 96, 0.3)';

type SelectionSource = 'pin' | 'carousel' | 'auto';

export default function MapsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();

  const { eventsCache, eventsLoading, userLanguage } = useGlobalContext();
  const { isSaved, saveEvent, unsaveEvent, savedEventIds } = useSavedEvents();

  const [timeFilter, setTimeFilter] = useState<MapTimeFilter>('all');
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const listRef = useRef<FlatList<Event>>(null);
  const selectionSourceRef = useRef<SelectionSource | null>(null);
  /** Timestamp until which carousel scroll events are programmatic. */
  const programmaticScrollUntilRef = useRef(0);

  const todayKey = getTodayDateKeyInBelgium();

  // Clock value the ended-event cutoff is evaluated against. Refreshed when
  // the tab regains focus so events that ended in the meantime drop off the
  // map without waiting for a cache refresh. The functional updater keeps the
  // previous Date when the time hasn't advanced (also protects tests, where
  // the focus callback runs during render under fake timers).
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow((prev) => {
        const next = new Date();
        return next.getTime() === prev.getTime() ? prev : next;
      });
    }, [])
  );

  // Upcoming events with coordinates — online/ungeocoded events never appear.
  const geocodedEvents = useMemo(
    () =>
      Object.values(eventsCache).filter(
        (event) => hasMapCoordinates(event) && isNotEnded(event, now)
      ),
    [eventsCache, now]
  );

  const filterContext = useMemo(() => ({ isSaved }), [isSaved]);

  const mapEvents = useMemo(
    () =>
      sortEventsChronologically(
        geocodedEvents.filter(
          (event) =>
            matchesTimeWindow(event, timeFilter, todayKey, now) &&
            matchesMapFilters(event, filters, filterContext)
        )
      ),
    [geocodedEvents, timeFilter, todayKey, now, filters, filterContext]
  );

  // Latest-value refs so the camera effect below can depend on selectedId only
  // (selection changes fly the camera; filter changes alone must not re-fly).
  const mapEventsRef = useRef(mapEvents);
  mapEventsRef.current = mapEvents;

  const select = useCallback((eventId: string, source: SelectionSource) => {
    selectionSourceRef.current = source;
    setSelectedId(eventId);
  }, []);

  // Keep the selection valid: preserve it while it still matches the filters,
  // otherwise fall back to the first (soonest) event; none when empty.
  useEffect(() => {
    if (mapEvents.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!mapEvents.some((event) => event.$id === selectedId)) {
      select(mapEvents[0].$id, 'auto');
    }
  }, [mapEvents, selectedId, select]);

  const flyToEvent = useCallback(async (event: Event) => {
    if (!cameraRef.current) return;
    let zoom = DEFAULT_ZOOM;
    try {
      zoom = (await mapRef.current?.getZoom()) ?? DEFAULT_ZOOM;
    } catch (error) {
      logger.warn('[MapsTab] getZoom failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    cameraRef.current.flyTo({
      center: [event.geocod_lng!, event.geocod_lat!],
      zoom: Math.max(zoom, SELECT_MIN_ZOOM),
      duration: 700,
      padding: {
        bottom: mapEventsRef.current.length > 0 ? CAROUSEL_CAMERA_PADDING_BOTTOM : 0,
      },
    });
  }, []);

  // Selection drives the camera and the carousel position (two-way sync).
  useEffect(() => {
    if (!selectedId || !mapReady) return;
    const events = mapEventsRef.current;
    const index = events.findIndex((event) => event.$id === selectedId);
    if (index < 0) return;

    void flyToEvent(events[index]);

    if (selectionSourceRef.current !== 'carousel') {
      programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_MS;
      listRef.current?.scrollToOffset({ offset: index * CARD_STEP, animated: true });
    }
    selectionSourceRef.current = null;
  }, [selectedId, mapReady, flyToEvent]);

  const handleZoom = useCallback(async (delta: number) => {
    if (!cameraRef.current || !mapRef.current) return;
    try {
      const zoom = await mapRef.current.getZoom();
      cameraRef.current.zoomTo(zoom + delta, { duration: 300 });
    } catch (error) {
      logger.warn('[MapsTab] Zoom step failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    // The user grabbed the carousel — any in-flight programmatic scroll is moot.
    programmaticScrollUntilRef.current = 0;
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Date.now() < programmaticScrollUntilRef.current) return;
      const events = mapEventsRef.current;
      if (events.length === 0) return;
      const index = Math.max(
        0,
        Math.min(events.length - 1, Math.round(e.nativeEvent.contentOffset.x / CARD_STEP))
      );
      const event = events[index];
      if (event && event.$id !== selectedId) select(event.$id, 'carousel');
    },
    [selectedId, select]
  );

  const handleToggleSave = useCallback(
    async (event: Event) => {
      try {
        if (isSaved(event.$id)) {
          await unsaveEvent(event.$id);
        } else {
          const endsAt = parseAsUTC(event.end_time ?? event.start_time).getTime();
          await saveEvent(event.$id, endsAt);
        }
      } catch (error) {
        logger.error('[MapsTab] Failed to update saved events', { error });
        Alert.alert(t('common.error'), t('explore.saveError'));
      }
    },
    [isSaved, saveEvent, unsaveEvent]
  );

  const handleCardPress = useCallback((event: Event) => {
    router.push(`/event/${event.$id}`);
  }, []);

  const toggleQuickCategory = useCallback((value: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((category) => category !== value)
        : [...prev.categories, value],
    }));
  }, []);

  const countMatches = useCallback(
    (draft: MapFilters) =>
      geocodedEvents.filter(
        (event) =>
          matchesTimeWindow(event, timeFilter, todayKey, now) &&
          matchesMapFilters(event, draft, filterContext)
      ).length,
    [geocodedEvents, timeFilter, todayKey, now, filterContext]
  );

  const handleResetAll = useCallback(() => {
    setFilters(DEFAULT_MAP_FILTERS);
    setTimeFilter('all');
  }, []);

  const renderCard = useCallback(
    ({ item }: { item: Event }) => (
      <MapEventCard
        event={item}
        active={item.$id === selectedId}
        saved={isSaved(item.$id)}
        userLanguage={userLanguage}
        todayKey={todayKey}
        displayCategory={getDisplayCategory(item.categories, filters.categories)}
        onPress={() => handleCardPress(item)}
        onToggleSave={() => void handleToggleSave(item)}
      />
    ),
    [
      selectedId,
      isSaved,
      userLanguage,
      todayKey,
      filters.categories,
      handleCardPress,
      handleToggleSave,
    ]
  );

  const activeFilterCount = countActiveMapFilters(filters);
  const anyFilterActive = activeFilterCount > 0;
  const anyResetTarget = hasActiveMapFilters(filters) || timeFilter !== 'all';
  const isInitialEventsLoad = eventsLoading && Object.keys(eventsCache).length === 0;
  const carouselVisible = mapEvents.length > 0;
  const carouselSidePadding = Math.max(0, (windowWidth - MAP_CARD_WIDTH) / 2);
  const bottomStackOffset = (Platform.OS === 'ios' ? tabBarHeight : 0) + 10;

  const countLabel =
    mapEvents.length === 0
      ? t('maps.actionCountNone')
      : t('maps.actionCount', { count: mapEvents.length });

  if (!isMapAvailable) {
    return (
      <ThemedView style={styles.wrapper}>
        <View style={styles.unavailableContainer}>
          <IconSymbol name="mappin.and.ellipse" size={48} color={themeColors.placeholder} />
          <ThemedText style={styles.unavailableTitle}>{t('maps.title')}</ThemedText>
          <ThemedText style={[styles.unavailableText, { color: themeColors.secondaryText }]}>
            {t('maps.mapUnavailable')}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    // Full-bleed map screen: the map fills the viewport and every control
    // floats above it, so the usual SafeAreaView wrapper is intentionally
    // replaced by inset-aware overlay padding.
    <ThemedView style={styles.wrapper}>
      <MapLibreMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={OPENFREEMAP_STYLE}
        logo={false}
        attribution={true}
        attributionPosition={{ top: insets.top + 104, right: 8 }}
        touchPitch={false}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: BRUSSELS_CENTER, zoom: DEFAULT_ZOOM }}
        />
        {mapEvents.map((event) => {
          const handleSelect = () => select(event.$id, 'pin');
          return (
            <Marker
              key={event.$id}
              id={event.$id}
              lngLat={[event.geocod_lng!, event.geocod_lat!]}
              // The teardrop's visual tip sits ~8pt above the footprint
              // bottom, so anchor at the bottom and push down to the tip.
              anchor="bottom"
              offset={[0, PIN_HEIGHT - PIN_TIP_Y]}
              selected={event.$id === selectedId}
              onPress={handleSelect}
            >
              <MapEventPin
                color={
                  getCategoryColors(getDisplayCategory(event.categories, filters.categories)).color
                }
                selected={event.$id === selectedId}
                onPress={handleSelect}
                accessibilityLabel={event.title}
              />
            </Marker>
          );
        })}
      </MapLibreMap>

      {!mapReady && (
        <View style={[styles.loadingOverlay, { backgroundColor: themeColors.background }]}>
          <BrandLoader />
        </View>
      )}

      {/* Header overlay on a fade-out gradient. */}
      <View
        style={[styles.headerOverlay, { paddingTop: insets.top + 14 }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={[
            themeColors.mapHeaderGradientStart,
            themeColors.mapHeaderGradientMid,
            'transparent',
          ]}
          locations={[0, 0.52, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <ThemedText style={styles.title}>{t('maps.title')}</ThemedText>
            <ThemedText style={[styles.countLabel, { color: themeColors.secondaryText }]}>
              {countLabel}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.openFilters')}
            style={[
              styles.filterButton,
              anyFilterActive
                ? { backgroundColor: ACCENT_ACTIVE_BG, borderColor: ACCENT_ACTIVE_BORDER }
                : {
                    backgroundColor: themeColors.mapOverlay,
                    borderColor: themeColors.mapOverlayBorder,
                  },
            ]}
          >
            <IconSymbol
              name="slider.horizontal.3"
              size={17}
              color={anyFilterActive ? themeColors.mapAccentSoftText : themeColors.secondaryText}
            />
            {anyFilterActive && (
              <View
                style={[
                  styles.filterBadge,
                  { backgroundColor: themeColors.tint, borderColor: themeColors.background },
                ]}
              >
                <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
              </View>
            )}
          </Pressable>
        </View>

        <MapQuickChipsRow
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          selectedCategories={filters.categories}
          onToggleCategory={toggleQuickCategory}
        />
      </View>

      {/* Bottom stack: legend + zoom controls, then empty state or carousel. */}
      <View style={[styles.bottomStack, { bottom: bottomStackOffset }]} pointerEvents="box-none">
        <View style={styles.legendZoomRow} pointerEvents="box-none">
          {filters.categories.length === 0 ? (
            <View
              style={[
                styles.legend,
                {
                  backgroundColor: themeColors.mapOverlay,
                  borderColor: themeColors.mapOverlayBorder,
                },
              ]}
            >
              {eventCategories.map(({ value }) => (
                <View key={value} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: getCategoryColors(value).color }]}
                  />
                  <ThemedText style={[styles.legendLabel, { color: themeColors.secondaryText }]}>
                    {t('categories.' + value.toLowerCase())}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <View />
          )}

          <View style={styles.zoomStack}>
            <Pressable
              onPress={() => void handleZoom(1)}
              accessibilityRole="button"
              accessibilityLabel={t('maps.zoomIn')}
              style={[
                styles.mapButton,
                {
                  backgroundColor: themeColors.mapOverlay,
                  borderColor: themeColors.mapOverlayBorder,
                },
              ]}
            >
              <IconSymbol name="plus" size={16} color={themeColors.secondaryText} />
            </Pressable>
            <Pressable
              onPress={() => void handleZoom(-1)}
              accessibilityRole="button"
              accessibilityLabel={t('maps.zoomOut')}
              style={[
                styles.mapButton,
                {
                  backgroundColor: themeColors.mapOverlay,
                  borderColor: themeColors.mapOverlayBorder,
                },
              ]}
            >
              <IconSymbol name="minus" size={16} color={themeColors.secondaryText} />
            </Pressable>
          </View>
        </View>

        {mapEvents.length === 0 && !isInitialEventsLoad && (
          <Animated.View
            entering={FadeInUp.duration(280)}
            style={[
              styles.emptyCard,
              {
                backgroundColor: themeColors.mapOverlayStrong,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <IconSymbol name="mappin.and.ellipse" size={24} color={themeColors.placeholder} />
            <ThemedText style={styles.emptyTitle}>{t('maps.emptyTitle')}</ThemedText>
            {anyResetTarget && (
              <Pressable
                onPress={handleResetAll}
                accessibilityRole="button"
                style={[
                  styles.resetPill,
                  { backgroundColor: ACCENT_MUTED_BG, borderColor: ACCENT_MUTED_BORDER },
                ]}
              >
                <ThemedText
                  style={[styles.resetPillLabel, { color: themeColors.mapAccentSoftText }]}
                >
                  {t('maps.resetFilters')}
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>
        )}

        {carouselVisible && (
          <FlatList
            ref={listRef}
            data={mapEvents}
            horizontal
            keyExtractor={(item) => item.$id}
            renderItem={renderCard}
            extraData={[selectedId, savedEventIds, userLanguage]}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_STEP}
            snapToAlignment="start"
            decelerationRate="fast"
            onScrollBeginDrag={handleScrollBeginDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            contentContainerStyle={[
              styles.carouselContent,
              { paddingHorizontal: carouselSidePadding },
            ]}
            getItemLayout={(_, index) => ({
              length: CARD_STEP,
              offset: index * CARD_STEP,
              index,
            })}
          />
        )}
      </View>

      <MapFiltersSheet
        visible={sheetOpen}
        initialFilters={filters}
        events={geocodedEvents}
        userLanguage={userLanguage}
        onApply={setFilters}
        onClose={() => setSheetOpen(false)}
        countMatches={countMatches}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: Spacing.xl,
  },
  unavailableTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.families.bold,
  },
  unavailableText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.families.extraBold,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  countLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: Spacing.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: Typography.sizes.xxs,
    fontFamily: Typography.families.extraBold,
    color: 'white',
    lineHeight: 12,
  },
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    gap: Spacing.md,
  },
  legendZoomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  legend: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 11,
    gap: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendLabel: {
    fontSize: 10.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 14,
  },
  zoomStack: {
    gap: Spacing.sm,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emptyCard: {
    marginHorizontal: Spacing.xl,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    textAlign: 'center',
  },
  resetPill: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 9,
    paddingHorizontal: Spacing.lg,
  },
  resetPillLabel: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
  carouselContent: {
    gap: MAP_CARD_GAP,
    paddingBottom: 6,
  },
});
