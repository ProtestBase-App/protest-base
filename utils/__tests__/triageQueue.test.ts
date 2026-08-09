/**
 * Tests for utils/triageQueue.ts — the triage-mode state machine.
 *
 * The two behaviours worth pinning are the ones a user would notice going
 * wrong: undo must put a card back exactly where it was, and the counter must
 * keep reconciling with the queue snapshot no matter what order decisions and
 * undos arrive in.
 */

import { Event } from '@/types/event.types';
import {
  createTriageState,
  currentDraft,
  decidedCount,
  isQueueCleared,
  skippedIds,
  summarizeDecisions,
  triageReducer,
  TriageState,
} from '@/utils/triageQueue';

function draft(id: string, title = `Draft ${id}`): Event {
  return { $id: id, title, organizer_name: 'Org' } as Event;
}

const QUEUE = [draft('a'), draft('b'), draft('c')];

function reduce(
  state: TriageState,
  ...actions: Parameters<typeof triageReducer>[1][]
): TriageState {
  return actions.reduce(triageReducer, state);
}

describe('triageQueue', () => {
  describe('createTriageState', () => {
    it('snapshots the queue length as the immutable total', () => {
      const state = createTriageState(QUEUE);
      expect(state.total).toBe(3);
      expect(state.index).toBe(0);
      expect(currentDraft(state)?.$id).toBe('a');
      expect(isQueueCleared(state)).toBe(false);
    });

    it('treats an empty queue as already cleared', () => {
      expect(isQueueCleared(createTriageState([]))).toBe(true);
    });
  });

  describe('decide', () => {
    it('advances through the queue and reports it cleared at the end', () => {
      let state = createTriageState(QUEUE);
      state = reduce(
        state,
        { type: 'decide', id: 'a', decision: 'published' },
        { type: 'decide', id: 'b', decision: 'skipped' },
        { type: 'decide', id: 'c', decision: 'rescheduled' }
      );

      expect(isQueueCleared(state)).toBe(true);
      expect(currentDraft(state)).toBeNull();
      expect(decidedCount(state)).toBe(3);
    });

    it('keeps rescheduled separate from published in the receipt', () => {
      let state = createTriageState(QUEUE);
      state = reduce(
        state,
        { type: 'decide', id: 'a', decision: 'published' },
        { type: 'decide', id: 'b', decision: 'rescheduled' },
        { type: 'decide', id: 'c', decision: 'skipped' }
      );

      expect(summarizeDecisions(state)).toEqual({
        published: 1,
        rescheduled: 1,
        deleted: 0,
        skipped: 1,
      });
    });

    it('lists skipped ids for the review link', () => {
      let state = createTriageState(QUEUE);
      state = reduce(
        state,
        { type: 'decide', id: 'a', decision: 'skipped' },
        { type: 'decide', id: 'b', decision: 'published' },
        { type: 'decide', id: 'c', decision: 'skipped' }
      );

      expect(skippedIds(state)).toEqual(['a', 'c']);
    });
  });

  describe('deferred delete', () => {
    it('removes the card and holds it as pending, without advancing past it', () => {
      const state = triageReducer(createTriageState(QUEUE), { type: 'deleteDeferred' });

      expect(state.pendingDelete?.event.$id).toBe('a');
      expect(state.pendingDelete?.index).toBe(0);
      expect(state.queue.map((e) => e.$id)).toEqual(['b', 'c']);
      // The next card slides into the same slot.
      expect(currentDraft(state)?.$id).toBe('b');
      expect(state.decisions.a).toBe('deleted');
      expect(decidedCount(state)).toBe(1);
    });

    it('undo reinserts at the original index and steps the counter back', () => {
      let state = createTriageState(QUEUE);
      // Decide the first card, then delete the second.
      state = reduce(
        state,
        { type: 'decide', id: 'a', decision: 'published' },
        { type: 'deleteDeferred' }
      );
      expect(state.queue.map((e) => e.$id)).toEqual(['a', 'c']);
      expect(decidedCount(state)).toBe(2);

      state = triageReducer(state, { type: 'undoDelete' });

      expect(state.queue.map((e) => e.$id)).toEqual(['a', 'b', 'c']);
      expect(currentDraft(state)?.$id).toBe('b');
      expect(state.decisions.b).toBeUndefined();
      expect(decidedCount(state)).toBe(1);
      expect(state.pendingDelete).toBeNull();
    });

    it('undo restores a middle card to its slot, not to the end', () => {
      let state = createTriageState(QUEUE);
      state = reduce(
        state,
        { type: 'decide', id: 'a', decision: 'published' },
        { type: 'deleteDeferred' },
        { type: 'undoDelete' }
      );

      expect(state.queue.map((e) => e.$id)).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op when there is nothing pending to undo', () => {
      const state = createTriageState(QUEUE);
      expect(triageReducer(state, { type: 'undoDelete' })).toBe(state);
    });

    it('clearing the pending delete keeps the decision recorded', () => {
      let state = triageReducer(createTriageState(QUEUE), { type: 'deleteDeferred' });
      state = triageReducer(state, { type: 'clearPendingDelete' });

      expect(state.pendingDelete).toBeNull();
      expect(state.decisions.a).toBe('deleted');
      expect(summarizeDecisions(state).deleted).toBe(1);
    });

    it('does nothing when the queue is already exhausted', () => {
      const state = createTriageState([]);
      expect(triageReducer(state, { type: 'deleteDeferred' })).toBe(state);
    });

    // The receipt promises decisions === queue length; deleting shrinks the
    // working queue, so this is where that could silently drift.
    it('reconciles decisions against the snapshot after a delete', () => {
      let state = createTriageState(QUEUE);
      state = reduce(
        state,
        { type: 'deleteDeferred' },
        { type: 'decide', id: 'b', decision: 'published' },
        { type: 'decide', id: 'c', decision: 'skipped' }
      );

      const summary = summarizeDecisions(state);
      expect(summary.deleted + summary.published + summary.skipped + summary.rescheduled).toBe(
        state.total
      );
      expect(isQueueCleared(state)).toBe(true);
    });
  });

  describe('pendingDate', () => {
    it('records a chosen date per draft without deciding it', () => {
      const state = triageReducer(createTriageState(QUEUE), {
        type: 'setDate',
        id: 'a',
        isoDate: '2026-09-05T12:00:00.000Z',
      });

      expect(state.pendingDate.a).toBe('2026-09-05T12:00:00.000Z');
      expect(state.decisions.a).toBeUndefined();
      expect(state.index).toBe(0);
    });
  });

  describe('init', () => {
    it('replaces the whole state, dropping earlier decisions', () => {
      let state = triageReducer(createTriageState(QUEUE), {
        type: 'decide',
        id: 'a',
        decision: 'published',
      });
      state = triageReducer(state, { type: 'init', queue: [draft('z')] });

      expect(state.total).toBe(1);
      expect(state.decisions).toEqual({});
      expect(currentDraft(state)?.$id).toBe('z');
    });
  });
});
