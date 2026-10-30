import { useCallback, useEffect, useRef, useState } from 'react';

import { EventSeriesError, getSeries } from '@/services/event.service';
import type { EventSeries } from '@/types/eventSeries.types';
import { logger } from '@/utils/logger';

export type EventSeriesLoadError = 'notFound' | 'failed';

export interface UseEventSeriesReturn {
  series: EventSeries | null;
  loading: boolean;
  /** `notFound` is the backend's answer; `failed` is no answer at all. */
  error: EventSeriesLoadError | null;
  refresh: () => Promise<void>;
}

/**
 * The rule and the dates of a series, for whoever is asking: members also get the
 * drafts. Pass null while there is no series to read, or the feature is off.
 */
export function useEventSeries(seriesId: string | null): UseEventSeriesReturn {
  const [series, setSeries] = useState<EventSeries | null>(null);
  const [loading, setLoading] = useState(!!seriesId);
  const [error, setError] = useState<EventSeriesLoadError | null>(null);

  // Only the latest call may land: a slow answer is either for another series, or
  // older than the one a refresh after an action just brought.
  const latestRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!seriesId) return;
    const request = ++latestRequestRef.current;
    try {
      const loaded = await getSeries(seriesId);
      if (request !== latestRequestRef.current) return;
      setSeries(loaded);
      setError(null);
    } catch (err) {
      if (request !== latestRequestRef.current) return;
      if (err instanceof EventSeriesError && err.code === 'SERIES_NOT_FOUND') {
        setSeries(null);
        setError('notFound');
      } else {
        logger.warn('[Series] Could not load the series', {
          seriesId,
          error: err instanceof Error ? err.message : String(err),
        });
        setError('failed');
      }
    } finally {
      if (request === latestRequestRef.current) setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    latestRequestRef.current += 1;
    setSeries(null);
    setError(null);
    setLoading(!!seriesId);
    refresh();
  }, [seriesId, refresh]);

  return { series, loading, error, refresh };
}
