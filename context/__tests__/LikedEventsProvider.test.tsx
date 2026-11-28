/**
 * LikedEventsProvider: the liked list after the device's user data is wiped.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockFetchLikedEntries = jest.fn();

jest.mock('@/services/localStorageService', () => ({
  fetchLikedEntriesLocally: (...args: unknown[]) => mockFetchLikedEntries(...args),
  writeLikedEntriesLocally: jest.fn().mockResolvedValue(undefined),
  addLikedEntryLocally: jest.fn().mockResolvedValue(undefined),
  removeLikedIdLocally: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/engagement.service', () => ({
  likeEventOnServer: jest.fn(),
  unlikeEventOnServer: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

let mockLocalDataGeneration = 0;
let mockEventsCache: Record<string, unknown> = {};
jest.mock('@/context/GlobalProvider', () => ({
  useGlobalContext: () => ({
    eventsCache: mockEventsCache,
    localDataGeneration: mockLocalDataGeneration,
  }),
}));

import { LikedEventsProvider, useLikedEvents } from '@/context/LikedEventsProvider';
import {
  addLikedEntryLocally,
  removeLikedIdLocally,
  writeLikedEntriesLocally,
} from '@/services/localStorageService';
import { likeEventOnServer, unlikeEventOnServer } from '@/services/engagement.service';
import { logger } from '@/utils/logger';

const mockAdd = addLikedEntryLocally as jest.Mock;
const mockRemove = removeLikedIdLocally as jest.Mock;
const mockWrite = writeLikedEntriesLocally as jest.Mock;
const mockLike = likeEventOnServer as jest.Mock;
const mockUnlike = unlikeEventOnServer as jest.Mock;
const mockWarn = logger.warn as jest.Mock;

const inAWeek = () => Date.now() + 7 * 24 * 60 * 60 * 1000;

function wrapper({ children }: { children: React.ReactNode }) {
  return <LikedEventsProvider>{children}</LikedEventsProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocalDataGeneration = 0;
  mockEventsCache = {};
  mockAdd.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
  mockWrite.mockResolvedValue(undefined);
});

async function renderLoaded(entries: { id: string; endsAt: number }[] = []) {
  mockFetchLikedEntries.mockResolvedValue(entries);
  const view = renderHook(() => useLikedEvents(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('LikedEventsProvider', () => {
  it('hydrates the liked events from local storage', async () => {
    mockFetchLikedEntries.mockResolvedValue([{ id: 'event-1', endsAt: inAWeek() }]);
    const { result } = renderHook(() => useLikedEvents(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLiked('event-1')).toBe(true);
  });

  // The provider never remounts: without the reload, a sign-out's wipe left the previous
  // person's likes on screen, and the next like wrote them back to storage.
  it('reloads the liked events from storage after the device user data is wiped', async () => {
    mockFetchLikedEntries.mockResolvedValue([{ id: 'event-1', endsAt: inAWeek() }]);
    const view = renderHook(() => useLikedEvents(), { wrapper });
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mockFetchLikedEntries.mockResolvedValue([]);
    mockLocalDataGeneration = 1;
    view.rerender({});

    await waitFor(() => expect(view.result.current.isLiked('event-1')).toBe(false));
  });

  it('keeps the list when the reload after a wipe fails', async () => {
    const view = await renderLoaded([{ id: 'event-1', endsAt: inAWeek() }]);

    mockFetchLikedEntries.mockRejectedValue(new Error('locked'));
    mockLocalDataGeneration = 1;
    view.rerender({});

    await waitFor(() =>
      expect(mockWarn).toHaveBeenCalledWith('[LikedEvents] Reload after a wipe failed', {
        error: 'locked',
      })
    );
    expect(view.result.current.isLiked('event-1')).toBe(true);
  });

  it('drops entries past the retention window and saves the rest', async () => {
    const kept = { id: 'event-1', endsAt: inAWeek() };
    const { result } = await renderLoaded([kept, { id: 'old', endsAt: 0 }]);

    expect(result.current.likedEventIds).toEqual(['event-1']);
    expect(mockWrite).toHaveBeenCalledWith([kept]);
  });

  it('still loads the kept entries when saving the pruned list fails', async () => {
    mockWrite.mockRejectedValue(new Error('full'));
    const { result } = await renderLoaded([
      { id: 'event-1', endsAt: inAWeek() },
      { id: 'old', endsAt: 0 },
    ]);

    expect(result.current.likedEventIds).toEqual(['event-1']);
    expect(mockWarn).toHaveBeenCalledWith('[LikedEvents] Failed to persist pruned entries', {
      error: 'full',
    });
  });

  it('starts empty when the stored list cannot be read', async () => {
    mockFetchLikedEntries.mockRejectedValue(new Error('corrupt'));
    const { result } = renderHook(() => useLikedEvents(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.likedEventIds).toEqual([]);
  });

  describe('likeEvent', () => {
    it('stores the like with the given end time and returns the server count', async () => {
      mockLike.mockResolvedValue(3);
      const { result } = await renderLoaded();

      let count: number | null = null;
      await act(async () => {
        count = await result.current.likeEvent('event-2', 1234);
      });

      expect(count).toBe(3);
      expect(result.current.isLiked('event-2')).toBe(true);
      expect(mockAdd).toHaveBeenCalledWith({ id: 'event-2', endsAt: 1234 });
    });

    it('takes the end time from the cached event', async () => {
      mockLike.mockResolvedValue(1);
      mockEventsCache = {
        'event-2': { start_time: '2030-01-01T10:00:00Z', end_time: '2030-01-01T12:00:00Z' },
      };
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.likeEvent('event-2');
      });

      expect(mockAdd).toHaveBeenCalledWith({
        id: 'event-2',
        endsAt: Date.parse('2030-01-01T12:00:00Z'),
      });
    });

    it('falls back to a year ahead for an event it knows nothing about', async () => {
      mockLike.mockResolvedValue(1);
      const { result } = await renderLoaded();
      const before = Date.now();

      await act(async () => {
        await result.current.likeEvent('event-2');
      });

      const { endsAt } = mockAdd.mock.calls[0][0];
      expect(endsAt).toBeGreaterThanOrEqual(before + 364 * 24 * 60 * 60 * 1000);
    });

    it('does not store an already liked event twice', async () => {
      mockLike.mockResolvedValue(5);
      const { result } = await renderLoaded([{ id: 'event-1', endsAt: inAWeek() }]);

      await act(async () => {
        await result.current.likeEvent('event-1');
      });

      expect(mockAdd).not.toHaveBeenCalled();
      expect(result.current.likedEventIds).toEqual(['event-1']);
    });

    it('rolls back the local like when storing it fails', async () => {
      mockAdd.mockRejectedValue(new Error('full'));
      mockLike.mockResolvedValue(2);
      const { result } = await renderLoaded();

      let count: number | null = null;
      await act(async () => {
        count = await result.current.likeEvent('event-2', 1);
      });

      expect(count).toBe(2);
      expect(result.current.isLiked('event-2')).toBe(false);
    });

    it('rolls back and returns null when the server refuses', async () => {
      mockLike.mockRejectedValue(new Error('offline'));
      const { result } = await renderLoaded();

      let count: number | null = 0;
      await act(async () => {
        count = await result.current.likeEvent('event-2', 1);
      });

      expect(count).toBeNull();
      expect(result.current.isLiked('event-2')).toBe(false);
      expect(mockRemove).toHaveBeenCalledWith('event-2');
    });

    it('logs when removing the stored like during rollback fails', async () => {
      mockLike.mockRejectedValue(new Error('offline'));
      mockRemove.mockRejectedValue(new Error('locked'));
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.likeEvent('event-2', 1);
      });

      expect(mockWarn).toHaveBeenCalledWith('[LikedEvents] rollback persist failed', {
        error: 'locked',
      });
    });
  });

  describe('unlikeEvent', () => {
    it('removes the like and returns the server count', async () => {
      mockUnlike.mockResolvedValue(0);
      const { result } = await renderLoaded([{ id: 'event-1', endsAt: inAWeek() }]);

      let count: number | null = null;
      await act(async () => {
        count = await result.current.unlikeEvent('event-1');
      });

      expect(count).toBe(0);
      expect(result.current.isLiked('event-1')).toBe(false);
      expect(mockRemove).toHaveBeenCalledWith('event-1');
    });

    it('restores the like when removing it from storage fails', async () => {
      mockRemove.mockRejectedValue(new Error('locked'));
      mockUnlike.mockResolvedValue(4);
      const { result } = await renderLoaded([{ id: 'event-1', endsAt: inAWeek() }]);

      await act(async () => {
        await result.current.unlikeEvent('event-1');
      });

      expect(result.current.isLiked('event-1')).toBe(true);
    });

    it('re-reads storage and returns null when the server refuses', async () => {
      mockUnlike.mockRejectedValue(new Error('offline'));
      const { result } = await renderLoaded([{ id: 'event-1', endsAt: inAWeek() }]);
      mockFetchLikedEntries.mockResolvedValue([{ id: 'event-1', endsAt: inAWeek() }]);

      let count: number | null = 0;
      await act(async () => {
        count = await result.current.unlikeEvent('event-1');
      });

      expect(count).toBeNull();
      expect(result.current.isLiked('event-1')).toBe(true);
    });
  });

  it('throws when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useLikedEvents())).toThrow(
      'useLikedEvents must be used within a LikedEventsProvider'
    );
  });
});
