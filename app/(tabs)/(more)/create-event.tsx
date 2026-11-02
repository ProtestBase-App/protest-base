import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Alert, TouchableOpacity, BackHandler, View } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { router, Link, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { EventFormShell } from '@/components/event-form/EventFormShell';
import { FormByline } from '@/components/event-form/FormByline';
import { EVENT_FORM_SHELL } from '@/constants/EventFormFlags';
import { FormFieldAnchor, FormScreenScaffold } from '@/components/FormScreenScaffold';
import { FormIssueSummary } from '@/components/FormIssueSummary';

import {
  createEventBackend,
  createDraftEvent,
  getEventByIdBackend,
} from '@/services/event.service';
import { getTemplate } from '@/services/template.service';
import { saveEventDraft, getEventDraft, clearEventDraft } from '@/services/localStorageService';
import CustomButton from '@/components/CustomButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import {
  useRecurringEventsEnabled,
  useTitleOnlyDraftsEnabled,
} from '@/context/VersionCheckProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDuplicatePrompt } from '@/hooks/useDuplicatePrompt';
import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import { useFormAutosave } from '@/hooks/useFormAutosave';
import { getThemeColors } from '@/utils/themeColors';
import EventForm from '@/components/EventForm';
import DuplicateEventModal from '@/components/DuplicateEventModal';
import { OrganizationPicker } from '@/components/OrganizationPicker';
import type { FormState } from '@/types/eventForm.types';
import type { CreateEventRequest, PickedImage } from '@/types/event.types';
import type { CreateEventReport, RepeatFormState } from '@/types/eventSeries.types';
import type { ParsedEventTemplate } from '@/types/template.types';
import { IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { alertWithDuplicateWarning, duplicateHref } from '@/utils/duplicateEvents';
import { buildEventRequest, createBlankForm } from '@/utils/eventFormData';
import { keepExistingImages } from '@/utils/localImages';
import { templateStartFromEvent } from '@/utils/templateUtils';
import { stillNeededFields, validateEventForm } from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { toPostalCodeString } from '@/utils/eventLocation';
import { buildRecurrenceRule, isRepeating, seriesErrorMessage } from '@/utils/recurrence';

const areArraysEqual = (arr1: string[] | undefined, arr2: string[] | undefined): boolean => {
  const a = arr1 || [];
  const b = arr2 || [];

  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => val === sortedB[idx]);
};

// Order-sensitive (reorder counts as a change); entries compare by reference.
const areImageListsEqual = (a: FormState['images'], b: FormState['images']): boolean =>
  a.length === b.length && a.every((img, idx) => img === b[idx]);

/**
 * Local drafts saved before multi-image support stored a single `image`
 * (PickedImage | string | null) instead of the `images` list; fold it in so
 * resuming an old draft doesn't crash on the missing array.
 */
const migrateDraftFormState = (saved: FormState & { image?: unknown }): FormState => {
  // Drafts saved before the address-coordinate fields existed lack them; default
  // to null so a resumed draft has a well-formed FormState (no live-pick coords).
  const withCoords: FormState = {
    ...saved,
    geocod_lat: saved.geocod_lat ?? null,
    geocod_lng: saved.geocod_lng ?? null,
  };
  if (Array.isArray(withCoords.images)) return withCoords;
  const legacy = saved.image;
  return {
    ...withCoords,
    images: legacy && typeof legacy === 'object' ? [legacy as PickedImage] : [],
  };
};

type TemplateStart = Pick<ParsedEventTemplate, 'event_data' | 'image_urls'> & { name?: string };

/**
 * The form with a template's saved details laid over it. Empty strings saved in the
 * template are kept; only fields the template never had fall back to `prevForm`.
 */
const applyTemplate = (prevForm: FormState, template: TemplateStart): FormState => {
  const eventData = template.event_data;
  return {
    ...prevForm,
    organization_id:
      eventData.organization_id !== undefined
        ? eventData.organization_id
        : prevForm.organization_id,
    // Template images are hosted URLs attached verbatim on create — the event gets
    // its own list entries; the template's images are never consumed or moved.
    images: template.image_urls?.length ? template.image_urls : prevForm.images,
    title: eventData.title !== undefined ? eventData.title : prevForm.title,
    description: eventData.description !== undefined ? eventData.description : prevForm.description,
    street_address:
      eventData.street_address !== undefined ? eventData.street_address : prevForm.street_address,
    city: eventData.city !== undefined ? eventData.city : prevForm.city,
    region: eventData.region !== undefined ? eventData.region : prevForm.region,
    country: eventData.country !== undefined ? eventData.country : prevForm.country,
    postal_code: toPostalCodeString(eventData.postal_code) ?? prevForm.postal_code,
    website_url: eventData.website_url !== undefined ? eventData.website_url : prevForm.website_url,
    categories: Array.isArray(eventData.categories)
      ? eventData.categories.join(',')
      : eventData.categories !== undefined
        ? eventData.categories
        : prevForm.categories,
    disclaimer: eventData.disclaimer !== undefined ? eventData.disclaimer : prevForm.disclaimer,
    co_organizers: eventData.co_organizers ?? prevForm.co_organizers,
    help_needed: eventData.help_needed ?? prevForm.help_needed,
    help_description:
      eventData.help_description !== undefined
        ? eventData.help_description
        : prevForm.help_description,
  };
};

const hasFormChanges = (current: FormState, initial: FormState): boolean => {
  return (
    current.organization_id !== initial.organization_id ||
    current.title !== initial.title ||
    current.description !== initial.description ||
    !areImageListsEqual(current.images, initial.images) ||
    current.street_address !== initial.street_address ||
    current.city !== initial.city ||
    current.region !== initial.region ||
    current.country !== initial.country ||
    current.start_time !== initial.start_time ||
    current.end_time !== initial.end_time ||
    current.website_url !== initial.website_url ||
    current.categories !== initial.categories ||
    current.disclaimer !== initial.disclaimer ||
    current.postal_code !== initial.postal_code ||
    !areArraysEqual(current.co_organizers, initial.co_organizers) ||
    current.help_needed !== initial.help_needed ||
    current.help_description !== initial.help_description ||
    isRepeating(current.repeat)
  );
};

export default function CreateEventModal() {
  const {
    user,
    loading,
    isLogged,
    userLanguage,
    refreshUserEventCounts,
    refetchEvents,
    upsertEventInCache,
  } = useGlobalContext();
  const {
    selectedOrganizationId,
    hasOrganizations,
    userOrganizations,
    loading: userOrgsLoading,
  } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const recurringEnabled = useRecurringEventsEnabled();
  const titleOnlyDrafts = useTitleOnlyDraftsEnabled();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isPresented = router.canGoBack();
  const params = useLocalSearchParams<{
    templateId?: string;
    fromEventId?: string;
    resume?: string;
    source?: string;
  }>();

  const [isSubmitting, setSubmitting] = useState(false);
  const [isSavingDraft, setSavingDraft] = useState(false);
  const isSending = isSubmitting || isSavingDraft;
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isResuming, setIsResuming] = useState(params.resume === '1');
  const [publishCheckOpen, setPublishCheckOpen] = useState(false);
  const [startingTemplate, setStartingTemplate] = useState<TemplateStart | null>(null);

  // 409 DUPLICATE_EVENT. The context records WHICH button was pressed, so
  // "Create anyway" re-sends that same submission — routing a refused draft save
  // through the event create would publish something the organizer only meant to
  // save. The form state is untouched, so the retry re-attaches the images the
  // refused request never uploaded.
  const duplicatePrompt = useDuplicatePrompt<'event' | 'draft'>({ isOffline });

  const [form, setForm] = useState<FormState>(() =>
    createBlankForm({ organizer_name: user?.name || '' })
  );

  // What the form holds before the organizer touches it: the auto-filled organization
  // and a launched template are its starting point, not edits to autosave or warn about.
  const initialFormState = useMemo<FormState>(() => {
    const blankForm = createBlankForm({
      organization_id: selectedOrganizationId || '',
      organizer_name: user?.name || '',
    });
    return startingTemplate ? applyTemplate(blankForm, startingTemplate) : blankForm;
  }, [user?.name, selectedOrganizationId, startingTemplate]);

  // Apply organization_id from context for single-org users
  useEffect(() => {
    if (selectedOrganizationId && !form.organization_id) {
      setForm((prev) => ({ ...prev, organization_id: selectedOrganizationId }));
    }
  }, [selectedOrganizationId, form.organization_id]);

  const formHasChanges = useMemo(
    () => hasFormChanges(form, initialFormState),
    [form, initialFormState]
  );

  const draftCheckedRef = useRef(false);

  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  const handleCloseAttempt = useCallback(() => {
    if (isSending) return;

    if (!formHasChanges) {
      router.back();
      return;
    }

    Alert.alert(t('draft.closeTitle'), t('draft.closeMessage'), [
      {
        text: t('draft.discard'),
        style: 'destructive',
        onPress: async () => {
          await clearEventDraft();
          router.back();
        },
      },
      {
        text: t('draft.saveDraft'),
        onPress: async () => {
          await saveEventDraft(form);
          router.back();
        },
      },
      {
        text: t('draft.keepEditing'),
        style: 'cancel',
      },
    ]);
  }, [form, formHasChanges, isSending]);

  // Resuming is a choice made on the start screen, which also guards every other way
  // in, so a new form never autosaves over the local draft unasked.
  useEffect(() => {
    if (params.resume !== '1' || draftCheckedRef.current || loading) return;
    draftCheckedRef.current = true;

    const resumeDraft = async () => {
      try {
        const draft = await getEventDraft();
        if (!draft) return;
        const saved = migrateDraftFormState(draft.formData);
        const images = keepExistingImages(saved.images);
        setForm({ ...saved, images });
        if (images.length < saved.images.length) {
          Alert.alert(t('draft.photosMissingTitle'), t('draft.photosMissingMessage'));
        }
      } catch (error) {
        logger.warn('Failed to resume draft', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsResuming(false);
      }
    };

    resumeDraft();
  }, [loading, params.resume]);

  useFormAutosave({
    value: form,
    enabled: formHasChanges && !isResuming,
    save: saveEventDraft,
  });

  useEffect(() => {
    if (EVENT_FORM_SHELL.createEvent) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseAttempt();
      return true;
    });

    return () => backHandler.remove();
  }, [handleCloseAttempt]);

  // Pre-fill from a template or a past event, whichever the start screen chose.
  useEffect(() => {
    const { templateId, fromEventId } = params;
    if (!templateId && !fromEventId) return;

    const loadStart = async () => {
      setIsLoadingTemplate(true);
      try {
        const start = templateId
          ? await getTemplate(templateId)
          : templateStartFromEvent(await getEventByIdBackend(fromEventId as string));
        setForm((prevForm) => applyTemplate(prevForm, start));
        setStartingTemplate(start);
      } catch (error) {
        logger.warn('Failed to load what the form starts from', {
          templateId,
          fromEventId,
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert(t('createEvent.templateError'), t('createEvent.templateErrorMessage'), [
          { text: t('common.ok') },
        ]);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.templateId, params.fromEventId]);

  const handleBackPress = () => {
    handleCloseAttempt();
  };

  /**
   * The rule this form is asking for, or null for a single event. Read at every
   * submit: a resumed autosave can hold a rule from when the feature was on, and the
   * form then shows the single-event fields, so that is what gets sent.
   */
  const activeRepeat = (): RepeatFormState | null =>
    recurringEnabled && isRepeating(form.repeat) ? form.repeat : null;

  const validation = useEventFormValidation((intent) =>
    validateEventForm(form, {
      intent,
      // Form value takes precedence, fall back to context (single-org users)
      organizationId: form.organization_id || selectedOrganizationId || '',
      repeat: activeRepeat(),
      requireDraftContent: !titleOnlyDrafts,
    })
  );

  const submit = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validation.check('publish')) return;

    if (EVENT_FORM_SHELL.createEvent) {
      setPublishCheckOpen(true);
    } else {
      await runCreateEvent(false);
    }
  };

  /**
   * Send the create request. Validation has already run; `duplicateOverride`
   * acknowledges a 409 DUPLICATE_EVENT and is only ever true on a retry the user
   * explicitly confirmed.
   */
  const runCreateEvent = async (duplicateOverride: boolean) => {
    const repeat = activeRepeat();
    const rule = repeat ? buildRecurrenceRule(repeat).rule : null;
    if (repeat && !rule) return;

    setSubmitting(true);
    try {
      // Non-blocking duplicate verdicts, when the backend has something to say
      // about an event it accepted anyway (warn mode, or a weak match).
      const report: CreateEventReport = {};

      const resultCreateEvent = await createEventBackend(
        buildEventRequest(
          form,
          form.organization_id || selectedOrganizationId || '',
          rule
        ) as CreateEventRequest,
        { duplicateOverride, report }
      );

      await clearEventDraft();

      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds);

      // Seed the global events cache so Home (calendar/list) and other screens
      // see the new event immediately, without waiting for the next refetch.
      upsertEventInCache(resultCreateEvent);
      // A series is N new rows and this seeded one: the rest come with a refresh.
      if (report.series) {
        refetchEvents().catch((refreshErr) => {
          logger.warn('Global events cache refresh failed', { error: refreshErr });
        });
      }

      router.replace(DynamicRoutes.event(resultCreateEvent.$id, { isCreated: true }));

      alertWithDuplicateWarning(
        t('common.success'),
        report.series
          ? t('series.messages.created', { count: report.series.occurrence_count })
          : t('alerts.eventCreated'),
        report,
        (duplicate) => router.push(duplicateHref(duplicate)),
        undefined,
        userLanguage
      );
    } catch (error) {
      // Block mode refused it: the prompt shows the matches and waits. Never
      // retried automatically — the override is the organizer's call.
      if (duplicatePrompt.capture(error, 'event')) return;
      const errorMessage = rule
        ? seriesErrorMessage(error, userLanguage)
        : error instanceof Error
          ? error.message
          : String(error);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Save the in-progress form as a backend draft (status: 'draft'). The backend wants
  // a description and a start on every create, drafts included, until it announces
  // `titleOnlyDrafts`; publishing enforces the rest. This is unrelated to the LOCAL
  // form autosave (clearEventDraft below only clears that local snapshot).
  const submitDraft = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validation.check('saveDraft')) return;
    await runCreateDraft(false);
  };

  /** Send the draft-create request; see runCreateEvent for `duplicateOverride`. */
  const runCreateDraft = async (duplicateOverride: boolean) => {
    const repeat = activeRepeat();
    const rule = repeat ? buildRecurrenceRule(repeat).rule : null;
    if (repeat && !rule) return;

    setSavingDraft(true);
    try {
      const report: CreateEventReport = {};

      await createDraftEvent(
        buildEventRequest(form, form.organization_id || selectedOrganizationId || '', rule),
        { duplicateOverride, report }
      );

      // Clear the LOCAL autosave snapshot now that it's persisted server-side.
      await clearEventDraft();

      // Refresh the draft badge count (drafts ARE counted). The global events
      // cache is NOT touched — drafts are excluded from it.
      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds);

      router.replace(Routes.DRAFT_EVENTS);
      alertWithDuplicateWarning(
        t('common.success'),
        report.series
          ? t('series.messages.draftsCreated', { count: report.series.occurrence_count })
          : t('drafts.savedConfirmation'),
        report,
        (duplicate) => router.push(duplicateHref(duplicate)),
        undefined,
        userLanguage
      );
    } catch (error) {
      // The duplicate guard runs on drafts too — same prompt, same override.
      if (duplicatePrompt.capture(error, 'draft')) return;
      const errorMessage = rule
        ? seriesErrorMessage(error, userLanguage)
        : error instanceof Error
          ? error.message
          : String(error);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSavingDraft(false);
    }
  };

  if (!loading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (!loading && !userOrgsLoading && isLogged && !hasOrganizations) {
    return <Redirect href="/(tabs)/(more)/become-organizer?from=create-event" />;
  }

  if (isLoadingTemplate || isResuming || userOrgsLoading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
        {isLoadingTemplate && (
          <ThemedText style={styles.loadingText}>{t('templates.loadingTemplate')}</ThemedText>
        )}
        {isResuming && (
          <ThemedText style={styles.loadingText}>{t('draft.checkingDraft')}</ThemedText>
        )}
      </ThemedView>
    );
  }

  if (EVENT_FORM_SHELL.createEvent) {
    const onlyDateLeft =
      !!startingTemplate && stillNeededFields(form, 'create', activeRepeat()).join() === 'date';

    return (
      <>
        <EventFormShell
          kind="create"
          form={form}
          setForm={setForm}
          validation={validation}
          userLanguage={userLanguage}
          inSheet
          busy={isSending}
          showRepeat={recurringEnabled}
          scrollViewRef={scrollViewRef}
          closeLabel={t('createEvent.closeAccessibilityLabel')}
          onBack={() => {
            handleCloseAttempt();
            return true;
          }}
          intro={
            !!startingTemplate?.name && (
              <View style={styles.fromTemplate}>
                <IconSymbol
                  name="doc.on.doc"
                  size={IconSizes.xs}
                  color={themeColors.secondaryText}
                />
                <ThemedText style={[styles.fromTemplateText, { color: themeColors.secondaryText }]}>
                  {t('createEvent.fromTemplate', { name: startingTemplate.name })}
                </ThemedText>
              </View>
            )
          }
          byline={
            <>
              <FormFieldAnchor field="organization">
                <OrganizationPicker
                  value={form.organization_id || selectedOrganizationId || undefined}
                  onValueChange={(id) => setForm({ ...form, organization_id: id })}
                  error={!!validation.errors.organization}
                  errorMessage={validation.errors.organization}
                />
              </FormFieldAnchor>
              {userOrganizations.length === 1 && <FormByline name={userOrganizations[0].Name} />}
            </>
          }
          whenPrompt={
            onlyDateLeft
              ? {
                  title: t('createEvent.pickTheDate'),
                  subtitle: t('createEvent.onlyThingLeft'),
                }
              : undefined
          }
          highlightWhen={onlyDateLeft}
          publishCheck={{
            open: publishCheckOpen,
            onConfirm: () => {
              setPublishCheckOpen(false);
              runCreateEvent(false);
            },
            onClose: () => setPublishCheckOpen(false),
          }}
          footer={
            <>
              <CustomButton
                testID="btn-create-event-draft"
                title={isSavingDraft ? t('common.saving') : t('createEvent.saveAsDraft')}
                handlePress={submitDraft}
                pill
                containerStyles={[
                  styles.buttonDraft,
                  {
                    backgroundColor: themeColors.buttonSecondaryBackground,
                    borderColor: themeColors.buttonSecondaryBorder,
                  },
                ]}
                textStyles={{ color: themeColors.text }}
                isLoading={isSending}
              />
              <CustomButton
                testID="btn-create-event-submit"
                title={isSubmitting ? t('common.publishing') : t('createEvent.publish')}
                handlePress={submit}
                pill
                containerStyles={styles.button}
                isLoading={isSending}
              />
            </>
          }
        />
        <DuplicateEventModal
          mode="create"
          locale={userLanguage}
          {...duplicatePrompt.modalProps((submitted) =>
            submitted === 'draft' ? runCreateDraft(true) : runCreateEvent(true)
          )}
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <FormScreenScaffold
        scrollViewRef={scrollViewRef}
        inSheet
        footer={
          <ThemedView style={[styles.footer, { borderTopColor: themeColors.border }]}>
            <CustomButton
              testID="btn-create-event-draft"
              title={isSavingDraft ? t('common.saving') : t('createEvent.saveAsDraft')}
              handlePress={submitDraft}
              containerStyles={[
                styles.buttonDraft,
                {
                  backgroundColor: themeColors.buttonSecondaryBackground,
                  borderColor: themeColors.buttonSecondaryBorder,
                },
              ]}
              textStyles={{ color: themeColors.text }}
              isLoading={isSending}
            />
            <CustomButton
              testID="btn-create-event-submit"
              title={isSubmitting ? t('common.publishing') : t('createEvent.publish')}
              handlePress={submit}
              containerStyles={styles.button}
              isLoading={isSending}
            />
          </ThemedView>
        }
      >
        {/* Stays on screen while sending, so a refused send comes back as it left. */}
        <ThemedView style={styles.container} pointerEvents={isSending ? 'none' : 'auto'}>
          <ThemedView style={styles.headerRow}>
            <ThemedText type="title" style={styles.titleText}>
              {t('more.createEvent')}
            </ThemedText>
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('createEvent.closeAccessibilityLabel')}
              accessibilityHint={t('a11y.hints.closeScreen')}
              accessibilityRole="button"
            >
              <IconSymbol name="xmark" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </ThemedView>

          <FormIssueSummary validation={validation} />

          <FormFieldAnchor field="organization">
            <OrganizationPicker
              value={form.organization_id || selectedOrganizationId || undefined}
              onValueChange={(id) => setForm({ ...form, organization_id: id })}
              error={!!validation.errors.organization}
              errorMessage={validation.errors.organization}
            />
          </FormFieldAnchor>

          <EventForm
            form={form}
            setForm={setForm}
            errors={validation.errors}
            userLanguage={userLanguage}
            scrollViewRef={scrollViewRef}
            showRepeat={recurringEnabled}
          />

          {!isPresented && <Link href="../">{t('common.dismiss')}</Link>}
        </ThemedView>
      </FormScreenScaffold>
      <DuplicateEventModal
        mode="create"
        locale={userLanguage}
        {...duplicatePrompt.modalProps((submitted) =>
          submitted === 'draft' ? runCreateDraft(true) : runCreateEvent(true)
        )}
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
  closeButton: {
    minWidth: 44,
    minHeight: 44,
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
  // Slimmer than CustomButton's tall default (containerStyles win over the
  // base minHeight), matching the edit screens' 48px action buttons.
  button: {
    flex: 1,
    minHeight: 48,
  },
  buttonDraft: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  fromTemplate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  fromTemplateText: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: Typography.families.medium,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: Typography.sizes.sm,
    opacity: 0.7,
  },
});
