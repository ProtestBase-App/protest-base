import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes } from '@/constants/Routes';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { formatCompactCount } from '@/utils/calendarTabUtils';
import { formatEventTime24h } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { getOngoingDayProgress } from '@/utils/upcomingTimelineUtils';

export interface UpcomingTimelineRowProps {
  event: Event;
  /** Render the green NOW treatment (started, not yet ended). */
  ongoing: boolean;
  /** Belgium-TZ YYYY-MM-DD for today — drives "Day x/y" on ongoing rows. */
  todayKey: string;
  userLanguage: string;
}

/**
 * One row of the organizer's upcoming timeline: a 46pt time rail (start time
 * in the category color, or NOW + day progress while ongoing), the title,
 * a location/views meta line and a chevron. The whole row opens the event.
 */
function UpcomingTimelineRow({ event, ongoing, todayKey, userLanguage }: UpcomingTimelineRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { getSubMunicipalityName } = usePostalCodes();

  const categoryColors = getCategoryColors(event.categories?.[0]);
  const railColor = ongoing ? themeColors.live : categoryColors.color;

  const cityLabel =
    event.postal_code && event.country
      ? getSubMunicipalityName(String(event.postal_code), event.country, event.city)
      : event.city || '';

  const dayProgress = ongoing ? getOngoingDayProgress(event, todayKey) : null;

  return (
    <Pressable
      onPress={() => router.push(DynamicRoutes.event(event.$id))}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? themeColors.surfaceAltBackground : themeColors.cardBackground,
          borderColor: ongoing ? themeColors.liveBorder : themeColors.cardBorder,
        },
      ]}
    >
      <View style={styles.timeRail}>
        <ThemedText style={[ongoing ? styles.nowText : styles.timeText, { color: railColor }]}>
          {ongoing ? t('myEvents.nowLabel') : formatEventTime24h(event.start_time)}
        </ThemedText>
        {dayProgress && dayProgress.totalDays > 1 && (
          <ThemedText
            style={[styles.dayProgress, { color: themeColors.subtleText }]}
            numberOfLines={1}
          >
            {t('home.dayProgress', { index: dayProgress.dayIndex, total: dayProgress.totalDays })}
          </ThemedText>
        )}
      </View>

      <View style={[styles.railDivider, { backgroundColor: themeColors.separator }]} />

      <View style={styles.middle}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {event.title}
        </ThemedText>

        <View style={styles.metaRow}>
          {ongoing && (
            <View style={[styles.ongoingChip, { backgroundColor: themeColors.liveBg }]}>
              <View style={[styles.ongoingDot, { backgroundColor: themeColors.live }]} />
              <ThemedText style={[styles.ongoingChipText, { color: themeColors.live }]}>
                {t('home.inProgressBadge')}
              </ThemedText>
            </View>
          )}

          {cityLabel ? (
            <ThemedText
              style={[styles.location, { color: themeColors.secondaryText }]}
              numberOfLines={1}
            >
              {cityLabel}
            </ThemedText>
          ) : (
            <ThemedText
              style={[styles.noLocation, { color: themeColors.subtleText }]}
              numberOfLines={1}
            >
              {t('myEvents.noLocationSet')}
            </ThemedText>
          )}

          <View style={styles.viewsStat}>
            <IconSymbol name="eye" size={13} color={themeColors.subtleText} />
            <ThemedText style={[styles.viewsText, { color: themeColors.subtleText }]}>
              {formatCompactCount(event.view_count ?? 0, userLanguage)}
            </ThemedText>
          </View>
        </View>
      </View>

      <IconSymbol name="chevron.right" size={15} color={themeColors.subtleText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  timeRail: {
    width: 46,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontFamily: Typography.families.bold,
    lineHeight: 20,
  },
  nowText: {
    fontSize: 13.5,
    fontFamily: Typography.families.bold,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  dayProgress: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 1,
  },
  railDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  ongoingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 9,
  },
  ongoingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ongoingChipText: {
    fontSize: 11,
    fontFamily: Typography.families.semiBold,
    lineHeight: 15,
  },
  location: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  noLocation: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  viewsStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  viewsText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.medium,
    lineHeight: 16,
  },
});

export default memo(UpcomingTimelineRow);
