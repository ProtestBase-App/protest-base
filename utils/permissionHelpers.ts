/**
 * Permission Helpers
 *
 * Utilities for checking permission status without prompting the user.
 * Used primarily in the Privacy Center to display current permission states.
 */

import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { logger } from '@/utils/logger';

/**
 * Permission status types
 * - granted: User has allowed this permission (includes 'limited' on iOS 14+)
 * - denied: User has explicitly denied this permission
 * - undetermined: Permission has never been requested
 * - notUsed: Permission is not used by the app (for transparency display)
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'notUsed';

/**
 * Get photo library read permission status without prompting
 * Used when adding images to events via ImagePicker
 *
 * On Android, the system photo picker handles media access without requiring
 * a runtime permission, so getMediaLibraryPermissionsAsync() misleadingly
 * returns 'granted' on fresh installs. We return 'notUsed' on Android since
 * no real OS-level permission is involved.
 */
export async function getPhotoLibraryReadStatus(): Promise<PermissionStatus> {
  try {
    if (Platform.OS === 'android') {
      return 'notUsed';
    }
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return mapPermissionStatus(status);
  } catch (error) {
    logger.warn('Failed to get photo library read permission status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 'undetermined';
  }
}

/**
 * Get calendar permission status without prompting
 * Used when adding events to the device calendar
 */
export async function getCalendarStatus(): Promise<PermissionStatus> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return mapPermissionStatus(status);
  } catch (error) {
    logger.warn('Failed to get calendar permission status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 'undetermined';
  }
}

/**
 * Get notification permission status without prompting
 * Used for day-of saved-event reminders.
 *
 * Notifications are a real OS-level permission on both iOS and Android
 * (Android 13+ requires runtime POST_NOTIFICATIONS), so this is shown on
 * both platforms. The permission object has a different shape than
 * ImagePicker/Calendar, so it gets its own mapping. iOS provisional
 * authorization delivers quietly and is treated as 'granted', matching
 * hooks/useNotificationPermissionStatus.ts.
 */
export async function getNotificationsStatus(): Promise<PermissionStatus> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) {
      return 'granted';
    }
    if (settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return 'granted';
    }
    if (settings.status === Notifications.PermissionStatus.UNDETERMINED) {
      return 'undetermined';
    }
    return 'denied';
  } catch (error) {
    logger.warn('Failed to get notification permission status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 'undetermined';
  }
}

/**
 * Open the app's settings page
 * Allows users to modify permissions from within the app
 */
export function openAppSettings(): void {
  Linking.openSettings();
}

/**
 * Map expo permission status to our simplified status type
 * Note: 'limited' status (iOS 14+ photo library) is treated as 'granted'
 * since the user has given some level of access
 */
function mapPermissionStatus(
  status: ImagePicker.PermissionStatus | Calendar.PermissionStatus
): PermissionStatus {
  // Use enum values for type-safe comparison
  switch (status) {
    case ImagePicker.PermissionStatus.GRANTED:
      return 'granted';
    case ImagePicker.PermissionStatus.DENIED:
      return 'denied';
    case ImagePicker.PermissionStatus.UNDETERMINED:
      return 'undetermined';
    default:
      // Handle 'limited' status (iOS 14+ photo library)
      // iOS 14+ can return 'limited' as a string value for partial photo access
      // This isn't in the TypeScript enum, so we compare the string representation
      if (String(status) === 'limited') {
        return 'granted';
      }
      return 'undetermined';
  }
}

/**
 * Check all permissions at once
 * Useful for the Privacy Center screen to display all statuses
 */
export async function getAllPermissionStatuses(): Promise<{
  photoLibraryRead: PermissionStatus;
  calendar: PermissionStatus;
  notifications: PermissionStatus;
}> {
  const [photoLibraryRead, calendar, notifications] = await Promise.all([
    getPhotoLibraryReadStatus(),
    getCalendarStatus(),
    getNotificationsStatus(),
  ]);

  return {
    photoLibraryRead,
    calendar,
    notifications,
  };
}
