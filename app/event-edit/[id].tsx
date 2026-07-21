import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, BackHandler } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FormScreenScaffold } from '@/components/FormScreenScaffold';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getEventByIdBackend, updateEvent } from '@/services/event.service';
import CustomButton from '@/components/CustomButton';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import EventForm from '@/components/EventForm';
import type { FormState } from '@/types/eventForm.types';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { Spacing } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';

// Matches common URL patterns, with or without protocol/www.
const URL_REGEX =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

export default function EditEvent() {
  const { user, isLogged, userLanguage, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { id, isCreated } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;

  const [eventDetail, setEventDetail] = useState<FormattedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
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

  const [emptyFields, setEmptyFields] = useState({
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  // Baseline snapshot of the freshly loaded form; drives the unsaved-changes
  // guard so leaving without saving prompts only when something actually changed.
  const initialFormRef = useRef<FormState | null>(null);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

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
      let postalCode = null;
      if (eventDetail[0].postal_code) {
        postalCode =
          typeof eventDetail[0].postal_code === 'number'
            ? eventDetail[0].postal_code
            : parseInt(eventDetail[0].postal_code);

        if (isNaN(postalCode)) postalCode = null;
      }

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
    const newEmptyFields = {
      title: form.title === '',
      start_time: form.start_time === '',
      description: form.description === '',
      help_description: form.help_needed && !form.help_description?.trim(),
    };

    setEmptyFields(newEmptyFields);

    if (
      newEmptyFields.title ||
      newEmptyFields.start_time ||
      newEmptyFields.description ||
      newEmptyFields.help_description
    ) {
      const missingFields: string[] = [];
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

    if (form.end_time && form.end_time < form.start_time) {
      Alert.alert(t('common.error'), t('eventEdit.invalidTimeRangeError'));
      return;
    }

    if (form.website_url && form.website_url.trim()) {
      const urlValue = form.website_url.trim();
      if (!URL_REGEX.test(urlValue)) {
        Alert.alert(t('common.error'), t('createEvent.invalidUrlFormat'));
        return;
      }
    }

    setSubmitting(true);
    try {
      // co_organizers holds org IDs (the dropdown values) — sent through as-is.
      const finalCoOrganizers = form.co_organizers?.length ? form.co_organizers : undefined;

      // organizer_name is intentionally not sent — it's tied to the creator.
      await updateEvent(eventId, {
        title: form.title,
        description: form.description,
        start_time: form.start_time,
        end_time: form.end_time || undefined,
        street_address: form.street_address || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        country: form.country || undefined,
        postal_code: form.postal_code || undefined,
        // Re-picking the street this session adopts the confirmed pin (healing a
        // stale/wrong one); omitted when the street wasn't re-picked.
        geocod_lat: form.geocod_lat ?? undefined,
        geocod_lng: form.geocod_lng ?? undefined,
        // Authoritative full ordered list (kept URLs + new files); an emptied
        // list is an explicit removal of every image.
        images: form.images.length ? form.images : null,
        website_url: form.website_url || undefined,
        categories: form.categories,
        disclaimer: form.disclaimer || undefined,
        co_organizers: finalCoOrganizers,
        help_needed: form.help_needed,
        help_description: form.help_needed ? form.help_description || undefined : undefined,
      });

      await refetchEvents();

      const orgIds = userOrganizations.map((org) => org.$id);
      refreshUserEventCounts(orgIds);

      router.replace(DynamicRoutes.event(eventId, { isCreated: isCreated === 'true' }));

      Alert.alert(t('common.success'), t('eventEdit.successMessage'));
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    } finally {
      setSubmitting(false);
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
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
            >
              <IconSymbol name="xmark" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </ThemedView>

          <EventForm
            form={form}
            setForm={setForm}
            emptyFields={emptyFields}
            userLanguage={userLanguage}
            mode="edit-event"
            scrollViewRef={scrollViewRef}
          />
        </ThemedView>
      </FormScreenScaffold>
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
