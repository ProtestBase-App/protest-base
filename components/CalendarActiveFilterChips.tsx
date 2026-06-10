import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import { CalendarFilters, hasActiveCalendarFilters } from '@/utils/calendarTabUtils';

export interface CalendarActiveFilterChipsProps {
  filters: CalendarFilters;
  /** Maps a location token to its display label. */
  resolveLocationLabel: (token: string) => string;
  /** Maps an organization ID to its display name. */
  resolveOrganizationLabel: (id: string) => string;
  onRemoveCategories: () => void;
  onRemoveLocation: (token: string) => void;
  onRemoveOrganization: (id: string) => void;
  onRemoveSavedOnly: () => void;
  onRemoveHelpNeeded: () => void;
}

/**
 * Horizontal summary row of the calendar tab's active filters. Each chip is
 * removable — tapping it clears that filter.
 */
export default function CalendarActiveFilterChips({
  filters,
  resolveLocationLabel,
  resolveOrganizationLabel,
  onRemoveCategories,
  onRemoveLocation,
  onRemoveOrganization,
  onRemoveSavedOnly,
  onRemoveHelpNeeded,
}: CalendarActiveFilterChipsProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  if (!hasActiveCalendarFilters(filters)) {
    return null;
  }

  const categoriesLabel =
    filters.categories.length === 1
      ? t('categories.' + filters.categories[0].toLowerCase())
      : t('home.typesCount', { count: filters.categories.length });

  return (
    <Animated.View entering={FadeIn.duration(280)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {filters.categories.length > 0 && (
          <FilterChip
            small
            active
            removable
            label={categoriesLabel}
            accessibilityLabel={`Remove ${categoriesLabel}`}
            onPress={onRemoveCategories}
          />
        )}
        {filters.locations.map((token) => (
          <FilterChip
            key={token}
            small
            active
            removable
            label={resolveLocationLabel(token)}
            accessibilityLabel={`Remove ${resolveLocationLabel(token)}`}
            onPress={() => onRemoveLocation(token)}
            leading={<IconSymbol name="mappin.and.ellipse" size={11} color={themeColors.tint} />}
          />
        ))}
        {filters.organizations.map((id) => (
          <FilterChip
            key={id}
            small
            active
            removable
            label={resolveOrganizationLabel(id)}
            accessibilityLabel={`Remove ${resolveOrganizationLabel(id)}`}
            onPress={() => onRemoveOrganization(id)}
            leading={<IconSymbol name="person" size={11} color={themeColors.tint} />}
          />
        ))}
        {filters.savedOnly && (
          <FilterChip
            small
            active
            removable
            label={t('home.savedChip')}
            accessibilityLabel={`Remove ${t('home.savedChip')}`}
            onPress={onRemoveSavedOnly}
            leading={<IconSymbol name="bookmark.fill" size={11} color={themeColors.tint} />}
          />
        )}
        {filters.helpNeeded && (
          <FilterChip
            small
            active
            removable
            label={t('createEvent.helpNeeded')}
            accessibilityLabel={`Remove ${t('createEvent.helpNeeded')}`}
            onPress={onRemoveHelpNeeded}
            activeColor={themeColors.warning}
            activeBackground={themeColors.warningBg}
            leading={<IconSymbol name="hand.raised.fill" size={11} color={themeColors.warning} />}
          />
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: Spacing.md,
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.lg,
  },
});
