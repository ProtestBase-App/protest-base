import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { logger } from '@/utils/logger';

/** Hard cap per run. A batch is a foreground task; keep it finishable. */
export const BATCH_CAP = 25;

export type BatchStopReason = 'done' | 'rateLimited' | 'backgrounded' | 'failed';

export interface BatchResult {
  /** Ids the operation completed for. */
  succeededIds: string[];
  /** How many were attempted, i.e. the capped queue length. */
  attempted: number;
  reason: BatchStopReason;
  /** Message from the first hard failure, when reason is 'failed'. */
  error?: string;
}

export interface SequentialBatchOptions {
  /** The per-item call. Rejects are classified by the rules below. */
  operation: (id: string) => Promise<unknown>;
  /**
   * Errors this batch should count as success rather than failure — used by
   * publish, where a 409 means the draft is already public and the user's intent
   * for it is therefore satisfied. Delete has no such case.
   */
  isAlreadyDone?: (error: unknown) => boolean;
  /** Prefix for log lines, e.g. '[BatchPublish]'. */
  logLabel: string;
}

export interface UseSequentialBatchReturn {
  running: boolean;
  /** "3 / 12" while a run is in progress, else null. */
  progressLabel: string | null;
  /** Runs the operation over up to BATCH_CAP ids, sequentially. */
  run: (ids: string[]) => Promise<BatchResult>;
}

/**
 * Sequential batch runner shared by the drafts list's publish and delete actions.
 *
 * Neither operation can be batched server-side — it is one round-trip per draft —
 * so a run is a genuinely long foreground task. Three rules follow, and they are
 * the whole reason this is a hook rather than a loop at the call site:
 *
 * - **Suspend safely.** A web tab survives a long run; a mobile app does not. On
 *   AppState leaving 'active' the loop stops at the current index and reports
 *   honest partial progress. Everything already committed stays committed.
 * - **Stop on 429.** A rate limit means the remaining calls would fail too;
 *   hammering them turns a slow run into a broken one.
 * - **Continue past a single item's failure**, so one bad draft doesn't strand
 *   the other twenty-four.
 */
export function useSequentialBatch({
  operation,
  isAlreadyDone,
  logLabel,
}: SequentialBatchOptions): UseSequentialBatchReturn {
  const [running, setRunning] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  // Flipped by the AppState listener; read between iterations.
  const backgroundedRef = useRef(false);
  const runningRef = useRef(false);

  // Latest-refs so `run` stays stable while still calling the current operation.
  const operationRef = useRef(operation);
  const isAlreadyDoneRef = useRef(isAlreadyDone);
  useEffect(() => {
    operationRef.current = operation;
    isAlreadyDoneRef.current = isAlreadyDone;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && runningRef.current) {
        backgroundedRef.current = true;
      }
    });
    return () => sub.remove();
  }, []);

  const run = useCallback(
    async (ids: string[]): Promise<BatchResult> => {
      const queue = ids.slice(0, BATCH_CAP);
      const succeededIds: string[] = [];
      let reason: BatchStopReason = 'done';
      let error: string | undefined;

      backgroundedRef.current = false;
      runningRef.current = true;
      setRunning(true);
      setProgressLabel(`0 / ${queue.length}`);

      try {
        for (let index = 0; index < queue.length; index += 1) {
          if (backgroundedRef.current) {
            reason = 'backgrounded';
            break;
          }

          const id = queue[index];
          try {
            await operationRef.current(id);
            succeededIds.push(id);
          } catch (err) {
            if (isAlreadyDoneRef.current?.(err)) {
              succeededIds.push(id);
            } else if ((err as { isRateLimited?: boolean })?.isRateLimited) {
              reason = 'rateLimited';
              break;
            } else {
              if (!error) error = err instanceof Error ? err.message : String(err);
              reason = 'failed';
              logger.warn(`${logLabel} Item failed`, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }

          setProgressLabel(`${index + 1} / ${queue.length}`);
        }
      } finally {
        runningRef.current = false;
        setRunning(false);
        setProgressLabel(null);
      }

      return { succeededIds, attempted: queue.length, reason, error };
    },
    [logLabel]
  );

  return { running, progressLabel, run };
}
