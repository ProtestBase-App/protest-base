import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FiltersSheetSectionLabel } from '@/components/FiltersSheetShell';
import { FilterChip } from '@/components/ui/FilterChip';
import { Spacing } from '@/constants/DesignTokens';
import type { EventCountry } from '@/types/event.types';
import { getCountryFilterOptions } from '@/utils/countryOptions';
import { t } from '@/utils/i18n';

export interface CountryFilterSectionProps {
  /** Selected country, or null for all countries. */
  selected: EventCountry | null;
  /** Called with the tapped chip's value; null for "All". */
  onSelect: (country: EventCountry | null) => void;
  /** Language for the country labels. */
  userLanguage: string;
}

/**
 * Single-select country row shared by the Explore and Map filter sheets:
 * "All" plus every selectable country, labeled in the user's language.
 *
 * The language is a prop because sheet content renders in the
 * BottomSheetModalProvider portal, which sits above the app's context providers.
 */
export function CountryFilterSection({
  selected,
  onSelect,
  userLanguage,
}: CountryFilterSectionProps) {
  const options = useMemo(() => getCountryFilterOptions(userLanguage), [userLanguage]);

  return (
    <View style={styles.section}>
      <FiltersSheetSectionLabel label={t('filters.country')} />
      <View style={styles.chipRow}>
        <FilterChip
          testID="filter-country-all"
          label={t('filters.countryAll')}
          active={selected === null}
          onPress={() => onSelect(null)}
        />
        {options.map((option) => (
          <FilterChip
            key={option.value}
            testID={`filter-country-${option.value}`}
            label={option.label}
            active={selected === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});

export default CountryFilterSection;
