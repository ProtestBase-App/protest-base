import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { sectionStyles } from '@/components/event-form/sectionStyles';
import { Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface OwnerCoOrganizerQuestionProps {
  organizationName: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function OwnerCoOrganizerQuestion({
  organizationName,
  value,
  onChange,
}: OwnerCoOrganizerQuestionProps) {
  const themeColors = getThemeColors(useColorScheme());
  const question = t('createEvent.ownerCoOrganizerQuestion', { name: organizationName });

  return (
    <View style={styles.container} testID="owner-co-organizer-question">
      <ThemedText style={sectionStyles.fieldLabel}>{question}</ThemedText>
      <View style={sectionStyles.chipRow}>
        <FilterChip
          testID="owner-co-organizer-yes"
          label={t('common.yes')}
          accessibilityLabel={`${question} ${t('common.yes')}`}
          accessibilityHint={t('a11y.hints.ownerCoOrganizerYes', { name: organizationName })}
          active={value}
          onPress={() => onChange(true)}
        />
        <FilterChip
          testID="owner-co-organizer-no"
          label={t('common.no')}
          accessibilityLabel={`${question} ${t('common.no')}`}
          accessibilityHint={t('a11y.hints.ownerCoOrganizerNo', { name: organizationName })}
          active={!value}
          onPress={() => onChange(false)}
        />
      </View>
      <ThemedText style={[styles.helper, { color: themeColors.secondaryText }]}>
        {t('createEvent.ownerCoOrganizerHelper', { name: organizationName })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});
