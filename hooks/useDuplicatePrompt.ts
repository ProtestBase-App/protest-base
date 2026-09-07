import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import type { DuplicateEventModalProps } from '@/components/DuplicateEventModal';
import { DuplicateEventError } from '@/services/event.service';
import type { DuplicateSummary } from '@/types/event.types';
import { duplicateHref } from '@/utils/duplicateEvents';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';

/** Everything `<DuplicateEventModal>` needs except `mode` and `locale`. */
type DuplicateModalProps = Omit<DuplicateEventModalProps, 'mode' | 'locale'>;

export interface UseDuplicatePromptReturn<T> {
  /**
   * Call from a catch block. Returns true when the error was a duplicate the
   * prompt took over — the caller should then stop, having reported nothing.
   * A 409 that lists no usable matches returns false so the caller falls back
   * to its normal error path: an empty dialog is worse than the message.
   */
  capture: (error: unknown, context: T) => boolean;
  /**
   * Spread onto `<DuplicateEventModal>`. `retry` is passed here, at the render
   * site, rather than to the hook: the submit function it re-runs is declared
   * BELOW the hook call (it needs `capture`), and closing over it any earlier
   * would be a forward reference.
   */
  modalProps: (retry: (context: T) => void) => DuplicateModalProps;
}

/**
 * The 409 DUPLICATE_EVENT half of a create or publish screen.
 *
 * Every screen that submits an event has the same three moving parts: hold the
 * matches from the refused request, show them, and — only if the organizer says
 * so — re-send the identical request with `duplicate_override`. Keeping that in
 * one place is what stops the parts that are easy to forget (the offline guard,
 * never auto-retrying, not opening an empty dialog) from being re-decided per
 * screen.
 *
 * `retry` receives the context the caller passed to `capture`, so a screen with
 * more than one submit path (create vs save-as-draft) or one row among many
 * (the drafts list) can send the right one again.
 */
export function useDuplicatePrompt<T = void>(options?: {
  isOffline?: boolean;
}): UseDuplicatePromptReturn<T> {
  const [prompt, setPrompt] = useState<{
    duplicates: DuplicateSummary[];
    canOverride: boolean;
    context: T;
  } | null>(null);

  const isOffline = options?.isOffline ?? false;

  const capture = useCallback((error: unknown, context: T): boolean => {
    if (!(error instanceof DuplicateEventError) || error.duplicates.length === 0) {
      return false;
    }
    setPrompt({ duplicates: error.duplicates, canOverride: error.canOverride, context });
    return true;
  }, []);

  const dismiss = useCallback(() => setPrompt(null), []);

  const openDuplicate = useCallback((duplicate: DuplicateSummary) => {
    setPrompt(null);
    router.push(duplicateHref(duplicate));
  }, []);

  const modalProps = useCallback(
    (retry: (context: T) => void): DuplicateModalProps => ({
      visible: prompt !== null,
      duplicates: prompt?.duplicates ?? [],
      canOverride: prompt?.canOverride ?? false,
      onDismiss: dismiss,
      onConfirm: () => {
        // The screens guard their first attempt; this is a separate entry point
        // that can be tapped minutes later, so it needs the same check.
        if (!assertOnlineOrAlert(isOffline)) return;
        if (!prompt) return;
        const { context } = prompt;
        setPrompt(null);
        retry(context);
      },
      onOpenDuplicate: openDuplicate,
    }),
    [prompt, dismiss, openDuplicate, isOffline]
  );

  return { capture, modalProps };
}
