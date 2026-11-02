import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Alert, Pressable, TouchableOpacity, BackHandler } from 'react-native';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { EventFormShell } from '@/components/event-form/EventFormShell';
import { TemplateMetaFields } from '@/components/event-form/TemplateMetaFields';
import { EVENT_FORM_SHELL } from '@/constants/EventFormFlags';
import { FormFieldAnchor, FormScreenScaffold } from '@/components/FormScreenScaffold';
import { FormIssueSummary } from '@/components/FormIssueSummary';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { getTemplate } from '@/services/template.service';
import { resolveImageUrls } from '@/services/storage.service';
import { useTemplates } from '@/context/TemplatesProvider';
import CustomButton from '@/components/CustomButton';
import FormField from '@/components/FormField';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import EventForm from '@/components/EventForm';
import type { FormState } from '@/types/eventForm.types';
import { Spacing, Typography, IconSizes } from '@/constants/DesignTokens';
import { TEMPLATE_LIMITS } from '@/constants/EventConfig';
import { buildTemplateEventData, createBlankForm } from '@/utils/eventFormData';
import { isTemplateDataTooLong, validateEventForm } from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { toPostalCodeString } from '@/utils/eventLocation';

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
  const themeColors = getThemeColors(colorScheme);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const templateId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const [form, setForm] = useState<FormState>(createBlankForm);

  const validation = useEventFormValidation((intent) =>
    validateEventForm(form, { intent, templateName })
  );

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
    if (isSubmitting) return;

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
  }, [formHasChanges, isSubmitting]);

  useEffect(() => {
    if (EVENT_FORM_SHELL.editTemplate) return;

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
          postal_code: toPostalCodeString(eventData.postal_code),
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
    if (!validation.check('saveTemplate')) return;

    const eventData = buildTemplateEventData(form, form.organization_id);

    if (isTemplateDataTooLong(eventData)) {
      Alert.alert(t('common.error'), t('template.dataTooLong'));
      return;
    }

    setSubmitting(true);
    try {
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

  if (loading || isDeleting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
        {isDeleting && <ThemedText style={styles.loadingText}>{t('template.deleting')}</ThemedText>}
      </ThemedView>
    );
  }

  if (EVENT_FORM_SHELL.editTemplate) {
    return (
      <>
        <EventFormShell
          kind="template"
          form={form}
          setForm={setForm}
          validation={validation}
          userLanguage={userLanguage}
          inSheet
          busy={isSubmitting}
          closeLabel="Close edit template screen"
          onBack={() => {
            handleCloseAttempt();
            return true;
          }}
          coverActions={
            <Pressable
              testID="btn-edit-template-delete"
              onPress={handleDelete}
              style={[
                styles.deleteAction,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('template.deleteButton')}
              accessibilityHint={t('a11y.hints.deleteTemplate')}
            >
              <IconSymbol name="trash" size={IconSizes.md} color={themeColors.destructive} />
            </Pressable>
          }
          heading={t('template.editTitle')}
          intro={
            <TemplateMetaFields
              name={templateName}
              onChangeName={setTemplateName}
              note={templateDescription}
              onChangeNote={setTemplateDescription}
              nameError={validation.errors.template_name}
              nameTestID="input-edit-template-name"
              noteTestID="input-edit-template-description"
            />
          }
          footer={
            <CustomButton
              testID="btn-edit-template-save"
              title={isSubmitting ? t('common.saving') : t('common.save')}
              handlePress={handleSave}
              pill
              containerStyles={styles.buttonSave}
              isLoading={isSubmitting}
            />
          }
        />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <FormScreenScaffold
        contentContainerStyle={styles.scrollViewContent}
        inSheet
        footer={
          <ThemedView
            style={[styles.footerWrapper, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}
          >
            <ThemedView style={styles.footer}>
              <CustomButton
                title={t('common.cancel')}
                handlePress={handleBackPress}
                containerStyles={styles.buttonCancel}
                isLoading={false}
                disabled={isSubmitting}
              />
              <CustomButton
                testID="btn-edit-template-save"
                title={isSubmitting ? t('common.saving') : t('common.save')}
                handlePress={handleSave}
                containerStyles={styles.buttonSave}
                isLoading={isSubmitting}
              />
            </ThemedView>
          </ThemedView>
        }
      >
        <ThemedView style={styles.container} pointerEvents={isSubmitting ? 'none' : 'auto'}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close edit template screen"
            accessibilityHint={t('a11y.hints.closeScreen')}
            accessibilityRole="button"
          >
            <IconSymbol name="xmark" size={24} color="#687076" />
          </TouchableOpacity>

          <ThemedText type="title" style={styles.titleSpacing}>
            {t('template.editTitle')}
          </ThemedText>

          <FormIssueSummary validation={validation} />

          <ThemedView style={styles.templateMetaSection}>
            <FormFieldAnchor field="template_name">
              <FormField
                testID="input-edit-template-name"
                title={t('template.nameLabel')}
                value={templateName}
                placeholder={t('template.namePlaceholder')}
                handleChangeText={setTemplateName}
                otherStyles={styles.fieldSpacing}
                maxLength={TEMPLATE_LIMITS.name}
                errorText={validation.errors.template_name}
              />
            </FormFieldAnchor>

            <FormField
              title={t('template.descriptionLabel')}
              value={templateDescription}
              placeholder={t('template.descriptionPlaceholder')}
              handleChangeText={setTemplateDescription}
              otherStyles={styles.fieldSpacing}
              maxLength={TEMPLATE_LIMITS.description}
            />
          </ThemedView>

          <ThemedView
            style={[styles.divider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}
          />

          <ThemedText style={styles.sectionTitle}>{t('template.eventDetailsSection')}</ThemedText>

          <EventForm
            form={form}
            setForm={setForm}
            errors={validation.errors}
            userLanguage={userLanguage}
            mode="edit-template"
          />

          <TouchableOpacity
            accessibilityRole="button"
            testID="btn-edit-template-delete"
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={18} color="#EF4444" />
            <ThemedText style={styles.deleteButtonText}>{t('template.deleteButton')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </FormScreenScaffold>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  deleteAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
