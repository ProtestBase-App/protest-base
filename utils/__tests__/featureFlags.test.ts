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
import { getAppEnv } from '@/utils/featureFlags';

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
});
