/**
 * Tests for permissionHelpers utility functions
 */

import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import { Linking, Platform } from 'react-native';
import { logger } from '../logger';

// Mock dependencies
jest.mock('expo-image-picker');
jest.mock('expo-calendar');
jest.mock('../logger');

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Import after mocks
import {
  getPhotoLibraryReadStatus,
  getCalendarStatus,
  getAllPermissionStatuses,
  openAppSettings,
  PermissionStatus,
} from '../permissionHelpers';

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

      const result = await getAllPermissionStatuses();

      expect(result).toEqual({
        photoLibraryRead: 'granted',
        calendar: 'undetermined',
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

      await getAllPermissionStatuses();

      // Verify all permission checks were called
      expect(mockImagePicker.getMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockCalendar.getCalendarPermissionsAsync).toHaveBeenCalledTimes(1);
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

      const result = await getAllPermissionStatuses();

      expect(result).toEqual({
        photoLibraryRead: 'notUsed',
        calendar: 'undetermined',
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
