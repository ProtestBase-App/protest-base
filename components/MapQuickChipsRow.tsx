import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { MapTimeFilter } from '@/utils/mapTabUtils';
import { getThemeColors, ThemeColors } from '@/utils/themeColors';

/**
 * Horizontally scrollable quick-filter chips overlaid on the map, under the
 * header: a single-select time window group, a hairline divider, then the
 * multi-select category chips (shared state with the filter sheet).
 */

// Accent tints for the active time chips (tint #F94460 at handoff alphas);
// theme-independent like the category tints in constants/CategoryColors.ts.
const TIME_CHIP_ACTIVE_BG = 'rgba(249, 68, 96, 0.22)';
const TIME_CHIP_ACTIVE_BORDER = 'rgba(249, 68, 96, 0.5)';

const TIME_OPTIONS: { value: MapTimeFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'maps.timeAll' },
  { value: 'today', labelKey: 'maps.timeToday' },
  { value: 'week', labelKey: 'maps.timeWeek' },
];

interface OverlayChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  themeColors: ThemeColors;
  /** Active border + text color; defaults to the accent time-chip styling. */
  activeColor?: string;
  activeBackground?: string;
  activeTextColor?: string;
  dotColor?: string;
}

function OverlayChip({
  label,
  active,
  onPress,
  themeColors,
  activeColor,
  activeBackground,
  activeTextColor,
  dotColor,
}: OverlayChipProps) {
  const backgroundColor = active
    ? (activeBackground ?? TIME_CHIP_ACTIVE_BG)
    : themeColors.mapOverlay;
  const borderColor = active
    ? (activeColor ?? TIME_CHIP_ACTIVE_BORDER)
    : themeColors.mapOverlayBorder;
  const textColor = active
    ? (activeTextColor ?? activeColor ?? themeColors.mapAccentSoftText)
    : themeColors.mapChipText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor, borderColor, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      <ThemedText style={[styles.chipLabel, { color: textColor }]}>{label}</ThemedText>
    </Pressable>
  );
}

export interface MapQuickChipsRowProps {
  timeFilter: MapTimeFilter;
  onTimeFilterChange: (value: MapTimeFilter) => void;
  /** Selected backend category values (shared with the filter sheet). */
  selectedCategories: string[];
  onToggleCategory: (value: string) => void;
  /** Show the "Near me" sort toggle (only when a home area is set). */
  showNearMe?: boolean;
  nearMeActive?: boolean;
  onToggleNearMe?: () => void;
}

export function MapQuickChipsRow({
  timeFilter,
  onTimeFilterChange,
  selectedCategories,
  onToggleCategory,
  showNearMe = false,
  nearMeActive = false,
  onToggleNearMe,
}: MapQuickChipsRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {showNearMe && onToggleNearMe && (
        <>
          <OverlayChip
            label={t('maps.nearMe')}
            active={nearMeActive}
            onPress={onToggleNearMe}
            themeColors={themeColors}
            activeTextColor={themeColors.mapAccentSoftText}
          />
          <View style={[styles.divider, { backgroundColor: themeColors.mapOverlayBorder }]} />
        </>
      )}

      {TIME_OPTIONS.map((option) => (
        <OverlayChip
          key={option.value}
          label={t(option.labelKey)}
          active={timeFilter === option.value}
          onPress={() => onTimeFilterChange(option.value)}
          themeColors={themeColors}
          activeTextColor={themeColors.mapAccentSoftText}
        />
      ))}

      <View style={[styles.divider, { backgroundColor: themeColors.mapOverlayBorder }]} />

      {eventCategories.map(({ value }) => {
        const categoryColors = getCategoryColors(value);
        return (
          <OverlayChip
            key={value}
            label={t('categories.' + value.toLowerCase())}
            active={selectedCategories.includes(value)}
            onPress={() => onToggleCategory(value)}
            themeColors={themeColors}
            activeColor={categoryColors.color}
            activeBackground={`${categoryColors.color}2E`}
            dotColor={categoryColors.color}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  chipLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
    lineHeight: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  divider: {
    width: 1,
    height: 18,
    marginHorizontal: 3,
  },
});

export default MapQuickChipsRow;
