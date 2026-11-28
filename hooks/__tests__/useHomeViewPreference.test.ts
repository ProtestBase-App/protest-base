import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { useHomeViewPreference } from '@/hooks/useHomeViewPreference';
import { logger } from '@/utils/logger';

describe('useHomeViewPreference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('defaults to the month view when nothing is stored', async () => {
    const { result } = renderHook(() => useHomeViewPreference());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.viewMode).toBe('month');
  });

  it.each([
    ['agenda', 'agenda'],
    ['month', 'month'],
    ['list', 'agenda'],
    ['calendar', 'month'],
  ])('reads a stored %s as %s', async (stored, expected) => {
    await AsyncStorage.setItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE, stored);

    const { result } = renderHook(() => useHomeViewPreference());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.viewMode).toBe(expected);
  });

  it('ignores an unknown stored value', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE, 'grid');

    const { result } = renderHook(() => useHomeViewPreference());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.viewMode).toBe('month');
  });

  it('is ready with the default when reading fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const { result } = renderHook(() => useHomeViewPreference());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.viewMode).toBe('month');
    expect(warn).toHaveBeenCalledWith('[useHomeViewPreference] Failed to load preference', {
      error: 'disk',
    });
  });

  it('switches and persists the chosen view', async () => {
    const { result } = renderHook(() => useHomeViewPreference());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setViewMode('agenda');
    });

    expect(result.current.viewMode).toBe('agenda');
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEYS.HOME_VIEW_PREFERENCE)).toBe('agenda')
    );
  });

  it('keeps the new view when persisting fails', async () => {
    const { result } = renderHook(() => useHomeViewPreference());
    await waitFor(() => expect(result.current.ready).toBe(true));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    act(() => {
      result.current.setViewMode('agenda');
    });

    expect(result.current.viewMode).toBe('agenda');
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('[useHomeViewPreference] Failed to persist preference', {
        error: 'full',
      })
    );
  });
});
