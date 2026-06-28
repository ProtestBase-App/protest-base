import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { getTemplate } from '@/services/template.service';
import { resolveImageUrls } from '@/services/storage.service';
import { useTemplates } from '@/context/TemplatesProvider';
import { TemplateEventData } from '@/types/template.types';
import CustomButton from '@/components/CustomButton';
import FormField from '@/components/FormField';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import EventForm from '@/components/EventForm';
import type { FormState } from '@/types/eventForm.types';
import { Spacing, Typography } from '@/constants/DesignTokens';
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

const hasTemplateFormChanges = (
  current: FormState,
  initial: FormState,
  currentTemplateName: string,
  initialTemplateName: string,
  currentTemplateDescription: string,
  initialTemplateDescription: string
): boolean => {
  return (
    currentTemplateName !== initialTemplateName ||
    currentTemplateDescription !== initialTemplateDescription ||
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

export default function EditTemplateScreen() {
  const { loading: authLoading, isLogged, userLanguage } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const { removeTemplate, editTemplate } = useTemplates();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams();
  const templateId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateNameError, setTemplateNameError] = useState(false);

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

  const [emptyFields, setEmptyFields] = useState({
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  // Initial values loaded from the template, used for change detection.
  const initialTemplateNameRef = useRef('');
  const initialTemplateDescriptionRef = useRef('');
  const initialFormRef = useRef<FormState>({
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

  const formHasChanges = useMemo(
    () =>
      hasTemplateFormChanges(
        form,
        initialFormRef.current,
        templateName,
        initialTemplateNameRef.current,
        templateDescription,
        initialTemplateDescriptionRef.current
      ),
    [form, templateName, templateDescription]
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

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const fetchedTemplate = await getTemplate(templateId);

        setTemplateName(fetchedTemplate.name);
        setTemplateDescription(fetchedTemplate.description || '');

        const eventData = fetchedTemplate.event_data;
        const loadedForm: FormState = {
          organization_id: eventData.organization_id || '',
          title: eventData.title || '',
          description: eventData.description || '',
          images: fetchedTemplate.image_urls ?? [],
          street_address: eventData.street_address || '',
          city: eventData.city || '',
          region: eventData.region || '',
          country: eventData.country || '',
          start_time: '',
          end_time: '',
          organizer_name: '',
          website_url: eventData.website_url || '',
          categories: Array.isArray(eventData.categories)
            ? eventData.categories[0] || ''
            : eventData.categories || '',
          disclaimer: eventData.disclaimer || '',
          postal_code: eventData.postal_code || null,
          co_organizers: eventData.co_organizers || [],
          help_needed: eventData.help_needed || false,
          help_description: eventData.help_description || '',
          // Templates carry no event pin; coordinates stay null and are never
          // sent in event_data.
          geocod_lat: null,
          geocod_lng: null,
        };

        setForm(loadedForm);

        initialTemplateNameRef.current = fetchedTemplate.name;
        initialTemplateDescriptionRef.current = fetchedTemplate.description || '';
        initialFormRef.current = loadedForm;
      } catch (error) {
        Alert.alert(t('common.error'), (error as any).message);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const handleBackPress = () => {
    handleCloseAttempt();
  };

  const handleSave = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
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
      const eventData: TemplateEventData = {};

      if (form.organization_id) eventData.organization_id = form.organization_id;

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

      // Authoritative full list: kept URLs verbatim, new picks uploaded first.
      // An empty array clears all template images.
      const imageUrls = await resolveImageUrls(form.images);

      await editTemplate(templateId, {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        event_data: eventData,
        image_urls: imageUrls,
      });

      Alert.alert(t('common.success'), t('template.updatedSuccess'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), (error as any).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    Alert.alert(
      t('template.deleteConfirmTitle'),
      t('template.deleteConfirmMessage', { name: templateName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await removeTemplate(templateId);
              Alert.alert(t('common.success'), t('template.deletedSuccess'));
              router.back();
            } catch (error) {
              Alert.alert(t('common.error'), (error as any).message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  if (!isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (!templateId) {
    return <Redirect href="/(tabs)/(more)/event-templates" />;
  }

  if (loading || isSubmitting || isDeleting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
        {isDeleting && <ThemedText style={styles.loadingText}>{t('template.deleting')}</ThemedText>}
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
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedView style={styles.container}>
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close edit template screen"
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={24} color="#687076" />
              </TouchableOpacity>

              <ThemedText type="title" style={styles.titleSpacing}>
                {t('template.editTitle')}
              </ThemedText>

              <ThemedView style={styles.templateMetaSection}>
                <FormField
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

              <EventForm
                form={form}
                setForm={setForm}
                emptyFields={emptyFields}
                userLanguage={userLanguage}
                mode="edit-template"
              />

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <IconSymbol name="trash" size={18} color="#EF4444" />
                <ThemedText style={styles.deleteButtonText}>
                  {t('template.deleteButton')}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>

          <ThemedView
            style={[styles.footerWrapper, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}
          >
            <SafeAreaView
              style={styles.footerSafeArea}
              edges={Platform.OS === 'ios' ? ['bottom'] : []}
            >
              <ThemedView style={styles.footer}>
                <CustomButton
                  title={t('common.cancel')}
                  handlePress={handleBackPress}
                  containerStyles={styles.buttonCancel}
                  isLoading={false}
                />
                <CustomButton
                  title={t('common.save')}
                  handlePress={handleSave}
                  containerStyles={styles.buttonSave}
                  isLoading={isSubmitting}
                />
              </ThemedView>
            </SafeAreaView>
          </ThemedView>
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
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Spacing['3xl'],
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
  templateMetaSection: {
    marginTop: Spacing.lg,
  },
  fieldSpacing: {
    marginTop: Spacing.lg,
  },
  divider: {
    height: 1,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    color: '#EF4444',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: '#6B7280',
    marginTop: Spacing.sm,
  },
  footerWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerSafeArea: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  buttonCancel: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#687076',
  },
  buttonSave: {
    flex: 1,
    minHeight: 48,
  },
});
