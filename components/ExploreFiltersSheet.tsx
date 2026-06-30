import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { FilterChip } from '@/components/ui/FilterChip';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { DEFAULT_EXPLORE_FILTERS, ExploreAppliedFilters } from '@/context/ExploreTabProvider';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { EventFilterParams, getEventsBackend } from '@/services/event.service';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

export interface ExploreFiltersSheetProps {
  visible: boolean;
  initialFilters: ExploreAppliedFilters;
  /** Current search text — included in the live result count. */
  searchQuery: string;
  onApply: (filters: ExploreAppliedFilters) => void;
  onClose: () => void;
}

const DATE_PRESETS = [
  { value: 'today', labelKey: 'filters.today' },
  { value: 'tomorrow', labelKey: 'filters.tomorrow' },
  { value: 'thisWeek', labelKey: 'filters.thisWeek' },
  { value: 'thisWeekend', labelKey: 'filters.thisWeekend' },
  { value: 'thisMonth', labelKey: 'filters.thisMonth' },
] as const;

const COUNT_DEBOUNCE_MS = 400;

function isDraftDefault(draft: ExploreAppliedFilters): boolean {
  return (
    draft.category === DEFAULT_EXPLORE_FILTERS.category &&
    draft.dateFilter === DEFAULT_EXPLORE_FILTERS.dateFilter &&
    draft.locations.length === DEFAULT_EXPLORE_FILTERS.locations.length &&
    draft.organizations.length === DEFAULT_EXPLORE_FILTERS.organizations.length
  );
}

/**
 * Bottom-sheet filter editor for the explore tab. Edits a local draft of the
 * filters; changes only propagate on Apply — closing the sheet (scrim tap,
 * close button, back gesture) discards the draft.
 *
 * Unlike the calendar sheet, explore filters server-side, so the live result
 * count for the Apply button comes from a debounced limit-1 backend request.
 */
export function ExploreFiltersSheet({
  visible,
  initialFilters,
  searchQuery,
  onApply,
  onClose,
}: ExploreFiltersSheetProps) {
  const {
    locationFilterOptions,
    resolveLocationLabel,
    expandLocationTokens,
    isLocationSelectionTooBroad,
    loading,
  } = usePostalCodes();
  const { dropdownItems } = useOrganizations();

  const [draft, setDraft] = useState<ExploreAppliedFilters>(initialFilters);

  useEffect(() => {
    if (visible) setDraft(initialFilters);
  }, [visible, initialFilters]);

  const toggleCategory = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, category: prev.category === value ? null : value }));
  }, []);

  const toggleDateFilter = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, dateFilter: prev.dateFilter === value ? null : value }));
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

  // Live result count from the backend; null = unknown/loading (label falls back).
  const [matchCount, setMatchCount] = useState<number | null>(null);
  // Monotonic request id; lets in-flight handlers detect when their result is stale.
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      // Invalidate any in-flight count fetch from the just-closed session and
      // drop the now-meaningless count so reopening starts from the fallback
      // label instead of flashing the discarded draft's count.
      requestIdRef.current++;
      setMatchCount(null);
      return;
    }

    // Invalidate any in-flight count fetch as soon as the inputs change.
    const currentRequestId = ++requestIdRef.current;
    setMatchCount(null);

    // A too-broad selection disables Apply anyway — skip the (potentially huge)
    // token expansion and the request entirely.
    if (isLocationSelectionTooBroad(draft.locations)) return;

    const timer = setTimeout(async () => {
      try {
        const params: EventFilterParams = { limit: 1, offset: 0, includeEnded: false };
        if (draft.dateFilter) {
          params.dateFilter = draft.dateFilter as EventFilterParams['dateFilter'];
        }
        if (draft.locations.length > 0) {
          params.postalCodes = expandLocationTokens(draft.locations).codes;
        }
        if (draft.organizations.length > 0) {
          params.organizers = draft.organizations;
        }
        if (draft.category) {
          params.category = draft.category;
        }
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await getEventsBackend(params);

        // Discard if a newer count request was issued while this one was in flight.
        if (currentRequestId !== requestIdRef.current) return;
        setMatchCount(response.total);
      } catch (error) {
        if (currentRequestId !== requestIdRef.current) return;
        logger.warn('[ExploreFiltersSheet] Count fetch failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, COUNT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [visible, draft, searchQuery, expandLocationTokens, isLocationSelectionTooBroad]);

  const draftIsDefault = isDraftDefault(draft);

  const applyLabel =
    matchCount === null
      ? t('filters.confirmFilters')
      : matchCount === 0
        ? t('home.filterApplyNone')
        : t('home.filterApplyCount', { count: matchCount });

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
            const active = draft.category === value;
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
        <FiltersSheetSectionLabel label={t('filters.date')} />
        <View style={styles.chipRow}>
          {DATE_PRESETS.map(({ value, labelKey }) => (
            <FilterChip
              key={value}
              label={t(labelKey)}
              active={draft.dateFilter === value}
              onPress={() => toggleDateFilter(value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('filters.location')} />
        <SheetSearchMultiSelect
          inBottomSheet
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
          inBottomSheet
          options={organizationOptions}
          selected={draft.organizations}
          onChange={(next) => setDraft((prev) => ({ ...prev, organizations: next }))}
          placeholder={t('filters.searchOrganizations')}
          resolveSelectedLabel={resolveOrganizationLabel}
          leadingIconName="person"
          minSearchLength={0}
        />
      </View>

      <FiltersSheetFooter
        onReset={() => setDraft(DEFAULT_EXPLORE_FILTERS)}
        resetDisabled={draftIsDefault}
        onApply={handleApply}
        applyDisabled={tooBroad}
        applyLabel={applyLabel}
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
});

export default ExploreFiltersSheet;
