import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Teardrop map pin rendered inside a MapLibre `Marker`.
 *
 * Geometry mirrors the design handoff: a 30×30 rounded square (one sharp
 * corner) rotated −45° so the point faces down, with a white core dot.
 * Selection scales the pin 1.3× around its tip with a springy ease and adds
 * a tinted halo ring behind the body.
 */

export const PIN_WIDTH = 36;
export const PIN_HEIGHT = 46;

/**
 * The visual tip of the rotated teardrop sits at y ≈ 38.2 inside the 36×46
 * footprint (body center 17 + half-diagonal 15√2). Markers should anchor at
 * "bottom" with an offset of [0, PIN_HEIGHT - PIN_TIP_Y] so the tip — not the
 * footprint bottom — marks the spot.
 */
export const PIN_TIP_Y = 17 + 15 * Math.SQRT2;

/** Tip offset from the footprint center — keeps the tip fixed while scaling. */
const TIP_OFFSET_FROM_CENTER = PIN_TIP_Y - PIN_HEIGHT / 2;
const SELECTED_SCALE = 1.3;

export interface MapEventPinProps {
  /** Category color filling the teardrop. */
  color: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

function MapEventPin({ color, selected, onPress, accessibilityLabel, testID }: MapEventPinProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: 180,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  }, [selected, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + (SELECTED_SCALE - 1) * progress.value;
    return {
      transform: [{ translateY: -TIP_OFFSET_FROM_CENTER * (scale - 1) }, { scale }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      testID={testID}
      hitSlop={4}
    >
      <Animated.View style={[styles.footprint, animatedStyle]}>
        <View style={[styles.halo, selected && { backgroundColor: `${color}55` }]}>
          <View
            style={[
              styles.body,
              {
                backgroundColor: color,
                borderColor: selected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            <View style={styles.core} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footprint: {
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
    alignItems: 'center',
  },
  // 3pt selection ring around the body; transparent when idle so the body
  // geometry (and the tip position) never shifts.
  halo: {
    position: 'absolute',
    top: -1,
    width: 36,
    height: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: 30,
    height: 30,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    borderBottomLeftRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  // The core is a circle, so no counter-rotation is needed.
  core: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
});

export default memo(MapEventPin);
