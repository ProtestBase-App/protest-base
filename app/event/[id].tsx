import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, TouchableOpacity, Alert, View, type ViewInstance } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getEventByIdBackend,
  cancelEvent,
  cancelSeries,
  EventAlreadyCancelledError,
  EventNotFoundError,
  EventNetworkError,
} from '@/services/event.service';
import type { Event } from '@/services/event.service';
import type { SeriesScope } from '@/types/eventSeries.types';
import { trackEventView } from '@/services/eventView.service';
import { canUserEditEvent } from '@/utils/eventPermissions';
import { getEffectiveEndTime } from '@/utils/eventStatus';
import { formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import { openMap } from '@/utils/mapHelpers';
import { shareEventWithAlert } from '@/utils/shareHelpers';
import EventDetailed from '@/components/EventDetailed';
import CreatorActionSheet from '@/components/CreatorActionSheet';
import { SaveAsTemplateDialog } from '@/components/SaveAsTemplateDialog';
import CancelEventModal from '@/components/CancelEventModal';
import { SeriesBadge } from '@/components/SeriesBadge';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { useLikedEvents } from '@/context/LikedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useIsOrganizationMember } from '@/context/UserOrganizationsProvider';
import { useRecurringEventsEnabled } from '@/context/VersionCheckProvider';
import { useEventSeries } from '@/hooks/useEventSeries';
import { useReturnFocus } from '@/hooks/useOverlayFocus';
import { useEventWeather } from '@/hooks/useEventWeather';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';

import { logger } from '@/utils/logger';
import { resolveEventCityLabel } from '@/utils/eventLocation';
import { getCountryLabel } from '@/utils/countryOptions';
import { seriesBadgeText, seriesErrorMessage } from '@/utils/recurrence';

export default function EventDetails() {
  const {
    user,
    isLogged,
    userLanguage,
    eventsCache,
    refetchEvents,
    upsertEventInCache,
    removeEventFromCache,
  } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const { saveEvent, unsaveEvent, isSaved } = useSavedEvents();
  const { likeEvent, unlikeEvent, isLiked } = useLikedEvents();
  const { loading: postalCodesLoading, getSubMunicipalityName } = usePostalCodes();
  const { userOrganizations } = useUserOrganizations();
  const { id, isCreated } = useLocalSearchParams<{ id: string | string[]; isCreated?: string }>();
  const insets = useSafeAreaInsets();

  const eventId = Array.isArray(id) ? id[0] : id;

  // Cache-first paint: the card the user tapped was rendered from this same
  // cache, so the event is almost always already in memory as a complete Event.
  // Seeding the initial state from it (rather than setting it in an effect)
  // keeps the very first render free of the spinner frame. Only the avatars —
  // fetch-only fields, optional everywhere they're rendered — and view_count
  // are missing; the revalidation below fills them in.
  const cachedEvent = eventId ? eventsCache[eventId] : undefined;

  const [rawEvent, setRawEvent] = useState<Event | null>(() => cachedEvent ?? null);
  const [loading, setLoading] = useState(() => !cachedEvent);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const manageRef = useRef<ViewInstance>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  useReturnFocus(saveTemplateOpen ? 'dialog' : null, () => manageRef);
  const [isCancelling, setIsCancelling] = useState(false);
  const [viewCount, setViewCount] = useState(() => cachedEvent?.view_count ?? 0);

  // Fetched here, not in EventDetailed: the pre-check needs the raw event and
  // the connectivity flag, and the presentational component stays that way.
  const { weather, refresh: refreshWeather } = useEventWeather(rawEvent, { isOffline });

  // The series only matters to the organization that runs it: everyone else sees an
  // ordinary event, with no badge and no request for the rule.
  const recurringEnabled = useRecurringEventsEnabled();
  const isOrganizationMember = useIsOrganizationMember(rawEvent?.organization_id);
  const seriesId = recurringEnabled && isOrganizationMember ? (rawEvent?.series_id ?? null) : null;
  const { series, refresh: refreshSeries } = useEventSeries(seriesId);

  const event = useMemo<FormattedEvent | null>(
    () => (rawEvent ? formatEventForDisplay(rawEvent, userLanguage) : null),
    [rawEvent, userLanguage]
  );

  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [userCanEdit, setUserCanEdit] = useState(false);

  const isEventSaved = isSaved(eventId);
  const isEventLiked = isLiked(eventId);

  const trackedEventId = useRef<string | null>(null);

  // Latest-ref so the load effect can read the cache when eventId changes
  // without re-running every time a background refresh replaces the cache.
  const eventsCacheRef = useRef(eventsCache);
  useEffect(() => {
    eventsCacheRef.current = eventsCache;
  });

  useEffect(() => {
    if (!eventId) {
      setError(t('events.detailLoadError'));
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Painted from cache (see cachedEvent above): render now, revalidate below.
    // On a miss — deep link, or an event outside the bulk-fetch window — this
    // stays on the original blocking path.
    const cached = eventsCacheRef.current[eventId];
    if (cached) {
      setRawEvent(cached);
      setViewCount(cached.view_count ?? 0);
      setError(null);
      setLoading(false);
    }

    const loadEvent = async () => {
      try {
        if (!cached) {
          setLoading(true);
        }
        setError(null);

        const fetched = await getEventByIdBackend(eventId, true);
        if (!isMounted) return;

        setRawEvent(fetched);
        // Warm the global events cache so the home calendar can resolve this
        // event without an extra hydration round-trip (covers deep-link cold
        // starts and far-future events past the bulk-fetch window).
        upsertEventInCache(fetched);
        // Seed from the server count so the value is correct even when
        // trackEventView fails silently.
        setViewCount(fetched.view_count ?? 0);

        // View tracking deliberately stays on the revalidation path rather than
        // the cache paint, so the displayed count always comes from the server.
        if (trackedEventId.current !== eventId) {
          trackedEventId.current = eventId;
          try {
            const viewResult = await trackEventView(eventId);
            if (isMounted && viewResult?.success) {
              setViewCount(viewResult.view_count);
            }
          } catch (trackError) {
            logger.info('Event view tracking failed:', { error: trackError });
          }
        }
      } catch (err) {
        if (!isMounted) return;
        // A revalidation failure must never blank a screen the user is already
        // reading. Only a confirmed 404 may — the event is genuinely gone, and
        // the eviction below keeps it off the calendar/map too.
        if (cached && !(err instanceof EventNotFoundError)) {
          logger.warn('Event revalidation failed; keeping the cached copy', {
            eventId,
            error: err,
          });
          return;
        }
        logger.error('Failed to load event:', { eventId, error: err });
        setRawEvent(null);
        // Only a confirmed backend 404 may claim the event doesn't exist —
        // an unreachable backend (e.g. deep-link open without connectivity)
        // must surface as a connectivity problem instead.
        if (err instanceof EventNotFoundError) {
          setError(t('events.detailNotFound'));
          // Confirmed deleted on the backend — evict any cached copy (e.g. a
          // disk-hydrated snapshot entry) so it stops appearing on the
          // calendar/map lists.
          removeEventFromCache(eventId);
        } else if (err instanceof EventNetworkError) {
          setError(t('events.detailNetworkError'));
        } else {
          setError(t('events.detailLoadError'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (isLogged && user && event) {
      const userOrgIds = userOrganizations.map((org) => org.$id);
      setUserCanEdit(
        canUserEditEvent(event.organization_id, userOrgIds, event.startDateFull, event.endDateFull)
      );
    } else {
      setUserCanEdit(false);
    }
  }, [event, user, isLogged, userOrganizations]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      // Fire-and-forget: the spinner never waits on the forecast, which can
      // take a few seconds server-side and can't fail loudly anyway.
      void refreshWeather();
      const fetchedEvent = await getEventByIdBackend(eventId, true);
      setRawEvent(fetchedEvent);
      upsertEventInCache(fetchedEvent);
      // Global cache refresh is best-effort — don't block the spinner on it.
      refetchEvents().catch((refreshErr) => {
        logger.warn('Global events cache refresh failed', { error: refreshErr });
      });
    } catch (err) {
      logger.error('Failed to refresh event:', { eventId, error: err });
      Alert.alert(t('home.refreshFailed'), t('home.refreshFailedMessage'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleBackPress = () => {
    if (isCreated === 'true') {
      router.push(Routes.MORE);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push(Routes.HOME);
    }
  };

  const handleSave = async () => {
    try {
      const endsAt = rawEvent ? getEffectiveEndTime(rawEvent).getTime() : undefined;
      const newCount = isEventSaved ? await unsaveEvent(eventId) : await saveEvent(eventId, endsAt);
      // Trust the server: update the displayed save_count if the bump reached the backend.
      if (newCount !== null) {
        setRawEvent((prev) => (prev ? { ...prev, save_count: newCount } : prev));
      }
    } catch (err) {
      logger.error('Failed to toggle save event:', { error: err });
    }
  };

  const handleLike = async () => {
    try {
      const newCount = isEventLiked ? await unlikeEvent(eventId) : await likeEvent(eventId);
      if (newCount !== null) {
        setRawEvent((prev) => (prev ? { ...prev, like_count: newCount } : prev));
      }
    } catch (err) {
      logger.error('Failed to toggle like:', { error: err });
    }
  };

  const handleConfirmCancel = async (scope: SeriesScope) => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (scope === 'following' && seriesId) {
      await cancelFollowing(seriesId);
      return;
    }
    try {
      setIsCancelling(true);
      const result = await cancelEvent(eventId);
      // Merge the server response into local state to avoid a full refetch.
      setRawEvent((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              cancelled_at: result.cancelled_at,
              cancellation_reason: result.cancellation_reason,
            }
          : prev
      );
      setCancelModalOpen(false);
      Alert.alert(t('common.success'), t('events.cancelSuccess'));
      // Fire-and-forget: refresh the global cache so other screens see the change.
      refetchEvents().catch((refreshErr) => {
        logger.warn('Global events cache refresh failed', { error: refreshErr });
      });
    } catch (err) {
      if (err instanceof EventAlreadyCancelledError) {
        setCancelModalOpen(false);
        Alert.alert(t('events.alreadyCancelled'), '');
        // Best-effort refetch so the UI reflects the actual cancelled state.
        try {
          const fetched = await getEventByIdBackend(eventId, true);
          setRawEvent(fetched);
        } catch (_refetchErr) {
          // Swallow — the banner just won't appear until the next refresh.
        }
        return;
      }
      logger.error('Failed to cancel event:', { eventId, error: err });
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('events.cancelError'));
    } finally {
      setIsCancelling(false);
    }
  };

  /** Cancel this date and every later one. No reason, as for a single event. */
  const cancelFollowing = async (id: string) => {
    try {
      setIsCancelling(true);
      const result = await cancelSeries(id, { fromEventId: eventId });
      setRawEvent((prev) =>
        prev ? { ...prev, status: 'cancelled', cancelled_at: new Date().toISOString() } : prev
      );
      setCancelModalOpen(false);
      Alert.alert(t('common.success'), t('series.messages.cancelled', { count: result.cancelled }));
      refreshSeries();
      refetchEvents().catch((refreshErr) => {
        logger.warn('Global events cache refresh failed', { error: refreshErr });
      });
    } catch (err) {
      logger.error('Failed to cancel the series:', { eventId, error: err });
      setCancelModalOpen(false);
      Alert.alert(t('common.error'), seriesErrorMessage(err, userLanguage));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOrganizerPress = (orgId: string) => {
    router.push(DynamicRoutes.organizer(orgId));
  };

  const handleOpenEdit = () => {
    router.replace(DynamicRoutes.eventEdit(eventId, { isCreated: isCreated === 'true' }));
  };

  const handleOpenDirections = () => {
    if (!event?.geocod_lat || !event?.geocod_lng) return;
    const cityLabel =
      event.postal_code && event.country
        ? getSubMunicipalityName(String(event.postal_code), event.country, event.city)
        : '';
    // The country disambiguates same-named places (a "Grand-Rue" in Belgium or Luxembourg).
    const address = [
      event.street_address,
      event.postal_code,
      cityLabel || event.city,
      event.country ? getCountryLabel(event.country, userLanguage) : '',
    ]
      .filter(Boolean)
      .join(', ');
    openMap(event.geocod_lat, event.geocod_lng, address);
  };

  // Ref (not state): a double-tap lands before any re-render, so only a
  // synchronous flag reliably prevents a second native share sheet.
  const isSharingRef = useRef(false);

  const handleShare = async () => {
    if (!rawEvent || isSharingRef.current) return;
    isSharingRef.current = true;
    try {
      // shareEventWithAlert re-formats the event itself, so it needs the raw
      // Event (not the FormattedEvent). cityLabel is resolved the same way as
      // directions/sharing elsewhere so the shared message stays consistent.
      const cityLabel = resolveEventCityLabel(rawEvent, getSubMunicipalityName);
      await shareEventWithAlert(rawEvent, userLanguage, cityLabel);
    } finally {
      isSharingRef.current = false;
    }
  };

  if (loading || postalCodesLoading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  if (error || !event) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle" size={48} color={themeColors.tint} />
              <ThemedText style={styles.errorTitle}>{t('common.error')}</ThemedText>
              <ThemedText style={styles.errorMessage}>{error || t('errors.notFound')}</ThemedText>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={onRefresh}
                style={[styles.retryButton, { backgroundColor: themeColors.cta }]}
              >
                <ThemedText style={styles.retryButtonText}>{t('common.tryAgain')}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <ThemedView style={styles.wrapper}>
      {/* SafeAreaView omits 'top' so the hero can extend behind the status bar. */}
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ThemedView style={styles.container} aria-hidden={saveTemplateOpen}>
          <EventDetailed
            event={event}
            isCreator={userCanEdit}
            isEventSaved={isEventSaved}
            isEventLiked={isEventLiked}
            viewCount={viewCount}
            weather={weather}
            onBack={handleBackPress}
            onSave={handleSave}
            onLike={handleLike}
            onShare={handleShare}
            onOrganizerPress={handleOrganizerPress}
            onOpenCreatorMenu={() => setMenuOpen(true)}
            refreshing={refreshing}
            onRefresh={onRefresh}
            userLanguage={userLanguage}
            topInset={insets.top}
            seriesBadge={
              seriesId ? (
                <SeriesBadge
                  event={event}
                  label={series ? seriesBadgeText(series, userLanguage) : undefined}
                  testID="event-series-badge"
                />
              ) : undefined
            }
          />

          <View style={styles.stickyBar}>
            <LinearGradient
              colors={[themeColors.background + '00', themeColors.background]}
              style={styles.stickyBarGradient}
              pointerEvents="none"
            />
            <View
              style={[
                styles.stickyBarButtons,
                { backgroundColor: themeColors.background, paddingBottom: bottomInset },
              ]}
            >
              {userCanEdit ? (
                <>
                  <TouchableOpacity
                    ref={manageRef}
                    style={[
                      styles.iconButton,
                      {
                        backgroundColor: themeColors.buttonSecondaryBackground,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                    testID="event-sticky-manage"
                    onPress={() => setMenuOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('events.manage')}
                    accessibilityHint={t('a11y.hints.manageEvent')}
                  >
                    <IconSymbol name="ellipsis" size={IconSizes.md} color={themeColors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    testID="event-sticky-edit"
                    style={[styles.primaryButton, { backgroundColor: themeColors.cta }]}
                    onPress={handleOpenEdit}
                    activeOpacity={0.85}
                  >
                    <IconSymbol name="pencil" size={IconSizes.md} color="white" />
                    <ThemedText style={styles.primaryButtonText}>
                      {t('events.editEvent')}
                    </ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.iconButton,
                      {
                        backgroundColor: isEventSaved
                          ? themeColors.tint
                          : themeColors.buttonSecondaryBackground,
                        borderColor: isEventSaved ? themeColors.tint : themeColors.cardBorder,
                      },
                    ]}
                    testID="event-sticky-save"
                    onPress={handleSave}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isEventSaved ? t('events.savedEvent') : t('events.saveEvent')
                    }
                    accessibilityHint={t('a11y.hints.toggleSave')}
                  >
                    <IconSymbol
                      name={isEventSaved ? 'bookmark.fill' : 'bookmark'}
                      size={IconSizes.md}
                      color={isEventSaved ? 'white' : themeColors.text}
                    />
                  </TouchableOpacity>
                  {event.geocod_lat != null && event.geocod_lng != null && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      testID="button-directions"
                      style={[styles.primaryButton, { backgroundColor: themeColors.cta }]}
                      onPress={handleOpenDirections}
                      activeOpacity={0.85}
                    >
                      <IconSymbol
                        name="arrow.triangle.turn.up.right.diamond"
                        size={IconSizes.md}
                        color="white"
                      />
                      <ThemedText style={styles.primaryButtonText}>
                        {t('events.directions')}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </ThemedView>
      </SafeAreaView>

      <CreatorActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onEditDetails={handleOpenEdit}
        onSaveAsTemplate={() => {
          if (assertOnlineOrAlert(isOffline)) setSaveTemplateOpen(true);
        }}
        onCancelEvent={() => setCancelModalOpen(true)}
        cancelDisabled={event.status === 'cancelled'}
      />

      {saveTemplateOpen && rawEvent && (
        <SaveAsTemplateDialog event={rawEvent} onClose={() => setSaveTemplateOpen(false)} />
      )}

      <CancelEventModal
        visible={cancelModalOpen}
        onDismiss={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        submitting={isCancelling}
        inSeries={!!seriesId}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  stickyBarGradient: {
    height: 32,
  },
  stickyBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
    color: 'white',
  },
});
