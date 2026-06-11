import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { CalendarDayEntry, formatCompactCount, isEventInProgress } from '@/utils/calendarTabUtils';
import { formatEventTime } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface CalendarEventRowProps {
  entry: CalendarDayEntry;
  /** Belgium-TZ YYYY-MM-DD for today — drives the "in progress" badge. */
  todayKey: string;
  isSaved: boolean;
  /** Parent navigates to the event detail screen. */
  onPress: (eventId: string) => void;
  onToggleSave: (event: Event, currentlySaved: boolean) => void;
  userLanguage: string;
  /** Resolved sub-municipality label; falls back to event.city. */
  cityLabel?: string;
  /** Show the tinted attendee count segment. Default true. */
  showAttendees?: boolean;
  /**
   * Category to surface on the row (icon tint + badge). Defaults to the
   * event's primary category; pass the filter-matched category
   * (`getDisplayCategory`) while category filters are active.
   */
  displayCategory?: string;
}

function CalendarEventRow({
  entry,
  todayKey,
  isSaved,
  onPress,
  onToggleSave,
  userLanguage,
  cityLabel,
  showAttendees = true,
  displayCategory,
}: CalendarEventRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const reducedMotion = useReducedMotion();

  const { event, dayIndex, totalDays } = entry;
  const displayedCategory = displayCategory ?? event.categories?.[0];
  const categoryColors = getCategoryColors(displayedCategory);

  const city = cityLabel || event.city || '';
  const participantCount = event.participant_count ?? 0;
  const showGoing = showAttendees && participantCount > 0;
  const isMultiDay = totalDays > 1;
  const inProgress = isEventInProgress(event, todayKey);

  // "En cours" dot pulse: opacity 1 → 0.3 → 1 over 1.6s, ease-in-out, forever.
  // With Reduce Motion enabled the dot stays static at full opacity.
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (!inProgress || reducedMotion) {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
      return;
    }
    pulseOpacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulseOpacity);
  }, [inProgress, reducedMotion, pulseOpacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const primarySegment = isMultiDay
    ? t('home.dayProgress', { index: dayIndex, total: totalDays })
    : formatEventTime(event.start_time, userLanguage);

  const hasBadges =
    inProgress || event.help_needed === true || Boolean(displayedCategory) || isMultiDay;

  return (
    <Pressable
      onPress={() => onPress(event.$id)}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? themeColors.surfaceAltBackground : themeColors.cardBackground,
          borderColor: themeColors.cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: categoryColors.bg, borderColor: categoryColors.border },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: categoryColors.color }]} />
      </View>

      <View style={styles.middle}>
        <ThemedText style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {event.title}
        </ThemedText>

        <ThemedText
          style={[styles.secondary, { color: themeColors.secondaryText }]}
          numberOfLines={1}
        >
          {primarySegment}
          {city ? ` · ${city}` : ''}
          {showGoing && (
            <>
              {' · '}
              <ThemedText style={[styles.goingCount, { color: themeColors.tint }]}>
                {formatCompactCount(participantCount, userLanguage)}
              </ThemedText>
              <ThemedText style={[styles.secondary, { color: themeColors.secondaryText }]}>
                {' '}
                {t('home.going')}
              </ThemedText>
            </>
          )}
        </ThemedText>

        {hasBadges && (
          <View style={styles.badgeRow}>
            {inProgress && (
              <View
                style={[styles.badge, styles.liveBadge, { backgroundColor: themeColors.liveBg }]}
              >
                <Animated.View
                  style={[styles.liveDot, { backgroundColor: themeColors.live }, pulseStyle]}
                />
                <ThemedText style={[styles.badgeText, { color: themeColors.live }]}>
                  {t('home.inProgressBadge')}
                </ThemedText>
              </View>
            )}
            {event.help_needed && (
              <View
                style={[styles.badge, styles.helpBadge, { backgroundColor: themeColors.warningBg }]}
              >
                <IconSymbol name="hand.raised.fill" size={10} color={themeColors.warning} />
                <ThemedText style={[styles.badgeText, { color: themeColors.warning }]}>
                  {t('createEvent.helpNeeded')}
                </ThemedText>
              </View>
            )}
            {displayedCategory && (
              <View style={[styles.badge, { backgroundColor: categoryColors.badgeBg }]}>
                <ThemedText style={[styles.badgeText, { color: categoryColors.color }]}>
                  {t(`categories.${displayedCategory.toLowerCase()}`)}
                </ThemedText>
              </View>
            )}
            {isMultiDay && (
              <View style={[styles.badge, { backgroundColor: themeColors.badgeBg }]}>
                <ThemedText style={[styles.badgeText, { color: themeColors.secondaryText }]}>
                  {t('home.multiDayBadge', { count: totalDays })}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave(event, isSaved);
        }}
        hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
        style={styles.bookmarkButton}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save event'}
        accessibilityState={{ selected: isSaved }}
      >
        {/* Keyed remount fades the fill/color swap in per the handoff's 0.15s spec. */}
        <Animated.View key={isSaved ? 'saved' : 'unsaved'} entering={FadeIn.duration(150)}>
          <IconSymbol
            name={isSaved ? 'bookmark.fill' : 'bookmark'}
            size={18}
            color={isSaved ? themeColors.tint : themeColors.placeholder}
          />
        </Animated.View>
      </Pressable>
      <IconSymbol name="chevron.right" size={16} color={themeColors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    lineHeight: 20,
  },
  secondary: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  goingCount: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  badge: {
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
  },
  helpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: Typography.families.bold,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  bookmarkButton: {
    padding: Spacing.xs,
  },
});

export default memo(CalendarEventRow, (prevProps, nextProps) => {
  // Compare the event by reference: cache refetches build new Event objects,
  // so reference equality is what detects fresh server data for a row.
  return (
    prevProps.entry.event === nextProps.entry.event &&
    prevProps.entry.dayIndex === nextProps.entry.dayIndex &&
    prevProps.entry.totalDays === nextProps.entry.totalDays &&
    prevProps.todayKey === nextProps.todayKey &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.userLanguage === nextProps.userLanguage &&
    prevProps.cityLabel === nextProps.cityLabel &&
    prevProps.showAttendees === nextProps.showAttendees &&
    prevProps.displayCategory === nextProps.displayCategory &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onToggleSave === nextProps.onToggleSave
  );
});
