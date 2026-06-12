import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, View, Pressable, PanResponder, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography, Spacing } from '@/constants/DesignTokens';
import { generateCalendarGrid, getDayHeaders, CalendarDay } from '@/utils/calendarUtils';
import { getCategoryColors } from '@/constants/CategoryColors';
import { eventCategories } from '@/constants/EventCategories';
import { t } from '@/utils/i18n';

const SWIPE_THRESHOLD = 50;
const ANIMATION_DURATION = 250;
const MAX_VISIBLE_DOTS = 3;
const OVERFLOW_VISIBLE_DOTS = 2;

export interface CalendarGridProps {
  year: number;
  month: number;
  selectedDateKey: string;
  /** Belgium-TZ dateKey → ordered dot colors, one per event that day. */
  dayMarkers: Record<string, string[]>;
  showLegend: boolean;
  onSelectDay: (day: CalendarDay) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  userLanguage: string;
}

export default function CalendarGrid({
  year,
  month,
  selectedDateKey,
  dayMarkers,
  showLegend,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  userLanguage,
}: CalendarGridProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { width: screenWidth } = useWindowDimensions();

  const weeks = useMemo(() => generateCalendarGrid(year, month), [year, month]);
  const dayHeaders = useMemo(() => getDayHeaders(userLanguage), [userLanguage]);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Direction of the previous transition so the entering page slides from the correct side.
  const directionRef = useRef<'left' | 'right' | null>(null);

  // Animate in when month/year changes.
  useEffect(() => {
    const dir = directionRef.current;
    if (dir) {
      translateX.value = dir === 'left' ? screenWidth * 0.3 : -screenWidth * 0.3;
      opacity.value = 0;
    }
    translateX.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    directionRef.current = null;
  }, [year, month, translateX, opacity, screenWidth]);

  const animateOut = useCallback(
    (direction: 'left' | 'right', onDone: () => void) => {
      const target = direction === 'left' ? -screenWidth * 0.3 : screenWidth * 0.3;
      directionRef.current = direction;
      opacity.value = withTiming(0, { duration: ANIMATION_DURATION * 0.6 });
      translateX.value = withTiming(
        target,
        { duration: ANIMATION_DURATION, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(onDone)();
          }
        }
      );
    },
    [translateX, opacity, screenWidth]
  );

  // Stable refs so PanResponder callbacks always read the latest values.
  const onPrevMonthRef = useRef(onPrevMonth);
  const onNextMonthRef = useRef(onNextMonth);
  const canGoPrevRef = useRef(canGoPrev);
  const animateOutRef = useRef(animateOut);
  onPrevMonthRef.current = onPrevMonth;
  onNextMonthRef.current = onNextMonth;
  canGoPrevRef.current = canGoPrev;
  animateOutRef.current = animateOut;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD && canGoPrevRef.current) {
          animateOutRef.current('right', () => {
            onPrevMonthRef.current();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          animateOutRef.current('left', () => {
            onNextMonthRef.current();
          });
        }
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <ThemedView style={styles.container} {...panResponder.panHandlers}>
      {/* Day-of-week headers stay fixed; only the grid below animates on swipe. */}
      <View style={styles.headerRow}>
        {dayHeaders.map((label, i) => (
          <View key={i} style={styles.dayHeaderCell}>
            <ThemedText
              style={[
                styles.dayHeaderText,
                { color: i === 6 ? themeColors.tint : themeColors.secondaryText },
              ]}
            >
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <Animated.View style={animatedStyle}>
        {weeks.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            {week.days.map((day, dayIdx) => {
              const isSelected = day.dateKey === selectedDateKey;
              const markerColors = dayMarkers[day.dateKey] ?? [];
              const hasEvents = markerColors.length > 0;
              const showOverflow = markerColors.length > MAX_VISIBLE_DOTS;
              const visibleDotColors = showOverflow
                ? markerColors.slice(0, OVERFLOW_VISIBLE_DOTS)
                : markerColors;

              return (
                <Pressable
                  key={dayIdx}
                  style={styles.dayCell}
                  onPress={() => onSelectDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.date.toDateString()}${
                    hasEvents ? ', has events' : ''
                  }`}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && [
                        styles.dayCircleSelected,
                        { backgroundColor: themeColors.tint, shadowColor: themeColors.tint },
                      ],
                      !isSelected &&
                        day.isToday && [styles.dayCircleToday, { borderColor: themeColors.tint }],
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        isSelected
                          ? styles.dayTextSelected
                          : day.isToday
                            ? [styles.dayTextToday, { color: themeColors.tint }]
                            : !day.isCurrentMonth
                              ? [styles.dayTextOutOfMonth, { color: themeColors.placeholder }]
                              : hasEvents
                                ? [styles.dayTextHasEvents, { color: themeColors.text }]
                                : [styles.dayTextDefault, { color: themeColors.secondaryText }],
                      ]}
                    >
                      {day.day}
                    </ThemedText>
                  </View>
                  <View style={[styles.dotRow, !day.isCurrentMonth && styles.dotRowOutOfMonth]}>
                    {visibleDotColors.map((color, dotIdx) => (
                      <View
                        key={dotIdx}
                        style={[styles.eventDot, { backgroundColor: isSelected ? 'white' : color }]}
                      />
                    ))}
                    {showOverflow && (
                      <ThemedText
                        style={[
                          styles.dotOverflowText,
                          { color: isSelected ? 'white' : themeColors.secondaryText },
                        ]}
                      >
                        {`+${markerColors.length - OVERFLOW_VISIBLE_DOTS}`}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {showLegend && (
        <View style={styles.legendRow}>
          {eventCategories.map(({ value }) => (
            <View key={value} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: getCategoryColors(value).color }]}
              />
              <ThemedText style={[styles.legendLabel, { color: themeColors.placeholder }]}>
                {t(`categories.${value.toLowerCase()}`)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: 14,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 3,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dayCircleToday: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: Typography.sizes.base,
  },
  dayTextSelected: {
    color: 'white',
    fontFamily: Typography.families.bold,
  },
  dayTextToday: {
    fontFamily: Typography.families.bold,
  },
  dayTextOutOfMonth: {
    opacity: 0.45,
    fontFamily: Typography.families.regular,
  },
  dayTextHasEvents: {
    fontFamily: Typography.families.semiBold,
  },
  dayTextDefault: {
    fontFamily: Typography.families.regular,
  },
  dotRow: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dotRowOutOfMonth: {
    opacity: 0.3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotOverflowText: {
    fontSize: 8.5,
    fontFamily: Typography.families.extraBold,
    lineHeight: 10,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: Typography.families.medium,
  },
});
