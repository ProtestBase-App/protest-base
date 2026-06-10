import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { logger } from '@/utils/logger';

interface NotificationPermissionState {
  permissionStatus: Notifications.NotificationPermissionsStatus | null;
  /**
   * True only for an explicit denial. Undetermined (never asked) is not
   * denied — the contextual first-save prompt covers that case — and iOS
   * provisional authorization delivers quietly, so it counts as granted.
   */
  isDenied: boolean;
}

/**
 * Live notification-permission status: checked on mount and re-checked every
 * time the app returns to the foreground, since the user may toggle the
 * permission in system settings at any moment.
 */
export function useNotificationPermissionStatus(): NotificationPermissionState {
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      try {
        const status = await Notifications.getPermissionsAsync();
        if (isMounted) {
          // Keep the previous object when nothing meaningful changed, so
          // consumers don't re-render on every foreground transition.
          setPermissionStatus((prev) =>
            prev &&
            prev.granted === status.granted &&
            prev.status === status.status &&
            prev.ios?.status === status.ios?.status
              ? prev
              : status
          );
        }
      } catch (error) {
        logger.warn('[useNotificationPermissionStatus] Permission check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const isDenied = permissionStatus
    ? !permissionStatus.granted &&
      permissionStatus.status !== Notifications.PermissionStatus.UNDETERMINED &&
      permissionStatus.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
    : false;

  return { permissionStatus, isDenied };
}
