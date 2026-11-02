import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { EventSeriesError, previewRecurrence } from '@/services/event.service';
import type { RecurrenceInput, RecurrencePreview } from '@/types/eventSeries.types';
import { logger } from '@/utils/logger';

const PREVIEW_DEBOUNCE_MS = 400;

export type RecurrencePreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; preview: RecurrencePreview }
  /** The backend refused the rule: shown inline, under the control. */
  | { status: 'refused'; error: EventSeriesError }
  /** No answer. Not a verdict on the rule, which the save checks anyway. */
  | { status: 'unavailable' };

type PreviewAnswer = Exclude<RecurrencePreviewState, { status: 'idle' | 'loading' }>;

/**
 * The dates of a rule, refetched (debounced) whenever it changes. A null rule is one
 * the form cannot send yet. Dates always come from here, never from the device.
 */
export function useRecurrencePreview(rule: RecurrenceInput | null): RecurrencePreviewState {
  const ruleKey = rule ? JSON.stringify(rule) : null;
  const debouncedKey = useDebouncedValue(ruleKey, PREVIEW_DEBOUNCE_MS);
  // Kept with the rule it answers, so it can never be shown for another one.
  const [answer, setAnswer] = useState<{ key: string; state: PreviewAnswer } | null>(null);

  useEffect(() => {
    if (!debouncedKey) return;

    let cancelled = false;
    previewRecurrence(JSON.parse(debouncedKey) as RecurrenceInput)
      .then((preview) => {
        if (!cancelled) setAnswer({ key: debouncedKey, state: { status: 'ready', preview } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof EventSeriesError) {
          setAnswer({ key: debouncedKey, state: { status: 'refused', error } });
        } else {
          logger.warn('[Recurrence] Preview unavailable', {
            error: error instanceof Error ? error.message : String(error),
          });
          setAnswer({ key: debouncedKey, state: { status: 'unavailable' } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedKey]);

  if (!ruleKey) return { status: 'idle' };
  return answer?.key === ruleKey ? answer.state : { status: 'loading' };
}
