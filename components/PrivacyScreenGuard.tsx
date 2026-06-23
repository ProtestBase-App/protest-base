import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

import { screenCaptureProtectionEnabled } from '@/utils/featureFlags';
import { logger } from '@/utils/logger';

/**
 * Effect-only global guard applying native screen-capture protection
 * (Android FLAG_SECURE; iOS recording-blank + app-switcher blur) in production.
 * Global rather than per-screen because FLAG_SECURE is window-level and
 * per-screen toggling flashes black on Android focus changes. Renders nothing.
 */
export function PrivacyScreenGuard() {
  useEffect(() => {
    if (!screenCaptureProtectionEnabled()) {
      return;
    }

    let active = true;

    async function enable() {
      try {
        if (!(await ScreenCapture.isAvailableAsync())) {
          return;
        }
        // Unmounted while awaiting availability — bail so we don't enable
        // protection with no matching cleanup.
        if (!active) {
          return;
        }
        await ScreenCapture.preventScreenCaptureAsync();
        if (Platform.OS === 'ios') {
          await ScreenCapture.enableAppSwitcherProtectionAsync();
        }
      } catch (error) {
        logger.warn('[PrivacyScreenGuard] Failed to enable screen-capture protection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    async function disable() {
      try {
        await ScreenCapture.allowScreenCaptureAsync();
        if (Platform.OS === 'ios') {
          await ScreenCapture.disableAppSwitcherProtectionAsync();
        }
      } catch (error) {
        logger.warn('[PrivacyScreenGuard] Failed to disable screen-capture protection', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    enable();

    return () => {
      active = false;
      disable();
    };
  }, []);

  return null;
}
