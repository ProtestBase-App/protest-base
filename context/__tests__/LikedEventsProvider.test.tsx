/**
 * LikedEventsProvider: the liked list after the device's user data is wiped.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';

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
jest.mock('@/context/GlobalProvider', () => ({
  useGlobalContext: () => ({ eventsCache: {}, localDataGeneration: mockLocalDataGeneration }),
}));

import { LikedEventsProvider, useLikedEvents } from '@/context/LikedEventsProvider';

const inAWeek = () => Date.now() + 7 * 24 * 60 * 60 * 1000;

function wrapper({ children }: { children: React.ReactNode }) {
  return <LikedEventsProvider>{children}</LikedEventsProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocalDataGeneration = 0;
});

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
});
