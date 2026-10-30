import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import DuplicateEventModal, { DuplicateEventMode } from '@/components/DuplicateEventModal';
import FormFieldNumeric from '@/components/FormFieldNumeric';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ConfirmDialogShell from '@/components/ui/ConfirmDialogShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { PillButton } from '@/components/ui/PillButton';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useRecurringEventsEnabled } from '@/context/VersionCheckProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDuplicatePrompt } from '@/hooks/useDuplicatePrompt';
import { useEventSeries } from '@/hooks/useEventSeries';
import {
  addSeriesDates,
  cancelSeries,
  deleteSeriesOccurrences,
  EventIncompleteError,
  getDraftEventPreview,
  getEventByIdBackend,
  publishSeries,
} from '@/services/event.service';
import type { DuplicateWarningReport, Event, EventStatus } from '@/types/event.types';
import type { EventSeriesOccurrence } from '@/types/eventSeries.types';
import { alertWithDuplicateWarning, duplicateHref } from '@/utils/duplicateEvents';
import { formatEventTime24h } from '@/utils/eventFormatters';
import { publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import {
  describeSeries,
  editableOccurrences,
  formatCalendarDate,
  formatOccurrenceDate,
  isDraftsOnlyScope,
  RECURRENCE_MAX_COUNT,
  representativeOccurrence,
  seriesErrorMessage,
  upcomingOccurrences,
} from '@/utils/recurrence';
import { getThemeColors } from '@/utils/themeColors';

type SeriesDialog = 'cancel' | 'delete' | 'publish' | 'addDates';

const STATUS_LABEL_KEYS: Record<EventStatus, string> = {
  draft: 'series.page.status.draft',
  active: 'series.page.status.active',
  cancelled: 'series.page.status.cancelled',
  past: 'series.page.status.past',
};

interface DateRowProps {
  occurrence: EventSeriesOccurrence;
  userLanguage: string;
  onPress: (occurrence: EventSeriesOccurrence) => void;
}

function DateRow({ occurrence, userLanguage, onPress }: DateRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const statusColor =
    occurrence.status === 'active'
      ? themeColors.success
      : occurrence.status === 'cancelled'
        ? themeColors.destructive
        : themeColors.subtleText;

  return (
    <Pressable
      testID={`series-date-${occurrence.$id}`}
      onPress={() => onPress(occurrence)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.dateRow,
        {
          backgroundColor: pressed ? themeColors.surfaceAltBackground : themeColors.cardBackground,
          borderColor: themeColors.cardBorder,
        },
      ]}
    >
      <View style={styles.dateText}>
        <ThemedText style={styles.dateLabel}>
          {formatOccurrenceDate(occurrence.start_time, userLanguage)}
        </ThemedText>
        <ThemedText style={[styles.dateTime, { color: themeColors.secondaryText }]}>
          {formatEventTime24h(occurrence.start_time)}
        </ThemedText>
      </View>
      <ThemedText style={[styles.dateStatus, { color: statusColor }]}>
        {t(STATUS_LABEL_KEYS[occurrence.status])}
      </ThemedText>
      <IconSymbol name="chevron.right" size={IconSizes.sm} color={themeColors.subtleText} />
    </Pressable>
  );
}

/**
 * Every date of a recurring series with its status and, for members of the series'
 * organization, the actions on every upcoming date. Anyone can read it; what they see
 * is the backend's call, members also get the drafts.
 */
export default function SeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const seriesId = Array.isArray(id) ? id[0] : id;

  const { isLogged, userLanguage, eventsCache, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const recurringEnabled = useRecurringEventsEnabled();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const { series, loading, error, refresh } = useEventSeries(
    recurringEnabled && seriesId ? seriesId : null
  );

  const [refreshing, setRefreshing] = useState(false);
  const [dialog, setDialog] = useState<SeriesDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [addCount, setAddCount] = useState('1');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateEventMode>('publish');
  const duplicatePrompt = useDuplicatePrompt<() => void>({ isOffline });

  // Dates can have changed in an editor opened from here.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) refresh();
      hasFocusedRef.current = true;
    }, [refresh])
  );

  const now = useMemo(() => new Date(), [series]); // eslint-disable-line react-hooks/exhaustive-deps
  const upcoming = useMemo(() => (series ? upcomingOccurrences(series, now) : []), [series, now]);
  const editable = useMemo(() => (series ? editableOccurrences(series, now) : []), [series, now]);
  const upcomingIds = useMemo(() => new Set(upcoming.map((o) => o.$id)), [upcoming]);
  const past = useMemo(
    () => series?.occurrences.filter((occurrence) => !upcomingIds.has(occurrence.$id)) ?? [],
    [series, upcomingIds]
  );
  const upcomingDrafts = upcoming.filter((occurrence) => occurrence.status === 'draft');
  const upcomingActive = upcoming.filter((occurrence) => occurrence.status === 'active');

  // The series GET has no title or organization, so one date stands in for it.
  const representative = useMemo(
    () => (series ? representativeOccurrence(series, now) : null),
    [series, now]
  );
  const [loadedEvent, setLoadedEvent] = useState<Event | null>(null);
  const representativeEvent =
    (representative ? eventsCache[representative.$id] : undefined) ?? loadedEvent;

  useEffect(() => {
    if (!representative || eventsCache[representative.$id]) return;
    let cancelled = false;
    // The public GET 404s on a draft, and a draft is only listed to a member.
    const load =
      representative.status === 'draft'
        ? getDraftEventPreview(representative.$id)
        : getEventByIdBackend(representative.$id);
    load
      .then((event) => {
        if (!cancelled) setLoadedEvent(event);
      })
      .catch((err) => {
        logger.warn('[Series] Could not load a date of the series', {
          eventId: representative.$id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [representative?.$id, representative?.status]);

  // The backend checks this again on every action; this only decides what to offer.
  const isMember =
    isLogged &&
    !!representativeEvent?.organization_id &&
    userOrganizations.some((org) => org.$id === representativeEvent.organization_id);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  /** Everything a series action changes outside this screen. */
  const refreshAfterChange = () => {
    refetchEvents().catch((refreshErr) => {
      logger.warn('Global events cache refresh failed', { error: refreshErr });
    });
    refreshUserEventCounts(userOrganizations.map((org) => org.$id)).catch((refreshErr) => {
      logger.warn('Event counts refresh failed', { error: refreshErr });
    });
  };

  /** Alert for a failed action. A 409 DUPLICATE_EVENT goes to the prompt instead. */
  const handleActionError = (err: unknown, retry: () => void, mode: DuplicateEventMode) => {
    setDialog(null);
    if (duplicatePrompt.capture(err, retry)) {
      setDuplicateMode(mode);
      return;
    }
    if (err instanceof EventIncompleteError) {
      const messages = err.fields.length
        ? [...new Set(err.fields.map((field) => t(publishFieldToMessageKey(field))))]
        : [t('drafts.issueIncomplete')];
      Alert.alert(t('drafts.publishIssuesTitle'), messages.join('\n'));
      return;
    }
    Alert.alert(t('common.error'), seriesErrorMessage(err, userLanguage));
  };

  const runCancel = async () => {
    if (!seriesId || !assertOnlineOrAlert(isOffline)) return;
    setBusy(true);
    try {
      const result = await cancelSeries(seriesId);
      setDialog(null);
      refreshAfterChange();
      Alert.alert(
        t('common.success'),
        result.cancelled > 0
          ? t('series.messages.cancelled', { count: result.cancelled })
          : t('series.messages.deleted', { count: result.deleted })
      );
      if (result.series) await refresh();
      else router.back();
    } catch (err) {
      handleActionError(err, runCancel, 'publish');
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (!seriesId || !assertOnlineOrAlert(isOffline)) return;
    setBusy(true);
    try {
      const result = await deleteSeriesOccurrences(seriesId);
      setDialog(null);
      refreshAfterChange();
      Alert.alert(t('common.success'), t('series.messages.deleted', { count: result.deleted }));
      if (result.series) await refresh();
      else router.back();
    } catch (err) {
      handleActionError(err, runDelete, 'publish');
    } finally {
      setBusy(false);
    }
  };

  const runPublish = async (duplicateOverride: boolean) => {
    if (!seriesId || !assertOnlineOrAlert(isOffline)) return;
    setBusy(true);
    const report: DuplicateWarningReport = {};
    try {
      const result = await publishSeries(seriesId, { duplicateOverride, report });
      setDialog(null);
      refreshAfterChange();
      await refresh();
      alertWithDuplicateWarning(
        t('common.success'),
        t('series.messages.published', { count: result.published }),
        report,
        (duplicate) => router.push(duplicateHref(duplicate)),
        undefined,
        userLanguage
      );
    } catch (err) {
      handleActionError(err, () => runPublish(true), 'publish');
    } finally {
      setBusy(false);
    }
  };

  const runAddDates = async (count: number, duplicateOverride: boolean) => {
    if (!seriesId || !assertOnlineOrAlert(isOffline)) return;
    setBusy(true);
    const report: DuplicateWarningReport = {};
    try {
      const result = await addSeriesDates(
        seriesId,
        { add_count: count },
        { duplicateOverride, report }
      );
      setDialog(null);
      refreshAfterChange();
      await refresh();
      alertWithDuplicateWarning(
        t('common.success'),
        t('series.messages.datesAdded', { count: result.created }),
        report,
        (duplicate) => router.push(duplicateHref(duplicate)),
        undefined,
        userLanguage
      );
    } catch (err) {
      handleActionError(err, () => runAddDates(count, true), 'create');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDate = (occurrence: EventSeriesOccurrence) => {
    router.push(
      occurrence.status === 'draft'
        ? DynamicRoutes.draftEdit(occurrence.$id)
        : DynamicRoutes.event(occurrence.$id)
    );
  };

  const handleEditAll = () => {
    const first = editable[0];
    if (!first) return;
    router.push(
      first.status === 'draft'
        ? DynamicRoutes.draftEdit(first.$id, { allUpcoming: true })
        : DynamicRoutes.eventEdit(first.$id, { allUpcoming: true })
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push(Routes.HOME);
  };

  // No route to this screen is offered while the feature is off; a stale one ends here.
  if (!recurringEnabled) {
    return <Redirect href={Routes.HOME} />;
  }

  const parsedAddCount = Number(addCount);
  const addCountValid =
    Number.isInteger(parsedAddCount) &&
    parsedAddCount >= 1 &&
    parsedAddCount <= RECURRENCE_MAX_COUNT;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              testID="series-back"
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              accessibilityHint={t('a11y.hints.goBack')}
            >
              <IconSymbol name="arrow.backward" size={IconSizes.xl} color={themeColors.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              {t('series.page.heading')}
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <BrandLoader />
            </View>
          ) : !series ? (
            <ErrorState
              testID="series-error"
              message={
                error === 'notFound' ? t('series.page.notFound') : t('series.page.loadError')
              }
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={themeColors.tint}
                />
              }
            >
              {!!representativeEvent?.title && (
                <ThemedText testID="series-title" style={styles.title}>
                  {representativeEvent.title}
                </ThemedText>
              )}
              <ThemedText
                testID="series-rule"
                style={[styles.rule, { color: themeColors.secondaryText }]}
              >
                {describeSeries(series, userLanguage)}
              </ThemedText>

              <ThemedText style={styles.sectionHeading}>{t('series.page.upcoming')}</ThemedText>
              {upcoming.length === 0 ? (
                <ThemedText style={[styles.empty, { color: themeColors.subtleText }]}>
                  {t('series.page.noUpcoming')}
                </ThemedText>
              ) : (
                upcoming.map((occurrence) => (
                  <DateRow
                    key={occurrence.$id}
                    occurrence={occurrence}
                    userLanguage={userLanguage}
                    onPress={handleOpenDate}
                  />
                ))
              )}

              {past.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeading}>{t('series.page.past')}</ThemedText>
                  {past.map((occurrence) => (
                    <DateRow
                      key={occurrence.$id}
                      occurrence={occurrence}
                      userLanguage={userLanguage}
                      onPress={handleOpenDate}
                    />
                  ))}
                </>
              )}

              {isMember && (
                <View style={styles.manage}>
                  <ThemedText style={styles.sectionHeading}>
                    {t('series.page.manageHeading')}
                  </ThemedText>
                  <ThemedText style={[styles.manageNote, { color: themeColors.subtleText }]}>
                    {t('series.page.manageNote')}
                  </ThemedText>

                  {upcomingDrafts.length > 0 && (
                    <PillButton
                      testID="series-publish-all"
                      label={t('series.page.publishAll')}
                      onPress={() => setDialog('publish')}
                    />
                  )}
                  {editable.length > 0 && (
                    <PillButton
                      testID="series-edit-all"
                      label={t('series.page.editAll')}
                      variant="outline"
                      onPress={handleEditAll}
                    />
                  )}
                  {series.can_add_dates && (
                    <PillButton
                      testID="series-add-dates"
                      label={t('series.page.addDates')}
                      variant="outline"
                      onPress={() => {
                        setAddCount('1');
                        setDialog('addDates');
                      }}
                    />
                  )}
                  {upcomingActive.length > 0 && (
                    <PillButton
                      testID="series-cancel-all"
                      label={t('series.page.cancelAll')}
                      variant="outline"
                      onPress={() => setDialog('cancel')}
                    />
                  )}
                  {/* A delete takes every date in scope, published or not, and the
                      app only deletes drafts. */}
                  {isDraftsOnlyScope(series, undefined, now) && (
                    <PillButton
                      testID="series-delete-all"
                      label={t('series.page.deleteAll')}
                      variant="outline"
                      onPress={() => setDialog('delete')}
                    />
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </ThemedView>
      </SafeAreaView>

      <ConfirmDialogShell
        visible={dialog === 'cancel'}
        title={t('series.dialogs.cancelAllTitle')}
        message={t('series.dialogs.cancelAllBody', { count: editable.length })}
        dismissLabel={t('events.keepActive')}
        onDismiss={() => setDialog(null)}
        confirmLabel={t('events.cancelAction')}
        onConfirm={runCancel}
        destructive
        submitting={busy}
        testID="series-cancel-dialog"
      />
      <ConfirmDialogShell
        visible={dialog === 'delete'}
        title={t('series.dialogs.deleteAllTitle')}
        message={t('series.dialogs.deleteAllBody', { count: upcoming.length })}
        dismissLabel={t('common.cancel')}
        onDismiss={() => setDialog(null)}
        confirmLabel={t('drafts.delete')}
        onConfirm={runDelete}
        destructive
        submitting={busy}
        testID="series-delete-dialog"
      />
      <ConfirmDialogShell
        visible={dialog === 'publish'}
        title={t('series.dialogs.publishAllTitle')}
        message={t('series.dialogs.publishAllBody', { count: upcomingDrafts.length })}
        dismissLabel={t('common.cancel')}
        onDismiss={() => setDialog(null)}
        confirmLabel={t('series.page.publishAll')}
        onConfirm={() => runPublish(false)}
        submitting={busy}
        testID="series-publish-dialog"
      />
      <ConfirmDialogShell
        visible={dialog === 'addDates'}
        title={t('series.dialogs.addDatesTitle')}
        message={
          series
            ? t('series.page.windowNote', {
                date: formatCalendarDate(series.window_end, userLanguage),
              })
            : undefined
        }
        dismissLabel={t('common.cancel')}
        onDismiss={() => setDialog(null)}
        confirmLabel={t('series.dialogs.addDatesConfirm')}
        onConfirm={() => {
          if (addCountValid) runAddDates(parsedAddCount, false);
        }}
        submitting={busy}
        testID="series-add-dates-dialog"
      >
        <FormFieldNumeric
          testID="series-add-count"
          title={t('series.page.addDatesLabel')}
          value={addCount}
          placeholder="1"
          handleChangeText={setAddCount}
          maxLength={2}
          otherStyles={styles.addCount}
        />
      </ConfirmDialogShell>

      <DuplicateEventModal
        mode={duplicateMode}
        locale={userLanguage}
        {...duplicatePrompt.modalProps((retry) => retry())}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.bold,
  },
  rule: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    marginTop: Spacing.xs,
  },
  sectionHeading: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  empty: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  dateText: {
    flex: 1,
  },
  dateLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  dateTime: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
  },
  dateStatus: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.medium,
  },
  manage: {
    gap: Spacing.sm,
  },
  manageNote: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  addCount: {
    marginBottom: Spacing.md,
  },
});
