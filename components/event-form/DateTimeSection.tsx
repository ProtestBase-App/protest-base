import React from 'react';

import FormDateField from '@/components/FormDateField';
import { FormFieldAnchor } from '@/components/FormScreenScaffold';
import RepeatFields from '@/components/RepeatFields';
import { sectionStyles } from '@/components/event-form/sectionStyles';
import type { EventFormErrors, FormState } from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import { isBelgiumMidnight } from '@/utils/eventFormatters';
import { HelperText, SectionHeader } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';

/** Safely parse a date string, returning a valid Date or the fallback. */
function safeParseDate(dateString: string | undefined, fallback: Date = new Date()): Date {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

export interface DateTimeSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  userLanguage: string;
  isDark: boolean;
  isAllDay: boolean;
  showRepeat: boolean;
  repeat: RepeatFormState | null;
}

/** The start and end, or the Repeat rule that replaces them. */
export function DateTimeSection({
  form,
  setForm,
  errors,
  userLanguage,
  isDark,
  isAllDay,
  showRepeat,
  repeat,
}: DateTimeSectionProps) {
  // Moving the start off Brussels midnight is the only way to give an all-day event a time.
  const stillAllDay = isAllDay && !!form.start_time && isBelgiumMidnight(form.start_time);

  const handleStartTimeChange = (isoString: string) => {
    const newStartTime = safeParseDate(isoString);
    const currentEndTime = form.end_time ? safeParseDate(form.end_time) : null;

    if (currentEndTime && currentEndTime < newStartTime) {
      setForm({
        ...form,
        start_time: isoString,
        end_time: isoString,
      });
    } else {
      setForm({ ...form, start_time: isoString });
    }
  };

  return (
    <>
      <SectionHeader title={t('createEvent.dateAndTime')} isDark={isDark} />

      {showRepeat && (
        <RepeatFields
          repeat={form.repeat}
          onChange={(next) => setForm((prev) => ({ ...prev, repeat: next }))}
          startTime={form.start_time}
          endTime={form.end_time}
          userLanguage={userLanguage}
          formErrors={errors}
        />
      )}

      {!repeat && (
        <>
          <FormFieldAnchor field="start_time">
            <FormDateField
              testID="input-event-start-time"
              title={`${t('createEvent.startTime')} *`}
              value={form.start_time}
              placeholder={t('createEvent.pickStartDateTime')}
              handleChangeText={handleStartTimeChange}
              otherStyles={sectionStyles.fieldSpacing}
              errorText={errors.start_time}
              minDate={new Date()}
              allDayLabel={stillAllDay ? t('events.allDay') : undefined}
              allDayHint={stillAllDay ? t('eventEdit.allDayHint') : undefined}
            />
          </FormFieldAnchor>

          <FormFieldAnchor field="end_time">
            <FormDateField
              testID="input-event-end-time"
              title={`${t('createEvent.endTime')} (${t('common.optional')})`}
              value={form.end_time}
              placeholder={t('createEvent.pickEndDateTime')}
              handleChangeText={(isoString: string) => setForm({ ...form, end_time: isoString })}
              otherStyles={sectionStyles.fieldSpacing}
              errorText={errors.end_time}
              minDate={safeParseDate(form.start_time)}
              // The end of an all-day event is a storage artifact, so no hint here.
              allDayLabel={stillAllDay ? t('events.allDay') : undefined}
            />
          </FormFieldAnchor>
          <HelperText text={t('createEvent.endTimeHelper')} isDark={isDark} />
        </>
      )}
    </>
  );
}
