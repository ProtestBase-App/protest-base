import React, { useCallback, useMemo, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, type TextInstance } from 'react-native';

import FormField from '@/components/FormField';
import FormLongText from '@/components/FormLongText';
import { FormFieldAnchor, useFormKeyboard } from '@/components/FormScreenScaffold';
import {
  SheetSearchMultiSelect,
  type SheetSearchMultiSelectOption,
} from '@/components/SheetSearchMultiSelect';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { sectionStyles } from '@/components/event-form/sectionStyles';
import { Typography } from '@/constants/DesignTokens';
import { EVENT_TEXT_LIMITS, MAX_CO_ORGANIZERS } from '@/constants/EventConfig';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventFormErrors, EventFormProps, FormState } from '@/types/eventForm.types';
import { inputMaxLength } from '@/utils/eventFormValidation';
import { HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export type OptionalField = 'link' | 'coOrganizers' | 'volunteers' | 'goodToKnow';

const ALL_FIELDS: OptionalField[] = ['link', 'coOrganizers', 'volunteers', 'goodToKnow'];

export interface DetailsSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  isDark: boolean;
  scrollViewRef?: EventFormProps['scrollViewRef'];
  /** Which of the details to show. */
  fields?: OptionalField[];
  /** The field just added, whose label takes `addedLabelRef`. */
  addedField?: OptionalField | null;
  addedLabelRef?: Ref<TextInstance>;
}

/** The link, co-organizers, volunteers and the good-to-know text. */
export function DetailsSection({
  form,
  setForm,
  errors,
  isDark,
  scrollViewRef,
  fields = ALL_FIELDS,
  addedField,
  addedLabelRef,
}: DetailsSectionProps) {
  const labelRefOf = (field: OptionalField) => (field === addedField ? addedLabelRef : undefined);
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { setDropdownFocused } = useFormKeyboard();
  const {
    dropdownItems: organizations,
    loading: organizationsLoading,
    ensureOrganizations,
  } = useOrganizations();

  // The listing is not fetched at app start.
  React.useEffect(() => {
    ensureOrganizations();
  }, [ensureOrganizations]);

  // O(1) lookup when resolving co-organizer chip labels.
  const orgLookup = useMemo(
    () => new Map(organizations.map((o) => [o.value, o.label])),
    [organizations]
  );

  const organizationOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () => organizations.map((o) => ({ value: o.value, label: o.label })),
    [organizations]
  );

  const resolveOrganizationLabel = useCallback(
    (id: string) => orgLookup.get(id) ?? id,
    [orgLookup]
  );

  // Scroll to end when the disclaimer focuses; delay lets the keyboard appear first.
  const handleDisclaimerFocus = useCallback(() => {
    if (scrollViewRef?.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }
  }, [scrollViewRef]);

  return (
    <>
      {fields.includes('link') && (
        <>
          <FormFieldAnchor field="website_url">
            <FormField
              testID="input-event-website-url"
              labelRef={labelRefOf('link')}
              title={`${t('createEvent.eventLink')} (${t('common.optional')})`}
              value={form.website_url}
              placeholder={t('createEvent.eventLinkPlaceholder')}
              handleChangeText={(value) => setForm({ ...form, website_url: value })}
              otherStyles={sectionStyles.fieldSpacing}
              maxLength={inputMaxLength(EVENT_TEXT_LIMITS.websiteUrl, form.website_url)}
              errorText={errors.website_url}
              keyboardType="url"
              autoCapitalize="none"
            />
          </FormFieldAnchor>
          <HelperText text={t('createEvent.eventLinkHelper')} isDark={isDark} />
        </>
      )}

      {fields.includes('coOrganizers') && (
        <>
          <ThemedView style={sectionStyles.labelWithLoadingWrapper}>
            <ThemedText
              ref={labelRefOf('coOrganizers')}
              style={[sectionStyles.fieldLabel, sectionStyles.fieldSpacing]}
            >
              {t('createEvent.coOrganizers')} ({t('common.optional')})
            </ThemedText>
            {organizationsLoading && (
              <ActivityIndicator
                size="small"
                color={themeColors.tint}
                style={sectionStyles.fieldLoadingIndicator}
              />
            )}
          </ThemedView>
          <ThemedView style={sectionStyles.controlSpacing}>
            <SheetSearchMultiSelect
              testID="dropdown-event-co-organizers"
              options={organizationOptions}
              selected={form.co_organizers}
              onChange={(next) => setForm({ ...form, co_organizers: next })}
              placeholder={
                organizationsLoading ? t('common.loading') : t('createEvent.selectCoOrganizers')
              }
              resolveSelectedLabel={resolveOrganizationLabel}
              leadingIconName="person"
              minSearchLength={0}
              noResultsText={t('createEvent.searchNoResults')}
              maxSelected={MAX_CO_ORGANIZERS}
              maxSelectedHint={t('createEvent.maxCoOrganizers', { max: MAX_CO_ORGANIZERS })}
              onFocusChange={setDropdownFocused}
            />
          </ThemedView>

          <HelperText text={t('createEvent.coOrganizersHelper')} isDark={isDark} />
        </>
      )}

      {fields.includes('volunteers') && (
        <>
          <ThemedText
            ref={labelRefOf('volunteers')}
            style={[sectionStyles.fieldLabel, sectionStyles.fieldSpacing]}
          >
            {t('createEvent.volunteering')}
          </ThemedText>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.help_needed }}
            testID="checkbox-event-help-needed"
            style={styles.checkboxContainer}
            onPress={() => setForm({ ...form, help_needed: !form.help_needed })}
            activeOpacity={0.8}
          >
            <IconSymbol
              name={form.help_needed ? 'checkmark.square.fill' : 'square'}
              size={24}
              color={form.help_needed ? themeColors.tint : themeColors.icon}
            />
            <ThemedText style={styles.checkboxLabel}>
              {t('createEvent.needHelpCheckbox')}
            </ThemedText>
          </TouchableOpacity>

          {form.help_needed && (
            <ThemedView style={styles.conditionalFieldGroup}>
              <FormFieldAnchor field="help_description">
                <FormLongText
                  testID="input-event-help-description"
                  title={`${t('createEvent.volunteerRoles')} *`}
                  value={form.help_description || ''}
                  placeholder={t('createEvent.volunteerRolesPlaceholder')}
                  handleChangeText={(value) => setForm({ ...form, help_description: value })}
                  otherStyles={styles.fieldSpacingConditional}
                  isLongText={true}
                  maxLength={inputMaxLength(
                    EVENT_TEXT_LIMITS.helpDescription,
                    form.help_description
                  )}
                  counterLimit={EVENT_TEXT_LIMITS.helpDescription}
                  errorText={errors.help_description}
                />
              </FormFieldAnchor>
              <HelperText text={t('createEvent.volunteerHelper')} isDark={isDark} />
            </ThemedView>
          )}
        </>
      )}

      {fields.includes('goodToKnow') && (
        <>
          <FormFieldAnchor field="disclaimer">
            <FormLongText
              testID="input-event-disclaimer"
              labelRef={labelRefOf('goodToKnow')}
              title={`${t('createEvent.disclaimer')} (${t('common.optional')})`}
              value={form.disclaimer}
              placeholder={t('createEvent.disclaimerPlaceholder')}
              handleChangeText={(value) => setForm({ ...form, disclaimer: value })}
              otherStyles={sectionStyles.fieldSpacing}
              isLongText={true}
              maxLength={inputMaxLength(EVENT_TEXT_LIMITS.disclaimer, form.disclaimer)}
              counterLimit={EVENT_TEXT_LIMITS.disclaimer}
              errorText={errors.disclaimer}
              onFocusCallback={handleDisclaimerFocus}
            />
          </FormFieldAnchor>
          <HelperText text={t('createEvent.disclaimerHelper')} isDark={isDark} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldSpacingConditional: {
    marginTop: 20,
  },
  conditionalFieldGroup: {
    marginTop: 0,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  checkboxLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
});
