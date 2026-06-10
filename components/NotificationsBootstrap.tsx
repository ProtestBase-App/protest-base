import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useGlobalContext } from '@/context/GlobalProvider';
import {
  ensureAndroidNotificationChannel,
  handleNotificationResponse,
  registerNotificationCategories,
} from '@/services/notifications.service';
import { logger } from '@/utils/logger';

/**
 * Invisible bridge component that keeps the notification channel and
 * action-button categories registered in the user's language, and routes
 * notification taps while the app is running. Launch-by-tap (cold start) is
 * handled by app/index.tsx via getLastNotificationResponse(); the handler's
 * dedupe key keeps the two paths from double-routing.
 */
export function NotificationsBootstrap() {
  const { userLanguage } = useGlobalContext();

  useEffect(() => {
    async function setup() {
      try {
        await ensureAndroidNotificationChannel(userLanguage);
        await registerNotificationCategories(userLanguage);
        logger.debug('[NotificationsBootstrap] Channel and categories registered', {
          language: userLanguage,
        });
      } catch (error) {
        logger.warn('[NotificationsBootstrap] Notification setup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    setup();
  }, [userLanguage]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Deliberately NOT clearing the last response here: if this fires while
      // the boot splash is still mounted, app/index.tsx must still observe
      // the response to skip its Explore fallback (the handler's dedupe
      // prevents double-routing); only the cold-start path clears it.
      handleNotificationResponse(response, 'push');
    });
    return () => subscription.remove();
  }, []);

  return null;
}
