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
import { Typography, Spacing, BorderRadius } from '@/constants/DesignTokens';
import { generateCalendarGrid, getDayHeaders, CalendarDay } from '@/utils/calendarUtils';

const SWIPE_THRESHOLD = 50;
const ANIMATION_DURATION = 250;

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDateKey: string;
  eventDateKeys: Set<string>;
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
  eventDateKeys,
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
        <View style={styles.weekNumCell} />
        {dayHeaders.map((label, i) => (
          <View key={i} style={styles.dayHeaderCell}>
            <ThemedText
              style={[styles.dayHeaderText, i === 6 && { color: themeColors.calendarAccent }]}
            >
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <Animated.View style={animatedStyle}>
        {weeks.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            <View style={styles.weekNumCell}>
              <ThemedText style={[styles.weekNumText, { color: themeColors.subtleText }]}>
                {week.weekNumber}
              </ThemedText>
            </View>

            {week.days.map((day, dayIdx) => {
              const isSelected = day.dateKey === selectedDateKey;
              const hasEvents = eventDateKeys.has(day.dateKey);

              return (
                <Pressable
                  key={dayIdx}
                  style={styles.dayCell}
                  onPress={() => !day.isPast && onSelectDay(day)}
                  disabled={day.isPast}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.date.toDateString()}${
                    hasEvents ? ', has events' : ''
                  }`}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      day.isToday && { backgroundColor: themeColors.calendarAccent },
                      isSelected &&
                        !day.isToday &&
                        !day.isPast && {
                          backgroundColor: themeColors.badgeBg,
                        },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        !day.isCurrentMonth && { color: themeColors.subtleText, opacity: 0.5 },
                        day.isCurrentMonth && !day.isPast && { color: themeColors.text },
                        day.isPast && { color: themeColors.subtleText, opacity: 0.3 },
                        day.isToday && { color: 'white' },
                      ]}
                    >
                      {day.day}
                    </ThemedText>
                  </View>
                  {hasEvents && (
                    <View
                      style={[
                        styles.eventDot,
                        {
                          backgroundColor: day.isToday ? 'white' : themeColors.calendarDotDefault,
                        },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  weekNumCell: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  weekNumText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xxs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
