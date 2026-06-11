import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  FiltersSheetFooter,
  FiltersSheetSectionLabel,
  FiltersSheetShell,
  FiltersSheetWarningBanner,
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
import { CalendarFilters, DEFAULT_CALENDAR_FILTERS } from '@/utils/calendarTabUtils';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface CalendarFiltersSheetProps {
  visible: boolean;
  initialFilters: CalendarFilters;
  onApply: (filters: CalendarFilters) => void;
  onClose: () => void;
  /** Live result count for the apply button label, computed by the parent. */
  countMatches: (draft: CalendarFilters) => number;
}

function isDraftDefault(draft: CalendarFilters): boolean {
  return (
    draft.categories.length === DEFAULT_CALENDAR_FILTERS.categories.length &&
    draft.locations.length === DEFAULT_CALENDAR_FILTERS.locations.length &&
    draft.organizations.length === DEFAULT_CALENDAR_FILTERS.organizations.length &&
    draft.savedOnly === DEFAULT_CALENDAR_FILTERS.savedOnly &&
    draft.helpNeeded === DEFAULT_CALENDAR_FILTERS.helpNeeded
  );
}

/**
 * Bottom-sheet filter editor for the calendar tab. Edits a local draft of the
 * filters; changes only propagate on Apply — closing the sheet (scrim tap,
 * close button, back gesture) discards the draft.
 */
export function CalendarFiltersSheet({
  visible,
  initialFilters,
  onApply,
  onClose,
  countMatches,
}: CalendarFiltersSheetProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const { locationFilterOptions, resolveLocationLabel, isLocationSelectionTooBroad, loading } =
    usePostalCodes();
  const { dropdownItems } = useOrganizations();

  const [draft, setDraft] = useState<CalendarFilters>(initialFilters);

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

  const locationOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () =>
      loading
        ? []
        : locationFilterOptions.map((option) => ({
            value: option.value,
            label: option.label,
            searchText: option.searchText,
            sublabel:
              option.provinceLabel || t('filters.postalCodesCount', { count: option.count }),
          })),
    [loading, locationFilterOptions]
  );

  const organizationOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () => dropdownItems.map((item) => ({ value: item.value, label: item.label })),
    [dropdownItems]
  );

  const resolveOrganizationLabel = useCallback(
    (id: string) => dropdownItems.find((item) => item.value === id)?.label ?? id,
    [dropdownItems]
  );

  const tooBroad = useMemo(
    () => isLocationSelectionTooBroad(draft.locations),
    [isLocationSelectionTooBroad, draft.locations]
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
        <FiltersSheetSectionLabel label={t('filters.category')} />
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
        <FiltersSheetSectionLabel label={t('filters.location')} />
        <SheetSearchMultiSelect
          options={locationOptions}
          selected={draft.locations}
          onChange={(next) => setDraft((prev) => ({ ...prev, locations: next }))}
          placeholder={t('filters.searchPlaceholder')}
          resolveSelectedLabel={resolveLocationLabel}
          leadingIconName="mappin.and.ellipse"
          minSearchLength={2}
        />
        {tooBroad && <FiltersSheetWarningBanner message={t('filters.selectionTooBroad')} />}
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('filters.organization')} />
        <SheetSearchMultiSelect
          options={organizationOptions}
          selected={draft.organizations}
          onChange={(next) => setDraft((prev) => ({ ...prev, organizations: next }))}
          placeholder={t('filters.searchOrganizations')}
          resolveSelectedLabel={resolveOrganizationLabel}
          leadingIconName="person"
          minSearchLength={0}
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
        onReset={() => setDraft(DEFAULT_CALENDAR_FILTERS)}
        resetDisabled={draftIsDefault}
        onApply={handleApply}
        applyDisabled={tooBroad}
        applyLabel={
          matchCount === 0
            ? t('home.filterApplyNone')
            : t('home.filterApplyCount', { count: matchCount })
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

export default CalendarFiltersSheet;
