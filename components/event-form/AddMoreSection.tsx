import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type TextInstance } from 'react-native';

import { DetailsSection, type OptionalField } from '@/components/event-form/DetailsSection';
import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { IconSizes, Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFocusOnChange } from '@/hooks/useOverlayFocus';
import type { EventFormErrors, EventFormProps, FormState } from '@/types/eventForm.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

const OPTIONS: { field: OptionalField; labelKey: string }[] = [
  { field: 'link', labelKey: 'createEvent.link' },
  { field: 'coOrganizers', labelKey: 'createEvent.coOrganizers' },
  { field: 'volunteers', labelKey: 'createEvent.volunteering' },
  { field: 'goodToKnow', labelKey: 'createEvent.disclaimer' },
];

function isInUse(field: OptionalField, form: FormState, errors: EventFormErrors): boolean {
  switch (field) {
    case 'link':
      return !!form.website_url || !!errors.website_url;
    case 'coOrganizers':
      return form.co_organizers.length > 0;
    case 'volunteers':
      return form.help_needed || !!errors.help_description;
    case 'goodToKnow':
      return !!form.disclaimer || !!errors.disclaimer;
  }
}

export interface AddMoreSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  isDark: boolean;
  scrollViewRef?: EventFormProps['scrollViewRef'];
}

/** The optional details: a chip each until used, so a short event stays short. */
export function AddMoreSection({
  form,
  setForm,
  errors,
  isDark,
  scrollViewRef,
}: AddMoreSectionProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [opened, setOpened] = useState<OptionalField[]>([]);
  // The pressed chip goes away, and TalkBack would fall back to the top of the page.
  const [added, setAdded] = useState<OptionalField | null>(null);
  const addedLabelRef = useRef<TextInstance>(null);
  useFocusOnChange(added, addedLabelRef);

  const shown = OPTIONS.map((option) => option.field).filter(
    (field) => opened.includes(field) || isInUse(field, form, errors)
  );
  const available = OPTIONS.filter((option) => !shown.includes(option.field));

  const open = (field: OptionalField) => {
    setOpened((prev) => [...prev, field]);
    setAdded(field);
    if (field === 'volunteers') setForm((prev) => ({ ...prev, help_needed: true }));
  };

  return (
    <View>
      {shown.length > 0 && (
        <DetailsSection
          form={form}
          setForm={setForm}
          errors={errors}
          isDark={isDark}
          scrollViewRef={scrollViewRef}
          fields={shown}
          addedField={added}
          addedLabelRef={addedLabelRef}
        />
      )}
      {available.length > 0 && (
        <>
          <ThemedText style={[styles.label, { color: themeColors.secondaryText }]}>
            {t('createEvent.addMore')}
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            {available.map(({ field, labelKey }) => (
              <FilterChip
                key={field}
                testID={`add-more-${field}`}
                label={t(labelKey)}
                containerStyle={[styles.addChip, { borderColor: themeColors.inputBorder }]}
                leading={<IconSymbol name="plus" size={IconSizes.xs} color={themeColors.text} />}
                onPress={() => open(field)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  addChip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
});
