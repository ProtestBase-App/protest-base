import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '@/components/CustomButton';
import FormField from '@/components/FormField';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useTemplates } from '@/context/TemplatesProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import EventForm from '@/components/EventForm';
import { OrganizationPicker } from '@/components/OrganizationPicker';
import { resolveImageUrls } from '@/services/storage.service';
import { MAX_EVENT_IMAGES } from '@/constants/EventConfig';
import type { FormState } from '@/types/eventForm.types';
import type { TemplateEventData } from '@/types/template.types';
import type { CreateTemplateSearchParams } from '@/types/navigation.types';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';

const areArraysEqual = (arr1: string[] | undefined, arr2: string[] | undefined): boolean => {
  const a = arr1 || [];
  const b = arr2 || [];

  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => val === sortedB[idx]);
};

// Order-sensitive (reorder counts as a change); entries compare by reference
// (string equality for kept URLs).
const areImageListsEqual = (a: FormState['images'], b: FormState['images']): boolean =>
  a.length === b.length && a.every((img, idx) => img === b[idx]);

/** Parse the sourceImages navigation param (JSON string[] of hosted URLs). */
const parseSourceImages = (raw: string | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((u): u is string => typeof u === 'string').slice(0, MAX_EVENT_IMAGES)
      : [];
  } catch {
    return [];
  }
};

const hasTemplateFormChanges = (
  current: FormState,
  initial: FormState,
  currentTemplateName: string,
  initialTemplateName: string,
  currentTemplateDescription: string,
  initialTemplateDescription: string,
  currentOrgId: string,
  initialOrgId: string
): boolean => {
  return (
    currentTemplateName !== initialTemplateName ||
    currentTemplateDescription !== initialTemplateDescription ||
    currentOrgId !== initialOrgId ||
    current.title !== initial.title ||
    current.description !== initial.description ||
    !areImageListsEqual(current.images, initial.images) ||
    current.street_address !== initial.street_address ||
    current.city !== initial.city ||
    current.region !== initial.region ||
    current.country !== initial.country ||
    current.postal_code !== initial.postal_code ||
    current.website_url !== initial.website_url ||
    current.categories !== initial.categories ||
    current.disclaimer !== initial.disclaimer ||
    !areArraysEqual(current.co_organizers, initial.co_organizers) ||
    current.help_needed !== initial.help_needed ||
    current.help_description !== initial.help_description
  );
};

export default function CreateTemplateScreen() {
  const { loading, isLogged, userLanguage } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const { addTemplate } = useTemplates();
  const {
    selectedOrganizationId,
    hasOrganizations,
    loading: userOrgsLoading,
  } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<CreateTemplateSearchParams>();
  const [isSubmitting, setSubmitting] = useState(false);
  const isFromPastEvent = Boolean(params.sourceEventData);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgError, setOrgError] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateNameError, setTemplateNameError] = useState(false);

  // Reuses the EventForm shape; dates/image fields are unused in template mode.
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
    organizer_name: '',
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

  // Apply organization_id from context for single-org users.
  useEffect(() => {
    if (selectedOrganizationId && !selectedOrgId) {
      setSelectedOrgId(selectedOrganizationId);
    }
  }, [selectedOrganizationId, selectedOrgId]);

  const [emptyFields, setEmptyFields] = useState({
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
      organizer_name: '',
      website_url: '',
      categories: '',
      disclaimer: '',
      postal_code: null,
      co_organizers: [],
      help_needed: false,
      help_description: '',
      geocod_lat: null,
      geocod_lng: null,
    }),
    []
  );

  // Initial values accounting for pre-fill from a past event.
  const initialTemplateName = useMemo(() => params.suggestedName || '', [params.suggestedName]);
  const initialTemplateDescription = useMemo(() => '', []);
  const initialOrgId = useMemo(() => selectedOrganizationId || '', [selectedOrganizationId]);

  const initialFormFromEvent = useMemo<FormState>(() => {
    if (!params.sourceEventData) return initialFormState;

    try {
      const eventData: TemplateEventData = JSON.parse(params.sourceEventData);
      return {
        ...initialFormState,
        title: eventData.title || '',
        description: eventData.description || '',
        images: parseSourceImages(params.sourceImages),
        street_address: eventData.street_address || '',
        city: eventData.city || '',
        region: eventData.region || '',
        country: eventData.country || '',
        postal_code: eventData.postal_code ?? null,
        website_url: eventData.website_url || '',
        categories: Array.isArray(eventData.categories)
          ? eventData.categories.join(',')
          : eventData.categories || '',
        disclaimer: eventData.disclaimer || '',
        co_organizers: eventData.co_organizers || [],
        help_needed: eventData.help_needed || false,
        help_description: eventData.help_description || '',
      };
    } catch {
      return initialFormState;
    }
  }, [params.sourceEventData, params.sourceImages, initialFormState]);

  const formHasChanges = useMemo(
    () =>
      hasTemplateFormChanges(
        form,
        initialFormFromEvent,
        templateName,
        initialTemplateName,
        templateDescription,
        initialTemplateDescription,
        selectedOrgId || selectedOrganizationId || '',
        initialOrgId
      ),
    [
      form,
      initialFormFromEvent,
      templateName,
      initialTemplateName,
      templateDescription,
      initialTemplateDescription,
      selectedOrgId,
      selectedOrganizationId,
      initialOrgId,
    ]
  );

  const handleCloseAttempt = useCallback(() => {
    if (!formHasChanges) {
      router.back();
      return;
    }

    Alert.alert(t('draft.closeTitle'), t('draft.closeMessage'), [
      {
        text: t('draft.discard'),
        style: 'destructive',
        onPress: () => {
          router.back();
        },
      },
      {
        text: t('draft.keepEditing'),
        style: 'cancel',
      },
    ]);
  }, [formHasChanges]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseAttempt();
      return true;
    });

    return () => backHandler.remove();
  }, [handleCloseAttempt]);

  // Pre-fill form when navigating from a past event.
  useEffect(() => {
    if (params.sourceEventData) {
      try {
        const eventData: TemplateEventData = JSON.parse(params.sourceEventData);

        if (params.suggestedName) {
          setTemplateName(params.suggestedName);
        }

        setForm((prev) => ({
          ...prev,
          title: eventData.title || '',
          description: eventData.description || '',
          images: parseSourceImages(params.sourceImages),
          street_address: eventData.street_address || '',
          city: eventData.city || '',
          region: eventData.region || '',
          country: eventData.country || '',
          postal_code: eventData.postal_code ?? null,
          website_url: eventData.website_url || '',
          categories: Array.isArray(eventData.categories)
            ? eventData.categories.join(',')
            : eventData.categories || '',
          disclaimer: eventData.disclaimer || '',
          co_organizers: eventData.co_organizers || [],
          help_needed: eventData.help_needed || false,
          help_description: eventData.help_description || '',
        }));
      } catch (e) {
        logger.error('Failed to parse sourceEventData:', { error: e });
      }
    }
  }, [params.sourceEventData, params.sourceImages, params.suggestedName]);

  const handleBackPress = () => {
    handleCloseAttempt();
  };

  const submit = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    const effectiveOrgId = selectedOrgId || selectedOrganizationId || '';

    if (!effectiveOrgId) {
      setOrgError(true);
      Alert.alert(t('common.error'), t('createEvent.organizationRequired'));
      return;
    }
    setOrgError(false);

    if (!templateName.trim()) {
      setTemplateNameError(true);
      Alert.alert(t('common.error'), t('template.nameMissing'));
      return;
    }
    setTemplateNameError(false);

    if (form.help_needed && !form.help_description?.trim()) {
      setEmptyFields((prev) => ({ ...prev, help_description: true }));
      Alert.alert(t('common.error'), t('template.volunteerDescMissing'));
      return;
    }

    setSubmitting(true);
    try {
      // Build event_data from form (date/time/organizer fields are excluded —
      // templates only carry static event metadata; images are stored on the
      // template record itself as image_urls, not inside event_data).
      const eventData: TemplateEventData = {};

      // organization_id is stored in event_data so it can pre-fill when creating events.
      eventData.organization_id = effectiveOrgId;

      if (form.title) eventData.title = form.title;
      if (form.description) eventData.description = form.description;
      if (form.street_address) eventData.street_address = form.street_address;
      if (form.city) eventData.city = form.city;
      if (form.region) eventData.region = form.region;
      if (form.country) eventData.country = form.country;
      if (form.postal_code) eventData.postal_code = form.postal_code;
      if (form.website_url) eventData.website_url = form.website_url;
      if (form.categories) eventData.categories = form.categories;
      if (form.disclaimer) eventData.disclaimer = form.disclaimer;
      if (form.co_organizers?.length) eventData.co_organizers = form.co_organizers;
      if (form.help_needed) {
        eventData.help_needed = form.help_needed;
        if (form.help_description) eventData.help_description = form.help_description;
      }

      // New picks are uploaded to hosted URLs first (the templates API is
      // JSON-only); URLs kept from a past event pass through verbatim.
      const imageUrls = await resolveImageUrls(form.images);

      await addTemplate({
        organization_id: effectiveOrgId,
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        event_data: eventData,
        image_urls: imageUrls.length ? imageUrls : undefined,
      });

      Alert.alert(t('common.success'), t('template.createdSuccess'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), (error as any).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || userOrgsLoading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  if (!isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (!loading && !userOrgsLoading && isLogged && !hasOrganizations) {
    return <Redirect href="/(tabs)/(more)/become-organizer?from=create-template" />;
  }

  if (isSubmitting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedView style={styles.container}>
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close create template screen"
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={24} color="#687076" />
              </TouchableOpacity>

              <ThemedText type="title" style={styles.titleSpacing}>
                {isFromPastEvent ? t('template.createFromEventTitle') : t('template.createTitle')}
              </ThemedText>

              <ThemedText style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {t('template.createSubtitle')}
              </ThemedText>

              <OrganizationPicker
                value={selectedOrgId || selectedOrganizationId || undefined}
                onValueChange={(id) => {
                  setSelectedOrgId(id);
                  setOrgError(false);
                }}
                error={orgError}
                errorMessage={t('createEvent.organizationRequired')}
              />

              <ThemedView style={styles.templateMetaSection}>
                <FormField
                  testID="input-template-name"
                  title={t('template.nameLabel')}
                  value={templateName}
                  placeholder={t('template.namePlaceholder')}
                  handleChangeText={(value) => {
                    setTemplateName(value);
                    if (value.trim()) setTemplateNameError(false);
                  }}
                  otherStyles={styles.fieldSpacing}
                  maxLength={100}
                  hasError={templateNameError}
                />

                <FormField
                  testID="input-template-description"
                  title={t('template.descriptionLabel')}
                  value={templateDescription}
                  placeholder={t('template.descriptionPlaceholder')}
                  handleChangeText={setTemplateDescription}
                  otherStyles={styles.fieldSpacing}
                  maxLength={8000}
                />
              </ThemedView>

              <ThemedView
                style={[styles.divider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
              />

              <ThemedText style={styles.sectionTitle}>
                {t('template.eventDetailsSection')}
              </ThemedText>
              <ThemedText
                style={[styles.sectionSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
              >
                {t('template.eventDetailsHelper')}
              </ThemedText>

              <EventForm
                form={form}
                setForm={setForm}
                emptyFields={emptyFields}
                userLanguage={userLanguage}
                mode="create-template"
              />

              <ThemedView style={styles.buttonContainer}>
                <CustomButton
                  testID="btn-template-submit"
                  title={t('template.saveButton')}
                  handlePress={submit}
                  containerStyles={styles.saveButton}
                  isLoading={isSubmitting}
                />

                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[styles.cancelButtonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                  >
                    {t('common.cancel')}
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    marginTop: 32,
    right: 16,
    position: 'absolute',
    zIndex: 10,
    minWidth: 44,
    minHeight: 44,
  },
  titleSpacing: {
    marginTop: 32,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    color: '#6B7280',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  templateMetaSection: {
    marginTop: Spacing.lg,
  },
  fieldSpacing: {
    marginTop: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    color: '#6B7280',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  saveButton: {
    minHeight: 48,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    color: '#6B7280',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
