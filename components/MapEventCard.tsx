import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getPrimaryCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { Event } from '@/types/event.types';
import { formatCompactCount } from '@/utils/calendarTabUtils';
import { formatEventTime } from '@/utils/eventFormatters';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { formatMapCardDateLabel } from '@/utils/mapTabUtils';
import { getThemeColors } from '@/utils/themeColors';

/** Card width from the handoff; the carousel snaps on width + gap. */
export const MAP_CARD_WIDTH = 330;
export const MAP_CARD_GAP = 10;

export interface MapEventCardProps {
  event: Event;
  /** Whether this card is the current selection (centered in the carousel). */
  active: boolean;
  saved: boolean;
  userLanguage: string;
  /** Belgium-TZ YYYY-MM-DD for today, for the "Today" date label. */
  todayKey: string;
  /** Push the event detail screen. */
  onPress: () => void;
  /** Toggle the bookmark; must not trigger navigation. */
  onToggleSave: () => void;
}

function MapEventCard({
  event,
  active,
  saved,
  userLanguage,
  todayKey,
  onPress,
  onToggleSave,
}: MapEventCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const categoryColors = getPrimaryCategoryColors(event.categories);
  const primaryCategory = event.categories?.[0];
  const categoryLabel = primaryCategory ? t('categories.' + primaryCategory.toLowerCase()) : null;

  const dateLabel = formatMapCardDateLabel(event, userLanguage, todayKey, t('maps.today'));
  const timeLabel = formatEventTime(event.start_time, userLanguage);
  const place = event.street_address || event.city || '';
  const secondary = [dateLabel, timeLabel, place].filter(Boolean).join(' · ');

  const attendeeCount = event.participant_count ?? 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={[
        styles.card,
        {
          backgroundColor: themeColors.mapOverlayStrong,
          borderColor: active ? themeColors.mapOverlayBorderActive : themeColors.cardBorder,
          opacity: active ? 1 : 0.82,
        },
      ]}
    >
      <View
        style={[
          styles.categoryContainer,
          { backgroundColor: categoryColors.bg, borderColor: categoryColors.border },
        ]}
      >
        <View style={[styles.categoryDot, { backgroundColor: categoryColors.color }]} />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {event.title}
        </ThemedText>
        <ThemedText
          style={[styles.secondary, { color: themeColors.secondaryText }]}
          numberOfLines={1}
        >
          {secondary}
        </ThemedText>
        <View style={styles.badgeRow}>
          {event.help_needed && (
            <View style={[styles.badge, { backgroundColor: themeColors.warningBg }]}>
              <IconSymbol name="hand.raised.fill" size={10} color={themeColors.warning} />
              <ThemedText style={[styles.badgeText, { color: themeColors.warning }]}>
                {t('createEvent.helpNeeded')}
              </ThemedText>
            </View>
          )}
          {categoryLabel && (
            <View style={[styles.badge, { backgroundColor: categoryColors.badgeBg }]}>
              <ThemedText style={[styles.badgeText, { color: categoryColors.color }]}>
                {categoryLabel}
              </ThemedText>
            </View>
          )}
          {attendeeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: themeColors.badgeBg }]}>
              <ThemedText style={[styles.badgeText, { color: themeColors.secondaryText }]}>
                {formatCompactCount(attendeeCount, userLanguage)} {t('home.going')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={onToggleSave}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={saved ? t('events.saved') : t('events.save')}
        accessibilityState={{ selected: saved }}
        style={styles.saveButton}
      >
        <IconSymbol
          name={saved ? 'bookmark.fill' : 'bookmark'}
          size={18}
          color={saved ? themeColors.tint : themeColors.chevron}
        />
      </Pressable>

      <IconSymbol name="chevron.right" size={16} color={themeColors.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: MAP_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  categoryContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    lineHeight: 21,
  },
  secondary: {
    fontSize: 13,
    fontFamily: Typography.families.regular,
    lineHeight: 18,
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    overflow: 'hidden',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 7,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: Typography.families.bold,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  saveButton: {
    padding: 6,
  },
});

export default memo(MapEventCard, (prev, next) => {
  return (
    prev.event.$id === next.event.$id &&
    prev.active === next.active &&
    prev.saved === next.saved &&
    prev.userLanguage === next.userLanguage &&
    prev.todayKey === next.todayKey
  );
});
