import { parseAsUTC } from '@/utils/eventFormatters';

/**
 * Client-side publish-readiness check for draft events.
 *
 * Two rules mirror the backend's collectPublishReadinessErrors (publish returns
 * 422 EVENT_INCOMPLETE): a non-empty description and at least one category. The
 * future start_time rule is FRONTEND-ONLY — the backend will happily publish a
 * past-dated draft straight into `past`. Running this check before calling
 * publishDraft() reports every problem at once and blocks the past-date footgun.
 *
 * Location is intentionally NOT a rule; see the comment in getPublishIssues.
 * The website's equivalent util makes the same three-rule choice.
 */

export type PublishIssueCode =
  | 'DESCRIPTION_REQUIRED'
  | 'CATEGORY_REQUIRED'
  | 'LOCATION_REQUIRED'
  | 'START_TIME_FUTURE_REQUIRED'
  | 'INCOMPLETE';

export interface PublishIssue {
  /** The form/event field the issue relates to. */
  field: string;
  code: PublishIssueCode;
  /** i18n key for the user-facing message. */
  messageKey: string;
}

/**
 * Accepts both FormState (categories as a single string) and a raw Event
 * (categories as string[]), so the editor can check the in-progress form.
 */
export interface PublishReadinessInput {
  description?: string | null;
  categories?: string | string[] | null;
  city?: string | null;
  street_address?: string | null;
  start_time?: string | null;
}

const CODE_TO_MESSAGE_KEY: Record<PublishIssueCode, string> = {
  DESCRIPTION_REQUIRED: 'drafts.issueDescription',
  CATEGORY_REQUIRED: 'drafts.issueCategory',
  LOCATION_REQUIRED: 'drafts.issueLocation',
  START_TIME_FUTURE_REQUIRED: 'drafts.issueStartTime',
  INCOMPLETE: 'drafts.issueIncomplete',
};

function hasNonEmpty(value?: string | null): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function hasCategory(categories?: string | string[] | null): boolean {
  if (!categories) return false;
  if (Array.isArray(categories)) return categories.some((c) => hasNonEmpty(c));
  return hasNonEmpty(categories);
}

function isFutureStart(startTime: string | null | undefined, now: Date): boolean {
  if (!hasNonEmpty(startTime)) return false;
  const date = parseAsUTC(startTime as string);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > now.getTime();
}

/**
 * Return every publish-blocking issue at once (empty array means ready).
 * Pass `now` to evaluate the future-start rule against a render-stable clock
 * (e.g. the drafts list's per-refresh clock); it defaults to the current time.
 */
export function getPublishIssues(
  input: PublishReadinessInput,
  now: Date = new Date()
): PublishIssue[] {
  const issues: PublishIssue[] = [];

  if (!hasNonEmpty(input.description)) {
    issues.push({
      field: 'description',
      code: 'DESCRIPTION_REQUIRED',
      messageKey: CODE_TO_MESSAGE_KEY.DESCRIPTION_REQUIRED,
    });
  }

  if (!hasCategory(input.categories)) {
    issues.push({
      field: 'categories',
      code: 'CATEGORY_REQUIRED',
      messageKey: CODE_TO_MESSAGE_KEY.CATEGORY_REQUIRED,
    });
  }

  // Location (city/street_address) is deliberately NOT checked: the backend's
  // collectPublishReadinessErrors gates description + categories only, so gating
  // it here refused publishes the web dashboard performs happily — and automation
  // drafts are the class most likely to arrive without a city. LOCATION_REQUIRED
  // stays in the vocabulary below so a future backend 422 naming a location field
  // still renders a real label instead of the generic fallback.

  if (!isFutureStart(input.start_time, now)) {
    issues.push({
      field: 'start_time',
      code: 'START_TIME_FUTURE_REQUIRED',
      messageKey: CODE_TO_MESSAGE_KEY.START_TIME_FUTURE_REQUIRED,
    });
  }

  return issues;
}

/**
 * Map a backend field name (from a 422 EVENT_INCOMPLETE `fields[]`) to a
 * publish-issue message key, so a server-side rejection can be surfaced with the
 * same wording as the client check. Unknown fields fall back to a generic key.
 */
export function publishFieldToMessageKey(field: string): string {
  switch (field) {
    case 'description':
      return CODE_TO_MESSAGE_KEY.DESCRIPTION_REQUIRED;
    case 'categories':
      return CODE_TO_MESSAGE_KEY.CATEGORY_REQUIRED;
    case 'city':
    case 'street_address':
    case 'location':
      return CODE_TO_MESSAGE_KEY.LOCATION_REQUIRED;
    case 'start_time':
      return CODE_TO_MESSAGE_KEY.START_TIME_FUTURE_REQUIRED;
    default:
      return CODE_TO_MESSAGE_KEY.INCOMPLETE;
  }
}
