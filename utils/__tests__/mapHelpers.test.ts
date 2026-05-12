jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { Linking } from 'react-native';
import { openMap, __resetMapCooldownForTests } from '@/utils/mapHelpers';

describe('mapHelpers.openMap', () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    __resetMapCooldownForTests();
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURLSpy.mockRestore();
    jest.useRealTimers();
  });

  it('calls Linking.openURL with address when provided', () => {
    openMap(50.85, 4.35, '123 Main St, Brussels');
    expect(openURLSpy).toHaveBeenCalledTimes(1);
    const url = openURLSpy.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('123 Main St, Brussels'));
  });

  it('falls back to coordinates when no address provided', () => {
    openMap(50.85, 4.35);
    expect(openURLSpy).toHaveBeenCalledTimes(1);
    const url = openURLSpy.mock.calls[0][0];
    expect(url).toContain('50.85,4.35');
  });

  it('prevents duplicate opens within 3s cooldown', () => {
    openMap(50.85, 4.35, 'A');
    openMap(50.85, 4.35, 'A');
    openMap(50.85, 4.35, 'A');
    expect(openURLSpy).toHaveBeenCalledTimes(1);
  });

  it('resets cooldown after 3 seconds', () => {
    jest.useFakeTimers();
    openMap(50.85, 4.35, 'A');
    expect(openURLSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3001);

    openMap(50.85, 4.35, 'B');
    expect(openURLSpy).toHaveBeenCalledTimes(2);
  });

  it('logs an error when Linking.openURL rejects', async () => {
    const { logger } = require('@/utils/logger');
    openURLSpy.mockRejectedValueOnce(new Error('Cannot open'));

    openMap(50.85, 4.35, 'A');
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalled();
  });
});
