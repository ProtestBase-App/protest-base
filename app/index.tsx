import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { handleNotificationResponse } from '@/services/notifications.service';
import { parseEventDeepLink } from '@/utils/deepLinkValidation';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { logger } from '@/utils/logger';

export default function Index() {
  const { loading, eventsLoading } = useGlobalContext();
  const { loading: savedEventsLoading } = useSavedEvents();
  const { loading: postalCodesLoading } = usePostalCodes();
  const notificationHandledRef = useRef(false);

  // When the warm listener routes a tap by PUSHING over this splash, this
  // route stays mounted underneath with its redirect already consumed —
  // backing into it would strand the user on a dead loader. Redirect on
  // refocus instead.
  useFocusEffect(
    useCallback(() => {
      if (notificationHandledRef.current) {
        router.replace(Routes.EXPLORE);
      }
    }, [])
  );

  useEffect(() => {
    const redirect = async () => {
      // Launch-by-notification-tap takes precedence over deep links: the
      // warm-app listener misses it on launch-by-tap (both platforms), so
      // the cold-start path reads it here; the handler's dedupe avoids
      // double-routing if both ran.
      const notificationResponse = Notifications.getLastNotificationResponse();
      if (notificationResponse && handleNotificationResponse(notificationResponse, 'replace')) {
        Notifications.clearLastNotificationResponse();
        notificationHandledRef.current = true;
        return;
      }

      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        const { isValid, eventId, error } = parseEventDeepLink(initialUrl);

        if (isValid && eventId) {
          router.replace(DynamicRoutes.event(eventId));
          return;
        }

        logger.warn('[Security] Invalid deep link attempt:', {
          url: initialUrl,
          error,
          timestamp: new Date().toISOString(),
        });
      }

      router.replace(Routes.EXPLORE);
    };

    const allDataLoaded = !loading && !eventsLoading && !savedEventsLoading && !postalCodesLoading;
    if (allDataLoaded) {
      redirect();
    }
  }, [loading, eventsLoading, savedEventsLoading, postalCodesLoading]);

  return (
    <ThemedView style={styles.splashContainer}>
      <BrandLoader />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
