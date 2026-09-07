import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DraftBatchBar, {
  BATCH_BAR_BOTTOM_OFFSET,
  BATCH_BAR_CLEARANCE,
  BATCH_BAR_ROW_CLEARANCE,
} from '@/components/DraftBatchBar';
import DraftFiltersSheet, {
  DEFAULT_DRAFT_FILTERS,
  DraftFilters,
} from '@/components/DraftFiltersSheet';
import DraftListControls, {
  DraftStatusCounts,
  DraftStatusFilter,
} from '@/components/DraftListControls';
import DraftListRow from '@/components/DraftListRow';
import DuplicateEventModal from '@/components/DuplicateEventModal';
import TriageEntryCard from '@/components/TriageEntryCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { DashedEmptyState } from '@/components/ui/DashedEmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Toast } from '@/components/ui/Toast';
import { API_LIMITS } from '@/constants/ApiConfig';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BATCH_PUBLISH_CAP, useBatchDelete, useBatchPublish } from '@/hooks/useBatchPublish';
import { useDuplicatePrompt } from '@/hooks/useDuplicatePrompt';
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';
import {
  deleteEvent,
  EventIncompleteError,
  EventNotDraftError,
  getDraftEventsForOrganizations,
  publishDraft,
} from '@/services/event.service';
import { DuplicateWarningReport, Event } from '@/types/event.types';
import {
  DEFAULT_SORT_DIRECTION,
  DraftStatus,
  getDraftStatus,
  getEditedAgoParts,
  sortDrafts,
} from '@/utils/draftStatusUtils';
import { alertWithDuplicateWarning, duplicateHref } from '@/utils/duplicateEvents';
import { getPublishIssues, publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
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
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasMountedRef = useRef(false);
  // One in-flight publish/delete at a time; every row's actions are disabled
  // meanwhile. The ref twin guards Alert callbacks, whose closures capture
  // the state from when the dialog opened.
  const [busyId, setBusyId] = useState<string | null>(null);
  const mutationBusyRef = useRef(false);
  // Blocks a second trash tap from queueing another confirm dialog.
  const confirmOpenRef = useRef(false);
  // One-open-row convention: opening a row's swipe action closes the previous.
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  // Server-side filters (GET /events/drafts applies search/category/created_via
  // and returns the exact post-filter total, so pagination needs no special
  // handling). Sort and the status chips are client-side — the endpoint has a
  // fixed ORDER BY and no sort parameter.
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DraftFilters>(DEFAULT_DRAFT_FILTERS);
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>('all');
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  // Bumped on clear to remount the controls — the search field owns its text, so
  // resetting `search` alone would leave a stale query visible.
  const [controlsVersion, setControlsVersion] = useState(0);

  const sheetFiltersActive =
    filters.category !== null ||
    filters.source !== null ||
    filters.sort !== DEFAULT_DRAFT_FILTERS.sort;
  const hasActiveFilters = search !== '' || sheetFiltersActive || statusFilter !== 'all';
  // Narrower than `sheetFiltersActive`: sort only reorders the same rows, so it
  // leaves the account-wide counts (and the triage entry) intact.
  const dataFiltersActive = search !== '' || filters.category !== null || filters.source !== null;

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilters(DEFAULT_DRAFT_FILTERS);
    setStatusFilter('all');
    setControlsVersion((version) => version + 1);
  }, []);

  const {
    events: drafts,
    loading,
    refreshing,
    fetching,
    loadingMore,
    error,
    total,
    handleRefresh,
    handleEndReached,
  } = usePaginatedEvents<Event, Event>({
    fetchFn: async (pageSize, offset, organizationIds) => {
      // Every organization the user belongs to, not just the first — a draft
      // saved under a second org would otherwise be invisible and unreachable.
      const response = await getDraftEventsForOrganizations(organizationIds, {
        limit: pageSize,
        offset,
        search,
        category: filters.category ?? undefined,
        createdVia: filters.source ?? undefined,
      });
      return { events: response.events, total: response.total, limit: pageSize, offset };
    },
    formatFn: (events) => events,
    // The backend orders drafts by start_time, so the accumulated list is
    // re-sorted below; per-page sorting would break at page joins. EVENTS_MAX is
    // the endpoint's ceiling and only a cap — a request returns however many
    // drafts exist, so this costs nothing for a small account, and it makes the
    // client-side sort and the chip counts honest for realistic backlogs.
    pageSize: API_LIMITS.EVENTS_MAX,
    refetchKey: `${search}|${filters.category ?? ''}|${filters.source ?? ''}`,
  });

  // Optimistically hide rows whose publish/delete succeeded; the refetched
  // server data won't contain them anymore.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // Status (ready / past-date) is clock-dependent; re-anchor it whenever the
  // screen refreshes so a published/deleted/edited draft re-derives correctly.
  const [now, setNow] = useState(() => new Date());

  // One status pass drives the rows, the chip counts, the batch bar and the
  // triage queue — deriving them separately would let them disagree.
  const { visibleDrafts, statuses, counts, readyIds, queueIds, removedInData } = useMemo(() => {
    const sorted = sortDrafts(drafts, filters.sort, DEFAULT_SORT_DIRECTION[filters.sort]);
    const present = sorted.filter((draft) => !removedIds.has(draft.$id));
    const statusMap = new Map<string, DraftStatus>();
    const tally: DraftStatusCounts = { all: present.length, ready: 0, pastDate: 0, missing: 0 };
    const ready: string[] = [];
    const queue: string[] = [];

    for (const draft of present) {
      const status = getDraftStatus(draft, now);
      statusMap.set(draft.$id, status);
      if (status.kind === 'ready') {
        tally.ready += 1;
        ready.push(draft.$id);
      } else if (status.kind === 'pastDate') {
        tally.pastDate += 1;
        queue.push(draft.$id);
      } else {
        tally.missing += 1;
        queue.push(draft.$id);
      }
    }

    const visible =
      statusFilter === 'all'
        ? present
        : present.filter((draft) => statusMap.get(draft.$id)?.kind === statusFilter);

    return {
      visibleDrafts: visible,
      statuses: statusMap,
      counts: tally,
      readyIds: ready,
      queueIds: queue,
      removedInData: sorted.length - present.length,
    };
  }, [drafts, removedIds, now, filters.sort, statusFilter]);

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

  // Neutral, non-blocking notice for an outcome that already happened
  // (published elsewhere) — an Alert would demand a tap for nothing.
  const [notice, setNotice] = useState<string | null>(null);

  // 409 DUPLICATE_EVENT. The context is the draft id, so the confirm re-publishes
  // the row that was refused rather than whichever one is busy now.
  const duplicatePrompt = useDuplicatePrompt<string>({ isOffline });

  const runPublish = useCallback(
    async (eventId: string, duplicateOverride: boolean) => {
      if (mutationBusyRef.current) return;

      mutationBusyRef.current = true;
      setBusyId(eventId);
      try {
        const report: DuplicateWarningReport = {};
        await publishDraft(eventId, { duplicateOverride, report });
        // The event is public now — drop the row immediately (the refetch would
        // otherwise briefly re-enable a row that is no longer a draft) and
        // refresh the global cache, counts and list.
        setRemovedIds((prev) => new Set(prev).add(eventId));
        refreshCountsAndCache(true);
        refreshAll();
        // A clean publish gets the transient toast; one the backend flagged gets
        // an alert instead, since it carries something to read and act on.
        alertWithDuplicateWarning(
          t('common.success'),
          t('drafts.published'),
          report,
          (dup) => router.push(duplicateHref(dup)),
          () => setNotice(t('drafts.published'))
        );
      } catch (err) {
        if (err instanceof EventIncompleteError) {
          const messages = err.fields.length
            ? err.fields.map((field) => t(publishFieldToMessageKey(field)))
            : [t('drafts.issueIncomplete')];
          Alert.alert(t('drafts.publishIssuesTitle'), messages.join('\n'));
        } else if (duplicatePrompt.capture(err, eventId)) {
          // Nothing was published — the prompt holds the matches and waits.
        } else if (err instanceof EventNotDraftError) {
          // Already published elsewhere (commonly the web dashboard) while this
          // list still showed it as a draft. The user's intent is satisfied —
          // drop the stale row and resync rather than reporting a failure.
          setRemovedIds((prev) => new Set(prev).add(eventId));
          refreshCountsAndCache(true);
          refreshAll();
          setNotice(t('drafts.alreadyPublished'));
        } else if ((err as { isRateLimited?: boolean }).isRateLimited) {
          Alert.alert(t('errors.rateLimit.title'), t('errors.rateLimit.message'));
        } else {
          Alert.alert(t('common.error'), (err as Error).message);
        }
      } finally {
        mutationBusyRef.current = false;
        setBusyId(null);
      }
    },
    [refreshCountsAndCache, refreshAll, duplicatePrompt]
  );

  const handlePublish = useCallback(
    async (event: Event) => {
      if (!assertOnlineOrAlert(isOffline)) return;
      if (mutationBusyRef.current) return;

      // Belt and braces: the swipe action only exists on a ready row, but the
      // readiness check also blocks the past-date publish the backend allows.
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

      await runPublish(event.$id, false);
    },
    [runPublish, isOffline]
  );

  const handleDelete = useCallback(
    (event: Event) => {
      if (!assertOnlineOrAlert(isOffline)) return;
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
                setNotice(t('drafts.deleted'));
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
    [refreshCountsAndCache, refreshAll, isOffline]
  );

  // --- Batch publish -------------------------------------------------------
  const { running: batchRunning, progressLabel, run: runBatch } = useBatchPublish();

  const handlePublishAll = useCallback(() => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (batchRunning || mutationBusyRef.current || readyIds.length === 0) return;

    Alert.alert(
      t('drafts.batchConfirmTitle', { count: readyIds.length }),
      t('drafts.batchConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('drafts.batchPublishAll'),
          onPress: async () => {
            const result = await runBatch(readyIds);
            if (result.publishedIds.length > 0) {
              setRemovedIds((prev) => {
                const next = new Set(prev);
                result.publishedIds.forEach((id) => next.add(id));
                return next;
              });
              refreshCountsAndCache(true);
            }
            refreshAll();

            const summary = t('drafts.batchResult', {
              published: result.publishedIds.length,
              total: result.attempted,
            });
            const tail =
              result.reason === 'rateLimited'
                ? `\n${t('drafts.batchStoppedRateLimit')}`
                : result.reason === 'backgrounded'
                  ? `\n${t('drafts.batchStoppedBackground')}`
                  : '';
            Alert.alert(t('common.success'), `${summary}${tail}`);
          },
        },
      ]
    );
  }, [isOffline, batchRunning, readyIds, runBatch, refreshCountsAndCache, refreshAll]);

  // --- Remove all past-dated drafts ---------------------------------------
  const {
    running: deleteRunning,
    progressLabel: deleteProgress,
    run: runDelete,
  } = useBatchDelete();

  const handleRemovePastDrafts = useCallback(() => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (batchRunning || deleteRunning || mutationBusyRef.current) return;

    const confirmAndRun = async () => {
      // This action is defined as "every past-dated draft", not "the ones on
      // screen", so the loaded set is the wrong thing to count when a
      // search/category/source filter is narrowing it. Re-fetch unfiltered so the
      // number in the confirmation is the number that gets deleted.
      let targets: string[];
      try {
        const response = await getDraftEventsForOrganizations(organizationIds, {
          limit: API_LIMITS.EVENTS_MAX,
        });
        const clock = new Date();
        targets = response.events
          .filter((event) => getDraftStatus(event, clock).kind === 'pastDate')
          .map((event) => event.$id);
      } catch (err) {
        Alert.alert(t('common.error'), (err as Error).message);
        return;
      }

      if (targets.length === 0) {
        setNotice(t('drafts.batchDeleteNone'));
        refreshAll();
        return;
      }

      const capped = targets.length > BATCH_PUBLISH_CAP;
      const message = capped
        ? `${t('drafts.batchDeleteConfirmMessage')}\n\n${t('drafts.batchCappedNotice', {
            count: BATCH_PUBLISH_CAP,
          })}`
        : t('drafts.batchDeleteConfirmMessage');

      Alert.alert(t('drafts.batchDeleteConfirmTitle', { count: targets.length }), message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('drafts.batchDeleteConfirmCta'),
          style: 'destructive',
          onPress: async () => {
            const result = await runDelete(targets);
            if (result.deletedIds.length > 0) {
              setRemovedIds((prev) => {
                const next = new Set(prev);
                result.deletedIds.forEach((id) => next.add(id));
                return next;
              });
              // Drafts are not in the global events cache, so counts only.
              refreshCountsAndCache(false);
            }
            refreshAll();

            const summary = t('drafts.batchDeleteResult', {
              deleted: result.deletedIds.length,
              total: result.attempted,
            });
            const tail =
              result.reason === 'rateLimited'
                ? `\n${t('drafts.batchStoppedRateLimit')}`
                : result.reason === 'backgrounded'
                  ? `\n${t('drafts.batchStoppedBackground')}`
                  : '';
            Alert.alert(t('common.success'), `${summary}${tail}`);
          },
        },
      ]);
    };

    confirmAndRun();
  }, [
    isOffline,
    batchRunning,
    deleteRunning,
    organizationIds,
    runDelete,
    refreshCountsAndCache,
    refreshAll,
  ]);

  // --- Swipe discoverability ----------------------------------------------
  // The rows have no visible buttons, so the affordance is taught once per
  // install by animating the first row open.
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.DRAFT_SWIPE_HINT_SEEN)
      .then((seen) => {
        if (!cancelled && !seen) setShowSwipeHint(true);
      })
      .catch((err) =>
        logger.warn('[DraftEvents] Could not read the swipe-hint flag', {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwipeHintDone = useCallback(() => {
    setShowSwipeHint(false);
    AsyncStorage.setItem(STORAGE_KEYS.DRAFT_SWIPE_HINT_SEEN, '1').catch((err) =>
      logger.warn('[DraftEvents] Could not persist the swipe-hint flag', {
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }, []);

  const handleEdit = useCallback((event: Event) => {
    router.push(DynamicRoutes.draftEdit(event.$id));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Event; index: number }) => {
      const editedParts = getEditedAgoParts(item, now);
      const status = statuses.get(item.$id) ?? getDraftStatus(item, now);
      return (
        <DraftListRow
          event={item}
          status={status}
          editedLabel={editedParts ? t(editedParts.key, { count: editedParts.count }) : ''}
          userLanguage={userLanguage}
          now={now}
          onEdit={handleEdit}
          onPublish={handlePublish}
          onDelete={handleDelete}
          // Any in-flight mutation locks every row — a tap elsewhere would be
          // silently swallowed by the global guard otherwise.
          busy={busyId !== null || batchRunning || deleteRunning}
          onSwipeOpen={handleSwipeOpen}
          demoSwipe={showSwipeHint && index === 0 && status.kind === 'ready'}
          onDemoSwipeDone={handleSwipeHintDone}
        />
      );
    },
    [
      now,
      statuses,
      userLanguage,
      handleEdit,
      handlePublish,
      handleDelete,
      handleSwipeOpen,
      busyId,
      batchRunning,
      deleteRunning,
      showSwipeHint,
      handleSwipeHintDone,
    ]
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
            {t('drafts.swipeHint')}
          </ThemedText>
        )}
      </>
    );
  }, [loadingMore, visibleDrafts.length, themeColors]);

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  const showLoading = authLoading || loading;
  // A page-1 fetch that is NOT a pull-to-refresh or focus refresh — i.e. a filter
  // change. Only then do the rows on screen belong to a different filter than the
  // one selected, making an empty list meaningless. Refresh keeps its rows for the
  // same filter, so an empty account must keep its artboard while one is running.
  const filterRefetchInFlight = fetching && !refreshing;
  const isEmpty = !showLoading && !error && !filterRefetchInFlight && visibleDrafts.length === 0;

  // Optimistically removed rows leave the server total stale until the
  // refetch lands — subtract the ones still present in the data.
  const displayTotal = Math.max(total - removedInData, 0);
  // With a filter applied `total` is the post-filter count, so the unfiltered
  // wording would misreport how many drafts the account has.
  const subtitle = hasActiveFilters
    ? t('drafts.filteredCount', { count: visibleDrafts.length })
    : displayTotal > 0
      ? `${t('drafts.draftCount', { count: displayTotal })} · ${t('drafts.onlyVisibleToYou', { count: displayTotal })}`
      : t('drafts.draftCount', { count: 0 });

  // Keep the controls available once filtered to zero so the user can clear
  // them, but keep them off the empty artboard of an account with no drafts.
  const showControls =
    !showLoading && !error && (counts.all > 0 || hasActiveFilters || filterRefetchInFlight);

  // Hidden when a status chip would hide the very drafts it publishes, so the
  // count on the bar always matches what the user can see.
  const showPublishRow = counts.ready > 0 && (statusFilter === 'all' || statusFilter === 'ready');
  // Deliberately not filter-gated: this action is defined over the whole account,
  // and the confirmation re-counts unfiltered before anything is deleted.
  const showRemovePastRow = counts.pastDate > 0;
  const showBatchBar = !showLoading && !error && (showPublishRow || showRemovePastRow);

  // Status chips are views onto the same data, so "Past date" / "Needs work" —
  // the chips that isolate the queue — keep the entry; hiding it there hid it
  // exactly where it was wanted. Search, category and source still hide it:
  // those narrow the fetched set, so the card's counts would stop describing
  // the account. The visible guard keeps it off a zero-count chip's empty state.
  const showTriageEntry =
    !showLoading &&
    !error &&
    queueIds.length > 0 &&
    visibleDrafts.length > 0 &&
    statusFilter !== 'ready' &&
    !dataFiltersActive;

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
              counts.all > 0 ? () => router.push(Routes.CREATE_EVENT_OPTIONS) : undefined
            }
          />

          {showControls && (
            <DraftListControls
              key={controlsVersion}
              initialSearch={search}
              onSearch={setSearch}
              totalCount={displayTotal}
              filtersActive={sheetFiltersActive}
              onOpenFilters={() => setFiltersSheetOpen(true)}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              counts={counts}
            />
          )}

          {showLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <FlatList
              data={visibleDrafts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.listContent,
                showBatchBar && {
                  paddingBottom:
                    LIST_BOTTOM_PADDING +
                    BATCH_BAR_CLEARANCE +
                    (showPublishRow && showRemovePastRow ? BATCH_BAR_ROW_CLEARANCE : 0),
                },
              ]}
              showsVerticalScrollIndicator={false}
              // Windowing: the default windowSize of 21 keeps ~10 screens of rows
              // mounted, and every row owns a Swipeable (gesture handler +
              // reanimated shared values), so the default was mounting far more
              // native views than a 127-draft list needs.
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={11}
              updateCellsBatchingPeriod={50}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshAll}
                  tintColor={themeColors.tint}
                />
              }
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.3}
              ListHeaderComponent={
                showTriageEntry ? (
                  <TriageEntryCard
                    queueCount={queueIds.length}
                    pastCount={counts.pastDate}
                    readyCount={counts.ready}
                    onStartTriage={() => router.push(Routes.DRAFT_TRIAGE)}
                    // Same gate as the batch bar: no publish shortcut while the
                    // active chip hides the very drafts it would publish.
                    onPublishReady={showPublishRow ? handlePublishAll : undefined}
                  />
                ) : null
              }
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                !isEmpty ? null : hasActiveFilters ? (
                  // "No drafts" would be a lie here — the account has drafts,
                  // they just don't match. Offer the way out instead of Create.
                  <DashedEmptyState
                    icon="magnifyingglass"
                    iconSize={32}
                    title={t('drafts.noResultsTitle')}
                    helper={t('drafts.noResultsHelp')}
                    ctaLabel={t('drafts.clearFilters')}
                    onCtaPress={clearFilters}
                  />
                ) : (
                  <DashedEmptyState
                    icon="pencil"
                    iconSize={32}
                    title={t('drafts.emptyTitle')}
                    helper={t('drafts.emptyHelp')}
                    ctaLabel={`+ ${t('more.createNewEvent')}`}
                    onCtaPress={() => router.push(Routes.CREATE_EVENT_OPTIONS)}
                  />
                )
              }
            />
          )}

          {showBatchBar && (
            <DraftBatchBar
              readyCount={showPublishRow ? counts.ready : 0}
              onPublishAll={handlePublishAll}
              pastCount={showRemovePastRow ? counts.pastDate : 0}
              onRemovePast={handleRemovePastDrafts}
              running={batchRunning || deleteRunning}
              progressLabel={progressLabel ?? deleteProgress ?? undefined}
            />
          )}

          <Toast
            visible={notice !== null}
            title={notice ?? ''}
            icon="checkmark"
            iconColor={themeColors.live}
            durationMs={3200}
            onTimeout={() => setNotice(null)}
            // Anchored to the bar's own offset so both track the tab bar, which
            // only overlays the screen on iOS.
            bottom={BATCH_BAR_BOTTOM_OFFSET + (showBatchBar ? 65 : 17)}
            testID="draft-notice-toast"
          />

          <DraftFiltersSheet
            visible={filtersSheetOpen}
            onClose={() => setFiltersSheetOpen(false)}
            filters={filters}
            onApply={setFilters}
          />

          <DuplicateEventModal
            mode="publish"
            locale={userLanguage}
            {...duplicatePrompt.modalProps((eventId) => runPublish(eventId, true))}
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Clears the tab bar; the batch bar adds its own clearance on top. */
const LIST_BOTTOM_PADDING = Spacing['3xl'] + Spacing.bottomTabOffset;

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
    paddingBottom: LIST_BOTTOM_PADDING,
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
