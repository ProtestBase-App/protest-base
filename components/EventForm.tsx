import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { BasicsSection } from '@/components/event-form/BasicsSection';
import { DateTimeSection } from '@/components/event-form/DateTimeSection';
import { DetailsSection } from '@/components/event-form/DetailsSection';
import { FormProgress } from '@/components/event-form/FormProgress';
import { ImagesSection } from '@/components/event-form/ImagesSection';
import { LocationSection } from '@/components/event-form/LocationSection';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEventImages } from '@/hooks/useEventImages';
import { useEventLocation } from '@/hooks/useEventLocation';
import type { EventFormErrors, EventFormProps } from '@/types/eventForm.types';
import { SectionHeader } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import { isRepeating } from '@/utils/recurrence';

const NO_ERRORS: EventFormErrors = {};

const EventForm: React.FC<EventFormProps> = ({
  form,
  setForm,
  errors = NO_ERRORS,
  userLanguage,
  mode = 'create-event',
  scrollViewRef,
  isAllDay = false,
  showRepeat = false,
}) => {
  const isDark = useColorScheme() === 'dark';
  const isTemplateMode = mode === 'create-template' || mode === 'edit-template';
  // A series has a rule instead of the two date fields.
  const repeat = showRepeat && isRepeating(form.repeat) ? form.repeat : null;
  const location = useEventLocation({ form, setForm, userLanguage });
  const images = useEventImages({ form, setForm });

  return (
    <ThemedView style={styles.container}>
      {!isTemplateMode && <FormProgress form={form} mode={mode} repeat={repeat} />}

      <SectionHeader title={t('createEvent.basicInformation')} isDark={isDark} />
      <BasicsSection form={form} setForm={setForm} errors={errors} mode={mode} isDark={isDark} />

      {!isTemplateMode && (
        <DateTimeSection
          form={form}
          setForm={setForm}
          errors={errors}
          userLanguage={userLanguage}
          isDark={isDark}
          isAllDay={isAllDay}
          showRepeat={showRepeat}
          repeat={repeat}
        />
      )}

      <SectionHeader title={t('createEvent.locationSection')} isDark={isDark} />
      <LocationSection
        form={form}
        setForm={setForm}
        location={location}
        userLanguage={userLanguage}
        isDark={isDark}
      />

      <SectionHeader title={t('createEvent.mediaAndAdditionalDetails')} isDark={isDark} />
      <ImagesSection form={form} images={images} isTemplateMode={isTemplateMode} isDark={isDark} />
      <DetailsSection
        form={form}
        setForm={setForm}
        errors={errors}
        isDark={isDark}
        scrollViewRef={scrollViewRef}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 40,
  },
});

export default EventForm;
