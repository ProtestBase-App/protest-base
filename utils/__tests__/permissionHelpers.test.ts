/**
 * Tests for permissionHelpers utility functions
 */

import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { logger } from '../logger';

// Mock dependencies
jest.mock('expo-image-picker');
jest.mock('expo-calendar');
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
}));
jest.mock('../logger');

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Import after mocks
import {
  getPhotoLibraryReadStatus,
  getCalendarStatus,
  getNotificationsStatus,
  getAllPermissionStatuses,
  openAppSettings,
  PermissionStatus,
} from '../permissionHelpers';

// Default notification permission mock; individual tests override as needed.
function mockNotificationPermission(
  overrides: Partial<Notifications.NotificationPermissionsStatus>
): void {
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    status: Notifications.PermissionStatus.UNDETERMINED,
    granted: false,
    canAskAgain: true,
    expires: 'never',
    ...overrides,
  } as Notifications.NotificationPermissionsStatus);
}

describe('permissionHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPhotoLibraryReadStatus', () => {
    it('should return "granted" when permission is granted', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      const result = await getPhotoLibraryReadStatus();
      expect(result).toBe('granted');
    });

    it('should return "denied" when permission is denied', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      const result = await getPhotoLibraryReadStatus();
      expect(result).toBe('denied');
    });

    it('should return "undetermined" when permission has not been requested', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      const result = await getPhotoLibraryReadStatus();
      expect(result).toBe('undetermined');
    });

    it('should return "undetermined" and log error when permission check fails', async () => {
      const testError = new Error('Permission check failed');
      mockImagePicker.getMediaLibraryPermissionsAsync.mockRejectedValue(testError);

      const result = await getPhotoLibraryReadStatus();

      expect(result).toBe('undetermined');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to get photo library read permission status',
        { error: 'Permission check failed' }
      );
    });

    it('should return "notUsed" on Android since the system picker does not need permissions', async () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      const result = await getPhotoLibraryReadStatus();

      expect(result).toBe('notUsed');
      expect(mockImagePicker.getMediaLibraryPermissionsAsync).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    });
  });

  describe('getCalendarStatus', () => {
    it('should return "granted" when permission is granted', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Calendar.PermissionResponse);

      const result = await getCalendarStatus();
      expect(result).toBe('granted');
    });

    it('should return "denied" when permission is denied', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: false,
        expires: 'never',
      } as Calendar.PermissionResponse);

      const result = await getCalendarStatus();
      expect(result).toBe('denied');
    });

    it('should return "undetermined" when permission has not been requested', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Calendar.PermissionResponse);

      const result = await getCalendarStatus();
      expect(result).toBe('undetermined');
    });

    it('should return "undetermined" and log error when permission check fails', async () => {
      const testError = new Error('Calendar error');
      mockCalendar.getCalendarPermissionsAsync.mockRejectedValue(testError);

      const result = await getCalendarStatus();

      expect(result).toBe('undetermined');
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get calendar permission status', {
        error: 'Calendar error',
      });
    });
  });

  describe('getNotificationsStatus', () => {
    it('should return "granted" when notifications are granted', async () => {
      mockNotificationPermission({ status: Notifications.PermissionStatus.GRANTED, granted: true });

      const result = await getNotificationsStatus();
      expect(result).toBe('granted');
    });

    it('should treat iOS provisional authorization as "granted"', async () => {
      mockNotificationPermission({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
      } as Partial<Notifications.NotificationPermissionsStatus>);

      const result = await getNotificationsStatus();
      expect(result).toBe('granted');
    });

    it('should return "undetermined" when notifications have not been requested', async () => {
      mockNotificationPermission({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
      });

      const result = await getNotificationsStatus();
      expect(result).toBe('undetermined');
    });

    it('should return "denied" when notifications are explicitly denied', async () => {
      mockNotificationPermission({ status: Notifications.PermissionStatus.DENIED, granted: false });

      const result = await getNotificationsStatus();
      expect(result).toBe('denied');
    });

    it('should return "undetermined" and log error when permission check fails', async () => {
      const testError = new Error('Notifications error');
      mockNotifications.getPermissionsAsync.mockRejectedValue(testError);

      const result = await getNotificationsStatus();

      expect(result).toBe('undetermined');
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get notification permission status', {
        error: 'Notifications error',
      });
    });
  });

  describe('getAllPermissionStatuses', () => {
    it('should return all permission statuses', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Calendar.PermissionResponse);

      mockNotificationPermission({ status: Notifications.PermissionStatus.GRANTED, granted: true });

      const result = await getAllPermissionStatuses();

      expect(result).toEqual({
        photoLibraryRead: 'granted',
        calendar: 'undetermined',
        notifications: 'granted',
      });
    });

    it('should fetch all permissions in parallel', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      } as Calendar.PermissionResponse);

      mockNotificationPermission({ status: Notifications.PermissionStatus.GRANTED, granted: true });

      await getAllPermissionStatuses();

      // Verify all permission checks were called
      expect(mockImagePicker.getMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockCalendar.getCalendarPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return notUsed for photo library on Android', async () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as Calendar.PermissionResponse);

      mockNotificationPermission({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
      });

      const result = await getAllPermissionStatuses();

      expect(result).toEqual({
        photoLibraryRead: 'notUsed',
        calendar: 'undetermined',
        notifications: 'undetermined',
      });
      expect(mockImagePicker.getMediaLibraryPermissionsAsync).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    });
  });

  describe('openAppSettings', () => {
    it('should call Linking.openSettings', () => {
      const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockImplementation();

      openAppSettings();

      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
      openSettingsSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle unknown status values gracefully', async () => {
      // Simulate an unknown status value that might come from a future API version
      mockImagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'some_future_status' as any,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      } as ImagePicker.MediaLibraryPermissionResponse);

      const result = await getPhotoLibraryReadStatus();
      expect(result).toBe('undetermined');
    });

    it('should handle non-Error objects in catch block', async () => {
      mockImagePicker.getMediaLibraryPermissionsAsync.mockRejectedValue('string error');

      const result = await getPhotoLibraryReadStatus();

      expect(result).toBe('undetermined');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to get photo library read permission status',
        { error: 'string error' }
      );
    });
  });
});
