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

import { Event } from '@/types/event.types';
import { EVENT_TIMEZONE, formatEventTime24h, parseAsUTC } from '@/utils/eventFormatters';
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
 */
export function formatDraftDateLine(startTime: string | undefined, locale: string): string | null {
  const startMs = parseStartMs(startTime);
  if (!Number.isFinite(startMs)) return null;

  const resolvedLocale = LOCALE_MAP[locale] ?? 'en-GB';
  const datePart = new Intl.DateTimeFormat(resolvedLocale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: EVENT_TIMEZONE,
  }).format(new Date(startMs));

  return `${datePart} · ${formatEventTime24h(startTime as string)}`;
}

/** Most recently edited first ($updatedAt, falling back to $createdAt). */
export function sortDraftsByLastEdited<T extends EditedTimestamps>(events: T[]): T[] {
  const editedMs = (event: EditedTimestamps): number => {
    const stamp = event.$updatedAt || event.$createdAt;
    if (!stamp) return 0;
    const ms = parseAsUTC(stamp).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  return [...events].sort((a, b) => editedMs(b) - editedMs(a));
}
