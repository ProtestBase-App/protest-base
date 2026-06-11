import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import HomeViewToggle from '@/components/HomeViewToggle';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography, Spacing } from '@/constants/DesignTokens';
import { getMonthName } from '@/utils/calendarUtils';
import { t } from '@/utils/i18n';
import type { HomeViewMode } from '@/hooks/useHomeViewPreference';

export interface CalendarHeaderProps {
  /** Currently displayed year */
  year: number;
  /** Currently displayed month (0-based) */
  month: number;
  /** User language for localized month name */
  userLanguage: string;
  viewMode: HomeViewMode;
  onChangeViewMode: (mode: HomeViewMode) => void;
  /** Hides the "Today" chip when the visible month/day is already today */
  isOnToday: boolean;
  onGoToToday: () => void;
  /** Opens the month picker */
  onOpenPicker: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

export default function CalendarHeader({
  year,
  month,
  userLanguage,
  viewMode,
  onChangeViewMode,
  isOnToday,
  onGoToToday,
  onOpenPicker,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  activeFilterCount,
  onOpenFilters,
}: CalendarHeaderProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const monthName = getMonthName(month, userLanguage);
  const filtersActive = activeFilterCount > 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={onOpenPicker}
          style={({ pressed }) => [styles.monthButton, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`${monthName} ${year}, open month picker`}
        >
          <ThemedText style={[styles.monthText, { color: themeColors.text }]} numberOfLines={1}>
            {monthName}
          </ThemedText>
          <ThemedText style={[styles.yearText, { color: themeColors.placeholder }]}>
            {year}
          </ThemedText>
        </Pressable>

        {!isOnToday && (
          <Pressable
            onPress={onGoToToday}
            style={({ pressed }) => [
              styles.todayChip,
              { borderColor: themeColors.cardBorder },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <ThemedText style={[styles.todayText, { color: themeColors.secondaryText }]}>
              {t('filters.today')}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.filterButton,
            filtersActive
              ? {
                  backgroundColor: themeColors.categoryBadgeBg,
                  borderColor: 'rgba(249, 68, 96, 0.5)',
                }
              : {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('home.openFilters')}
        >
          <IconSymbol
            name="slider.horizontal.3"
            size={17}
            color={filtersActive ? themeColors.tint : themeColors.secondaryText}
          />
          {filtersActive && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: themeColors.tint, borderColor: themeColors.background },
              ]}
            >
              <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <HomeViewToggle value={viewMode} onChange={onChangeViewMode} />
        <View style={styles.spacer} />
        <View style={styles.chevronGroup}>
          <Pressable
            onPress={onPrevMonth}
            disabled={!canGoPrev}
            style={({ pressed }) => [
              styles.chevronButton,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
              !canGoPrev && { opacity: 0.4 },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home.previousMonth')}
          >
            <IconSymbol name="chevron.left" size={15} color={themeColors.secondaryText} />
          </Pressable>
          <Pressable
            onPress={onNextMonth}
            style={({ pressed }) => [
              styles.chevronButton,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home.nextMonth')}
          >
            <IconSymbol name="chevron.right" size={15} color={themeColors.secondaryText} />
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  monthButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  monthText: {
    fontFamily: Typography.families.extraBold,
    fontSize: 28,
    // Default ThemedText lineHeight (24) clips 28px ascenders — pin to ~1.25×.
    lineHeight: 35,
    flexShrink: 1,
  },
  yearText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.base,
  },
  todayChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
  },
  todayText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontFamily: Typography.families.extraBold,
    fontSize: Typography.sizes.xxs,
    lineHeight: 12,
  },
  bottomRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
    minWidth: Spacing.sm,
  },
  chevronGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
