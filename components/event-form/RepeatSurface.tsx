import React from 'react';
import { StyleSheet, View } from 'react-native';

import CustomButton from '@/components/CustomButton';
import { FormSurface } from '@/components/event-form/FormSurface';
import RepeatFields from '@/components/RepeatFields';
import { Spacing } from '@/constants/DesignTokens';
import type { EventFormErrors, FormState } from '@/types/eventForm.types';
import { t } from '@/utils/i18n';

export interface RepeatSurfaceProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  userLanguage: string;
  inSheet: boolean;
  onClose: () => void;
}

export function RepeatSurface({
  form,
  setForm,
  errors,
  userLanguage,
  inSheet,
  onClose,
}: RepeatSurfaceProps) {
  return (
    <FormSurface
      title={t('series.repeat.label')}
      onClose={onClose}
      inSheet={inSheet}
      testID="surface-repeat"
      footer={
        <View style={styles.footer}>
          <CustomButton
            testID="btn-repeat-done"
            title={t('common.done')}
            handlePress={onClose}
            pill
            isLoading={false}
          />
        </View>
      }
    >
      <RepeatFields
        repeat={form.repeat}
        onChange={(next) => setForm((prev) => ({ ...prev, repeat: next }))}
        startTime={form.start_time}
        endTime={form.end_time}
        userLanguage={userLanguage}
        formErrors={errors}
        hideLabel
      />
    </FormSurface>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
