import React from 'react';
import { StyleSheet, View } from 'react-native';

import CustomButton from '@/components/CustomButton';
import { FormSurface } from '@/components/event-form/FormSurface';
import { ImagesSection } from '@/components/event-form/ImagesSection';
import { Spacing } from '@/constants/DesignTokens';
import { MAX_EVENT_IMAGES } from '@/constants/EventConfig';
import type { EventImages } from '@/hooks/useEventImages';
import type { FormState } from '@/types/eventForm.types';
import { t } from '@/utils/i18n';

export interface PhotosSurfaceProps {
  form: FormState;
  images: EventImages;
  isTemplateMode: boolean;
  isDark: boolean;
  inSheet: boolean;
  onClose: () => void;
}

export function PhotosSurface({
  form,
  images,
  isTemplateMode,
  isDark,
  inSheet,
  onClose,
}: PhotosSurfaceProps) {
  return (
    <FormSurface
      title={`${t('createEvent.uploadImage')} ${form.images.length}/${MAX_EVENT_IMAGES}`}
      onClose={onClose}
      inSheet={inSheet}
      testID="surface-photos"
      footer={
        <View style={styles.footer}>
          <CustomButton
            testID="btn-photos-done"
            title={t('common.done')}
            handlePress={onClose}
            pill
            isLoading={false}
          />
        </View>
      }
    >
      <ImagesSection
        form={form}
        images={images}
        isTemplateMode={isTemplateMode}
        isDark={isDark}
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
