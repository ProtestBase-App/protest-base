jest.mock('@/services/event.service', () => {
  class EventSeriesError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'EventSeriesError';
      this.code = code;
    }
  }
  return { getSeries: jest.fn(), EventSeriesError };
});

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useEventSeries } from '@/hooks/useEventSeries';
import type { EventSeries } from '@/types/eventSeries.types';
import { logger } from '@/utils/logger';

const { getSeries, EventSeriesError } = require('@/services/event.service');

const seriesOf = (id: string, overrides: Partial<EventSeries> = {}): EventSeries => ({
  id,
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: null,
  starts_on: '2026-11-03',
  until_date: '2026-11-17',
  window_end: '2027-02-03',
  max_occurrences: 14,
  occurrences: [],
  can_add_dates: false,
  ...overrides,
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

const renderSeries = (initial: string | null) =>
  renderHook(({ id }: { id: string | null }) => useEventSeries(id), {
    initialProps: { id: initial },
  });

describe('useEventSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSeries.mockReset();
  });

  describe('without a series to read', () => {
    it('does nothing, and is not loading', async () => {
      const { result } = renderSeries(null);

      expect(result.current).toMatchObject({ series: null, loading: false, error: null });
      await act(async () => {
        await result.current.refresh();
      });

      expect(getSeries).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ series: null, loading: false, error: null });
    });
  });

  describe('loading', () => {
    it('is loading until the series arrives, then has it', async () => {
      const loaded = seriesOf('series-1');
      getSeries.mockResolvedValue(loaded);

      const { result } = renderSeries('series-1');
      expect(result.current).toMatchObject({ series: null, loading: true, error: null });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current).toMatchObject({ series: loaded, error: null });
      expect(getSeries).toHaveBeenCalledTimes(1);
      expect(getSeries).toHaveBeenCalledWith('series-1');
    });

    it('reads the series again on refresh, without going back to loading', async () => {
      getSeries.mockResolvedValueOnce(seriesOf('series-1'));
      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      const updated = seriesOf('series-1', { can_add_dates: true });
      getSeries.mockResolvedValueOnce(updated);
      await act(async () => {
        await result.current.refresh();
      });

      expect(getSeries).toHaveBeenCalledTimes(2);
      expect(result.current).toMatchObject({ series: updated, loading: false, error: null });
    });
  });

  describe('when it cannot be read', () => {
    it('says notFound for the backend answer SERIES_NOT_FOUND', async () => {
      getSeries.mockRejectedValue(new EventSeriesError('SERIES_NOT_FOUND', 'gone'));

      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toMatchObject({ series: null, error: 'notFound' });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('says failed for any other series code, and logs it', async () => {
      getSeries.mockRejectedValue(new EventSeriesError('RECURRENCE_DISABLED', 'off'));

      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toMatchObject({ series: null, error: 'failed' });
      expect(logger.warn).toHaveBeenCalledWith('[Series] Could not load the series', {
        seriesId: 'series-1',
        error: 'off',
      });
    });

    it('says failed for a plain network error, and for a rejection that is not an Error', async () => {
      getSeries.mockRejectedValueOnce(new Error('Network Error'));
      const first = renderSeries('series-1');
      await waitFor(() => expect(first.result.current.loading).toBe(false));
      expect(first.result.current.error).toBe('failed');

      getSeries.mockRejectedValueOnce('boom');
      const second = renderSeries('series-2');
      await waitFor(() => expect(second.result.current.loading).toBe(false));
      expect(second.result.current.error).toBe('failed');
      expect(logger.warn).toHaveBeenLastCalledWith('[Series] Could not load the series', {
        seriesId: 'series-2',
        error: 'boom',
      });
    });

    it('keeps the series it had when a refresh fails', async () => {
      const loaded = seriesOf('series-1');
      getSeries.mockResolvedValueOnce(loaded);
      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      getSeries.mockRejectedValueOnce(new Error('Network Error'));
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current).toMatchObject({ series: loaded, error: 'failed', loading: false });
    });

    it('clears the series when a refresh finds it gone', async () => {
      getSeries.mockResolvedValueOnce(seriesOf('series-1'));
      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      getSeries.mockRejectedValueOnce(new EventSeriesError('SERIES_NOT_FOUND', 'gone'));
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current).toMatchObject({ series: null, error: 'notFound' });
    });

    it('drops the error when the next refresh works', async () => {
      getSeries.mockRejectedValueOnce(new Error('Network Error'));
      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.error).toBe('failed'));

      const loaded = seriesOf('series-1');
      getSeries.mockResolvedValueOnce(loaded);
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current).toMatchObject({ series: loaded, error: null });
    });
  });

  describe('when the series changes', () => {
    it('starts over for the new id: nothing of the old series, loading again', async () => {
      getSeries.mockResolvedValueOnce(seriesOf('series-1'));
      const { result, rerender } = renderSeries('series-1');
      await waitFor(() => expect(result.current.series?.id).toBe('series-1'));

      const next = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(next.promise);
      rerender({ id: 'series-2' });

      expect(result.current).toMatchObject({ series: null, loading: true, error: null });
      await act(async () => {
        next.resolve(seriesOf('series-2'));
      });
      expect(result.current).toMatchObject({ loading: false });
      expect(result.current.series?.id).toBe('series-2');
    });

    it('ignores a slow answer for the previous id', async () => {
      const slow = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(slow.promise);
      getSeries.mockResolvedValueOnce(seriesOf('series-2'));
      const { result, rerender } = renderSeries('series-1');

      rerender({ id: 'series-2' });
      await waitFor(() => expect(result.current.series?.id).toBe('series-2'));

      await act(async () => {
        slow.resolve(seriesOf('series-1'));
      });

      expect(result.current.series?.id).toBe('series-2');
      expect(result.current.loading).toBe(false);
    });

    it('does not let a slow failure for the previous id become the new series error', async () => {
      const slow = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(slow.promise);
      getSeries.mockResolvedValueOnce(seriesOf('series-2'));
      const { result, rerender } = renderSeries('series-1');

      rerender({ id: 'series-2' });
      await waitFor(() => expect(result.current.series?.id).toBe('series-2'));

      await act(async () => {
        slow.reject(new EventSeriesError('SERIES_NOT_FOUND', 'gone'));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.series?.id).toBe('series-2');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not end the new id loading when the previous one answers first', async () => {
      const slow = deferred<EventSeries>();
      const next = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(slow.promise).mockReturnValueOnce(next.promise);
      const { result, rerender } = renderSeries('series-1');
      rerender({ id: 'series-2' });

      await act(async () => {
        slow.resolve(seriesOf('series-1'));
      });

      expect(result.current).toMatchObject({ series: null, loading: true });
    });

    it('lets go of the series when the id goes away, and ignores what was still in flight', async () => {
      const slow = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(slow.promise);
      const { result, rerender } = renderSeries('series-1');

      rerender({ id: null });
      expect(result.current).toMatchObject({ series: null, loading: false });

      await act(async () => {
        slow.resolve(seriesOf('series-1'));
      });

      expect(result.current).toMatchObject({ series: null, loading: false, error: null });
    });

    it('keeps the newer of two overlapping refreshes, whichever lands last', async () => {
      getSeries.mockResolvedValueOnce(seriesOf('series-1'));
      const { result } = renderSeries('series-1');
      await waitFor(() => expect(result.current.loading).toBe(false));

      const older = deferred<EventSeries>();
      const newer = deferred<EventSeries>();
      getSeries.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

      let first: Promise<void> | undefined;
      let second: Promise<void> | undefined;
      act(() => {
        first = result.current.refresh();
        second = result.current.refresh();
      });

      await act(async () => {
        newer.resolve(seriesOf('series-1', { until_date: '2026-12-01' }));
        await second;
      });
      await act(async () => {
        older.resolve(seriesOf('series-1', { until_date: '2026-11-17' }));
        await first;
      });

      expect(result.current.series?.until_date).toBe('2026-12-01');
    });
  });
});
