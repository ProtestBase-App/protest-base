import { deleteEvent, EventNotDraftError, publishDraft } from '@/services/event.service';
import {
  BATCH_CAP,
  BatchResult,
  BatchStopReason,
  useSequentialBatch,
  UseSequentialBatchReturn,
} from '@/hooks/useSequentialBatch';

/** Hard cap per run. A batch is a foreground task; keep it finishable. */
export const BATCH_PUBLISH_CAP = BATCH_CAP;

export type { BatchStopReason };

export interface BatchPublishResult extends Omit<BatchResult, 'succeededIds'> {
  /** Ids that are public now (includes EVENT_NOT_DRAFT — already published counts as done). */
  publishedIds: string[];
}

interface UseBatchPublishReturn extends Omit<UseSequentialBatchReturn, 'run'> {
  /** Publishes up to BATCH_PUBLISH_CAP ids, sequentially. */
  run: (ids: string[]) => Promise<BatchPublishResult>;
}

/**
 * Batch publish for the drafts list.
 *
 * An EVENT_NOT_DRAFT 409 counts as success: the draft is already public
 * (typically published from the web dashboard), so the user's intent for it is
 * satisfied and the run should carry on rather than treat it as a failure.
 *
 * A DUPLICATE_EVENT 409 is the opposite — nothing was published — so it stays a
 * per-item failure and the run reports it honestly in "Published X of Y". There
 * is deliberately no override here: acknowledging a duplicate is a per-event
 * decision that needs the matches on screen, which a batch cannot offer. The
 * organizer publishes those one at a time from the list.
 *
 * Suspend-safety, the 429 stop and the per-item failure policy all come from
 * `useSequentialBatch`.
 */
export function useBatchPublish(): UseBatchPublishReturn {
  const { running, progressLabel, run } = useSequentialBatch({
    operation: (id) => publishDraft(id),
    isAlreadyDone: (error) => error instanceof EventNotDraftError,
    logLabel: '[BatchPublish]',
  });

  return {
    running,
    progressLabel,
    run: async (ids) => {
      const { succeededIds, ...rest } = await run(ids);
      return { ...rest, publishedIds: succeededIds };
    },
  };
}

export interface BatchDeleteResult extends Omit<BatchResult, 'succeededIds'> {
  /** Ids that no longer exist. */
  deletedIds: string[];
}

interface UseBatchDeleteReturn extends Omit<UseSequentialBatchReturn, 'run'> {
  /** Deletes up to BATCH_CAP ids, sequentially. */
  run: (ids: string[]) => Promise<BatchDeleteResult>;
}

/**
 * Batch delete for past-dated drafts.
 *
 * Deliberately has no `isAlreadyDone` equivalent and no undo: `DELETE /events/:id`
 * is irreversible, and the 5s undo that makes a single delete safe in triage does
 * not scale to a batch. The safety therefore lives entirely in the confirmation
 * the caller shows and in the cap — see the drafts list.
 */
export function useBatchDelete(): UseBatchDeleteReturn {
  const { running, progressLabel, run } = useSequentialBatch({
    operation: (id) => deleteEvent(id),
    logLabel: '[BatchDelete]',
  });

  return {
    running,
    progressLabel,
    run: async (ids) => {
      const { succeededIds, ...rest } = await run(ids);
      return { ...rest, deletedIds: succeededIds };
    },
  };
}
