import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import DraftEventCard from '@/components/DraftEventCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { DashedEmptyState } from '@/components/ui/DashedEmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { API_LIMITS } from '@/constants/ApiConfig';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';
import {
  deleteEvent,
  EventIncompleteError,
  getDraftEvents,
  publishDraft,
} from '@/services/event.service';
import { Event } from '@/types/event.types';
import {
  getDraftStatus,
  getEditedAgoParts,
  sortDraftsByLastEdited,
} from '@/utils/draftStatusUtils';
import { getPublishIssues, publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { getThemeColors } from '@/utils/themeColors';

export default function DraftEventsScreen() {
  const {
    isLogged,
    loading: authLoading,
    userLanguage,
    refetchEvents,
    refreshUserEventCounts,
  } = useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasMountedRef = useRef(false);
  // One in-flight publish/delete at a time; every card's actions are disabled
  // meanwhile. The ref twin guards Alert callbacks, whose closures capture
  // the state from when the dialog opened.
  const [busyId, setBusyId] = useState<string | null>(null);
  const mutationBusyRef = useRef(false);
  // Blocks a second trash tap from queueing another confirm dialog.
  const confirmOpenRef = useRef(false);
  // One-open-row convention: opening a row's swipe action closes the previous.
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const {
    events: drafts,
    loading,
    refreshing,
    loadingMore,
    error,
    total,
    handleRefresh,
    handleEndReached,
  } = usePaginatedEvents<Event, Event>({
    fetchFn: async (pageSize, offset, organizationIds) => {
      if (organizationIds.length === 0) {
        return { events: [], total: 0, limit: pageSize, offset };
      }
      const response = await getDraftEvents(organizationIds[0], { limit: pageSize, offset });
      return { events: response.events, total: response.total, limit: pageSize, offset };
    },
    formatFn: (events) => events,
    // The backend orders drafts by start_time, not by last edited, so one big
    // page covers an organizer's realistic draft count and the accumulated
    // list is re-sorted below — per-page sorting would break at page joins.
    pageSize: API_LIMITS.EVENTS_DEFAULT,
  });

  // Optimistically hide rows whose publish/delete succeeded; the refetched
  // server data won't contain them anymore.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Design rule: sorted by last edited, most recent first — applied to the
  // full accumulated list.
  const { visibleDrafts, removedInData } = useMemo(() => {
    const sorted = sortDraftsByLastEdited(drafts);
    const visible = sorted.filter((draft) => !removedIds.has(draft.$id));
    return { visibleDrafts: visible, removedInData: sorted.length - visible.length };
  }, [drafts, removedIds]);

  // Status (ready / past-date) is clock-dependent; re-anchor it whenever the
  // screen refreshes so a published/deleted/edited draft re-derives correctly.
  const [now, setNow] = useState(() => new Date());

  const refreshAll = useCallback(() => {
    openSwipeableRef.current?.close();
    openSwipeableRef.current = null;
    setNow(new Date());
    handleRefresh();
  }, [handleRefresh]);

  const handleSwipeOpen = useCallback((methods: SwipeableMethods | null) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== methods) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = methods;
  }, []);

  // Refetch on focus so a published/deleted draft drops off when returning
  // here (latest-ref pattern — see more.tsx gotcha).
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
    }, [])
  );

  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  /** Best-effort cache/count refreshes after a mutation (mirrors draft-edit). */
  const refreshCountsAndCache = useCallback(
    (alsoGlobalCache: boolean) => {
      refreshUserEventCounts(organizationIds).catch((refreshErr: unknown) =>
        logger.warn('[DraftEvents] Event counts refresh failed', {
          error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        })
      );
      if (alsoGlobalCache) {
        refetchEvents().catch((refreshErr: unknown) =>
          logger.warn('[DraftEvents] Global events refresh failed', {
            error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
          })
        );
      }
    },
    [refreshUserEventCounts, refetchEvents, organizationIds]
  );

  const handlePublish = useCallback(
    async (event: Event) => {
      if (mutationBusyRef.current) return;

      // Belt and braces: the pill is only enabled when ready, but the readiness
      // check also blocks the past-date publish the backend would allow.
      const issues = getPublishIssues({
        description: event.description,
        categories: event.categories,
        city: event.city,
        street_address: event.street_address,
        start_time: event.start_time,
      });
      if (issues.length > 0) {
        Alert.alert(t('drafts.publishIssuesTitle'), issues.map((i) => t(i.messageKey)).join('\n'));
        return;
      }

      mutationBusyRef.current = true;
      setBusyId(event.$id);
      try {
        await publishDraft(event.$id);
        // The event is public now — drop the row immediately (the refetch
        // would otherwise briefly re-enable a card that is no longer a draft)
        // and refresh the global cache, counts and list.
        setRemovedIds((prev) => new Set(prev).add(event.$id));
        refreshCountsAndCache(true);
        refreshAll();
        Alert.alert(t('common.success'), t('drafts.published'));
      } catch (err) {
        if (err instanceof EventIncompleteError) {
          const messages = err.fields.length
            ? err.fields.map((field) => t(publishFieldToMessageKey(field)))
            : [t('drafts.issueIncomplete')];
          Alert.alert(t('drafts.publishIssuesTitle'), messages.join('\n'));
        } else {
          Alert.alert(t('common.error'), (err as Error).message);
        }
      } finally {
        mutationBusyRef.current = false;
        setBusyId(null);
      }
    },
    [refreshCountsAndCache, refreshAll]
  );

  const handleDelete = useCallback(
    (event: Event) => {
      if (mutationBusyRef.current || confirmOpenRef.current) return;
      confirmOpenRef.current = true;
      Alert.alert(
        t('drafts.deleteConfirmTitle'),
        t('drafts.deleteConfirmMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              confirmOpenRef.current = false;
            },
          },
          {
            text: t('drafts.delete'),
            style: 'destructive',
            onPress: async () => {
              confirmOpenRef.current = false;
              if (mutationBusyRef.current) return;
              mutationBusyRef.current = true;
              setBusyId(event.$id);
              try {
                await deleteEvent(event.$id);
                setRemovedIds((prev) => new Set(prev).add(event.$id));
                refreshCountsAndCache(false);
                refreshAll();
                Alert.alert(t('common.success'), t('drafts.deleted'));
              } catch (err) {
                Alert.alert(t('common.error'), (err as Error).message);
              } finally {
                mutationBusyRef.current = false;
                setBusyId(null);
              }
            },
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            confirmOpenRef.current = false;
          },
        }
      );
    },
    [refreshCountsAndCache, refreshAll]
  );

  const renderItem = useCallback(
    ({ item }: { item: Event }) => {
      const editedParts = getEditedAgoParts(item, now);
      return (
        <DraftEventCard
          event={item}
          status={getDraftStatus(item, now)}
          editedLabel={editedParts ? t(editedParts.key, { count: editedParts.count }) : ''}
          userLanguage={userLanguage}
          onEdit={() => router.push(DynamicRoutes.draftEdit(item.$id))}
          onPublish={() => handlePublish(item)}
          onDelete={() => handleDelete(item)}
          // Any in-flight mutation locks every card — a tap elsewhere would be
          // silently swallowed by the global guard otherwise.
          busy={busyId !== null}
          onSwipeOpen={handleSwipeOpen}
        />
      );
    },
    [now, userLanguage, handlePublish, handleDelete, handleSwipeOpen, busyId]
  );

  const keyExtractor = useCallback((item: Event) => item.$id, []);

  const renderFooter = useCallback(() => {
    return (
      <>
        {loadingMore && (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={themeColors.tint} />
          </View>
        )}
        {visibleDrafts.length > 0 && (
          <ThemedText style={[styles.sortHint, { color: themeColors.subtleText }]}>
            {t('drafts.sortHint')}
          </ThemedText>
        )}
      </>
    );
  }, [loadingMore, visibleDrafts.length, themeColors]);

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  const showLoading = authLoading || loading;
  const isEmpty = !showLoading && !error && visibleDrafts.length === 0;

  // Optimistically removed rows leave the server total stale until the
  // refetch lands — subtract the ones still present in the data.
  const displayTotal = Math.max(total - removedInData, 0);
  const subtitle =
    displayTotal > 0
      ? `${t('drafts.draftCount', { count: displayTotal })} · ${t('drafts.onlyVisibleToYou', { count: displayTotal })}`
      : t('drafts.draftCount', { count: 0 });

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.container}>
          <BrandHeader
            title={t('more.drafts')}
            subtitle={!showLoading && !error ? subtitle : undefined}
            // Positive gate so the button neither flashes during the initial
            // load of an empty account nor renders on the empty artboard,
            // which has no header create button (the card CTA is the entry).
            onCreatePress={
              visibleDrafts.length > 0 ? () => router.push(Routes.CREATE_EVENT_OPTIONS) : undefined
            }
          />

          {showLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <FlatList
              data={visibleDrafts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshAll}
                  tintColor={themeColors.tint}
                />
              }
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                isEmpty ? (
                  <DashedEmptyState
                    icon="pencil"
                    iconSize={32}
                    title={t('drafts.emptyTitle')}
                    helper={t('drafts.emptyHelp')}
                    ctaLabel={`+ ${t('more.createNewEvent')}`}
                    onCtaPress={() => router.push(Routes.CREATE_EVENT_OPTIONS)}
                  />
                ) : null
              }
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing['3xl'] + Spacing.bottomTabOffset,
    flexGrow: 1,
  },
  sortHint: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: 10,
    paddingHorizontal: 40,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
