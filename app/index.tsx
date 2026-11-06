import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { clearPendingEnrollment, loadPendingEnrollment } from '@/services/mfa.service';
import { handleNotificationResponse } from '@/services/notifications.service';
import { parseEventDeepLink } from '@/utils/deepLinkValidation';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { logger } from '@/utils/logger';

export default function Index() {
  const { loading, isLogged } = useGlobalContext();
  const { loading: savedEventsLoading } = useSavedEvents();
  const { loading: postalCodesLoading } = usePostalCodes();
  const notificationHandledRef = useRef(false);
  // Read when the redirect runs, so a later sign-in doesn't run the launch redirect again.
  const isLoggedRef = useRef(isLogged);
  useEffect(() => {
    isLoggedRef.current = isLogged;
  });

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

      // An authenticator setup the system interrupted resumes on the sign-in screen, opened over
      // Explore so its back arrow has somewhere to go. This runs on every launch, so a failure
      // here must still land on Explore.
      try {
        const pendingEnrollment = await loadPendingEnrollment();
        if (pendingEnrollment && !isLoggedRef.current) {
          router.replace(Routes.EXPLORE);
          router.push(Routes.SIGN_IN);
          return;
        }
        if (pendingEnrollment) void clearPendingEnrollment();
      } catch (error) {
        logger.warn('[Launch] Pending setup check failed', {
          error: error instanceof Error ? error.name : typeof error,
        });
      }

      router.replace(Routes.EXPLORE);
    };

    // The events cache is intentionally NOT gated here: the landing tab
    // (Explore) fetches its own list, and Home/Maps self-guard against an empty
    // cache with their own splash. Waiting on eventsLoading would block
    // time-to-interactive on a cache the landing screen never reads.
    const allDataLoaded = !loading && !savedEventsLoading && !postalCodesLoading;
    if (allDataLoaded) {
      redirect();
    }
  }, [loading, savedEventsLoading, postalCodesLoading]);

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
