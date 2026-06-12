import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { router, Link, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createEventBackend, createDraftEvent } from '@/services/event.service';
import { getTemplate } from '@/services/template.service';
import { saveEventDraft, getEventDraft, clearEventDraft } from '@/services/localStorageService';
import CustomButton from '@/components/CustomButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import EventForm from '@/components/EventForm';
import { OrganizationPicker } from '@/components/OrganizationPicker';
import type { FormState } from '@/types/eventForm.types';
import type { PickedImage } from '@/types/event.types';
import { Typography } from '@/constants/DesignTokens';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { DRAFT_CONFIG } from '@/constants/StorageConfig';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

/**
 * Validate URL format using URL constructor.
 * Only allows http/https protocols for security.
 */
const isValidUrl = (url: string): boolean => {
  try {
    const urlWithProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Hostname must have at least 2 non-empty parts (domain + TLD) to reject
    // "..." or "domain..com" while accepting "a.io".
    const hostnameParts = parsed.hostname.split('.');
    return hostnameParts.length >= 2 && hostnameParts.every((part) => part.length > 0);
  } catch {
    return false;
  }
};

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
  if (Array.isArray(saved.images)) return saved;
  const legacy = saved.image;
  return {
    ...saved,
    images: legacy && typeof legacy === 'object' ? [legacy as PickedImage] : [],
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
    current.help_description !== initial.help_description
  );
};

export default function CreateEventModal() {
  const { user, loading, isLogged, userLanguage, refreshUserEventCounts, upsertEventInCache } =
    useGlobalContext();
  const {
    selectedOrganizationId,
    hasOrganizations,
    userOrganizations,
    loading: userOrgsLoading,
  } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const isPresented = router.canGoBack();
  const params = useLocalSearchParams<{ templateId?: string; source?: string }>();

  const [isSubmitting, setSubmitting] = useState(false);
  const [isSavingDraft, setSavingDraft] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isCheckingDraft, setIsCheckingDraft] = useState(true);

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
  });

  const [emptyFields, setEmptyFields] = useState({
    organization_id: false,
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  const initialFormState = useMemo<FormState>(
    () => ({
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
    }),
    [user?.name, user?.email]
  );

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

  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftCheckedRef = useRef(false);
  const saveFailureCountRef = useRef(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleCloseAttempt = useCallback(() => {
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
  }, [form, formHasChanges]);

  // Check for existing draft on mount (before template loading)
  useEffect(() => {
    const checkDraft = async () => {
      // If a template is being loaded, the template wins and any existing draft is discarded.
      if (draftCheckedRef.current || params.templateId) {
        if (params.templateId) {
          await clearEventDraft();
        }
        setIsCheckingDraft(false);
        return;
      }

      draftCheckedRef.current = true;

      try {
        const draft = await getEventDraft();
        if (draft) {
          Alert.alert(
            t('draft.resumeTitle'),
            t('draft.resumeMessage'),
            [
              {
                text: t('draft.startFresh'),
                onPress: () => {
                  clearEventDraft();
                  setIsCheckingDraft(false);
                },
              },
              {
                text: t('draft.resumeDraft'),
                onPress: () => {
                  setForm(migrateDraftFormState(draft.formData));
                  setIsCheckingDraft(false);
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          setIsCheckingDraft(false);
        }
      } catch (error) {
        logger.warn('Failed to check for draft', {
          error: error instanceof Error ? error.message : String(error),
        });
        setIsCheckingDraft(false);
      }
    };

    if (!loading) {
      checkDraft();
    }
  }, [loading, params.templateId]);

  // Auto-save draft on form changes (debounced with retry)
  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    if (!formHasChanges || isCheckingDraft) {
      return;
    }

    draftTimeoutRef.current = setTimeout(async () => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await saveEventDraft(form);

        if (result.success) {
          saveFailureCountRef.current = 0;
          return;
        }

        lastError = new Error(String(result.error));

        // Exponential backoff between retries
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      saveFailureCountRef.current += 1;
      logger.warn('Draft save failed after retries', { error: lastError?.message });

      if (saveFailureCountRef.current === DRAFT_CONFIG.SAVE_FAILURE_THRESHOLD) {
        Alert.alert(t('draft.saveWarningTitle'), t('draft.saveWarningMessage'), [
          { text: t('common.ok') },
        ]);
      }
    }, DRAFT_CONFIG.AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [form, formHasChanges, isCheckingDraft]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseAttempt();
      return true;
    });

    return () => backHandler.remove();
  }, [handleCloseAttempt]);

  // Pre-fill form from template if templateId is provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (!params.templateId) return;

      setIsLoadingTemplate(true);

      try {
        const template = await getTemplate(params.templateId);
        const eventData = template.event_data;

        // Use nullish coalescing for fields where empty string should be preserved
        // from template; use logical OR only for fields where we want to fall back
        // to prevForm on empty.
        setForm((prevForm) => ({
          ...prevForm,
          organization_id:
            eventData.organization_id !== undefined
              ? eventData.organization_id
              : prevForm.organization_id,
          title: eventData.title !== undefined ? eventData.title : prevForm.title,
          description:
            eventData.description !== undefined ? eventData.description : prevForm.description,
          street_address:
            eventData.street_address !== undefined
              ? eventData.street_address
              : prevForm.street_address,
          city: eventData.city !== undefined ? eventData.city : prevForm.city,
          region: eventData.region !== undefined ? eventData.region : prevForm.region,
          country: eventData.country !== undefined ? eventData.country : prevForm.country,
          postal_code: eventData.postal_code ?? prevForm.postal_code,
          website_url:
            eventData.website_url !== undefined ? eventData.website_url : prevForm.website_url,
          categories: Array.isArray(eventData.categories)
            ? eventData.categories.join(',')
            : eventData.categories !== undefined
              ? eventData.categories
              : prevForm.categories,
          disclaimer:
            eventData.disclaimer !== undefined ? eventData.disclaimer : prevForm.disclaimer,
          co_organizers: eventData.co_organizers ?? prevForm.co_organizers,
          help_needed: eventData.help_needed ?? prevForm.help_needed,
          help_description:
            eventData.help_description !== undefined
              ? eventData.help_description
              : prevForm.help_description,
        }));
      } catch (error) {
        logger.warn('Failed to load template', {
          templateId: params.templateId,
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert(t('createEvent.templateError'), t('createEvent.templateErrorMessage'), [
          { text: t('common.ok') },
        ]);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [params.templateId]);

  const handleBackPress = () => {
    handleCloseAttempt();
  };

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const submit = async () => {
    const trimmedForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      street_address: form.street_address?.trim() || '',
      city: form.city?.trim() || '',
      region: form.region?.trim() || '',
      website_url: form.website_url?.trim() || '',
      disclaimer: form.disclaimer?.trim() || '',
      help_description: form.help_description?.trim() || '',
    };

    // Form value takes precedence, fall back to context (single-org users)
    const effectiveOrgId = trimmedForm.organization_id || selectedOrganizationId || '';

    const newEmptyFields = {
      organization_id: !effectiveOrgId,
      title: trimmedForm.title === '',
      start_time: trimmedForm.start_time === '',
      description: trimmedForm.description === '',
      help_description: trimmedForm.help_needed && !trimmedForm.help_description,
    };

    setEmptyFields(newEmptyFields);

    if (
      newEmptyFields.organization_id ||
      newEmptyFields.title ||
      newEmptyFields.start_time ||
      newEmptyFields.description ||
      newEmptyFields.help_description
    ) {
      const missingFields: string[] = [];
      if (newEmptyFields.organization_id) missingFields.push(t('createEvent.organization'));
      if (newEmptyFields.title) missingFields.push(t('createEvent.title'));
      if (newEmptyFields.description) missingFields.push(t('createEvent.description'));
      if (newEmptyFields.start_time) missingFields.push(t('createEvent.startTime'));
      if (newEmptyFields.help_description) missingFields.push(t('createEvent.volunteerRoles'));

      const errorMessage = t('createEvent.missingFieldsError', {
        fields: missingFields.join(', '),
      });
      Alert.alert(t('common.error'), errorMessage);

      scrollToTop();
      return;
    }

    if (trimmedForm.end_time && trimmedForm.end_time < trimmedForm.start_time) {
      Alert.alert(t('common.error'), t('createEvent.endTimeBeforeStart'));
      return;
    }

    if (trimmedForm.website_url) {
      if (!isValidUrl(trimmedForm.website_url)) {
        Alert.alert(t('common.error'), t('createEvent.invalidUrlFormat'));
        return;
      }
    }

    setSubmitting(true);
    try {
      // co_organizers holds org IDs (the dropdown values) — sent through as-is.
      const finalCoOrganizers = trimmedForm.co_organizers?.length
        ? trimmedForm.co_organizers
        : undefined;

      // On create every entry is a freshly picked file; URL strings can't occur
      // (there is no existing event to keep images from).
      const imageFiles = trimmedForm.images.filter(
        (img): img is PickedImage => typeof img === 'object' && img !== null
      );

      // Backend handles image upload, geocoding, URL validation, category
      // formatting; it also fills in organizer_id and organizer_name from the JWT.
      const resultCreateEvent = await createEventBackend({
        organization_id: effectiveOrgId,
        title: trimmedForm.title,
        description: trimmedForm.description,
        start_time: trimmedForm.start_time,
        end_time: trimmedForm.end_time || undefined,
        street_address: trimmedForm.street_address || undefined,
        city: trimmedForm.city || undefined,
        region: trimmedForm.region || undefined,
        country: trimmedForm.country || undefined,
        postal_code: trimmedForm.postal_code || undefined,
        images: imageFiles.length ? imageFiles : undefined, // Omitted → backend uses default
        website_url: trimmedForm.website_url || undefined,
        categories: trimmedForm.categories, // Service normalizes string -> string[]
        disclaimer: trimmedForm.disclaimer || undefined,
        co_organizers: finalCoOrganizers,
        help_needed: trimmedForm.help_needed,
        help_description: trimmedForm.help_description || undefined,
      });

      await clearEventDraft();

      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds);

      // Seed the global events cache so Home (calendar/list) and other screens
      // see the new event immediately, without waiting for the next refetch.
      upsertEventInCache(resultCreateEvent);

      router.replace(DynamicRoutes.event(resultCreateEvent.$id, { isCreated: true }));

      Alert.alert(t('common.success'), t('alerts.eventCreated'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Save the in-progress form as a backend draft (status: 'draft'). Drafts may
  // be incomplete, so validation is relaxed to just organization + title; the
  // rest is enforced at publish time. This is unrelated to the LOCAL form
  // autosave (clearEventDraft below only clears that local snapshot).
  const submitDraft = async () => {
    const trimmedForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      street_address: form.street_address?.trim() || '',
      city: form.city?.trim() || '',
      region: form.region?.trim() || '',
      website_url: form.website_url?.trim() || '',
      disclaimer: form.disclaimer?.trim() || '',
      help_description: form.help_description?.trim() || '',
    };

    const effectiveOrgId = trimmedForm.organization_id || selectedOrganizationId || '';

    const newEmptyFields = {
      organization_id: !effectiveOrgId,
      title: trimmedForm.title === '',
      start_time: false,
      description: false,
      help_description: false,
    };
    setEmptyFields(newEmptyFields);

    if (newEmptyFields.organization_id || newEmptyFields.title) {
      const missingFields: string[] = [];
      if (newEmptyFields.organization_id) missingFields.push(t('createEvent.organization'));
      if (newEmptyFields.title) missingFields.push(t('createEvent.title'));
      Alert.alert(
        t('common.error'),
        t('createEvent.missingFieldsError', { fields: missingFields.join(', ') })
      );
      scrollToTop();
      return;
    }

    if (trimmedForm.website_url && !isValidUrl(trimmedForm.website_url)) {
      Alert.alert(t('common.error'), t('createEvent.invalidUrlFormat'));
      return;
    }

    setSavingDraft(true);
    try {
      const finalCoOrganizers = trimmedForm.co_organizers?.length
        ? trimmedForm.co_organizers
        : undefined;

      const imageFiles = trimmedForm.images.filter(
        (img): img is PickedImage => typeof img === 'object' && img !== null
      );

      await createDraftEvent({
        organization_id: effectiveOrgId,
        title: trimmedForm.title,
        description: trimmedForm.description || undefined,
        start_time: trimmedForm.start_time || undefined,
        end_time: trimmedForm.end_time || undefined,
        street_address: trimmedForm.street_address || undefined,
        city: trimmedForm.city || undefined,
        region: trimmedForm.region || undefined,
        country: trimmedForm.country || undefined,
        postal_code: trimmedForm.postal_code || undefined,
        images: imageFiles.length ? imageFiles : undefined,
        website_url: trimmedForm.website_url || undefined,
        categories: trimmedForm.categories,
        disclaimer: trimmedForm.disclaimer || undefined,
        co_organizers: finalCoOrganizers,
        help_needed: trimmedForm.help_needed,
        help_description: trimmedForm.help_description || undefined,
      });

      // Clear the LOCAL autosave snapshot now that it's persisted server-side.
      await clearEventDraft();

      // Refresh the draft badge count (drafts ARE counted). The global events
      // cache is NOT touched — drafts are excluded from it.
      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds);

      router.replace(Routes.DRAFT_EVENTS);
      Alert.alert(t('common.success'), t('drafts.savedConfirmation'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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

  if (
    isSubmitting ||
    isSavingDraft ||
    isLoadingTemplate ||
    (isCheckingDraft && !params.templateId) ||
    userOrgsLoading
  ) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
        {isLoadingTemplate && (
          <ThemedText style={styles.loadingText}>{t('templates.loadingTemplate')}</ThemedText>
        )}
        {isCheckingDraft && !params.templateId && (
          <ThemedText style={styles.loadingText}>{t('draft.checkingDraft')}</ThemedText>
        )}
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          automaticallyAdjustKeyboardInsets={false}
          scrollEventThrottle={16}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.headerRow}>
              <ThemedText type="title" style={styles.titleText}>
                {t('more.createEvent')}
              </ThemedText>
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('createEvent.closeAccessibilityLabel')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={24} color="#687076" />
              </TouchableOpacity>
            </ThemedView>

            <OrganizationPicker
              value={form.organization_id || selectedOrganizationId || undefined}
              onValueChange={(id) => setForm({ ...form, organization_id: id })}
              error={emptyFields.organization_id}
              errorMessage={t('createEvent.organizationRequired')}
            />

            <EventForm
              form={form}
              setForm={setForm}
              emptyFields={emptyFields}
              userLanguage={userLanguage}
              scrollViewRef={scrollViewRef}
            />

            <CustomButton
              testID="btn-create-event-submit"
              title={t('more.createEvent')}
              handlePress={submit}
              containerStyles={styles.button}
              isLoading={isSubmitting}
            />

            <CustomButton
              testID="btn-create-event-draft"
              title={t('drafts.saveAsDraft')}
              handlePress={submitDraft}
              containerStyles={styles.buttonDraft}
              isLoading={isSavingDraft}
            />

            {!isPresented && <Link href="../">{t('common.dismiss')}</Link>}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  button: {
    marginTop: 20,
    marginBottom: 20,
  },
  buttonDraft: {
    marginBottom: 20,
    backgroundColor: '#687076',
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
