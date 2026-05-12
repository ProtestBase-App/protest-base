import React, { memo } from 'react';
import { ActivityIndicator, ActivityIndicatorProps, StyleSheet, ViewStyle } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { PlacardLoader } from '@/components/ui/loaders/PlacardLoader';

export type LoadingVariant = 'spinner' | 'brand' | 'placard';

interface LoadingStateProps {
  /** Loader style. 'spinner' (default) preserves the ActivityIndicator behaviour. */
  variant?: LoadingVariant;
  /** Color of the activity indicator. Defaults to theme tint color. Ignored for non-spinner variants. */
  color?: string;
  /** Size of the activity indicator. Defaults to 'large'. Ignored for non-spinner variants. */
  size?: ActivityIndicatorProps['size'];
  /** Style overrides for the container */
  containerStyles?: ViewStyle | ViewStyle[];
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Scale multiplier for the BrandLoader/PlacardLoader variants */
  scale?: number;
  /** Test ID forwarded to the root element */
  testID?: string;
}

function LoadingStateComponent({
  variant = 'brand',
  color,
  size = 'large',
  containerStyles,
  accessibilityLabel = 'Loading content',
  scale,
  testID,
}: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const indicatorColor = color ?? Colors[colorScheme ?? 'light'].tint;

  const renderInner = () => {
    if (variant === 'brand') {
      return <BrandLoader color={color} size={scale ? 56 * scale : undefined} testID={testID} />;
    }
    if (variant === 'placard') {
      return <PlacardLoader scale={scale} testID={testID} />;
    }
    return <ActivityIndicator size={size} color={indicatorColor} />;
  };

  return (
    <ThemedView
      style={[styles.container, containerStyles]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID={variant === 'spinner' ? testID : undefined}
    >
      {renderInner()}
    </ThemedView>
  );
}

export const LoadingState = memo(LoadingStateComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
