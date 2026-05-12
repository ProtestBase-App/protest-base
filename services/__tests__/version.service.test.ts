// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
  setApiPrefix: jest.fn().mockResolvedValue(undefined),
  getApiPrefix: jest.fn().mockReturnValue(''),
  API_BASE_URL: 'http://test',
}));

jest.mock('expo-application', () => {
  // Initialize global store inside factory so it's available when module loads
  (global as any).__versionTestApplication__ = { nativeApplicationVersion: '1.2.0' };
  return (global as any).__versionTestApplication__;
});

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.2.0',
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/services/api';
import { Platform, Linking } from 'react-native';
import { checkAppVersion, openUpdateUrl } from '@/services/version.service';
import { __resetAppVersionCacheForTests } from '@/utils/appVersion';

const mockApi = api as jest.Mocked<typeof api>;

const makeConfigResponse = (overrides = {}) => ({
  data: {
    success: true,
    data: {
      minimumVersion: { ios: '1.0.0', android: '1.0.0' },
      currentVersion: { ios: '1.2.0', android: '1.2.0' },
      updateUrl: {
        ios: 'https://apps.apple.com/app/id123',
        android: 'https://play.google.com/store/apps/id456',
      },
      forceUpdate: false,
      maintenanceMode: false,
      maintenanceMessage: null,
      updateMessage: 'New version available',
      configVersion: 1,
      ...overrides,
    },
  },
});

describe('version.service', () => {
  beforeEach(() => {
    __resetAppVersionCacheForTests();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // checkAppVersion
  // ============================================================
  describe('checkAppVersion', () => {
    describe('happy path - user can proceed', () => {
      it('returns canProceed true when version is up to date', async () => {
        mockApi.get.mockResolvedValueOnce(makeConfigResponse());

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
        expect(result.showMaintenanceScreen).toBe(false);
        expect(result.showBlockingUpdateScreen).toBe(false);
        expect(result.showDismissibleUpdatePrompt).toBe(false);
        expect(mockApi.get).toHaveBeenCalledWith('/app/config');
      });

      it('returns showUpdateBadge true when installed < current but >= minimum', async () => {
        // installed = 1.2.0, minimum = 1.0.0, current = 2.0.0
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            minimumVersion: { ios: '1.0.0', android: '1.0.0' },
            currentVersion: { ios: '2.0.0', android: '2.0.0' },
          })
        );

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
        expect(result.showUpdateBadge).toBe(true);
        expect(result.updateMessage).toBe('New version available');
      });

      it('returns showUpdateBadge false when installed equals current', async () => {
        // installed = 1.2.0, current = 1.2.0
        mockApi.get.mockResolvedValueOnce(makeConfigResponse());

        const result = await checkAppVersion();

        expect(result.showUpdateBadge).toBe(false);
        expect(result.updateMessage).toBeNull();
      });
    });

    describe('maintenance mode', () => {
      it('returns showMaintenanceScreen true when maintenanceMode is enabled', async () => {
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            maintenanceMode: true,
            maintenanceMessage: 'We are under maintenance',
          })
        );

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(false);
        expect(result.showMaintenanceScreen).toBe(true);
        expect(result.maintenanceMessage).toBe('We are under maintenance');
        expect(result.showBlockingUpdateScreen).toBe(false);
      });
    });

    describe('force update', () => {
      it('returns showBlockingUpdateScreen true when installed < minimum and forceUpdate is true', async () => {
        // installed = 1.2.0, minimum = 2.0.0, forceUpdate = true
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            minimumVersion: { ios: '2.0.0', android: '2.0.0' },
            forceUpdate: true,
            updateMessage: 'Update required',
          })
        );

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(false);
        expect(result.showBlockingUpdateScreen).toBe(true);
        expect(result.showDismissibleUpdatePrompt).toBe(false);
        expect(result.updateMessage).toBe('Update required');
        expect(result.updateUrl).toBe('https://apps.apple.com/app/id123');
      });

      it('returns showDismissibleUpdatePrompt true when installed < minimum and forceUpdate is false', async () => {
        // installed = 1.2.0, minimum = 2.0.0, forceUpdate = false
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            minimumVersion: { ios: '2.0.0', android: '2.0.0' },
            forceUpdate: false,
            updateMessage: 'Please update',
          })
        );

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
        expect(result.showDismissibleUpdatePrompt).toBe(true);
        expect(result.showBlockingUpdateScreen).toBe(false);
        expect(result.updateMessage).toBe('Please update');
      });
    });

    describe('fail-open behavior', () => {
      it('returns FAIL_OPEN_RESULT when API call fails', async () => {
        mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
        expect(result.showMaintenanceScreen).toBe(false);
        expect(result.showBlockingUpdateScreen).toBe(false);
        expect(result.showDismissibleUpdatePrompt).toBe(false);
        expect(result.showUpdateBadge).toBe(false);
      });

      it('returns FAIL_OPEN_RESULT when success is false', async () => {
        mockApi.get.mockResolvedValueOnce({
          data: { success: false },
        });

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
        expect(result.showMaintenanceScreen).toBe(false);
      });

      it('returns FAIL_OPEN_RESULT when minimum version is invalid semver', async () => {
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            minimumVersion: { ios: 'not-a-version', android: 'not-a-version' },
          })
        );

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);
      });
    });

    describe('android platform', () => {
      beforeEach(() => {
        (Platform as any).OS = 'android';
      });

      afterEach(() => {
        (Platform as any).OS = 'ios';
      });

      it('uses android versions and updateUrl for android platform', async () => {
        mockApi.get.mockResolvedValueOnce(
          makeConfigResponse({
            minimumVersion: { ios: '2.0.0', android: '2.0.0' },
            forceUpdate: true,
          })
        );

        const result = await checkAppVersion();

        expect(result.showBlockingUpdateScreen).toBe(true);
        expect(result.updateUrl).toBe('https://play.google.com/store/apps/id456');
      });
    });

    describe('unsupported platform', () => {
      it('returns FAIL_OPEN_RESULT for unsupported platforms', async () => {
        (Platform as any).OS = 'web';
        mockApi.get.mockResolvedValueOnce(makeConfigResponse());

        const result = await checkAppVersion();

        expect(result.canProceed).toBe(true);

        // reset
        (Platform as any).OS = 'ios';
      });
    });
  });

  // ============================================================
  // openUpdateUrl
  // ============================================================
  describe('openUpdateUrl', () => {
    it('calls Linking.openURL with the provided URL', () => {
      openUpdateUrl('https://apps.apple.com/app/id123');

      expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id123');
    });

    it('does not call Linking.openURL when url is empty string', () => {
      openUpdateUrl('');

      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('handles Linking.openURL rejection gracefully', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('Cannot open URL'));

      // Should not throw
      expect(() => openUpdateUrl('https://apps.apple.com/app/id123')).not.toThrow();
    });
  });

  // ============================================================
  // Additional branch coverage for getInstalledVersion()
  // ============================================================
  describe('getInstalledVersion() branch coverage', () => {
    afterEach(() => {
      // Restore default mock values using the global store
      (global as any).__versionTestApplication__.nativeApplicationVersion = '1.2.0';
    });

    it('returns FAIL_OPEN_RESULT when installed version is invalid semver (not parseable)', async () => {
      // Set native version to something that fails semverValid
      (global as any).__versionTestApplication__.nativeApplicationVersion = 'not-a-semver-version';

      mockApi.get.mockResolvedValueOnce(makeConfigResponse());

      const result = await checkAppVersion();

      expect(result.canProceed).toBe(true);
      expect(result.showMaintenanceScreen).toBe(false);
    });

    it('uses expoConfig version when nativeApplicationVersion indicates Expo Go (major > 50)', async () => {
      // Expo Go has a major version > 50 (e.g., 54.x.x)
      (global as any).__versionTestApplication__.nativeApplicationVersion = '54.0.0';

      mockApi.get.mockResolvedValueOnce(makeConfigResponse());

      // The service should use the expoConfig version (1.2.0) not the Expo Go version
      const result = await checkAppVersion();

      // With installed = 1.2.0 (from expoConfig), minimum = 1.0.0, current = 1.2.0
      // User can proceed, no update needed
      expect(result.canProceed).toBe(true);
      expect(result.showBlockingUpdateScreen).toBe(false);
    });

    it('returns showUpdateBadge false when currentVersion is invalid semver', async () => {
      mockApi.get.mockResolvedValueOnce(
        makeConfigResponse({
          currentVersion: { ios: 'invalid-version', android: 'invalid-version' },
        })
      );

      const result = await checkAppVersion();

      // Invalid currentVersion → hasAvailableUpdate = false
      expect(result.showUpdateBadge).toBe(false);
      expect(result.canProceed).toBe(true);
    });
  });
});
