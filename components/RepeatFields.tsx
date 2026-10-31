import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import FormDateField from '@/components/FormDateField';
import FormFieldNumeric from '@/components/FormFieldNumeric';
import { FormFieldAnchor } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FilterChip } from '@/components/ui/FilterChip';
import { FormErrorText } from '@/components/ui/FormErrorText';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRecurrencePreview } from '@/hooks/useRecurrencePreview';
import type { EventFormErrors } from '@/types/eventForm.types';
import type { RepeatFormState, RepeatFrequency } from '@/types/eventSeries.types';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { EVENT_TIMEZONE } from '@/utils/eventFormatters';
import { HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import {
  brusselsDateOf,
  brusselsInstant,
  brusselsTimeOf,
  buildRecurrenceRule,
  createRepeatForm,
  formatCalendarDate,
  formatOccurrenceDate,
  isRepeating,
  repeatFieldMessage,
  seriesErrorMessage,
  WEEKDAYS,
  WEEKS_OF_MONTH,
} from '@/utils/recurrence';
import { getThemeColors } from '@/utils/themeColors';

export interface RepeatFieldsProps {
  repeat: RepeatFormState | undefined;
  onChange: (repeat: RepeatFormState) => void;
  /** The single-event pickers' values, which seed the rule when Repeat is turned on. */
  startTime: string;
  endTime: string;
  userLanguage: string;
  /** What a refused submit found wrong with the rule, by field. */
  formErrors?: EventFormErrors;
}

const FREQUENCIES: { value: RepeatFrequency; labelKey: string }[] = [
  { value: 'once', labelKey: 'series.repeat.once' },
  { value: 'weekly', labelKey: 'series.repeat.weekly' },
  { value: 'every_2_weeks', labelKey: 'series.repeat.everyTwoWeeks' },
  { value: 'monthly', labelKey: 'series.repeat.monthly' },
];

const NO_ERRORS: EventFormErrors = {};

const WEEK_OF_MONTH_LABELS: Record<string, string> = {
  '1': 'series.ordinals.first',
  '2': 'series.ordinals.second',
  '3': 'series.ordinals.third',
  '4': 'series.ordinals.fourth',
  '-1': 'series.ordinals.last',
};

/** A date picked at noon Brussels stays on its day whatever the device's zone does to it. */
const NOON = '12:00';

/**
 * The Repeat control of the create form: Once, or a rule built from Brussels
 * wall-clock parts, with its dates under it. Everything the rule means is decided by
 * the backend, through the preview, so what is listed here is what will be created.
 */
export default function RepeatFields({
  repeat,
  onChange,
  startTime,
  endTime,
  userLanguage,
  formErrors = NO_ERRORS,
}: RepeatFieldsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);

  const repeating = isRepeating(repeat);
  const today = getTodayDateKeyInBelgium();

  const { rule, errors } = useMemo(
    () =>
      repeating
        ? buildRecurrenceRule(repeat, { requireEnd: false, today })
        : { rule: null, errors: [] },
    [repeat, repeating, today]
  );
  const previewState = useRecurrencePreview(rule);

  const selectFrequency = (frequency: RepeatFrequency) => {
    onChange({
      ...(repeat ?? createRepeatForm({ startTime, endTime }, today)),
      frequency,
    });
  };

  const update = (patch: Partial<RepeatFormState>) => {
    if (repeat) onChange({ ...repeat, ...patch });
  };

  const fieldErrors = errors.filter((field) => field !== 'start_local');

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={[styles.label, styles.fieldSpacing]}>
        {t('series.repeat.label')}
      </ThemedText>
      <ThemedView style={styles.chipRow}>
        {FREQUENCIES.map(({ value, labelKey }) => (
          <FilterChip
            key={value}
            testID={`repeat-chip-${value}`}
            label={t(labelKey)}
            active={(repeat?.frequency ?? 'once') === value}
            onPress={() => selectFrequency(value)}
          />
        ))}
      </ThemedView>

      {repeating && (
        <>
          {repeat.frequency === 'monthly' && (
            <>
              <ThemedText style={[styles.label, styles.fieldSpacing]}>
                {t('series.repeat.weekOfMonth')}
              </ThemedText>
              <ThemedView style={styles.chipRow}>
                {WEEKS_OF_MONTH.map((value) => (
                  <FilterChip
                    key={value}
                    testID={`repeat-ordinal-${value}`}
                    label={t(WEEK_OF_MONTH_LABELS[String(value)])}
                    active={repeat.weekOfMonth === value}
                    onPress={() => update({ weekOfMonth: value })}
                  />
                ))}
              </ThemedView>
            </>
          )}

          <ThemedText style={[styles.label, styles.fieldSpacing]}>
            {t('series.repeat.weekday')}
          </ThemedText>
          <ThemedView style={styles.chipRow}>
            {WEEKDAYS.map((weekday) => (
              <FilterChip
                key={weekday}
                testID={`repeat-weekday-${weekday}`}
                label={t(`series.weekdaysShort.${weekday}`)}
                accessibilityLabel={t(`series.weekdays.${weekday}`)}
                accessibilityHint={t('a11y.hints.repeatOnDay')}
                active={repeat.weekday === weekday}
                onPress={() => update({ weekday })}
              />
            ))}
          </ThemedView>

          <FormFieldAnchor field="start_local">
            <FormDateField
              testID="repeat-start-time"
              title={`${t('series.repeat.startTime')} *`}
              value={repeat.startLocal ? brusselsInstant(today, repeat.startLocal) : ''}
              placeholder={t('series.repeat.pickTime')}
              handleChangeText={(iso) => update({ startLocal: brusselsTimeOf(iso) })}
              pickerMode="time"
              timeZoneName={EVENT_TIMEZONE}
              formatValue={brusselsTimeOf}
              errorText={formErrors.start_local}
              otherStyles={styles.fieldSpacing}
            />
          </FormFieldAnchor>
          <FormFieldAnchor field="end_local">
            <FormDateField
              testID="repeat-end-time"
              title={`${t('series.repeat.endTime')} (${t('common.optional')})`}
              value={repeat.endLocal ? brusselsInstant(today, repeat.endLocal) : ''}
              placeholder={t('series.repeat.pickTime')}
              handleChangeText={(iso) => update({ endLocal: brusselsTimeOf(iso) })}
              pickerMode="time"
              timeZoneName={EVENT_TIMEZONE}
              formatValue={brusselsTimeOf}
              errorText={formErrors.end_local}
              otherStyles={styles.fieldSpacing}
            />
          </FormFieldAnchor>
          <HelperText text={t('series.repeat.timeHint')} isDark={isDark} />

          <FormFieldAnchor field="starts_on">
            <FormDateField
              testID="repeat-starts-on"
              title={t('series.repeat.startsOn')}
              value={repeat.startsOn ? brusselsInstant(repeat.startsOn, NOON) : ''}
              placeholder={t('series.repeat.pickDate')}
              handleChangeText={(iso) => update({ startsOn: brusselsDateOf(iso) })}
              pickerMode="date"
              timeZoneName={EVENT_TIMEZONE}
              formatValue={(value) => formatCalendarDate(brusselsDateOf(value), userLanguage)}
              minDate={new Date()}
              errorText={formErrors.starts_on}
              otherStyles={styles.fieldSpacing}
            />
          </FormFieldAnchor>
          <HelperText text={t('series.repeat.startsOnHint')} isDark={isDark} />

          <ThemedText style={[styles.label, styles.fieldSpacing]}>
            {t('series.repeat.ends')}
          </ThemedText>
          <ThemedView style={styles.chipRow}>
            <FilterChip
              testID="repeat-end-count"
              label={t('series.repeat.endsAfter')}
              active={repeat.endMode === 'count'}
              onPress={() => update({ endMode: 'count' })}
            />
            <FilterChip
              testID="repeat-end-until"
              label={t('series.repeat.endsOn')}
              active={repeat.endMode === 'until'}
              onPress={() => update({ endMode: 'until' })}
            />
          </ThemedView>

          {repeat.endMode === 'count' ? (
            <FormFieldAnchor field="count">
              <FormFieldNumeric
                testID="repeat-count"
                title={t('series.repeat.countLabel')}
                value={repeat.count}
                placeholder={t('series.repeat.countPlaceholder')}
                handleChangeText={(count) => update({ count })}
                maxLength={2}
                hasError={!!formErrors.count}
                otherStyles={styles.fieldSpacing}
              />
              {formErrors.count ? <FormErrorText message={formErrors.count} /> : null}
            </FormFieldAnchor>
          ) : (
            <FormFieldAnchor field="until">
              <FormDateField
                testID="repeat-until"
                title={t('series.repeat.untilLabel')}
                value={repeat.until ? brusselsInstant(repeat.until, NOON) : ''}
                placeholder={t('series.repeat.pickDate')}
                handleChangeText={(iso) => update({ until: brusselsDateOf(iso) })}
                pickerMode="date"
                timeZoneName={EVENT_TIMEZONE}
                formatValue={(value) => formatCalendarDate(brusselsDateOf(value), userLanguage)}
                minDate={new Date(brusselsInstant(repeat.startsOn, NOON))}
                errorText={formErrors.until}
                otherStyles={styles.fieldSpacing}
              />
            </FormFieldAnchor>
          )}
          <HelperText text={t('series.repeat.capHint')} isDark={isDark} />

          <View
            testID="repeat-preview"
            style={[
              styles.preview,
              {
                backgroundColor: themeColors.surfaceAltBackground,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <ThemedText style={styles.previewHeading}>{t('series.preview.heading')}</ThemedText>

            {fieldErrors.map((field) => (
              <ThemedText
                key={field}
                testID={`repeat-error-${field}`}
                style={[styles.previewText, { color: themeColors.destructive }]}
              >
                {repeatFieldMessage(field)}
              </ThemedText>
            ))}

            {fieldErrors.length === 0 && previewState.status === 'loading' && (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color={themeColors.tint} />
                <ThemedText style={[styles.previewText, { color: themeColors.secondaryText }]}>
                  {t('series.preview.loading')}
                </ThemedText>
              </View>
            )}

            {fieldErrors.length === 0 && previewState.status === 'refused' && (
              <ThemedText
                testID="repeat-preview-error"
                style={[styles.previewText, { color: themeColors.destructive }]}
              >
                {seriesErrorMessage(previewState.error, userLanguage)}
              </ThemedText>
            )}

            {fieldErrors.length === 0 && previewState.status === 'unavailable' && (
              <ThemedText style={[styles.previewText, { color: themeColors.secondaryText }]}>
                {t('series.preview.unavailable')}
              </ThemedText>
            )}

            {fieldErrors.length === 0 && previewState.status === 'ready' && (
              <>
                <ThemedText testID="repeat-preview-summary" style={styles.previewText}>
                  {rule?.until !== undefined || rule?.count !== undefined
                    ? t('series.preview.creates', { count: previewState.preview.count })
                    : t('series.preview.upTo', {
                        count: previewState.preview.max,
                        date: formatCalendarDate(previewState.preview.window_end, userLanguage),
                      })}
                </ThemedText>
                <ThemedText
                  testID="repeat-preview-dates"
                  style={[styles.previewText, { color: themeColors.secondaryText }]}
                >
                  {previewState.preview.occurrences
                    .map((occurrence) => formatOccurrenceDate(occurrence.start_time, userLanguage))
                    .join(' · ')}
                </ThemedText>
              </>
            )}
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  fieldSpacing: {
    marginTop: 20,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  preview: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  previewHeading: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  previewLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    lineHeight: 20,
  },
});
