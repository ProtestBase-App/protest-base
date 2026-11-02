import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, BackHandler } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EventFormShell } from '@/components/event-form/EventFormShell';
import { EVENT_FORM_SHELL } from '@/constants/EventFormFlags';
import { FormScreenScaffold } from '@/components/FormScreenScaffold';
import { FormIssueSummary } from '@/components/FormIssueSummary';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { editSeries, getEventByIdBackend, updateEvent } from '@/services/event.service';
import CustomButton from '@/components/CustomButton';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useRecurringEventsEnabled } from '@/context/VersionCheckProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import { allDaySubmitField, formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import EventForm from '@/components/EventForm';
import SeriesScopeDialog from '@/components/SeriesScopeDialog';
import type { FormState } from '@/types/eventForm.types';
import type { SeriesEditRequest, SeriesScope } from '@/types/eventSeries.types';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { Spacing } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { createBlankForm } from '@/utils/eventFormData';
import { validateEventForm } from '@/utils/eventFormValidation';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { buildLocationUpdate, toPostalCodeString } from '@/utils/eventLocation';
import { HelperText } from '@/utils/formHelpers';
import { seriesErrorMessage, seriesTimesFromForm } from '@/utils/recurrence';

export default function EditEvent() {
  const { user, isLogged, userLanguage, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { id, isCreated, allUpcoming } = useLocalSearchParams<{
    id: string | string[];
    isCreated?: string;
    allUpcoming?: string;
  }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const recurringEnabled = useRecurringEventsEnabled();

  const [eventDetail, setEventDetail] = useState<FormattedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    createBlankForm({ organizer_name: user?.name || '' })
  );

  const validation = useEventFormValidation((intent) => validateEventForm(form, { intent }));

  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  // Baseline snapshot of the freshly loaded form; drives the unsaved-changes
  // guard so leaving without saving prompts only when something actually changed.
  const initialFormRef = useRef<FormState | null>(null);
  // Whether the event ARRIVED date-only. A ref rather than form state: it never
  // changes after load, and the dirty check above stringifies the whole form.
  const wasAllDayRef = useRef(false);

  // One date of a series, while the feature is on. "Edit all upcoming" opens the form
  // on the first date in scope, and then there is no choice left to offer.
  const seriesId = recurringEnabled ? (eventDetail[0]?.series_id ?? null) : null;
  const editsAllUpcoming = !!seriesId && allUpcoming === 'true';

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);

        // Always fetch fresh — never seed from eventsCache. The form populates
        // every field from this object and writes them all back on submit, so a
        // stale cached copy (long session, or disk-hydrated snapshot) would
        // silently revert changes made from another device. Skipping the cache
        // also keeps the open form stable while background refreshes replace
        // eventsCache wholesale.
        const fetchedEvent = await getEventByIdBackend(eventId);
        const formatted = formatEventForDisplay(fetchedEvent, userLanguage);
        setEventDetail([formatted]);
      } catch (error) {
        logger.warn('Failed to load event for editing', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        setEventDetail([]);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId, userLanguage]);

  // Populate form once event data is available.
  useEffect(() => {
    if (eventDetail && eventDetail.length > 0) {
      const postalCode = toPostalCodeString(eventDetail[0].postal_code);

      wasAllDayRef.current = eventDetail[0].all_day === true;

      setForm((prevForm) => {
        const next: FormState = {
          ...prevForm,
          title: eventDetail[0].title || '',
          description: eventDetail[0].description || '',
          images: eventDetail[0].images || [],
          street_address: eventDetail[0].street_address || '',
          city: eventDetail[0].city || '',
          region: eventDetail[0].region || '',
          country: eventDetail[0].country || '',
          start_time: eventDetail[0].startDateFull || '',
          end_time: eventDetail[0].endDateFull || '',
          postal_code: postalCode,
          co_organizers: eventDetail[0].co_organizers || [],
          categories:
            eventDetail[0].categories && eventDetail[0].categories.length > 0
              ? eventDetail[0].categories[0]
              : '',
          website_url: eventDetail[0].website_url || '',
          disclaimer: eventDetail[0].disclaimer || '',
          help_needed: eventDetail[0].help_needed || false,
          help_description: eventDetail[0].help_description || '',
        };
        // Snapshot the loaded state as the dirty-check baseline.
        initialFormRef.current = next;
        return next;
      });
    }
  }, [eventDetail]);

  const isDirty = useCallback(
    () =>
      initialFormRef.current !== null &&
      JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form]
  );

  const performExit = useCallback(() => {
    if (isCreated) {
      router.push(Routes.MY_EVENTS);
    } else {
      router.back();
    }
  }, [isCreated]);

  const handleBackPress = useCallback(() => {
    if (isDirty()) {
      Alert.alert(t('eventEdit.discardTitle'), t('eventEdit.discardMessage'), [
        { text: t('eventEdit.keepEditing'), style: 'cancel' },
        { text: t('eventEdit.discardConfirm'), style: 'destructive', onPress: performExit },
      ]);
      return;
    }
    performExit();
  }, [isDirty, performExit]);

  // Intercept the Android hardware back so it honours the unsaved-changes guard
  // instead of silently discarding edits.
  useEffect(() => {
    if (EVENT_FORM_SHELL.eventEdit) return;

    const onHardwareBack = () => {
      if (isDirty()) {
        handleBackPress();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub?.remove?.();
  }, [isDirty, handleBackPress]);

  const submit = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validation.check('saveEdit')) return;

    if (editsAllUpcoming) {
      await saveSeries();
    } else if (seriesId) {
      setScopeDialogOpen(true);
    } else {
      await saveEvent();
    }
  };

  /** Everything but the schedule, shared by the one-event and the series save. */
  const contentFields = (): SeriesEditRequest => {
    // co_organizers holds org IDs (the dropdown values) — sent through as-is.
    const finalCoOrganizers = form.co_organizers?.length ? form.co_organizers : undefined;
    const locationUpdate = buildLocationUpdate(form, initialFormRef.current);

    // organizer_name is intentionally not sent — it's tied to the creator.
    return {
      title: form.title,
      description: form.description,
      // Emptied fields go as '' (clear); untouched blank ones are omitted.
      ...locationUpdate,
      // Re-picking the street this session adopts the confirmed pin (healing a
      // stale/wrong one); omitted when the street wasn't re-picked or is cleared.
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
    };
  };

  const finishSave = async (message: string) => {
    await refetchEvents();

    const orgIds = userOrganizations.map((org) => org.$id);
    refreshUserEventCounts(orgIds);

    router.replace(DynamicRoutes.event(eventId, { isCreated: isCreated === 'true' }));

    Alert.alert(t('common.success'), message);
  };

  const saveEvent = async () => {
    setSubmitting(true);
    try {
      await updateEvent(eventId, {
        ...contentFields(),
        start_time: form.start_time,
        end_time: form.end_time || undefined,
        ...allDaySubmitField(wasAllDayRef.current, form.start_time),
      });
      await finishSave(t('eventEdit.successMessage'));
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Null when the form asks for a schedule change, which a series cannot take.
  const seriesTimes =
    seriesId && initialFormRef.current
      ? seriesTimesFromForm(form, initialFormRef.current.start_time)
      : null;

  /** Save this date and every later one, or with `allUpcoming` every upcoming date. */
  const saveSeries = async () => {
    if (!seriesId) return;
    if (!seriesTimes) {
      Alert.alert(t('common.error'), t('series.edit.dateLocked'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await editSeries(
        seriesId,
        // An all-day series has no wall-clock times to set.
        { ...contentFields(), ...(wasAllDayRef.current ? {} : seriesTimes) },
        editsAllUpcoming ? undefined : { fromEventId: eventId }
      );
      await finishSave(t('series.messages.updated', { count: result.updated }));
    } catch (error) {
      Alert.alert(t('common.error'), seriesErrorMessage(error, userLanguage));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScopeConfirm = (scope: SeriesScope) => {
    setScopeDialogOpen(false);
    if (scope === 'following') {
      saveSeries();
    } else {
      saveEvent();
    }
  };

  if (!user && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  // Only the initial fetch takes over the screen. During save the form stays
  // mounted and the Save button shows its own spinner, so the page doesn't blink
  // out from under the user.
  if (loading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  const scopeDialog = (
    <SeriesScopeDialog
      visible={scopeDialogOpen}
      title={t('series.edit.scopeTitle')}
      onlyHint={t('series.edit.onlyNote')}
      followingHint={t('series.edit.followingNote')}
      followingDisabledReason={seriesTimes ? undefined : t('series.edit.dateLocked')}
      dismissLabel={t('common.cancel')}
      onDismiss={() => setScopeDialogOpen(false)}
      confirmLabel={t('common.save')}
      onConfirm={handleScopeConfirm}
      testID="series-edit-scope"
    />
  );

  const seriesNote = !!seriesId && (
    <HelperText
      text={
        editsAllUpcoming
          ? t('series.edit.allNote')
          : `${t('series.edit.partOfSeries')} ${t('series.edit.onlyNote')}`
      }
      isDark={colorScheme === 'dark'}
    />
  );

  if (EVENT_FORM_SHELL.eventEdit) {
    const event = eventDetail[0];
    return (
      <>
        <EventFormShell
          kind="edit"
          form={form}
          setForm={setForm}
          validation={validation}
          userLanguage={userLanguage}
          busy={isSubmitting}
          isAllDay={wasAllDayRef.current}
          savedPin={
            event?.geocod_lat != null && event.geocod_lng != null
              ? {
                  latitude: event.geocod_lat,
                  longitude: event.geocod_lng,
                  street: event.street_address || '',
                }
              : null
          }
          scrollViewRef={scrollViewRef}
          closeLabel={t('eventEdit.closeAccessibilityLabel')}
          onBack={() => {
            handleBackPress();
            return true;
          }}
          heading={t('eventEdit.title')}
          intro={seriesNote}
          footer={
            <>
              <CustomButton
                testID="button-cancel"
                title={t('common.cancel')}
                handlePress={() => handleBackPress()}
                pill
                containerStyles={[
                  styles.buttonCancel,
                  {
                    backgroundColor: themeColors.buttonSecondaryBackground,
                    borderColor: themeColors.buttonSecondaryBorder,
                  },
                ]}
                textStyles={{ color: themeColors.text }}
                isLoading={false}
                disabled={isSubmitting}
              />
              <CustomButton
                testID="button-save"
                title={isSubmitting ? t('common.saving') : t('common.save')}
                handlePress={submit}
                pill
                containerStyles={styles.buttonSave}
                isLoading={isSubmitting}
              />
            </>
          }
        />
        {scopeDialog}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <FormScreenScaffold
        scrollViewRef={scrollViewRef}
        footer={
          <ThemedView style={[styles.footer, { borderTopColor: themeColors.border }]}>
            <CustomButton
              testID="button-cancel"
              title={t('common.cancel')}
              handlePress={() => handleBackPress()}
              containerStyles={[
                styles.buttonCancel,
                {
                  backgroundColor: themeColors.buttonSecondaryBackground,
                  borderColor: themeColors.buttonSecondaryBorder,
                },
              ]}
              textStyles={{ color: themeColors.text }}
              isLoading={false}
              disabled={isSubmitting}
            />

            <CustomButton
              testID="button-save"
              title={t('common.save')}
              handlePress={submit}
              containerStyles={styles.buttonSave}
              isLoading={isSubmitting}
            />
          </ThemedView>
        }
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.headerRow}>
            <ThemedText type="title" style={styles.titleText}>
              {t('eventEdit.title')}
            </ThemedText>
            <TouchableOpacity
              onPress={() => handleBackPress()}
              disabled={isSubmitting}
              style={[styles.closeButton, isSubmitting && styles.closeButtonDisabled]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('eventEdit.closeAccessibilityLabel')}
              accessibilityHint={t('a11y.hints.closeScreen')}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <IconSymbol name="xmark" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </ThemedView>

          <FormIssueSummary validation={validation} />

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
            errors={validation.errors}
            userLanguage={userLanguage}
            mode="edit-event"
            scrollViewRef={scrollViewRef}
            isAllDay={wasAllDayRef.current}
          />
        </ThemedView>
      </FormScreenScaffold>
      {scopeDialog}
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
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.4,
  },
  // Slim action bar: equal-width buttons override CustomButton's tall default
  // (containerStyles win over the base minHeight).
  buttonCancel: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
  },
  buttonSave: {
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
