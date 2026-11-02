import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DynamicRoutes } from '@/constants/Routes';
import { BorderRadius, IconSizes, Spacing } from '@/constants/DesignTokens';
import { useIsOrganizationMember } from '@/context/UserOrganizationsProvider';
import { useRecurringEventsEnabled } from '@/context/VersionCheckProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

type SeriesBadgeEvent = Pick<Event, 'series_id' | 'organization_id'>;

/**
 * Whether this event gets the badge. It is the organizers' way into the series screen,
 * so only signed-in members of the owning organization see it; for everyone else a
 * date of a series is an ordinary event.
 */
export function useShowsSeriesBadge(event: SeriesBadgeEvent): boolean {
  const enabled = useRecurringEventsEnabled();
  const isMember = useIsOrganizationMember(event.organization_id);
  return enabled && isMember && !!event.series_id;
}

export interface SeriesBadgeProps {
  event: SeriesBadgeEvent;
  /**
   * "Repeats weekly · 14 events". The rule is one request per series, so only the
   * screens that hold it pass this; a card in a list stays on the generic label.
   */
  label?: string;
  testID?: string;
}

/** Marks an event as one date of a recurring series, and opens the series screen. */
export function SeriesBadge({ event, label, testID }: SeriesBadgeProps) {
  const visible = useShowsSeriesBadge(event);
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const seriesId = event.series_id;

  if (!visible || !seriesId) return null;

  return (
    <Pressable
      testID={testID}
      style={[styles.badge, { backgroundColor: themeColors.categoryBadgeBg }]}
      onPress={(e) => {
        // Usually inside a card that opens the event.
        e.stopPropagation();
        router.push(DynamicRoutes.series(seriesId));
      }}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('series.badge.generic')}
      accessibilityHint={t('series.badge.seeAll')}
    >
      <IconSymbol name="repeat" size={IconSizes.xs} color={themeColors.tint} />
      <ThemedText type="categoryBadge" style={{ color: themeColors.tint }}>
        {label ?? t('series.badge.generic')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
