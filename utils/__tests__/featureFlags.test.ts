let mockApplicationId: string | null = null;
jest.mock('expo-application', () => ({
  __esModule: true,
  get applicationId() {
    return mockApplicationId;
  },
}));

// Stable mock object so tests can mutate `extra` without re-importing the SUT.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        appEnv: 'development',
      },
    },
  },
}));

import Constants from 'expo-constants';
import { getAppEnv, isLuxembourgEnabled } from '@/utils/featureFlags';

type MutableExtra = Record<string, unknown>;

function setExtra(extra: MutableExtra | undefined): void {
  (Constants.expoConfig as { extra?: MutableExtra }).extra = extra;
}

describe('featureFlags', () => {
  afterEach(() => {
    setExtra({ appEnv: 'development' });
  });

  describe('getAppEnv', () => {
    it('returns the configured environment', () => {
      setExtra({ appEnv: 'production' });
      expect(getAppEnv()).toBe('production');
    });

    it('defaults to development when appEnv is absent', () => {
      setExtra({});
      expect(getAppEnv()).toBe('development');
    });

    it('defaults to development when extra is undefined', () => {
      setExtra(undefined);
      expect(getAppEnv()).toBe('development');
    });
  });

  describe('isLuxembourgEnabled', () => {
    it.each(['development', 'preview'])('is on in %s builds', (appEnv) => {
      setExtra({ appEnv });
      expect(isLuxembourgEnabled()).toBe(true);
    });

    it('is off in production builds until the launch', () => {
      setExtra({ appEnv: 'production' });
      expect(isLuxembourgEnabled()).toBe(false);
    });

    it('stays off in the store app even if an update ships without appEnv', () => {
      mockApplicationId = 'be.protestbase.app';
      setExtra({ appEnv: 'development' });
      expect(isLuxembourgEnabled()).toBe(false);
      mockApplicationId = null;
    });

    it('is on in the preview app', () => {
      mockApplicationId = 'be.protestbase.app.preview';
      setExtra({ appEnv: 'preview' });
      expect(isLuxembourgEnabled()).toBe(true);
      mockApplicationId = null;
    });
  });
});
