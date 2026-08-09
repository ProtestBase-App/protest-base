/**
 * Tests for hooks/useBatchPublish.ts
 *
 * A batch publish is a long foreground task on a device that can be suspended
 * at any moment, so the behaviours that matter are the ones that keep its report
 * honest: stop cleanly when backgrounded, stop early on a rate limit, treat a
 * 409 as done, and keep going past an ordinary per-item failure.
 */

jest.mock('@/services/event.service', () => ({
  publishDraft: jest.fn(),
  EventNotDraftError: class EventNotDraftError extends Error {
    code = 'EVENT_NOT_DRAFT';
    constructor() {
      super('already published');
      this.name = 'EventNotDraftError';
    }
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { BATCH_PUBLISH_CAP, useBatchPublish } from '@/hooks/useBatchPublish';

const { publishDraft, EventNotDraftError } = require('@/services/event.service');

/** Fires the AppState listener the hook registered. */
function emitAppState(state: string) {
  const spy = AppState.addEventListener as unknown as jest.Mock;
  const calls = spy.mock?.calls ?? [];
  calls.forEach(([event, handler]: [string, (s: string) => void]) => {
    if (event === 'change') handler(state);
  });
}

describe('useBatchPublish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    publishDraft.mockReset();
  });

  it('publishes every id sequentially', async () => {
    publishDraft.mockResolvedValue({ $id: 'x', status: 'active' });
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'b', 'c']);
    });

    expect(publishDraft).toHaveBeenCalledTimes(3);
    expect(outcome?.publishedIds).toEqual(['a', 'b', 'c']);
    expect(outcome?.reason).toBe('done');
    expect(result.current.running).toBe(false);
  });

  it('caps the queue so a run stays finishable', async () => {
    publishDraft.mockResolvedValue({ $id: 'x', status: 'active' });
    const ids = Array.from({ length: BATCH_PUBLISH_CAP + 10 }, (_, i) => `id-${i}`);
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(ids);
    });

    expect(publishDraft).toHaveBeenCalledTimes(BATCH_PUBLISH_CAP);
    expect(outcome?.attempted).toBe(BATCH_PUBLISH_CAP);
  });

  // The draft is already public, so the user's intent for it is satisfied.
  it('counts a 409 as published and continues', async () => {
    publishDraft
      .mockRejectedValueOnce(new EventNotDraftError())
      .mockResolvedValueOnce({ $id: 'b', status: 'active' });
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'b']);
    });

    expect(outcome?.publishedIds).toEqual(['a', 'b']);
    expect(outcome?.reason).toBe('done');
  });

  // Hammering a rate limit turns a slow run into a broken one.
  it('stops immediately on a rate limit and reports partial progress', async () => {
    publishDraft.mockResolvedValueOnce({ $id: 'a', status: 'active' }).mockRejectedValueOnce(
      Object.assign(new Error('Too many requests'), {
        code: 'RATE_LIMIT_EXCEEDED',
        isRateLimited: true,
      })
    );
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'b', 'c']);
    });

    expect(publishDraft).toHaveBeenCalledTimes(2);
    expect(outcome?.publishedIds).toEqual(['a']);
    expect(outcome?.reason).toBe('rateLimited');
  });

  it('keeps going past an ordinary per-item failure', async () => {
    publishDraft
      .mockResolvedValueOnce({ $id: 'a', status: 'active' })
      .mockRejectedValueOnce(new Error('This draft is incomplete'))
      .mockResolvedValueOnce({ $id: 'c', status: 'active' });
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'b', 'c']);
    });

    expect(publishDraft).toHaveBeenCalledTimes(3);
    expect(outcome?.publishedIds).toEqual(['a', 'c']);
    expect(outcome?.reason).toBe('failed');
    expect(outcome?.error).toBe('This draft is incomplete');
  });

  // A web tab survives a long run; a suspended app does not. Everything already
  // published stays published, and the report says where it stopped.
  it('stops cleanly when the app goes to the background', async () => {
    publishDraft.mockImplementation(async (id: string) => {
      if (id === 'a') emitAppState('background');
      return { $id: id, status: 'active' };
    });
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run(['a', 'b', 'c']);
    });

    expect(publishDraft).toHaveBeenCalledTimes(1);
    expect(outcome?.publishedIds).toEqual(['a']);
    expect(outcome?.reason).toBe('backgrounded');
  });

  it('does not carry a previous run’s background flag into the next run', async () => {
    publishDraft.mockImplementation(async (id: string) => {
      if (id === 'a') emitAppState('background');
      return { $id: id, status: 'active' };
    });
    const { result } = renderHook(() => useBatchPublish());

    await act(async () => {
      await result.current.run(['a', 'b']);
    });

    publishDraft.mockReset();
    publishDraft.mockResolvedValue({ $id: 'x', status: 'active' });

    let second: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      second = await result.current.run(['c', 'd']);
    });

    expect(second?.reason).toBe('done');
    expect(second?.publishedIds).toEqual(['c', 'd']);
  });

  it('reports nothing attempted for an empty queue', async () => {
    const { result } = renderHook(() => useBatchPublish());

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      outcome = await result.current.run([]);
    });

    expect(publishDraft).not.toHaveBeenCalled();
    expect(outcome).toEqual({ publishedIds: [], attempted: 0, reason: 'done', error: undefined });
  });
});
