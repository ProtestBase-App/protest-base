/**
 * Pure helpers for the drafts list redesign: publish-status derivation
 * (ready / missing fields / past date), last-edited recency parts, the
 * draft card's date line, and last-edited sorting.
 *
 * Status semantics mirror `eventPublishReadiness.getPublishIssues` — the
 * single source of truth for what blocks a publish — but split its
 * START_TIME_FUTURE_REQUIRED issue into "date missing" vs "date has passed",
 * which the design treats differently (secondary missing-line vs amber
 * warning + strikethrough).
 */

import { CONFIDENCE_BANDS } from '@/constants/EventConfig';
import { Event } from '@/types/event.types';
import {
  EVENT_TIMEZONE,
  formatEventTime24h,
  getAllDayLabel,
  getDateFormatter,
  parseAsUTC,
} from '@/utils/eventFormatters';
import { getPublishIssues } from '@/utils/eventPublishReadiness';

export type DraftStatusKind = 'ready' | 'missing' | 'pastDate';

export interface DraftStatus {
  kind: DraftStatusKind;
  /**
   * i18n keys of the short field labels for the "Missing: …" line. Can be
   * non-empty for 'pastDate' too (the warning takes display precedence, but
   * Publish stays blocked by the other fields as well).
   */
  missingFieldKeys: string[];
}

const FIELD_TO_LABEL_KEY: Record<string, string> = {
  description: 'drafts.fieldDescription',
  categories: 'drafts.fieldCategory',
  location: 'drafts.fieldLocation',
  start_time: 'drafts.fieldDate',
};

function parseStartMs(startTime?: string | null): number {
  if (typeof startTime !== 'string' || startTime.trim() === '') return NaN;
  return parseAsUTC(startTime).getTime();
}

/** Derive the card status. Publish is allowed only for kind 'ready'. */
export function getDraftStatus(event: Event, now: Date): DraftStatus {
  // Both the readiness check and the past-date split run on the same clock —
  // mixed clocks would render "Missing: date" for a date that just passed.
  const issues = getPublishIssues(
    {
      description: event.description,
      categories: event.categories,
      city: event.city,
      street_address: event.street_address,
      start_time: event.start_time,
    },
    now
  );

  // A valid start that is not in the future is "date has passed"; a blank or
  // unparseable start stays a plain "missing date" entry.
  const startMs = parseStartMs(event.start_time);
  const hasPastDate = Number.isFinite(startMs) && startMs <= now.getTime();

  const missingFieldKeys = issues
    .filter((issue) => !(issue.field === 'start_time' && hasPastDate))
    .map((issue) => FIELD_TO_LABEL_KEY[issue.field] ?? FIELD_TO_LABEL_KEY.start_time);

  if (hasPastDate) return { kind: 'pastDate', missingFieldKeys };
  if (missingFieldKeys.length > 0) return { kind: 'missing', missingFieldKeys };
  return { kind: 'ready', missingFieldKeys: [] };
}

export interface EditedAgoParts {
  /** i18n key under drafts.* (some take a {{count}} interpolation). */
  key: string;
  count?: number;
}

/** Anything carrying the standard metadata timestamps (events, templates). */
export interface EditedTimestamps {
  $updatedAt?: string;
  $createdAt?: string;
}

/**
 * Coarse "Edited 2 h ago" recency from $updatedAt (falling back to
 * $createdAt). Returns null when the item carries no timestamps.
 */
export function getEditedAgoParts(event: EditedTimestamps, now: Date): EditedAgoParts | null {
  const stamp = event.$updatedAt || event.$createdAt;
  if (!stamp) return null;

  const elapsedMs = now.getTime() - parseAsUTC(stamp).getTime();
  if (!Number.isFinite(elapsedMs)) return null;

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return { key: 'drafts.editedJustNow' };
  if (minutes < 60) return { key: 'drafts.editedMinutesAgo', count: minutes };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: 'drafts.editedHoursAgo', count: hours };

  const days = Math.floor(hours / 24);
  if (days === 1) return { key: 'drafts.editedYesterday' };
  if (days < 7) return { key: 'drafts.editedDaysAgo', count: days };

  return { key: 'drafts.editedWeeksAgo', count: Math.floor(days / 7) };
}

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', nl: 'nl-NL' };

/**
 * "Sat 27 Jun · 13:00" date line for the draft card, in the Belgium event
 * timezone. Null when the draft has no (parseable) start time.
 *
 * `allDay` takes the flag rather than the whole event because triage passes a
 * pending rescheduled date instead of the stored one. That reschedule steps
 * whole weeks and keeps the clock time, so an all-day draft stays all-day
 * through it and callers pass the event's flag either way.
 */
export function formatDraftDateLine(
  startTime: string | undefined,
  locale: string,
  allDay?: boolean
): string | null {
  const startMs = parseStartMs(startTime);
  if (!Number.isFinite(startMs)) return null;

  const resolvedLocale = LOCALE_MAP[locale] ?? 'en-GB';
  const datePart = getDateFormatter(resolvedLocale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: EVENT_TIMEZONE,
  }).format(new Date(startMs));

  const timePart =
    allDay === true ? getAllDayLabel(locale) : formatEventTime24h(startTime as string);

  return `${datePart} · ${timePart}`;
}

/** Most recently edited first ($updatedAt, falling back to $createdAt). */
export function sortDraftsByLastEdited<T extends EditedTimestamps>(events: T[]): T[] {
  return [...events].sort((a, b) => editedMs(b) - editedMs(a));
}

function editedMs(event: EditedTimestamps): number {
  const stamp = event.$updatedAt || event.$createdAt;
  if (!stamp) return 0;
  const ms = parseAsUTC(stamp).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

// ---------------------------------------------------------------------------
// Confidence (source-match) score
//
// A deterministic measure of how much of an automation draft the crawler could
// corroborate against its source page. NOT accuracy, NOT an AI self-rating, and
// never a publish gate — advisory display and sorting only.
// ---------------------------------------------------------------------------

/**
 * True only for a real numeric score. `null`/absent means never scored (human
 * draft, or the source could not be crawled) and must render nothing, while a
 * scored `0` means nothing was corroborated and must render loudly — so every
 * call site gates on this, never on `!score`.
 */
export function hasConfidenceScore(event: Pick<Event, 'confidence_score'>): boolean {
  return typeof event.confidence_score === 'number';
}

export type ConfidenceBand = 'high' | 'medium' | 'low';

/** Band for a score that has already passed `hasConfidenceScore`. */
export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_BANDS.high) return 'high';
  if (score >= CONFIDENCE_BANDS.medium) return 'medium';
  return 'low';
}

/** Per-check outcome in the corroboration breakdown. */
export type ConfidenceCheckState = 'found' | 'partial' | 'notFound' | 'notChecked';

export interface ConfidenceCheck {
  /** Stable key: 'start_date' | 'start_time_of_day' | 'title' | 'city'. */
  field: string;
  state: ConfidenceCheckState;
  /**
   * Raw word-overlap ratio when the source reported one instead of a verdict
   * (title matching does this). Surfaced only in accessibility text.
   */
  ratio?: number;
}

/**
 * The checks the confidence score averaged over, in display order. Mirrors the
 * website's CONFIDENCE_FIELDS.
 */
export const CONFIDENCE_FIELDS = ['start_date', 'start_time_of_day', 'title', 'city'] as const;

/**
 * Normalize `confidence_details` into a fixed set of checks.
 *
 * The backend deliberately leaves this object free-form (the checks live in the
 * automation workflow and change without a backend deploy), so anything
 * unrecognised degrades to 'notChecked' rather than throwing or guessing.
 */
export function getConfidenceChecks(
  details: Record<string, unknown> | null | undefined
): ConfidenceCheck[] {
  return CONFIDENCE_FIELDS.map((field) => {
    const raw = details?.[field];

    if (typeof raw === 'number') {
      // A ratio, not a verdict: 1 is a full match, 0 is no overlap, anything
      // between is partial. Never presented as a percentage of correctness.
      if (raw >= 1) return { field, state: 'found' as const, ratio: raw };
      if (raw <= 0) return { field, state: 'notFound' as const, ratio: raw };
      return { field, state: 'partial' as const, ratio: raw };
    }

    if (typeof raw === 'boolean') {
      return { field, state: raw ? ('found' as const) : ('notFound' as const) };
    }

    if (typeof raw === 'string') {
      const value = raw.toLowerCase();
      if (value === 'found' || value === 'true' || value === 'yes') {
        return { field, state: 'found' as const };
      }
      if (value === 'partial' || value === 'partly') return { field, state: 'partial' as const };
      if (value === 'not_found' || value === 'false' || value === 'no') {
        return { field, state: 'notFound' as const };
      }
    }

    return { field, state: 'notChecked' as const };
  });
}

/** How many of the breakdown's checks actually ran (i.e. are not 'notChecked'). */
export function countChecksRan(checks: ConfidenceCheck[]): number {
  return checks.filter((check) => check.state !== 'notChecked').length;
}

/** True when the score was capped because the date could not be corroborated. */
export function isCappedByStartDate(details: Record<string, unknown> | null | undefined): boolean {
  return details?.capped_by === 'start_date';
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type DraftSortKey = 'lastEdited' | 'date' | 'confidence';
export type DraftSortDirection = 'asc' | 'desc';

/**
 * The direction each sort key means when the user just picks the key.
 *
 * These are not symmetrical, because each answers a different question:
 * "what did I touch last" (newest first), "what happens soonest" (earliest
 * first), and "what should I check first" (lowest corroboration first — the
 * triage order the website uses).
 */
export const DEFAULT_SORT_DIRECTION: Record<DraftSortKey, DraftSortDirection> = {
  lastEdited: 'desc',
  date: 'asc',
  confidence: 'asc',
};

/**
 * Sort drafts for the list. Tie-break rules are ported verbatim from the
 * website, because they are the non-obvious half of the contract:
 *
 * - Undated drafts sort LAST in BOTH date directions (they are not "oldest"),
 *   with creation date breaking ties among them.
 * - Unscored drafts sort LAST under confidence, never treated as a 0 — a
 *   never-scored human draft is not the same as a draft that scored zero.
 */
export function sortDrafts<T extends Event>(
  events: T[],
  key: DraftSortKey,
  direction: DraftSortDirection = 'desc'
): T[] {
  const sign = direction === 'asc' ? 1 : -1;

  return [...events].sort((a, b) => {
    // desc = most recently edited first (the list's default).
    if (key === 'lastEdited') {
      return sign * (editedMs(a) - editedMs(b));
    }

    if (key === 'date') {
      const aMs = parseStartMs(a.start_time);
      const bMs = parseStartMs(b.start_time);
      const aDated = Number.isFinite(aMs);
      const bDated = Number.isFinite(bMs);
      // Undated last regardless of direction.
      if (!aDated && !bDated) return editedMs(b) - editedMs(a);
      if (!aDated) return 1;
      if (!bDated) return -1;
      if (aMs === bMs) return editedMs(b) - editedMs(a);
      return sign * (aMs - bMs);
    }

    // confidence
    const aScored = hasConfidenceScore(a);
    const bScored = hasConfidenceScore(b);
    // Unscored last regardless of direction — NOT sorted as 0.
    if (!aScored && !bScored) return editedMs(b) - editedMs(a);
    if (!aScored) return 1;
    if (!bScored) return -1;
    const aScore = a.confidence_score as number;
    const bScore = b.confidence_score as number;
    if (aScore === bScore) return editedMs(b) - editedMs(a);
    return sign * (aScore - bScore);
  });
}

// ---------------------------------------------------------------------------
// Reschedule shortcuts
// ---------------------------------------------------------------------------

export interface RescheduleOption {
  /** Full ISO start time preserving the original clock time. */
  isoDate: string;
  /** Pre-formatted "Sat 15 Aug" label in the event timezone. */
  label: string;
}

/**
 * The next two future occurrences of the original date's WEEKDAY, keeping its
 * clock time — a protest that was a Saturday is usually still a Saturday.
 *
 * Computed on UTC day arithmetic (the stored start times are UTC and the app
 * formats them in the Belgium event timezone), so it steps whole days and never
 * shifts the clock time across a DST boundary.
 *
 * @param startTime - The draft's current (past) start time
 * @param locale - App language for the label
 * @param now - Clock to measure "future" against
 * @returns Up to two options, or [] when the start time is missing/unparseable
 */
export function getRescheduleOptions(
  startTime: string | undefined | null,
  locale: string,
  now: Date = new Date()
): RescheduleOption[] {
  const startMs = parseStartMs(startTime);
  if (!Number.isFinite(startMs)) return [];

  const DAY_MS = 24 * 60 * 60 * 1000;
  // Advance whole weeks from the original date until it is in the future, so the
  // weekday and the time of day are both preserved exactly.
  let candidate = startMs;
  const nowMs = now.getTime();
  if (candidate <= nowMs) {
    const weeksBehind = Math.ceil((nowMs - candidate) / (7 * DAY_MS));
    candidate += weeksBehind * 7 * DAY_MS;
    // Ceil can land exactly on `now` (or a hair before it) — step one more week.
    if (candidate <= nowMs) candidate += 7 * DAY_MS;
  }

  return [candidate, candidate + 7 * DAY_MS].map((ms) => ({
    isoDate: new Date(ms).toISOString(),
    label: formatShortDayDate(ms, locale),
  }));
}

/** "Sat 15 Aug" in the event timezone. */
export function formatShortDayDate(ms: number, locale: string): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? 'en-GB';
  return getDateFormatter(resolvedLocale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: EVENT_TIMEZONE,
  }).format(new Date(ms));
}

/** True when `$createdAt` is within the last 48 hours. */
export function isNewDraft(event: EditedTimestamps, now: Date = new Date()): boolean {
  if (!event.$createdAt) return false;
  const createdMs = parseAsUTC(event.$createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  const elapsed = now.getTime() - createdMs;
  return elapsed >= 0 && elapsed <= 48 * 60 * 60 * 1000;
}
