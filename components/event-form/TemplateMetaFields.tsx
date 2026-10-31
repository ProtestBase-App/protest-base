import React from 'react';
import { StyleSheet, View } from 'react-native';

import FormField from '@/components/FormField';
import { FormFieldAnchor } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/DesignTokens';
import { TEMPLATE_LIMITS } from '@/constants/EventConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface TemplateMetaFieldsProps {
  name: string;
  onChangeName: (name: string) => void;
  note: string;
  onChangeNote: (note: string) => void;
  nameError?: string;
  nameTestID: string;
  noteTestID: string;
}

/** The template's own name and note, above the event details it saves. */
export function TemplateMetaFields({
  name,
  onChangeName,
  note,
  onChangeNote,
  nameError,
  nameTestID,
  noteTestID,
}: TemplateMetaFieldsProps) {
  const themeColors = getThemeColors(useColorScheme());

  return (
    <View>
      <FormFieldAnchor field="template_name">
        <FormField
          testID={nameTestID}
          title={t('template.nameLabel')}
          value={name}
          placeholder={t('template.namePlaceholder')}
          handleChangeText={onChangeName}
          maxLength={TEMPLATE_LIMITS.name}
          errorText={nameError}
        />
      </FormFieldAnchor>
      <ThemedText style={[styles.help, { color: themeColors.secondaryText }]}>
        {t('template.nameHelp')}
      </ThemedText>
      <FormField
        testID={noteTestID}
        title={t('template.descriptionLabel')}
        value={note}
        placeholder={t('template.descriptionPlaceholder')}
        handleChangeText={onChangeNote}
        maxLength={TEMPLATE_LIMITS.description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  help: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
});
