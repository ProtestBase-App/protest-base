import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import CalendarGrid from '@/components/CalendarGrid';
import CustomButton from '@/components/CustomButton';
import { FormRow } from '@/components/event-form/FormRow';
import { FormSurface } from '@/components/event-form/FormSurface';
import FormDateField from '@/components/FormDateField';
import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventFormErrors, FormState } from '@/types/eventForm.types';
import type { CalendarDay } from '@/utils/calendarUtils';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { EVENT_TIMEZONE, isBelgiumMidnight } from '@/utils/eventFormatters';
import {
  durationHours,
  endAfterHours,
  endAtTime,
  endsOnAnotherDay,
  moveStart,
  moveToDay,
} from '@/utils/eventWhen';
import { HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import {
  brusselsDateOf,
  brusselsInstant,
  brusselsTimeOf,
  formatMonthYear,
} from '@/utils/recurrence';
import { getThemeColors } from '@/utils/themeColors';

const DURATIONS = [1, 2, 3];

export interface WhenSurfaceProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: EventFormErrors;
  userLanguage: string;
  isDark: boolean;
  isAllDay: boolean;
  inSheet: boolean;
  /** An update leaves out an empty end, so only a new event can drop one. */
  canClearEnd: boolean;
  onOpenRepeat?: () => void;
  onClose: () => void;
}

export function WhenSurface({
  form,
  setForm,
  errors,
  userLanguage,
  isDark,
  isAllDay,
  inSheet,
  canClearEnd,
  onOpenRepeat,
  onClose,
}: WhenSurfaceProps) {
  const themeColors = getThemeColors(useColorScheme());
  const today = getTodayDateKeyInBelgium();
  const startDay = form.start_time ? brusselsDateOf(form.start_time) : null;
  // A day picked before a time: nothing valid to write to the form yet.
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const [needsTime, setNeedsTime] = useState(false);
  const [multiDay, setMultiDay] = useState(endsOnAnotherDay(form));
  const [openPickers, setOpenPickers] = useState(0);

  const shownDay = startDay ?? pendingDay ?? today;
  const [year, month] = shownDay.split('-').map(Number);
  const [view, setView] = useState({ year, month: month - 1 });

  const allDay = isAllDay && !!form.start_time && isBelgiumMidnight(form.start_time);
  const hours = durationHours(form);
  const showEnd = !!form.start_time && !allDay;
  const timeStyle = [styles.time, (!showEnd || multiDay || openPickers > 0) && styles.timeWide];
  const trackPicker = (open: boolean) => setOpenPickers((count) => count + (open ? 1 : -1));

  const goToMonth = (step: 1 | -1) => {
    setView(({ year: y, month: m }) => {
      const next = new Date(Date.UTC(y, m + step, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  };

  const handleSelectDay = (day: CalendarDay) => {
    if (form.start_time) {
      setForm((prev) => ({ ...prev, ...moveToDay(prev, day.dateKey) }));
    } else {
      setPendingDay(day.dateKey);
    }
  };

  const handleStartTime = (iso: string) => {
    const start = brusselsInstant(startDay ?? pendingDay ?? today, brusselsTimeOf(iso));
    setForm((prev) => ({ ...prev, ...moveStart(prev, start) }));
    setPendingDay(null);
    setNeedsTime(false);
  };

  const handleEndTime = (iso: string) => {
    setForm((prev) => ({
      ...prev,
      ...(multiDay ? { end_time: iso } : endAtTime(prev, brusselsTimeOf(iso))),
    }));
  };

  const handleDone = () => {
    if (pendingDay && !form.start_time) {
      setNeedsTime(true);
      return;
    }
    onClose();
  };

  return (
    <FormSurface
      title={t('createEvent.when')}
      onClose={onClose}
      inSheet={inSheet}
      testID="surface-when"
      footer={
        <View style={styles.footer}>
          <CustomButton
            testID="btn-when-done"
            title={t('common.done')}
            handlePress={handleDone}
            pill
            isLoading={false}
          />
        </View>
      }
    >
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => goToMonth(-1)}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel={t('createEvent.previousMonth')}
          accessibilityHint={t('a11y.hints.previousMonth')}
          testID="when-previous-month"
        >
          <IconSymbol name="chevron.left" size={IconSizes.md} color={themeColors.text} />
        </Pressable>
        <ThemedText style={styles.monthLabel}>
          {formatMonthYear(view.year, view.month, userLanguage)}
        </ThemedText>
        <Pressable
          onPress={() => goToMonth(1)}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel={t('createEvent.nextMonth')}
          accessibilityHint={t('a11y.hints.nextMonth')}
          testID="when-next-month"
        >
          <IconSymbol name="chevron.right" size={IconSizes.md} color={themeColors.text} />
        </Pressable>
      </View>

      <CalendarGrid
        year={view.year}
        month={view.month}
        selectedDateKey={startDay ?? pendingDay ?? ''}
        dayMarkers={{}}
        showLegend={false}
        onSelectDay={handleSelectDay}
        onPrevMonth={() => goToMonth(-1)}
        onNextMonth={() => goToMonth(1)}
        canGoPrev
        userLanguage={userLanguage}
        minDateKey={today}
        localizedDayLabels
        dayHint={t('a11y.hints.pickDay')}
      />

      <View style={styles.times}>
        <FormDateField
          testID="input-event-start-time"
          title={t('createEvent.starts')}
          value={form.start_time}
          placeholder={t('createEvent.timePlaceholder')}
          handleChangeText={handleStartTime}
          pickerMode="time"
          timeZoneName={EVENT_TIMEZONE}
          formatValue={allDay ? () => t('events.allDay') : brusselsTimeOf}
          errorText={needsTime ? t('createEvent.startTimeRequired') : errors.start_time}
          otherStyles={timeStyle}
          onPickerToggle={trackPicker}
        />
        {showEnd && (
          <FormDateField
            testID="input-event-end-time"
            title={`${t('createEvent.ends')} (${t('common.optional')})`}
            value={form.end_time}
            placeholder={t('createEvent.timePlaceholder')}
            handleChangeText={handleEndTime}
            pickerMode={multiDay ? 'datetime' : 'time'}
            timeZoneName={multiDay ? undefined : EVENT_TIMEZONE}
            formatValue={multiDay ? undefined : brusselsTimeOf}
            openAt={endAfterHours(form, 1).end_time}
            errorText={errors.end_time}
            otherStyles={timeStyle}
            onPickerToggle={trackPicker}
          />
        )}
      </View>
      {allDay && <HelperText text={t('eventEdit.allDayHint')} isDark={isDark} />}

      {showEnd && (
        <>
          <View style={styles.chips}>
            {DURATIONS.map((value) => (
              <FilterChip
                key={value}
                containerStyle={styles.chip}
                testID={`when-duration-${value}`}
                label={t('createEvent.hours', { count: value })}
                active={hours === value && !multiDay}
                onPress={() => {
                  setMultiDay(false);
                  setForm((prev) => ({ ...prev, ...endAfterHours(prev, value) }));
                }}
              />
            ))}
            {canClearEnd && (
              <FilterChip
                containerStyle={styles.chip}
                testID="when-no-end"
                label={t('createEvent.noSetEnd')}
                active={!form.end_time}
                onPress={() => {
                  setMultiDay(false);
                  setForm((prev) => ({ ...prev, end_time: '' }));
                }}
              />
            )}
            <FilterChip
              containerStyle={styles.chip}
              testID="when-other-day"
              label={t('createEvent.endsAnotherDay')}
              active={multiDay}
              onPress={() => setMultiDay(true)}
            />
          </View>
        </>
      )}

      {onOpenRepeat && (
        <View
          style={[
            styles.repeatCard,
            { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
          ]}
        >
          <FormRow
            icon="repeat"
            title={t('series.repeat.label')}
            subtitle={t('series.repeat.once')}
            onPress={onOpenRepeat}
            accessibilityHint={t('a11y.hints.openRepeat')}
            testID="row-event-repeat"
          />
        </View>
      )}
    </FormSurface>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    textTransform: 'capitalize',
  },
  times: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Widths, not flex: Yoga keeps a flex basis it has already computed.
  time: {
    width: '48.5%',
  },
  timeWide: {
    width: '100%',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
  },
  repeatCard: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
});
