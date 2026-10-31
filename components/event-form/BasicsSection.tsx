import React from 'react';
import { StyleSheet, View } from 'react-native';

import FormField from '@/components/FormField';
import FormLongText from '@/components/FormLongText';
import { FormFieldAnchor } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FilterChip } from '@/components/ui/FilterChip';
import { FormErrorText } from '@/components/ui/FormErrorText';
import { getCategoryColors } from '@/constants/CategoryColors';
import { eventCategories } from '@/constants/EventCategories';
import { EVENT_TEXT_LIMITS } from '@/constants/EventConfig';
import { sectionStyles } from '@/components/event-form/sectionStyles';
import type { EventFormErrors, EventFormMode, FormState } from '@/types/eventForm.types';
import { HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';

export interface BasicsSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  mode: EventFormMode;
  isDark: boolean;
}

/** Title, description and category. */
export function BasicsSection({ form, setForm, errors, mode, isDark }: BasicsSectionProps) {
  const isTemplateMode = mode === 'create-template' || mode === 'edit-template';

  // Required to create and to publish. An older live event with none can still be saved,
  // as on the website; once set, only a template can clear it.
  const categoryLabel = isTemplateMode
    ? `${t('createEvent.category')} (${t('common.optional')})`
    : mode === 'edit-event'
      ? t('createEvent.category')
      : `${t('createEvent.category')} *`;

  return (
    <>
      <FormFieldAnchor field="title">
        <FormField
          testID="input-event-title"
          title={isTemplateMode ? t('createEvent.title') : `${t('createEvent.title')} *`}
          value={form.title}
          placeholder={t('createEvent.titlePlaceholder')}
          handleChangeText={(value) => setForm({ ...form, title: value })}
          otherStyles={sectionStyles.fieldSpacing}
          maxLength={EVENT_TEXT_LIMITS.title}
          errorText={errors.title}
        />
      </FormFieldAnchor>

      <FormFieldAnchor field="description">
        <FormLongText
          testID="input-event-description"
          title={
            isTemplateMode ? t('createEvent.description') : `${t('createEvent.description')} *`
          }
          value={form.description}
          placeholder={t('createEvent.descriptionPlaceholder')}
          handleChangeText={(value) => setForm({ ...form, description: value })}
          otherStyles={sectionStyles.fieldSpacing}
          isLongText={true}
          maxLength={EVENT_TEXT_LIMITS.description}
          errorText={errors.description}
          defaultExpanded={true}
        />
      </FormFieldAnchor>

      <FormFieldAnchor field="categories">
        <ThemedText style={[sectionStyles.fieldLabel, sectionStyles.fieldSpacing]}>
          {categoryLabel}
        </ThemedText>
        <ThemedView style={sectionStyles.chipRow}>
          {eventCategories.map(({ value }) => {
            const categoryColors = getCategoryColors(value);
            const active = form.categories === value;
            return (
              <FilterChip
                key={value}
                testID={`category-chip-${value}`}
                label={t(`categories.${value.toLowerCase()}`)}
                active={active}
                activeColor={categoryColors.color}
                activeBackground={categoryColors.bg}
                leading={
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: categoryColors.color, opacity: active ? 1 : 0.6 },
                    ]}
                  />
                }
                onPress={() =>
                  setForm({ ...form, categories: active && isTemplateMode ? '' : value })
                }
              />
            );
          })}
        </ThemedView>
        {errors.categories ? <FormErrorText message={errors.categories} /> : null}
      </FormFieldAnchor>
      <HelperText text={t('createEvent.categoryHelper')} isDark={isDark} />
    </>
  );
}

const styles = StyleSheet.create({
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
