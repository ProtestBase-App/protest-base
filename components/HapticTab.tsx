import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { PlatformPressable } from 'expo-router/react-navigation';
import * as Haptics from 'expo-haptics';
import { logger } from '@/utils/logger';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
            logger.debug('[HapticTab] Haptic feedback failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
