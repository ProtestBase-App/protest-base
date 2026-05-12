// Mock expo-application and expo-constants via getters so test-body mutations
// to `__appVersionTestApplication__` / `__appVersionTestConstants__` propagate.
// Plain `return globalObj` style mocks don't work here because Babel's
// `_interopRequireWildcard` wrapper copies enumerable values into a fresh
// namespace at module-load time when `__esModule` is absent.
jest.mock('expo-application', () => {
  const store: { nativeApplicationVersion: string | null } = {
    nativeApplicationVersion: '1.2.3',
  };
  (global as any).__appVersionTestApplication__ = store;
  return {
    __esModule: true,
    get nativeApplicationVersion() {
      return store.nativeApplicationVersion;
    },
  };
});

jest.mock('expo-constants', () => {
  const store: { expoConfig: { version?: string } | null } = {
    expoConfig: { version: '1.2.3' },
  };
  (global as any).__appVersionTestConstants__ = store;
  return {
    __esModule: true,
    default: {
      get expoConfig() {
        return store.expoConfig;
      },
    },
  };
});

import { getInstalledAppVersion, __resetAppVersionCacheForTests } from '@/utils/appVersion';

describe('utils/appVersion', () => {
  beforeEach(() => {
    __resetAppVersionCacheForTests();
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = '1.2.3';
    (global as any).__appVersionTestConstants__.expoConfig = { version: '1.2.3' };
  });

  it('returns nativeApplicationVersion when not running in Expo Go', () => {
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = '2.0.1';
    expect(getInstalledAppVersion()).toBe('2.0.1');
  });

  it('falls back to expoConfig.version when nativeApplicationVersion looks like Expo Go (major > 50)', () => {
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = '54.0.0';
    expect(getInstalledAppVersion()).toBe('1.2.3');
  });

  it('returns nativeApplicationVersion when expoConfig.version is also a valid app semver but native is below the Expo Go threshold', () => {
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = '3.4.5';
    expect(getInstalledAppVersion()).toBe('3.4.5');
  });

  it('returns expoConfig.version when nativeApplicationVersion is missing', () => {
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = null;
    expect(getInstalledAppVersion()).toBe('1.2.3');
  });

  it('memoizes the result across calls', () => {
    expect(getInstalledAppVersion()).toBe('1.2.3');
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = '9.9.9';
    // Without the reset helper, the cached value should win.
    expect(getInstalledAppVersion()).toBe('1.2.3');
  });

  it('returns null when neither source has a version', () => {
    (global as any).__appVersionTestApplication__.nativeApplicationVersion = null;
    (global as any).__appVersionTestConstants__.expoConfig = {};
    expect(getInstalledAppVersion()).toBeNull();
  });
});
