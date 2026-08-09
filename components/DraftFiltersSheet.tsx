import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  FiltersSheetFooter,
  FiltersSheetSectionLabel,
  FiltersSheetShell,
} from '@/components/FiltersSheetShell';
import { FilterChip } from '@/components/ui/FilterChip';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { EventCreatedVia } from '@/types/event.types';
import { DraftSortKey } from '@/utils/draftStatusUtils';
import { t } from '@/utils/i18n';

export interface DraftFilters {
  /** Canonical backend category value, or null for any. */
  category: string | null;
  /** Draft origin, or null for any. */
  source: EventCreatedVia | null;
  sort: DraftSortKey;
}

export const DEFAULT_DRAFT_FILTERS: DraftFilters = {
  category: null,
  source: null,
  sort: 'lastEdited',
};

export interface DraftFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently applied filters; seeds the draft state each time it opens. */
  filters: DraftFilters;
  onApply: (filters: DraftFilters) => void;
}

const SOURCES: { value: EventCreatedVia; labelKey: string }[] = [
  { value: 'user', labelKey: 'drafts.sourceManual' },
  { value: 'automation', labelKey: 'drafts.sourceAutomation' },
];

const SORTS: { value: DraftSortKey; labelKey: string }[] = [
  { value: 'lastEdited', labelKey: 'drafts.sortLastEdited' },
  { value: 'date', labelKey: 'drafts.sortDate' },
  { value: 'confidence', labelKey: 'drafts.sortConfidence' },
];

/**
 * Drafts filter sheet: category, origin and sort order.
 *
 * Category and source are applied by the backend (`/events/drafts` takes both);
 * sort is applied client-side because the endpoint has a fixed
 * `ORDER BY start_time` and no sort parameter.
 *
 * Edits are staged locally and committed on Apply, matching the calendar and
 * explore sheets — a tap here must not fire a network refetch per chip.
 */
export default function DraftFiltersSheet({
  visible,
  onClose,
  filters,
  onApply,
}: DraftFiltersSheetProps) {
  const [draft, setDraft] = useState<DraftFilters>(filters);

  // Re-seed on open so a dismissed sheet doesn't reopen holding abandoned edits.
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const isDefault =
    draft.category === null && draft.source === null && draft.sort === DEFAULT_DRAFT_FILTERS.sort;

  return (
    <FiltersSheetShell
      visible={visible}
      onClose={onClose}
      title={t('filters.title')}
      testID="draft-filters-sheet"
    >
      <FiltersSheetSectionLabel label={t('filters.category')} />
      <View style={styles.chipRow}>
        {eventCategories.map(({ value }) => {
          const active = draft.category === value;
          const colors = getCategoryColors(value);
          return (
            <FilterChip
              key={value}
              label={t(`categories.${value.toLowerCase()}`)}
              active={active}
              activeColor={colors.color}
              activeBackground={colors.badgeBg}
              onPress={() => setDraft((prev) => ({ ...prev, category: active ? null : value }))}
              testID={`draft-filter-category-${value}`}
            />
          );
        })}
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('drafts.sourceLabel')} />
        <View style={styles.chipRow}>
          {SOURCES.map(({ value, labelKey }) => {
            const active = draft.source === value;
            return (
              <FilterChip
                key={value}
                label={t(labelKey)}
                active={active}
                onPress={() => setDraft((prev) => ({ ...prev, source: active ? null : value }))}
                testID={`draft-filter-source-${value}`}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <FiltersSheetSectionLabel label={t('drafts.sortLabel')} />
        <View style={styles.chipRow}>
          {SORTS.map(({ value, labelKey }) => (
            <FilterChip
              key={value}
              label={t(labelKey)}
              active={draft.sort === value}
              onPress={() => setDraft((prev) => ({ ...prev, sort: value }))}
              testID={`draft-filter-sort-${value}`}
            />
          ))}
        </View>
      </View>

      <FiltersSheetFooter
        onReset={() => setDraft(DEFAULT_DRAFT_FILTERS)}
        resetDisabled={isDefault}
        onApply={() => {
          onApply(draft);
          onClose();
        }}
        applyDisabled={false}
        applyLabel={t('filters.confirmFilters')}
      />
    </FiltersSheetShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
