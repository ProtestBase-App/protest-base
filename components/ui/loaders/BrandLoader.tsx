import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export type BrandLoaderSpeed = 'slow' | 'normal' | 'fast';

export interface BrandLoaderProps {
  size?: number;
  color?: string;
  speed?: BrandLoaderSpeed;
  testID?: string;
}

const DURATION: Record<BrandLoaderSpeed, number> = {
  slow: 1200,
  normal: 900,
  fast: 650,
};

const CHARS = ['!', '?', '!', '!'] as const;
const STAGGER_MS = 100;

export function BrandLoader({
  size = 56,
  color,
  speed = 'normal',
  testID = 'brand-loader',
}: BrandLoaderProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const glyphColor = color ?? themeColors.tint;
  const duration = DURATION[speed];
  const reduceMotion = useReducedMotion();

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [duration, pulse, reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      style={[styles.row, containerStyle]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      {CHARS.map((ch, i) => (
        <Glyph
          key={i}
          char={ch}
          index={i}
          size={size}
          duration={duration}
          color={glyphColor}
          reduceMotion={reduceMotion}
        />
      ))}
    </Animated.View>
  );
}

interface GlyphProps {
  char: string;
  index: number;
  size: number;
  duration: number;
  color: string;
  reduceMotion: boolean;
}

function Glyph({ char, index, size, duration, color, reduceMotion }: GlyphProps) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      y.value = 0;
      return;
    }
    const delay = index * STAGGER_MS;
    const id = setTimeout(() => {
      y.value = withRepeat(
        withSequence(
          withTiming(-size * 0.18, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }, delay);
    return () => clearTimeout(id);
  }, [index, size, duration, y, reduceMotion]);

  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={glyphStyle}>
      <View style={{ width: size * 0.55, alignItems: 'center' }}>
        <Text style={[styles.glyph, { fontSize: size, color }]} allowFontScaling={false}>
          {char}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: Typography.families.black,
    letterSpacing: -1,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
