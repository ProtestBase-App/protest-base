import React, { useEffect, useMemo, useState } from 'react';
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
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/DesignTokens';
import { useGlobalContext } from '@/context/GlobalProvider';
import { t } from '@/utils/i18n';
import { resolvePlacardWords } from './placardWords';

export interface PlacardLoaderProps {
  locale?: string;
  words?: string[];
  scale?: number;
  wordDurationMs?: number;
  testID?: string;
}

const STICK_COLOR = '#1F2937';
const SIGN_COLOR = Colors.light.tint;

export function PlacardLoader({
  locale,
  words: wordsProp,
  scale = 1,
  wordDurationMs = 900,
  testID = 'placard-loader',
}: PlacardLoaderProps) {
  const { userLanguage } = useGlobalContext();
  const reduceMotion = useReducedMotion();

  const words = useMemo(() => {
    if (wordsProp && wordsProp.length > 0) return wordsProp;
    return resolvePlacardWords(locale ?? userLanguage);
  }, [locale, userLanguage, wordsProp]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % words.length), wordDurationMs);
    return () => clearInterval(id);
  }, [words, wordDurationMs, reduceMotion]);

  const rot = useSharedValue(reduceMotion ? 0 : -6);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      rot.value = 0;
      lift.value = 0;
      return;
    }
    const opts = { duration: 600, easing: Easing.inOut(Easing.ease) };
    rot.value = withRepeat(withSequence(withTiming(6, opts), withTiming(-6, opts)), -1);
    lift.value = withRepeat(withSequence(withTiming(-5, opts), withTiming(0, opts)), -1);
  }, [lift, rot, reduceMotion]);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${rot.value}deg` }],
  }));

  const word = words[idx];
  const signWidth = word.length <= 4 ? 100 : word.length <= 5 ? 110 : word.length <= 7 ? 130 : 148;
  const fontSize = word.length <= 4 ? 22 : word.length <= 5 ? 20 : word.length <= 7 ? 17 : 15;

  return (
    <View
      style={[styles.box, { transform: [{ scale }] }]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={t('common.loadingCurrentWord', { word })}
    >
      <Animated.View style={[styles.sway, swayStyle]}>
        <View style={styles.stick} />
        <View style={[styles.sign, { width: signWidth }]}>
          <Text style={[styles.word, { fontSize }]} numberOfLines={1} allowFontScaling={false}>
            {word}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 160,
    height: 170,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sway: {
    alignItems: 'center',
    width: 160,
    height: 170,
  },
  stick: {
    width: 5,
    height: 78,
    backgroundColor: STICK_COLOR,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -2.5,
  },
  sign: {
    position: 'absolute',
    top: 0,
    height: 72,
    backgroundColor: SIGN_COLOR,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  word: {
    color: '#FFFFFF',
    fontFamily: Typography.families.black,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});
