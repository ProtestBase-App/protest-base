import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Alert, BackHandler, View, TouchableOpacity } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FormScreenScaffold } from '@/components/FormScreenScaffold';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  getDraftEventPreview,
  patchEvent,
  publishDraft,
  deleteEvent,
  deleteSeriesOccurrences,
  editSeries,
  EventIncompleteError,
  EventNotDraftError,
} from '@/services/event.service';
import CustomButton from '@/components/CustomButton';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useRecurringEventsEnabled } from '@/context/VersionCheckProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDuplicatePrompt } from '@/hooks/useDuplicatePrompt';
import { useEventSeries } from '@/hooks/useEventSeries';
import EventForm from '@/components/EventForm';
import DuplicateEventModal from '@/components/DuplicateEventModal';
import SeriesScopeDialog from '@/components/SeriesScopeDialog';
import type { FormState } from '@/types/eventForm.types';
import type { DuplicateWarningReport, UpdateEventRequest } from '@/types/event.types';
import type { SeriesScope } from '@/types/eventSeries.types';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { Spacing } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { alertWithDuplicateWarning, duplicateHref } from '@/utils/duplicateEvents';
import { getPublishIssues, publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { allDaySubmitField } from '@/utils/eventFormatters';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { buildLocationUpdate, toPostalCodeString } from '@/utils/eventLocation';
import { HelperText } from '@/utils/formHelpers';
import { isDraftsOnlyScope, seriesErrorMessage, seriesTimesFromForm } from '@/utils/recurrence';

// Matches common URL patterns, with or without protocol/www.
const URL_REGEX =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

export default function DraftEdit() {
  const { user, isLogged, userLanguage, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { id, allUpcoming } = useLocalSearchParams<{
    id: string | string[];
    allUpcoming?: string;
  }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const recurringEnabled = useRecurringEventsEnabled();

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [draftSeriesId, setDraftSeriesId] = useState<string | null>(null);
  const [saveScopeOpen, setSaveScopeOpen] = useState(false);
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);
  // 409 DUPLICATE_EVENT. The edits are already saved by the time publish runs,
  // so the retry re-sends only the publish — never the patch again.
  const duplicatePrompt = useDuplicatePrompt({ isOffline });
  const [form, setForm] = useState<FormState>({
    organization_id: '',
    title: '',
    description: '',
    images: [],
    street_address: '',
    city: '',
    region: '',
    country: '',
    start_time: '',
    end_time: '',
    organizer_name: user?.name || '',
    website_url: '',
    categories: '',
    disclaimer: '',
    postal_code: null,
    co_organizers: [],
    help_needed: false,
    help_description: '',
    geocod_lat: null,
    geocod_lng: null,
  });

  const [emptyFields] = useState({
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  // Baseline snapshot of the freshly loaded draft; drives the unsaved-changes
  // guard so leaving prompts only when something actually changed.
  const initialFormRef = useRef<FormState | null>(null);
  // Whether the draft ARRIVED date-only — the scraper's date-only sources land
  // here. A ref, not form state: it never changes after load, and the dirty
  // check stringifies the whole form.
  const wasAllDayRef = useRef(false);

  // Load the draft via the preview endpoint (the public GET 404s on drafts) and
  // map the raw Event directly into form state. We deliberately avoid
  // formatEventForDisplay, which assumes a non-empty start_time and would crash
  // on an incomplete draft.
  useEffect(() => {
    const loadDraft = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const event = await getDraftEventPreview(eventId);
        wasAllDayRef.current = event.all_day === true;
        setDraftSeriesId(event.series_id ?? null);
        setForm((prev) => {
          const next: FormState = {
            ...prev,
            organization_id: event.organization_id || '',
            title: event.title || '',
            description: event.description || '',
            // Raw Event (not formatEventForDisplay) — heal pre-multi-image
            // responses by surfacing the legacy single image as slot 0.
            images: event.images?.length ? event.images : event.image ? [event.image] : [],
            street_address: event.street_address || '',
            city: event.city || '',
            region: event.region || '',
            country: event.country || '',
            start_time: event.start_time || '',
            end_time: event.end_time || '',
            website_url: event.website_url || '',
            categories: event.categories?.[0] ?? '',
            disclaimer: event.disclaimer || '',
            // The API sends postcodes as strings; dropping them here would turn every
            // save into a clear now that emptied fields are sent as ''.
            postal_code: toPostalCodeString(event.postal_code),
            co_organizers: event.co_organizers || [],
            help_needed: event.help_needed || false,
            help_description: event.help_description || '',
          };
          // Snapshot the loaded state as the dirty-check baseline.
          initialFormRef.current = next;
          return next;
        });
      } catch (error) {
        logger.warn('Failed to load draft for editing', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert(t('common.error'), (error as Error).message);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [eventId]);

  // One date of a series, while the feature is on. "Edit all upcoming" opens the form
  // on the first date in scope, and then there is no choice left to offer.
  const seriesId = recurringEnabled ? draftSeriesId : null;
  const editsAllUpcoming = !!seriesId && allUpcoming === 'true';
  const { series } = useEventSeries(seriesId);

  const isDirty = useCallback(
    () =>
      initialFormRef.current !== null &&
      JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form]
  );

  /** Close the editor, confirming first when there are unsaved edits. */
  const handleClosePress = useCallback(() => {
    if (isDirty()) {
      Alert.alert(t('eventEdit.discardTitle'), t('eventEdit.discardMessage'), [
        { text: t('eventEdit.keepEditing'), style: 'cancel' },
        {
          text: t('eventEdit.discardConfirm'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
    router.back();
  }, [isDirty]);

  // Intercept the Android hardware back so it honours the unsaved-changes guard
  // instead of silently discarding edits (the iOS swipe-back is disabled via
  // gestureEnabled: false in app/_layout.tsx).
  useEffect(() => {
    const onHardwareBack = () => {
      if (isDirty()) {
        handleClosePress();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub?.remove?.();
  }, [isDirty, handleClosePress]);

  // Build the partial update payload from the current form (empty optionals omitted).
  const buildDraftPatch = useCallback((): UpdateEventRequest => {
    const finalCoOrganizers = form.co_organizers?.length ? form.co_organizers : undefined;
    const locationUpdate = buildLocationUpdate(form, initialFormRef.current);
    return {
      title: form.title || undefined,
      description: form.description || undefined,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      // Emptied fields go as '' (clear); untouched blank ones are omitted.
      ...locationUpdate,
      // Re-picking the street this session adopts the confirmed pin (e.g. setting
      // it on an automation draft that had none); omitted when not re-picked or cleared.
      ...(locationUpdate.street_address
        ? { geocod_lat: form.geocod_lat ?? undefined, geocod_lng: form.geocod_lng ?? undefined }
        : {}),
      // Authoritative full ordered list (kept URLs + new files); an emptied
      // list is an explicit removal of every image.
      images: form.images.length ? form.images : null,
      website_url: form.website_url || undefined,
      categories: form.categories,
      disclaimer: form.disclaimer || undefined,
      co_organizers: finalCoOrganizers,
      help_needed: form.help_needed,
      help_description: form.help_needed ? form.help_description || undefined : undefined,
      ...allDaySubmitField(wasAllDayRef.current, form.start_time),
    };
  }, [form]);

  const validateLight = (): boolean => {
    if (form.start_time && form.end_time && form.end_time < form.start_time) {
      Alert.alert(t('common.error'), t('eventEdit.invalidTimeRangeError'));
      return false;
    }
    if (form.website_url && form.website_url.trim() && !URL_REGEX.test(form.website_url.trim())) {
      Alert.alert(t('common.error'), t('createEvent.invalidUrlFormat'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validateLight()) return;
    if (editsAllUpcoming) {
      await saveSeries();
    } else if (seriesId) {
      setSaveScopeOpen(true);
    } else {
      await saveDraft();
    }
  };

  const saveDraft = async () => {
    setActionBusy(true);
    try {
      await patchEvent(eventId, buildDraftPatch());
      Alert.alert(t('common.success'), t('drafts.savedConfirmation'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  // Null when the form asks for a schedule change, which a series cannot take.
  const seriesTimes =
    seriesId && initialFormRef.current
      ? seriesTimesFromForm(form, initialFormRef.current.start_time)
      : null;

  /** Save this draft and every later date, or with `allUpcoming` every upcoming date. */
  const saveSeries = async () => {
    if (!seriesId) return;
    if (!seriesTimes) {
      Alert.alert(t('common.error'), t('series.edit.dateLocked'));
      return;
    }
    setActionBusy(true);
    try {
      // The schedule fields of the patch cannot be sent to a series.
      const {
        start_time: _start,
        end_time: _end,
        all_day: _allDay,
        ...content
      } = buildDraftPatch();
      const result = await editSeries(
        seriesId,
        { ...content, ...(wasAllDayRef.current ? {} : seriesTimes) },
        editsAllUpcoming ? undefined : { fromEventId: eventId }
      );
      Alert.alert(t('common.success'), t('series.messages.updated', { count: result.updated }));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), seriesErrorMessage(error, userLanguage));
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveScopeConfirm = (scope: SeriesScope) => {
    setSaveScopeOpen(false);
    if (scope === 'following') {
      saveSeries();
    } else {
      saveDraft();
    }
  };

  const handlePublish = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validateLight()) return;

    // Client-side readiness — reports every problem at once and blocks the
    // past-date publish that the backend would otherwise allow.
    const issues = getPublishIssues({
      description: form.description,
      categories: form.categories,
      city: form.city,
      street_address: form.street_address,
      start_time: form.start_time,
    });
    if (issues.length > 0) {
      Alert.alert(t('drafts.publishIssuesTitle'), issues.map((i) => t(i.messageKey)).join('\n'));
      return;
    }

    setActionBusy(true);
    try {
      // Persist the latest edits first so the server publishes what the user sees.
      await patchEvent(eventId, buildDraftPatch());
    } catch (error) {
      // The patch failed — nothing was published; keep the editor.
      alertPublishFailure(error);
      setActionBusy(false);
      return;
    }

    await runPublish(false);
  };

  /** Alert for a failed save-then-publish; the editor stays open either way. */
  const alertPublishFailure = (error: unknown) => {
    if (error instanceof EventIncompleteError) {
      const messages = error.fields.length
        ? error.fields.map((field) => t(publishFieldToMessageKey(field)))
        : [t('drafts.issueIncomplete')];
      Alert.alert(t('drafts.publishIssuesTitle'), messages.join('\n'));
    } else if ((error as { isRateLimited?: boolean }).isRateLimited) {
      Alert.alert(t('errors.rateLimit.title'), t('errors.rateLimit.message'));
    } else {
      Alert.alert(t('common.error'), (error as Error).message);
    }
  };

  /**
   * Publish the draft. The edits are already persisted by the time this runs, so
   * the duplicate-override retry re-sends only this call — never the patch.
   */
  const runPublish = async (duplicateOverride: boolean) => {
    setActionBusy(true);
    // Set when publish reports the event was already published elsewhere; the
    // success path below runs either way, only the confirmation copy differs.
    let publishedElsewhere = false;
    const report: DuplicateWarningReport = {};
    try {
      await publishDraft(eventId, { duplicateOverride, report });
    } catch (error) {
      // Already published elsewhere (commonly the web dashboard). The patch
      // succeeded, so the edits are saved and the event is public — fall through
      // to the success path instead of stranding the user in a draft editor for
      // an event that is no longer a draft.
      if (error instanceof EventNotDraftError) {
        publishedElsewhere = true;
      } else if (duplicatePrompt.capture(error)) {
        // The opposite of the case above: nothing was published. The prompt now
        // holds the matches and waits for an explicit "publish anyway".
        setActionBusy(false);
        return;
      } else {
        alertPublishFailure(error);
        setActionBusy(false);
        return;
      }
    }

    // Published successfully. The cache/count refresh is best-effort — a failure
    // here must NOT strand the user on an already-published draft, so it runs
    // fire-and-forget rather than inside the publish try/catch (mirrors event/[id]).
    const orgIds = userOrganizations.map((org) => org.$id);
    refetchEvents().catch((refreshErr) =>
      logger.warn('Global events refresh failed after publish', {
        error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
      })
    );
    refreshUserEventCounts(orgIds).catch((refreshErr) =>
      logger.warn('Event counts refresh failed after publish', {
        error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
      })
    );

    // The event is now public — route to its detail page (works for both
    // 'active' and 'past' results).
    router.replace(DynamicRoutes.event(eventId, { isCreated: true }));
    alertWithDuplicateWarning(
      t('common.success'),
      publishedElsewhere ? t('drafts.alreadyPublished') : t('drafts.published'),
      report,
      (duplicate) => router.push(duplicateHref(duplicate))
    );
  };

  const handleDelete = () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (seriesId) {
      setDeleteScopeOpen(true);
      return;
    }
    Alert.alert(t('drafts.deleteConfirmTitle'), t('drafts.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('drafts.delete'),
        style: 'destructive',
        onPress: () => runDelete('only'),
      },
    ]);
  };

  const runDelete = async (scope: SeriesScope) => {
    setDeleteScopeOpen(false);
    setActionBusy(true);
    try {
      let message = t('drafts.deleted');
      if (scope === 'following' && seriesId) {
        const result = await deleteSeriesOccurrences(seriesId, { fromEventId: eventId });
        message = t('series.messages.deleted', { count: result.deleted });
      } else {
        await deleteEvent(eventId);
      }
      // Keep the draft badge count in sync after removing a draft.
      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds).catch((refreshErr) =>
        logger.warn('Event counts refresh failed after draft delete', {
          error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        })
      );
      router.replace(Routes.DRAFT_EVENTS);
      Alert.alert(t('common.success'), message);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        scope === 'following' ? seriesErrorMessage(error, userLanguage) : (error as Error).message
      );
    } finally {
      setActionBusy(false);
    }
  };

  if (!user && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (loading || actionBusy) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <>
      <FormScreenScaffold
        scrollViewRef={scrollViewRef}
        footer={
          <ThemedView style={[styles.footer, { borderTopColor: themeColors.border }]}>
            <CustomButton
              testID="btn-draft-save"
              title={t('drafts.save')}
              handlePress={handleSave}
              containerStyles={[
                styles.buttonSecondary,
                {
                  backgroundColor: themeColors.buttonSecondaryBackground,
                  borderColor: themeColors.buttonSecondaryBorder,
                },
              ]}
              textStyles={{ color: themeColors.text }}
              isLoading={actionBusy}
            />

            {/* Publish acts on this one draft; "Publish all" is on the series screen. */}
            {!editsAllUpcoming && (
              <CustomButton
                testID="btn-draft-publish"
                title={t('drafts.publish')}
                handlePress={handlePublish}
                containerStyles={styles.buttonPrimary}
                isLoading={actionBusy}
              />
            )}
          </ThemedView>
        }
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.headerRow}>
            <ThemedText type="title" style={styles.titleText}>
              {t('drafts.editTitle')}
            </ThemedText>
            <View style={styles.headerActions}>
              {!editsAllUpcoming && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={t('drafts.delete')}
                  accessibilityHint={t('a11y.hints.deleteDraft')}
                  accessibilityRole="button"
                  testID="btn-draft-delete"
                >
                  <IconSymbol name="trash" size={24} color={themeColors.destructive} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleClosePress}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('common.close')}
                accessibilityHint={t('a11y.hints.closeScreen')}
                accessibilityRole="button"
                testID="btn-draft-close"
              >
                <IconSymbol name="xmark" size={24} color={themeColors.icon} />
              </TouchableOpacity>
            </View>
          </ThemedView>

          {!!seriesId && (
            <HelperText
              text={
                editsAllUpcoming
                  ? t('series.edit.allNote')
                  : `${t('series.edit.partOfSeries')} ${t('series.edit.onlyNote')}`
              }
              isDark={colorScheme === 'dark'}
            />
          )}

          <EventForm
            form={form}
            setForm={setForm}
            emptyFields={emptyFields}
            userLanguage={userLanguage}
            scrollViewRef={scrollViewRef}
            isAllDay={wasAllDayRef.current}
          />
        </ThemedView>
      </FormScreenScaffold>
      <SeriesScopeDialog
        visible={saveScopeOpen}
        title={t('series.edit.scopeTitle')}
        onlyHint={t('series.edit.onlyNote')}
        followingHint={t('series.edit.followingNote')}
        followingDisabledReason={seriesTimes ? undefined : t('series.edit.dateLocked')}
        dismissLabel={t('common.cancel')}
        onDismiss={() => setSaveScopeOpen(false)}
        confirmLabel={t('drafts.save')}
        onConfirm={handleSaveScopeConfirm}
        testID="series-edit-scope"
      />
      <SeriesScopeDialog
        visible={deleteScopeOpen}
        title={t('series.dialogs.deleteScopeTitle')}
        message={t('series.dialogs.deleteScopeBody')}
        followingDisabledReason={
          series && isDraftsOnlyScope(series, eventId)
            ? undefined
            : t('series.dialogs.deleteFollowingLocked')
        }
        dismissLabel={t('common.cancel')}
        onDismiss={() => setDeleteScopeOpen(false)}
        confirmLabel={t('drafts.delete')}
        onConfirm={runDelete}
        destructive
        testID="series-delete-scope"
      />
      <DuplicateEventModal
        mode="publish"
        locale={userLanguage}
        {...duplicatePrompt.modalProps(() => runPublish(true))}
      />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  titleText: {
    flex: 1,
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Slim action bar: equal-width buttons override CustomButton's tall default
  // (containerStyles win over the base minHeight).
  buttonSecondary: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
  },
  buttonPrimary: {
    flex: 1,
    minHeight: 48,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
