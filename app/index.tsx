import { useEffect } from 'react';
import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useSavedEvents } from '@/context/SavedEventsProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { parseEventDeepLink } from '@/utils/deepLinkValidation';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { logger } from '@/utils/logger';

export default function Index() {
  const { loading, eventsLoading } = useGlobalContext();
  const { loading: savedEventsLoading } = useSavedEvents();
  const { loading: postalCodesLoading } = usePostalCodes();

  useEffect(() => {
    const redirect = async () => {
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
