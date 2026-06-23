import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  FiltersSheetFooter,
  FiltersSheetSectionLabel,
  FiltersSheetShell,
} from '@/components/FiltersSheetShell';
import {
  SheetSearchMultiSelect,
  SheetSearchMultiSelectOption,
} from '@/components/SheetSearchMultiSelect';
import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';
import {
  buildCountryOptions,
  buildPostalCodeOptions,
  countryOfPostalToken,
  DEFAULT_MAP_FILTERS,
  MapFilters,
} from '@/utils/mapTabUtils';
import { getThemeColors } from '@/utils/themeColors';

export interface MapFiltersSheetProps {
  visible: boolean;
  initialFilters: MapFilters;
  /** Geocoded upcoming events — the source for country/postal-code options. */
  events: Event[];
  userLanguage: string;
  onApply: (filters: MapFilters) => void;
  onClose: () => void;
  /** Live result count for the apply button label, computed by the parent. */
  countMatches: (draft: MapFilters) => number;
}

function isDraftDefault(draft: MapFilters): boolean {
  return (
    draft.categories.length === 0 &&
    draft.country === null &&
    draft.postalCodes.length === 0 &&
    draft.organizations.length === 0 &&
    !draft.savedOnly &&
    !draft.helpNeeded
  );
}

/**
 * Bottom-sheet filter editor for the Maps tab. Edits a local draft of the
 * filters; changes only propagate on Apply — closing the sheet (scrim tap,
 * close button, back gesture) discards the draft.
 *
 * Unlike the calendar sheet, location filtering follows the maps handoff:
 * a single-select country row plus a postal-code multi-select scoped to the
 * selected country (out-of-country selections are dropped automatically).
 */
export function MapFiltersSheet({
  visible,
  initialFilters,
  events,
  userLanguage,
  onApply,
  onClose,
  countMatches,
}: MapFiltersSheetProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const { getSubMunicipalityName } = usePostalCodes();
  const { dropdownItems } = useOrganizations();

  const [draft, setDraft] = useState<MapFilters>(initialFilters);

  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const toggleCategory = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((category) => category !== value)
        : [...prev.categories, value],
    }));
  }, []);

  // Re-tapping the selected country deselects it (back to all); postal codes
  // outside the newly selected country are dropped automatically.
  const selectCountry = useCallback((value: string | null) => {
    setDraft((prev) => {
      const country = prev.country === value ? null : value;
      return {
        ...prev,
        country,
        postalCodes: country
          ? prev.postalCodes.filter((token) => countryOfPostalToken(token) === country)
          : prev.postalCodes,
      };
    });
  }, []);

  const countryOptions = useMemo(
    () => buildCountryOptions(events, userLanguage),
    [events, userLanguage]
  );

  const allPostalOptions = useMemo(
    () => buildPostalCodeOptions(events, getSubMunicipalityName),
    [events, getSubMunicipalityName]
  );

  const postalOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () =>
      allPostalOptions
        .filter((option) => !draft.country || option.country === draft.country)
        .map((option) => ({
          value: option.value,
          label: option.label,
          searchText: option.searchText,
        })),
    [allPostalOptions, draft.country]
  );

  const resolvePostalLabel = useCallback(
    (token: string) => allPostalOptions.find((option) => option.value === token)?.label ?? token,
    [allPostalOptions]
  );

  const organizationOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () => dropdownItems.map((item) => ({ value: item.value, label: item.label })),
    [dropdownItems]
  );

  const resolveOrganizationLabel = useCallback(
    (id: string) => dropdownItems.find((item) => item.value === id)?.label ?? id,
    [dropdownItems]
  );

  const matchCount = useMemo(
    () => (visible ? countMatches(draft) : 0),
    [visible, draft, countMatches]
  );

  const draftIsDefault = isDraftDefault(draft);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <FiltersSheetShell visible={visible} onClose={onClose} title={t('filters.title')}>
      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('maps.actionType')} />
        <View style={styles.chipRow}>
          {eventCategories.map(({ value }) => {
            const categoryColors = getCategoryColors(value);
            const active = draft.categories.includes(value);
            return (
              <FilterChip
                key={value}
                label={t('categories.' + value.toLowerCase())}
                active={active}
                activeColor={categoryColors.color}
                activeBackground={categoryColors.bg}
                leading={
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: categoryColors.color, opacity: active ? 1 : 0.6 },
                    ]}
                  />
                }
                onPress={() => toggleCategory(value)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('maps.country')} />
        <View style={styles.chipRow}>
          <FilterChip
            label={t('maps.countryAll')}
            active={draft.country === null}
            onPress={() => selectCountry(null)}
          />
          {countryOptions.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={draft.country === option.value}
              onPress={() => selectCountry(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('maps.postalCode')} />
        <SheetSearchMultiSelect
          inBottomSheet
          options={postalOptions}
          selected={draft.postalCodes}
          onChange={(next) => setDraft((prev) => ({ ...prev, postalCodes: next }))}
          placeholder={t('maps.searchPostalCode')}
          resolveSelectedLabel={resolvePostalLabel}
          leadingIconName="mappin.and.ellipse"
        />
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('filters.organization')} />
        <SheetSearchMultiSelect
          inBottomSheet
          options={organizationOptions}
          selected={draft.organizations}
          onChange={(next) => setDraft((prev) => ({ ...prev, organizations: next }))}
          placeholder={t('filters.searchOrganizations')}
          resolveSelectedLabel={resolveOrganizationLabel}
          leadingIconName="person"
        />
      </View>

      <View style={[styles.toggleSection, { borderTopColor: themeColors.separator }]}>
        <View style={[styles.toggleRow, { borderBottomColor: themeColors.separator }]}>
          <IconSymbol name="bookmark" size={17} color={themeColors.secondaryText} />
          <View style={styles.toggleText}>
            <ThemedText style={styles.toggleTitle}>{t('home.savedOnlyTitle')}</ThemedText>
            <ThemedText style={[styles.toggleSubtitle, { color: themeColors.secondaryText }]}>
              {t('home.savedOnlySubtitle')}
            </ThemedText>
          </View>
          <Switch
            value={draft.savedOnly}
            onValueChange={(value) => setDraft((prev) => ({ ...prev, savedOnly: value }))}
            trackColor={{ true: themeColors.tint }}
          />
        </View>

        <View style={[styles.toggleRow, styles.toggleRowLast]}>
          <IconSymbol name="hand.raised.fill" size={17} color={themeColors.warning} />
          <View style={styles.toggleText}>
            <ThemedText style={styles.toggleTitle}>{t('createEvent.helpNeeded')}</ThemedText>
            <ThemedText style={[styles.toggleSubtitle, { color: themeColors.secondaryText }]}>
              {t('home.helpNeededSubtitle')}
            </ThemedText>
          </View>
          <Switch
            value={draft.helpNeeded}
            onValueChange={(value) => setDraft((prev) => ({ ...prev, helpNeeded: value }))}
            trackColor={{ true: themeColors.tint }}
          />
        </View>
      </View>

      <FiltersSheetFooter
        onReset={() => setDraft(DEFAULT_MAP_FILTERS)}
        resetDisabled={draftIsDefault}
        onApply={handleApply}
        applyDisabled={false}
        applyLabel={
          matchCount === 0
            ? t('maps.filterApplyNone')
            : t('maps.filterApplyCount', { count: matchCount })
        }
      />
    </FiltersSheetShell>
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
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  toggleSection: {
    borderTopWidth: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  // The design has no trailing separator after the last toggle row.
  toggleRowLast: {
    borderBottomWidth: 0,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    lineHeight: 21,
  },
  toggleSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
});

export default MapFiltersSheet;
