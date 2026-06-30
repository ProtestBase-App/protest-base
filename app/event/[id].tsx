import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, TouchableOpacity, Alert, View } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getEventByIdBackend,
  cancelEvent,
  EventAlreadyCancelledError,
  EventNotFoundError,
  EventNetworkError,
} from '@/services/event.service';
import type { Event } from '@/services/event.service';
import { trackEventView } from '@/services/eventView.service';
import { canUserEditEvent } from '@/utils/eventPermissions';
import { getEffectiveEndTime } from '@/utils/eventStatus';
import { formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import { openMap } from '@/utils/mapHelpers';
import EventDetailed from '@/components/EventDetailed';
import CreatorActionSheet from '@/components/CreatorActionSheet';
import CancelEventModal from '@/components/CancelEventModal';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { useLikedEvents } from '@/context/LikedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';

import { logger } from '@/utils/logger';

export default function EventDetails() {
  const { user, isLogged, userLanguage, refetchEvents, upsertEventInCache } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const { saveEvent, unsaveEvent, isSaved } = useSavedEvents();
  const { likeEvent, unlikeEvent, isLiked } = useLikedEvents();
  const { loading: postalCodesLoading, getSubMunicipalityName } = usePostalCodes();
  const { userOrganizations } = useUserOrganizations();
  const { id, isCreated } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const eventId = Array.isArray(id) ? id[0] : id;

  const [rawEvent, setRawEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [viewCount, setViewCount] = useState(0);

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

  useEffect(() => {
    if (!eventId) {
      setError(t('events.detailLoadError'));
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadEvent = async () => {
      try {
        setLoading(true);
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
        logger.error('Failed to load event:', { eventId, error: err });
        setRawEvent(null);
        // Only a confirmed backend 404 may claim the event doesn't exist —
        // an unreachable backend (e.g. deep-link open without connectivity)
        // must surface as a connectivity problem instead.
        if (err instanceof EventNotFoundError) {
          setError(t('events.detailNotFound'));
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

  const handleConfirmCancel = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
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
    const address = [event.street_address, event.postal_code, cityLabel || event.city]
      .filter(Boolean)
      .join(', ');
    openMap(event.geocod_lat, event.geocod_lng, address);
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
                onPress={onRefresh}
                style={[styles.retryButton, { backgroundColor: themeColors.tint }]}
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
        <ThemedView style={styles.container}>
          <EventDetailed
            event={event}
            isCreator={userCanEdit}
            isEventSaved={isEventSaved}
            isEventLiked={isEventLiked}
            viewCount={viewCount}
            onBack={handleBackPress}
            onSave={handleSave}
            onLike={handleLike}
            onOrganizerPress={handleOrganizerPress}
            onOpenCreatorMenu={() => setMenuOpen(true)}
            refreshing={refreshing}
            onRefresh={onRefresh}
            userLanguage={userLanguage}
            topInset={insets.top}
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
                    style={[
                      styles.iconButton,
                      {
                        backgroundColor: themeColors.buttonSecondaryBackground,
                        borderColor: themeColors.cardBorder,
                      },
                    ]}
                    onPress={() => setMenuOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('events.manage')}
                  >
                    <IconSymbol name="ellipsis" size={IconSizes.md} color={themeColors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: themeColors.tint }]}
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
                    onPress={handleSave}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isEventSaved ? t('events.savedEvent') : t('events.saveEvent')
                    }
                  >
                    <IconSymbol
                      name={isEventSaved ? 'bookmark.fill' : 'bookmark'}
                      size={IconSizes.md}
                      color={isEventSaved ? 'white' : themeColors.text}
                    />
                  </TouchableOpacity>
                  {event.geocod_lat != null && event.geocod_lng != null && (
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: themeColors.tint }]}
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
        onCancelEvent={() => setCancelModalOpen(true)}
        cancelDisabled={event.status === 'cancelled'}
      />

      <CancelEventModal
        visible={cancelModalOpen}
        onDismiss={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        submitting={isCancelling}
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
