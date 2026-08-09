import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastProps {
  /** Nothing renders when false. */
  visible: boolean;
  title: string;
  helper?: string;
  icon?: IconSymbolName;
  /** Tint for the icon; defaults to the theme's secondary text. */
  iconColor?: string;
  /** Trailing action (e.g. Undo). */
  action?: ToastAction;
  /**
   * Auto-dismiss delay in ms. Also drives the draining progress line, which is
   * only shown when this is set — the line is a countdown, so a toast without a
   * deadline must not pretend to have one.
   */
  durationMs?: number;
  /** Fired when `durationMs` elapses. */
  onTimeout?: () => void;
  /** Distance from the bottom of the screen. */
  bottom?: number;
  testID?: string;
}

/**
 * Floating blurred toast used for reversible outcomes — a deleted draft with an
 * Undo, or a neutral "already published elsewhere" notice. Deliberately not an
 * Alert: these report something that already happened and must not block, and
 * an Alert cannot carry an inline Undo.
 *
 * The countdown is owned by the CALLER (it also owns the pending work being
 * counted down); this component only reports the deadline via `onTimeout` and
 * animates the line. That keeps the timer alive across re-renders and lets the
 * caller flush its pending work on unmount.
 */
export function Toast({
  visible,
  title,
  helper,
  icon,
  iconColor,
  action,
  durationMs,
  onTimeout,
  bottom = 112,
  testID,
}: ToastProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  // Latest-ref so restarting the timer doesn't depend on the callback identity.
  const onTimeoutRef = React.useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    if (!visible || !durationMs) return;
    const id = setTimeout(() => onTimeoutRef.current?.(), durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, title]);

  // Countdown line. Restarts whenever the toast content changes, so a
  // replacement toast doesn't inherit the previous one's progress.
  const progress = useSharedValue(1);
  useEffect(() => {
    if (!visible || !durationMs) return;
    progress.value = 1;
    progress.value = withTiming(0, { duration: durationMs, easing: Easing.linear });
  }, [visible, durationMs, title, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value, 0) * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      style={[
        styles.container,
        {
          bottom,
          borderColor: themeColors.cardBorder,
          shadowOpacity: isDark ? 0.45 : 0.16,
        },
      ]}
      testID={testID}
      accessibilityLiveRegion="polite"
    >
      <BlurView
        intensity={22}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blur,
          { backgroundColor: isDark ? 'rgba(37,37,55,0.96)' : 'rgba(255,255,255,0.96)' },
        ]}
      >
        {icon && (
          <IconSymbol name={icon} size={19} color={iconColor ?? themeColors.secondaryText} />
        )}

        <View style={styles.copy}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          {!!helper && (
            <ThemedText style={[styles.helper, { color: themeColors.secondaryText }]}>
              {helper}
            </ThemedText>
          )}
        </View>

        {action && (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={testID ? `${testID}-action` : undefined}
          >
            <ThemedText style={[styles.actionLabel, { color: themeColors.tint }]}>
              {action.label.toUpperCase()}
            </ThemedText>
          </Pressable>
        )}
      </BlurView>

      {!!durationMs && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: themeColors.tint }, progressStyle]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.xl - 4,
    right: Spacing.xl - 4,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 17,
  },
  helper: {
    fontSize: 11,
    fontFamily: Typography.families.regular,
    lineHeight: 15,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: Typography.families.bold,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
});

export default Toast;
