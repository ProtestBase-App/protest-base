import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventFormMode, FormState } from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import { stillNeededFields } from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface FormProgressProps {
  form: FormState;
  mode: EventFormMode;
  repeat: RepeatFormState | null;
}

/** How much of what the form requires is filled in, and what is left. */
export function FormProgress({ form, mode, repeat }: FormProgressProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const kind = mode === 'edit-event' ? 'edit' : 'create';
  const missing = stillNeededFields(form, kind, repeat);
  const total = kind === 'edit' ? 3 : 4;
  const getFormProgress = {
    missing: missing.map((name) => t(`createEvent.neededFields.${name}`)),
    percentage: Math.round(((total - missing.length) / total) * 100),
  };

  return (
    <ThemedView
      style={styles.progressContainer}
      accessible={true}
      accessibilityRole="progressbar"
      aria-label={t('createEvent.progressAccessibilityLabel', {
        percentage: getFormProgress.percentage,
      })}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: getFormProgress.percentage,
      }}
    >
      <ThemedView style={styles.progressHeader}>
        <ThemedText style={[styles.progressText, { color: themeColors.icon }]}>
          {getFormProgress.missing.length > 0
            ? t('createEvent.stillNeeded', { fields: getFormProgress.missing.join(', ') })
            : t('createEvent.allRequiredFilled')}
        </ThemedText>
        <ThemedText style={[styles.progressPercentage, { color: themeColors.tint }]}>
          {getFormProgress.percentage}%
        </ThemedText>
      </ThemedView>
      <ThemedView
        style={[styles.progressBarBackground, { backgroundColor: themeColors.inputBorder }]}
      >
        <ThemedView
          style={[
            styles.progressBarFill,
            { width: `${getFormProgress.percentage}%`, backgroundColor: themeColors.tint },
          ]}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    flexShrink: 1,
    marginRight: Spacing.sm,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  progressPercentage: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
