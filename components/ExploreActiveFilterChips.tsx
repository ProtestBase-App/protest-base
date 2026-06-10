import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing } from '@/constants/DesignTokens';
import { ExploreAppliedFilters } from '@/context/ExploreTabProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface ExploreActiveFilterChipsProps {
  filters: ExploreAppliedFilters;
  /** Maps a location token to its display label. */
  resolveLocationLabel: (token: string) => string;
  /** Maps an organization ID to its display name. */
  resolveOrganizationLabel: (id: string) => string;
  onRemoveCategory: () => void;
  onRemoveDate: () => void;
  onRemoveLocation: (token: string) => void;
  onRemoveOrganization: (id: string) => void;
}

/**
 * Horizontal summary row of the explore tab's active filters. Each chip is
 * removable — tapping it clears that filter.
 */
export function ExploreActiveFilterChips({
  filters,
  resolveLocationLabel,
  resolveOrganizationLabel,
  onRemoveCategory,
  onRemoveDate,
  onRemoveLocation,
  onRemoveOrganization,
}: ExploreActiveFilterChipsProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasActiveFilters =
    filters.category !== null ||
    filters.dateFilter !== null ||
    filters.locations.length > 0 ||
    filters.organizations.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(280)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {filters.category !== null && (
          <FilterChip
            small
            active
            removable
            label={t('categories.' + filters.category.toLowerCase())}
            accessibilityLabel={`Remove ${t('categories.' + filters.category.toLowerCase())}`}
            onPress={onRemoveCategory}
          />
        )}
        {filters.dateFilter !== null && (
          <FilterChip
            small
            active
            removable
            label={t('filters.' + filters.dateFilter)}
            accessibilityLabel={`Remove ${t('filters.' + filters.dateFilter)}`}
            onPress={onRemoveDate}
            leading={<IconSymbol name="calendar" size={11} color={themeColors.tint} />}
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

export default ExploreActiveFilterChips;
