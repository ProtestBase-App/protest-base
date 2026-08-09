import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SEARCH_DEBOUNCE_MS } from '@/components/SearchInput';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

/** Client-side status buckets the count chips filter by. */
export type DraftStatusFilter = 'all' | 'ready' | 'pastDate' | 'missing';

export interface DraftStatusCounts {
  all: number;
  ready: number;
  pastDate: number;
  missing: number;
}

export interface DraftListControlsProps {
  /** Seeds the field on mount only — this component owns the typed value. */
  initialSearch?: string;
  /** Fires debounced and trimmed. */
  onSearch: (query: string) => void;
  /** Total drafts, for the placeholder copy. */
  totalCount: number;
  /** True when a sheet filter (category/source) or non-default sort is applied. */
  filtersActive: boolean;
  onOpenFilters: () => void;
  statusFilter: DraftStatusFilter;
  onStatusFilterChange: (next: DraftStatusFilter) => void;
  counts: DraftStatusCounts;
}

/**
 * Drafts list header controls: search field, filter-sheet button, and the status
 * count chips.
 *
 * Pinned above the FlatList rather than living in `ListHeaderComponent` — a
 * header element's identity changes whenever the filters change, which would
 * remount the text field and steal focus mid-typing.
 */
export default function DraftListControls({
  initialSearch,
  onSearch,
  totalCount,
  filtersActive,
  onOpenFilters,
  statusFilter,
  onStatusFilterChange,
  counts,
}: DraftListControlsProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState(initialSearch ?? '');
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const id = setTimeout(() => onSearchRef.current(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const fieldBackground = themeColors.surfaceAltBackground;
  const fieldBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const chips: { value: DraftStatusFilter; label: string; dot?: string }[] = [
    { value: 'all', label: t('drafts.filterAll', { count: counts.all }) },
    {
      value: 'ready',
      label: t('drafts.filterReady', { count: counts.ready }),
      dot: themeColors.live,
    },
    {
      value: 'pastDate',
      label: t('drafts.filterPastDate', { count: counts.pastDate }),
      dot: themeColors.warning,
    },
    { value: 'missing', label: t('drafts.filterNeedsWork', { count: counts.missing }) },
  ];

  return (
    <View>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchField,
            { backgroundColor: fieldBackground, borderColor: fieldBorder },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={19} color={themeColors.subtleText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('drafts.searchPlaceholder', { count: totalCount })}
            placeholderTextColor={themeColors.placeholder}
            style={[styles.searchInput, { color: themeColors.text }]}
            accessibilityLabel={t('drafts.searchPlaceholder', { count: totalCount })}
            returnKeyType="search"
            maxLength={200}
            testID="draft-search-input"
          />
        </View>

        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel={t('filters.title')}
          testID="draft-filters-button"
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor: fieldBackground,
              borderColor: fieldBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <IconSymbol name="slider.horizontal.3" size={20} color={themeColors.text} />
          {filtersActive && (
            <View
              style={[
                styles.activeDot,
                { backgroundColor: themeColors.tint, borderColor: themeColors.background },
              ]}
              testID="draft-filters-active-dot"
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map(({ value, label, dot }) => (
          <FilterChip
            key={value}
            label={label}
            active={statusFilter === value}
            onPress={() => onStatusFilterChange(value)}
            leading={dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : undefined}
            testID={`draft-status-chip-${value}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.xl - 4,
    paddingBottom: Spacing.md,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    paddingHorizontal: 15,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    // Android centers poorly without this; iOS ignores it.
    paddingVertical: 0,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl - 4,
    paddingBottom: Spacing.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
