/**
 * Pure state machine for triage mode — one draft at a time, one decision each.
 *
 * Kept out of the screen so the two non-obvious behaviours are testable without
 * gestures: a deferred delete that is only sent after a 5s undo window, and a
 * counter that keeps reconciling (decisions made always equals the queue
 * snapshot) even as undo puts a card back.
 *
 * The reducer never performs I/O. The screen owns the network calls and the
 * undo timer; this only records what the user decided.
 */

import { Event } from '@/types/event.types';

export type TriageDecision = 'published' | 'rescheduled' | 'deleted' | 'skipped';

export interface PendingDelete {
  event: Event;
  /** Position to restore to when undone. */
  index: number;
}

export interface TriageState {
  /** Working queue: a delete removes from it, an undo puts the card back. */
  queue: Event[];
  /** Pointer into `queue`; `index >= queue.length` means the queue is cleared. */
  index: number;
  /** Immutable length of the entry snapshot — the denominator of the counter. */
  total: number;
  decisions: Record<string, TriageDecision>;
  /** Delete awaiting its undo window; null once flushed or undone. */
  pendingDelete: PendingDelete | null;
  /** Reschedule shortcut taps not yet saved, keyed by draft id. */
  pendingDate: Record<string, string>;
}

export type TriageAction =
  | { type: 'init'; queue: Event[] }
  | { type: 'setDate'; id: string; isoDate: string }
  /** Publish / reschedule-then-publish / skip: records and advances. */
  | { type: 'decide'; id: string; decision: Exclude<TriageDecision, 'deleted'> }
  /** Removes the card now, but the DELETE call is deferred by the caller. */
  | { type: 'deleteDeferred' }
  | { type: 'undoDelete' }
  /** The undo window closed (or was flushed): the delete is final. */
  | { type: 'clearPendingDelete' };

export function createTriageState(queue: Event[] = []): TriageState {
  return {
    queue,
    index: 0,
    total: queue.length,
    decisions: {},
    pendingDelete: null,
    pendingDate: {},
  };
}

export function triageReducer(state: TriageState, action: TriageAction): TriageState {
  switch (action.type) {
    case 'init':
      return createTriageState(action.queue);

    case 'setDate':
      return {
        ...state,
        pendingDate: { ...state.pendingDate, [action.id]: action.isoDate },
      };

    case 'decide':
      return {
        ...state,
        decisions: { ...state.decisions, [action.id]: action.decision },
        index: state.index + 1,
      };

    case 'deleteDeferred': {
      const event = state.queue[state.index];
      if (!event) return state;
      const queue = [...state.queue];
      queue.splice(state.index, 1);
      return {
        ...state,
        queue,
        // The next card slides into this index, so the pointer stays put.
        index: state.index,
        decisions: { ...state.decisions, [event.$id]: 'deleted' },
        pendingDelete: { event, index: state.index },
      };
    }

    case 'undoDelete': {
      if (!state.pendingDelete) return state;
      const { event, index } = state.pendingDelete;
      const queue = [...state.queue];
      queue.splice(index, 0, event);
      const decisions = { ...state.decisions };
      delete decisions[event.$id];
      return { ...state, queue, index, decisions, pendingDelete: null };
    }

    case 'clearPendingDelete':
      return { ...state, pendingDelete: null };

    default:
      return state;
  }
}

/** The draft currently under the user's thumb, or null at the end of the queue. */
export function currentDraft(state: TriageState): Event | null {
  return state.queue[state.index] ?? null;
}

/** True once every card has a decision. */
export function isQueueCleared(state: TriageState): boolean {
  return state.index >= state.queue.length;
}

/** How many decisions have been made — the counter's numerator. */
export function decidedCount(state: TriageState): number {
  return Object.keys(state.decisions).length;
}

export interface TriageSummary {
  published: number;
  rescheduled: number;
  deleted: number;
  skipped: number;
}

/**
 * Receipt counts. 'rescheduled' is kept separate from 'published' on purpose:
 * the user performed one action ("fix the date and publish"), even though the
 * API saw two calls. The receipt mirrors intent, not round-trips.
 */
export function summarizeDecisions(state: TriageState): TriageSummary {
  const summary: TriageSummary = { published: 0, rescheduled: 0, deleted: 0, skipped: 0 };
  for (const decision of Object.values(state.decisions)) {
    summary[decision] += 1;
  }
  return summary;
}

/** Ids the user skipped, in queue order, for the "review what I skipped" link. */
export function skippedIds(state: TriageState): string[] {
  return Object.entries(state.decisions)
    .filter(([, decision]) => decision === 'skipped')
    .map(([id]) => id);
}
