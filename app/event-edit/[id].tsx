import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getEventByIdBackend, updateEvent } from '@/services/event.service';
import { Event } from '@/types/event.types';
import CustomButton from '@/components/CustomButton';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatEventForDisplay, FormattedEvent } from '@/utils/eventFormatters';
import EventForm from '@/components/EventForm';
import type { FormState } from '@/types/eventForm.types';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { getThemeColors } from '@/utils/themeColors';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';

// Matches common URL patterns, with or without protocol/www.
const URL_REGEX =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

export default function EditEvent() {
  const { user, isLogged, userLanguage, eventsCache, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
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
  });

  const [emptyFields, setEmptyFields] = useState({
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);

        const cachedEvent = eventsCache[eventId] as Event | undefined;

        if (cachedEvent) {
          const formatted = formatEventForDisplay(cachedEvent, userLanguage);
          setEventDetail([formatted]);
        } else {
          const fetchedEvent = await getEventByIdBackend(eventId);
          const formatted = formatEventForDisplay(fetchedEvent, userLanguage);
          setEventDetail([formatted]);
        }
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
  }, [eventId, eventsCache, userLanguage]);

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

      setForm((prevForm) => ({
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
      }));
    }
  }, [eventDetail]);

  const handleBackPress = () => {
    if (isCreated) {
      router.push(Routes.MY_EVENTS);
    } else {
      router.back();
    }
  };

  const submit = async () => {
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

  if (loading || isSubmitting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
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
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={false}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.headerRow}>
              <ThemedText type="title" style={styles.titleText}>
                {t('eventEdit.title')}
              </ThemedText>
              <TouchableOpacity
                onPress={() => handleBackPress()}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('eventEdit.closeAccessibilityLabel')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={24} color={themeColors.icon} />
              </TouchableOpacity>
            </ThemedView>

            <EventForm
              form={form}
              setForm={setForm}
              emptyFields={emptyFields}
              userLanguage={userLanguage}
              scrollViewRef={scrollViewRef}
            />
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.footerWrapper}>
          <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
            <ThemedView style={styles.footer}>
              <CustomButton
                title={t('common.cancel')}
                handlePress={() => handleBackPress()}
                containerStyles={styles.buttonCancel}
                isLoading={false}
              />

              <CustomButton
                title={t('common.save')}
                handlePress={submit}
                containerStyles={styles.buttonSave}
                isLoading={isSubmitting}
              />
            </ThemedView>
          </SafeAreaView>
        </ThemedView>
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
  scrollViewContent: {
    paddingBottom: 120,
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
  buttonCancel: {
    marginVertical: 16,
    width: '45%',
    minHeight: 10,
    height: '80%',
    marginLeft: 4,
    backgroundColor: '#687076',
  },
  buttonSave: {
    marginVertical: 16,
    width: '45%',
    minHeight: 10,
    height: '80%',
    marginRight: 4,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerSafeArea: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    padding: 4,
    borderTopWidth: 1,
    // Not themeColors.border — that would require dynamic styles.
    borderTopColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
