import { useState } from 'react';

import type { EventFormErrors, EventFormIntent, EventFormIssue } from '@/types/eventForm.types';

const NO_ISSUES: EventFormIssue[] = [];

/** A submit the form stopped, with what stopped it. */
export interface RefusedSubmit {
  intent: EventFormIntent;
  issues: EventFormIssue[];
}

export interface EventFormValidation {
  /** What is wrong right now, in form order. Empty until a submit is refused. */
  issues: EventFormIssue[];
  /** The same issues, by field. */
  errors: EventFormErrors;
  /** The last refused submit. A new object each time, so each one can jump to its first issue. */
  refused: RefusedSubmit | null;
  /** Whether the submit can go ahead. If not, its issues show until they are fixed. */
  check: (intent: EventFormIntent) => boolean;
}

/**
 * Validation for a form screen. Nothing shows until a submit is refused, and from then
 * on the issues follow the form, so a message leaves as soon as its field is fixed.
 */
export function useEventFormValidation(
  validate: (intent: EventFormIntent) => EventFormIssue[]
): EventFormValidation {
  const [refused, setRefused] = useState<RefusedSubmit | null>(null);

  const issues = refused ? validate(refused.intent) : NO_ISSUES;
  const errors: EventFormErrors = Object.fromEntries(
    issues.map((issue) => [issue.field, issue.message])
  );

  const check = (intent: EventFormIntent) => {
    const found = validate(intent);
    setRefused(found.length > 0 ? { intent, issues: found } : null);
    return found.length === 0;
  };

  return { issues, errors, refused, check };
}
