import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, BackHandler } from 'react-native';
import { router, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { EventFormShell } from '@/components/event-form/EventFormShell';
import { TemplateMetaFields } from '@/components/event-form/TemplateMetaFields';
import { EVENT_FORM_SHELL } from '@/constants/EventFormFlags';
import { FormFieldAnchor, FormScreenScaffold } from '@/components/FormScreenScaffold';
import { FormIssueSummary } from '@/components/FormIssueSummary';
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
import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import { useFormAutosave } from '@/hooks/useFormAutosave';
import {
  clearTemplateDraft,
  getTemplateDraft,
  saveTemplateDraft,
} from '@/services/localStorageService';
import EventForm from '@/components/EventForm';
import { OrganizationPicker } from '@/components/OrganizationPicker';
import { resolveImageUrls } from '@/services/storage.service';
import { TEMPLATE_LIMITS } from '@/constants/EventConfig';
import type { FormState } from '@/types/eventForm.types';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { buildTemplateEventData, createBlankForm } from '@/utils/eventFormData';
import { isTemplateDataTooLong, validateEventForm } from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
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
  const themeColors = getThemeColors(colorScheme);
  const [isSubmitting, setSubmitting] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Reuses the EventForm shape; dates/image fields are unused in template mode.
  const [form, setForm] = useState<FormState>(createBlankForm);

  // Apply organization_id from context for single-org users.
  useEffect(() => {
    if (selectedOrganizationId && !selectedOrgId) {
      setSelectedOrgId(selectedOrganizationId);
    }
  }, [selectedOrganizationId, selectedOrgId]);

  const initialFormState = useMemo<FormState>(() => createBlankForm(), []);

  const initialOrgId = useMemo(() => selectedOrganizationId || '', [selectedOrganizationId]);

  const formHasChanges = useMemo(
    () =>
      hasTemplateFormChanges(
        form,
        initialFormState,
        templateName,
        '',
        templateDescription,
        '',
        selectedOrgId || selectedOrganizationId || '',
        initialOrgId
      ),
    [
      form,
      initialFormState,
      templateName,
      templateDescription,
      selectedOrgId,
      selectedOrganizationId,
      initialOrgId,
    ]
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
        onPress: async () => {
          await clearTemplateDraft();
          router.back();
        },
      },
      {
        text: t('draft.saveDraft'),
        onPress: () => router.back(),
      },
      {
        text: t('draft.keepEditing'),
        style: 'cancel',
      },
    ]);
  }, [formHasChanges, isSubmitting]);

  useEffect(() => {
    if (EVENT_FORM_SHELL.createTemplate) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseAttempt();
      return true;
    });

    return () => backHandler.remove();
  }, [handleCloseAttempt]);

  const handleBackPress = () => {
    handleCloseAttempt();
  };

  // An unfinished template comes back as it was left; the autosave below keeps it.
  useEffect(() => {
    getTemplateDraft().then((draft) => {
      if (!draft) return;
      setForm(draft.form as FormState);
      setTemplateName(draft.name);
      setTemplateDescription(draft.note);
      setSelectedOrgId(draft.organizationId);
    });
  }, []);

  const templateDraft = useMemo(
    () => ({ form, name: templateName, note: templateDescription, organizationId: selectedOrgId }),
    [form, templateName, templateDescription, selectedOrgId]
  );
  useFormAutosave({ value: templateDraft, enabled: formHasChanges, save: saveTemplateDraft });

  const validation = useEventFormValidation((intent) =>
    validateEventForm(form, {
      intent,
      organizationId: selectedOrgId || selectedOrganizationId || '',
      templateName,
    })
  );

  const submit = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    if (!validation.check('saveTemplate')) return;
    const effectiveOrgId = selectedOrgId || selectedOrganizationId || '';

    const eventData = buildTemplateEventData(form, effectiveOrgId);

    if (isTemplateDataTooLong(eventData)) {
      Alert.alert(t('common.error'), t('template.dataTooLong'));
      return;
    }

    setSubmitting(true);
    try {
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

      await clearTemplateDraft();
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

  if (EVENT_FORM_SHELL.createTemplate) {
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
          closeLabel="Close create template screen"
          onBack={() => {
            handleCloseAttempt();
            return true;
          }}
          heading={t('template.createTitle')}
          intro={
            <>
              <FormFieldAnchor field="organization">
                <OrganizationPicker
                  value={selectedOrgId || selectedOrganizationId || undefined}
                  onValueChange={setSelectedOrgId}
                  error={!!validation.errors.organization}
                  errorMessage={validation.errors.organization}
                />
              </FormFieldAnchor>
              <TemplateMetaFields
                name={templateName}
                onChangeName={setTemplateName}
                note={templateDescription}
                onChangeNote={setTemplateDescription}
                nameError={validation.errors.template_name}
                nameTestID="input-template-name"
                noteTestID="input-template-description"
              />
            </>
          }
          footer={
            <CustomButton
              testID="btn-template-submit"
              title={isSubmitting ? t('common.saving') : t('template.saveButton')}
              handlePress={submit}
              pill
              containerStyles={styles.saveButton}
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
        contentContainerStyle={styles.scrollContent}
        inSheet
        footer={
          <ThemedView style={[styles.footer, { borderTopColor: themeColors.border }]}>
            <CustomButton
              title={t('common.cancel')}
              handlePress={handleBackPress}
              containerStyles={[
                styles.cancelButton,
                {
                  backgroundColor: themeColors.buttonSecondaryBackground,
                  borderColor: themeColors.buttonSecondaryBorder,
                },
              ]}
              textStyles={{ color: themeColors.text }}
              isLoading={isSubmitting}
            />
            <CustomButton
              testID="btn-template-submit"
              title={isSubmitting ? t('common.saving') : t('template.saveButton')}
              handlePress={submit}
              containerStyles={styles.saveButton}
              isLoading={isSubmitting}
            />
          </ThemedView>
        }
      >
        <ThemedView style={styles.container} pointerEvents={isSubmitting ? 'none' : 'auto'}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close create template screen"
            accessibilityHint={t('a11y.hints.closeScreen')}
            accessibilityRole="button"
          >
            <IconSymbol name="xmark" size={24} color="#687076" />
          </TouchableOpacity>

          <ThemedText type="title" style={styles.titleSpacing}>
            {t('template.createTitle')}
          </ThemedText>

          <ThemedText style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {t('template.createSubtitle')}
          </ThemedText>

          <FormIssueSummary validation={validation} />

          <FormFieldAnchor field="organization">
            <OrganizationPicker
              value={selectedOrgId || selectedOrganizationId || undefined}
              onValueChange={setSelectedOrgId}
              error={!!validation.errors.organization}
              errorMessage={validation.errors.organization}
            />
          </FormFieldAnchor>

          <ThemedView style={styles.templateMetaSection}>
            <FormFieldAnchor field="template_name">
              <FormField
                testID="input-template-name"
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
              testID="input-template-description"
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
          <ThemedText style={[styles.sectionSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {t('template.eventDetailsHelper')}
          </ThemedText>

          <EventForm
            form={form}
            setForm={setForm}
            errors={validation.errors}
            userLanguage={userLanguage}
            mode="create-template"
          />
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
  },
  cancelButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
