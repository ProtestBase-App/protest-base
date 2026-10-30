jest.mock('@/services/event.service', () => {
  class EventSeriesError extends Error {
    code: string;
    max?: number;
    windowEnd?: string;
    constructor(code: string, message: string, cap?: { max?: number; windowEnd?: string }) {
      super(message);
      this.name = 'EventSeriesError';
      this.code = code;
      this.max = cap?.max;
      this.windowEnd = cap?.windowEnd;
    }
  }
  return { previewRecurrence: jest.fn(), EventSeriesError };
});

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook } from '@testing-library/react-native';

import { useRecurrencePreview } from '@/hooks/useRecurrencePreview';
import type { RecurrenceInput, RecurrencePreview } from '@/types/eventSeries.types';
import { logger } from '@/utils/logger';

const { previewRecurrence, EventSeriesError } = require('@/services/event.service');

const DEBOUNCE_MS = 400;

const weekly: RecurrenceInput = {
  frequency: 'weekly',
  weekday: 'tuesday',
  start_local: '19:00',
  count: 3,
};
const monthly: RecurrenceInput = {
  frequency: 'monthly',
  weekday: 'tuesday',
  week_of_month: 1,
  start_local: '19:00',
  count: 3,
};
const biweekly: RecurrenceInput = { ...weekly, frequency: 'every_2_weeks' };

const previewOf = (count: number): RecurrencePreview => ({
  occurrences: Array.from({ length: count }, (_, i) => ({
    start_time: `2026-11-0${i + 1}T18:00:00.000Z`,
    end_time: null,
  })),
  count,
  max: 14,
  window_end: '2027-01-27',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const renderPreview = (initial: RecurrenceInput | null) =>
  renderHook(({ rule }: { rule: RecurrenceInput | null }) => useRecurrencePreview(rule), {
    initialProps: { rule: initial },
  });

/** Lets the debounce fire and the request it starts settle. */
const settle = (ms = DEBOUNCE_MS) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

describe('useRecurrencePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    previewRecurrence.mockReset();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('a rule the form cannot send yet', () => {
    it('is idle and asks for nothing', async () => {
      const { result } = renderPreview(null);

      await settle(DEBOUNCE_MS * 3);

      expect(result.current).toEqual({ status: 'idle' });
      expect(previewRecurrence).not.toHaveBeenCalled();
    });

    it('goes idle at once when the rule is withdrawn, without waiting for the debounce', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));
      const { result, rerender } = renderPreview(weekly);
      await settle(0);
      expect(result.current.status).toBe('ready');

      rerender({ rule: null });

      expect(result.current).toEqual({ status: 'idle' });
      await settle(DEBOUNCE_MS * 3);
      expect(result.current).toEqual({ status: 'idle' });
      expect(previewRecurrence).toHaveBeenCalledTimes(1);
    });
  });

  describe('the first rule', () => {
    it('is asked for as soon as the hook mounts, then ready with what the backend sent', async () => {
      const preview = previewOf(3);
      previewRecurrence.mockResolvedValue(preview);

      const { result } = renderPreview(weekly);

      expect(previewRecurrence).toHaveBeenCalledTimes(1);
      expect(previewRecurrence).toHaveBeenCalledWith(weekly);
      await settle(0);
      expect(result.current).toEqual({ status: 'ready', preview });
    });

    it('says loading while the first answer is on its way', async () => {
      const pending = deferred<RecurrencePreview>();
      previewRecurrence.mockReturnValue(pending.promise);

      const { result } = renderPreview(weekly);
      expect(result.current).toEqual({ status: 'loading' });

      await act(async () => {
        pending.resolve(previewOf(2));
      });
      expect(result.current.status).toBe('ready');
    });
  });

  describe('debounce', () => {
    it('shows loading right after a change and asks only once the debounce has passed', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));
      const { result, rerender } = renderPreview(weekly);
      await settle(0);
      previewRecurrence.mockClear();

      rerender({ rule: monthly });

      // What is on screen belongs to the previous rule, so it is not shown for this one.
      expect(result.current).toEqual({ status: 'loading' });
      expect(previewRecurrence).not.toHaveBeenCalled();

      await settle(DEBOUNCE_MS - 1);
      expect(result.current).toEqual({ status: 'loading' });
      expect(previewRecurrence).not.toHaveBeenCalled();

      await settle(1);
      expect(previewRecurrence).toHaveBeenCalledTimes(1);
      expect(previewRecurrence).toHaveBeenCalledWith(monthly);
      expect(result.current.status).toBe('ready');
    });

    it('asks only for the last rule of a burst of changes', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));
      const { rerender } = renderPreview(weekly);
      await settle(0);
      previewRecurrence.mockClear();

      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS - 100);
      rerender({ rule: biweekly });
      await settle(DEBOUNCE_MS - 100);
      rerender({ rule: { ...biweekly, count: 5 } });
      await settle(DEBOUNCE_MS);

      expect(previewRecurrence).toHaveBeenCalledTimes(1);
      expect(previewRecurrence).toHaveBeenCalledWith({ ...biweekly, count: 5 });
    });

    it('does not ask again for a rule equal in value, however new the object', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));
      const { result, rerender } = renderPreview(weekly);
      await settle(0);
      previewRecurrence.mockClear();

      rerender({ rule: { ...weekly } });
      await settle(DEBOUNCE_MS * 2);

      expect(previewRecurrence).not.toHaveBeenCalled();
      expect(result.current.status).toBe('ready');
    });

    it('keeps the answer it has when the rule comes back before the debounce passes', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));
      const { result, rerender } = renderPreview(weekly);
      await settle(0);
      previewRecurrence.mockClear();

      rerender({ rule: monthly });
      expect(result.current.status).toBe('loading');
      rerender({ rule: weekly });

      expect(result.current.status).toBe('ready');
      await settle(DEBOUNCE_MS * 2);
      expect(previewRecurrence).not.toHaveBeenCalled();
    });
  });

  describe('a stale answer', () => {
    it('does not overwrite a newer rule when it lands last', async () => {
      const first = deferred<RecurrencePreview>();
      const second = deferred<RecurrencePreview>();
      previewRecurrence.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const { result, rerender } = renderPreview(weekly);
      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS);
      expect(previewRecurrence).toHaveBeenCalledTimes(2);

      await act(async () => {
        second.resolve(previewOf(2));
      });
      expect(result.current).toEqual({ status: 'ready', preview: previewOf(2) });

      await act(async () => {
        first.resolve(previewOf(5));
      });
      expect(result.current).toEqual({ status: 'ready', preview: previewOf(2) });
    });

    it('is not shown while the newer rule is still waiting for its own answer', async () => {
      const first = deferred<RecurrencePreview>();
      const second = deferred<RecurrencePreview>();
      previewRecurrence.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const { result, rerender } = renderPreview(weekly);
      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS);

      await act(async () => {
        first.resolve(previewOf(5));
      });

      expect(result.current).toEqual({ status: 'loading' });
    });

    it('does not turn a newer rule into an error when its predecessor fails late', async () => {
      const first = deferred<RecurrencePreview>();
      const second = deferred<RecurrencePreview>();
      previewRecurrence.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const { result, rerender } = renderPreview(weekly);
      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS);
      await act(async () => {
        second.resolve(previewOf(2));
      });

      await act(async () => {
        first.reject(new EventSeriesError('RECURRENCE_INVALID', 'invalid'));
      });

      expect(result.current.status).toBe('ready');
    });

    it('is dropped when the rule is withdrawn while it is in flight', async () => {
      const pending = deferred<RecurrencePreview>();
      previewRecurrence.mockReturnValue(pending.promise);

      const { result, rerender } = renderPreview(weekly);
      rerender({ rule: null });
      await settle(DEBOUNCE_MS);
      await act(async () => {
        pending.resolve(previewOf(3));
      });

      expect(result.current).toEqual({ status: 'idle' });
    });
  });

  describe('when the backend does not give dates', () => {
    it('is refused, with the typed error, when the backend refuses the rule', async () => {
      const refusal = new EventSeriesError('RECURRENCE_TOO_MANY_OCCURRENCES', 'too many', {
        max: 14,
        windowEnd: '2027-01-27',
      });
      previewRecurrence.mockRejectedValue(refusal);

      const { result } = renderPreview(weekly);
      await settle(0);

      expect(result.current).toEqual({ status: 'refused', error: refusal });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('is unavailable, and logged, on any other failure', async () => {
      previewRecurrence.mockRejectedValue(new Error('Network Error'));

      const { result } = renderPreview(weekly);
      await settle(0);

      expect(result.current).toEqual({ status: 'unavailable' });
      expect(logger.warn).toHaveBeenCalledWith('[Recurrence] Preview unavailable', {
        error: 'Network Error',
      });
    });

    it('is unavailable for a rejection that is not an Error', async () => {
      previewRecurrence.mockRejectedValue('boom');

      const { result } = renderPreview(weekly);
      await settle(0);

      expect(result.current).toEqual({ status: 'unavailable' });
      expect(logger.warn).toHaveBeenCalledWith('[Recurrence] Preview unavailable', {
        error: 'boom',
      });
    });

    it('recovers when the next rule gets an answer', async () => {
      previewRecurrence
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(previewOf(3));

      const { result, rerender } = renderPreview(weekly);
      await settle(0);
      expect(result.current.status).toBe('unavailable');

      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS);

      expect(result.current.status).toBe('ready');
    });
  });

  describe('an answer belongs to its rule', () => {
    it("never shows the previous rule's dates once the debounce has fired", async () => {
      const second = deferred<RecurrencePreview>();
      previewRecurrence.mockResolvedValueOnce(previewOf(14)).mockReturnValueOnce(second.promise);

      const seen: string[] = [];
      const { rerender } = renderHook(
        ({ rule }: { rule: RecurrenceInput }) => {
          const state = useRecurrencePreview(rule);
          seen.push(state.status === 'ready' ? `ready:${state.preview.count}` : state.status);
          return state;
        },
        { initialProps: { rule: weekly } }
      );
      await settle(0);
      expect(seen.at(-1)).toBe('ready:14');

      seen.length = 0;
      rerender({ rule: monthly });
      await settle(DEBOUNCE_MS);

      expect(seen).not.toContain('ready:14');
      expect(seen.at(-1)).toBe('loading');

      await act(async () => {
        second.resolve(previewOf(3));
      });
      expect(seen.at(-1)).toBe('ready:3');
    });

    it('goes back to the answer it already has when the rule comes back', async () => {
      previewRecurrence.mockResolvedValue(previewOf(3));

      const { result, rerender } = renderPreview(weekly);
      await settle(0);

      rerender({ rule: null });
      expect(result.current).toEqual({ status: 'idle' });

      rerender({ rule: weekly });
      expect(result.current.status).toBe('ready');
    });
  });
});
