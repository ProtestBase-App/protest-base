import React, { useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ActionPill } from '@/components/ui/ActionPill';
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
import { shareEventWithAlert } from '@/utils/shareHelpers';
import { ThemeColors, getThemeColors } from '@/utils/themeColors';
import { getStartsIn } from '@/utils/upcomingTimelineUtils';

/** Design: card width 330 with the next card peeking; 16 left pad + 10 gap. */
const CAROUSEL_CARD_GAP = 10;
const CAROUSEL_PEEK = 37;

export interface UpcomingNextUpProps {
  /** The soonest not-yet-started event(s); 2+ render as a swipeable carousel. */
  events: Event[];
  /** Render-stable clock value from the screen's last data refresh. */
  now: Date;
  userLanguage: string;
}

interface NextUpCardProps {
  event: Event;
  width: number | '100%';
  userLanguage: string;
  themeColors: ThemeColors;
}

function NextUpCard({ event, width, userLanguage, themeColors }: NextUpCardProps) {
  const { getSubMunicipalityName } = usePostalCodes();
  const categoryColors = getCategoryColors(event.categories?.[0]);

  const cityLabel =
    event.postal_code && event.country
      ? getSubMunicipalityName(String(event.postal_code), event.country, event.city)
      : event.city || '';

  const viewCount = event.view_count ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          width,
          backgroundColor: themeColors.surfaceAltBackground,
          borderColor: categoryColors.border,
        },
      ]}
    >
      <Pressable
        onPress={() => router.push(DynamicRoutes.event(event.$id))}
        accessibilityRole="button"
        accessibilityLabel={event.title}
        style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.categoryTile,
            { backgroundColor: categoryColors.bg, borderColor: categoryColors.border },
          ]}
        >
          <View style={[styles.categoryDot, { backgroundColor: categoryColors.color }]} />
        </View>

        <View style={styles.cardInfo}>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </ThemedText>
          <View style={styles.cardMetaRow}>
            <ThemedText
              style={[styles.cardMeta, { color: themeColors.secondaryText }]}
              numberOfLines={1}
            >
              {formatEventTime24h(event.start_time)}
              {cityLabel ? ` · ${cityLabel}` : ' ·'}
            </ThemedText>
            {!cityLabel && (
              <Pressable
                onPress={() => router.push(DynamicRoutes.eventEdit(event.$id))}
                accessibilityRole="button"
                accessibilityLabel={t('myEvents.addLocation')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <ThemedText style={[styles.addLocation, { color: themeColors.tint }]}>
                  {` + ${t('myEvents.addLocation')}`}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.actionsRow}>
        <ActionPill
          icon="pencil"
          label={t('common.edit')}
          variant="primary"
          onPress={() => router.push(DynamicRoutes.eventEdit(event.$id))}
        />
        <ActionPill
          icon="square.and.arrow.up"
          label={t('common.share')}
          onPress={() => shareEventWithAlert(event, userLanguage, cityLabel || undefined)}
        />
        <ActionPill
          icon="eye"
          label={t('myEvents.viewsPill', {
            count: viewCount,
            formatted: formatCompactCount(viewCount, userLanguage),
          })}
        />
      </View>
    </View>
  );
}

interface NextUpCarouselProps {
  events: Event[];
  cardWidth: number;
  userLanguage: string;
  themeColors: ThemeColors;
}

/**
 * Swipeable card rail with pager dots. The parent remounts it (keyed by the
 * event ids) whenever the next-up set changes, resetting the scroll offset
 * and active dot together.
 */
function NextUpCarousel({ events, cardWidth, userLanguage, themeColors }: NextUpCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const snapInterval = cardWidth + CAROUSEL_CARD_GAP;

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.min(Math.max(index, 0), events.length - 1));
  };

  return (
    <>
      <FlatList
        horizontal
        data={events}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <NextUpCard
            event={item}
            width={cardWidth}
            userLanguage={userLanguage}
            themeColors={themeColors}
          />
        )}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.carouselContent}
      />
      <View style={styles.dotsRow}>
        {events.map((event, index) => (
          <View
            key={event.$id}
            style={[
              styles.dot,
              index === activeIndex
                ? [styles.dotActive, { backgroundColor: themeColors.tint }]
                : { backgroundColor: themeColors.cardBorder },
            ]}
          />
        ))}
      </View>
    </>
  );
}

/**
 * The Next-Up block at the top of the upcoming timeline: a pink countdown
 * label and the soonest event as a raised card with quick actions. Two or
 * more events with the same start time become a swipeable carousel with
 * pager dots.
 */
export default function UpcomingNextUp({ events, now, userLanguage }: UpcomingNextUpProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { width: windowWidth } = useWindowDimensions();

  if (events.length === 0) return null;

  const isCarousel = events.length > 1;
  const cardWidth = Math.min(330, windowWidth - Spacing.lg - CAROUSEL_CARD_GAP - CAROUSEL_PEEK);

  const startsIn = getStartsIn(events[0].start_time, now);
  const labelDetail = isCarousel
    ? t('myEvents.nextUpSimultaneous', {
        count: events.length,
        time: formatEventTime24h(events[0].start_time),
      })
    : t(`myEvents.startsIn.${startsIn.unit}`, { count: startsIn.value });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <IconSymbol name="clock" size={14} color={themeColors.tint} />
        <ThemedText style={[styles.label, { color: themeColors.tint }]} numberOfLines={1}>
          {`${t('myEvents.nextUp')} · ${labelDetail}`}
        </ThemedText>
      </View>

      {isCarousel ? (
        <NextUpCarousel
          key={events.map((event) => event.$id).join(',')}
          events={events}
          cardWidth={cardWidth}
          userLanguage={userLanguage}
          themeColors={themeColors}
        />
      ) : (
        <View style={styles.singleCardWrapper}>
          <NextUpCard
            event={events[0]}
            width="100%"
            userLanguage={userLanguage}
            themeColors={themeColors}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xs + 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 2,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  label: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: Typography.families.bold,
    letterSpacing: 1.1,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  singleCardWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    gap: CAROUSEL_CARD_GAP,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 15,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 13,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  categoryTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDot: {
    width: 13,
    height: 13,
    borderRadius: BorderRadius.full,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.bold,
    lineHeight: 21,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  addLocation: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 13,
  },
  pressed: {
    opacity: 0.7,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  dotActive: {
    width: 18,
  },
});
