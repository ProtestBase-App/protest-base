/**
 * Display helpers for the backend's duplicate-event guard.
 *
 * Kept out of `services/` and out of the modal so the screens, the modal and the
 * tests share exactly one interpretation of a `DuplicateSummary`.
 */

import { Alert } from 'react-native';

import { DynamicRoutes } from '@/constants/Routes';
import type {
  DuplicateRelationship,
  DuplicateSummary,
  DuplicateWarningReport,
} from '@/types/event.types';
import { formatEventDateTimeLabel, isBelgiumMidnight } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { formatOccurrenceDate } from '@/utils/recurrence';

/**
 * Where "Open" on a match should go.
 *
 * A `draft` match is always the submitter's own draft — the backend's candidate
 * scope for the human paths is "published events from anyone + drafts of the
 * submitting organization only" — so the draft editor is always reachable. Every
 * other status is a public event.
 */
export function duplicateHref(duplicate: DuplicateSummary) {
  return duplicate.status === 'draft'
    ? DynamicRoutes.draftEdit(duplicate.id)
    : DynamicRoutes.event(duplicate.id);
}

/** Localized title, falling back to the drafts placeholder for an untitled match. */
export function duplicateTitle(duplicate: DuplicateSummary): string {
  return duplicate.title?.trim() || t('drafts.untitled');
}

/**
 * "Sunday July 14 at 10:00 AM", or null when the match carries no start time.
 *
 * `DuplicateSummary` has no `all_day` field, so a date-only match cannot be
 * identified from the payload — Brussels midnight stands in for it, the same
 * heuristic `allDaySubmitField` uses. The cost of being wrong is one genuine
 * midnight vigil rendering as "All day" in this list; the cost of not doing it
 * is every scraped all-day event rendering as "at 12:00 AM".
 */
export function formatDuplicateWhen(
  duplicate: DuplicateSummary,
  locale: string = 'en'
): string | null {
  if (!duplicate.start_time) return null;
  // start_time is free-form on the wire and the formatters throw on an
  // unparseable one (Intl rejects an Invalid Date). A bad date must cost the
  // meta line, not the screen the modal is rendering into.
  if (Number.isNaN(new Date(duplicate.start_time).getTime())) return null;
  return formatEventDateTimeLabel(
    { start_time: duplicate.start_time, all_day: isBelgiumMidnight(duplicate.start_time) },
    locale
  );
}

/** "Sunday July 14 at 10:00 AM · Brussels" — either half may be missing. */
export function formatDuplicateMeta(
  duplicate: DuplicateSummary,
  locale: string = 'en'
): string | null {
  const parts = [formatDuplicateWhen(duplicate, locale), duplicate.city?.trim() || null].filter(
    (part): part is string => !!part
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * A stable key for a match: on a series, one existing event can clash with several of
 * the dates being submitted, and then its id alone repeats.
 */
export function duplicateKey(duplicate: DuplicateSummary): string {
  return `${duplicate.id}-${duplicate.occurrence_start_time ?? ''}`;
}

/** How many events these matches are: on a series, one event can be listed per date. */
export function countDistinctDuplicates(duplicates: DuplicateSummary[]): number {
  return new Set(duplicates.map((duplicate) => duplicate.id)).size;
}

/** "Your date: Tue 3 Nov", the date of a series that clashed; null on a single event. */
export function formatDuplicateYourDate(
  duplicate: DuplicateSummary,
  locale: string = 'en'
): string | null {
  const start = duplicate.occurrence_start_time;
  if (!start || Number.isNaN(new Date(start).getTime())) return null;
  return t('duplicates.yourDate', { date: formatOccurrenceDate(start, locale) });
}

/**
 * The one-line explanation shown under a match, keyed by how the submitting
 * organization relates to it. `other_org` is the only one that suggests an
 * action the app cannot perform for the user: there is no co-organizer invite
 * mechanism (a co-organizer is set by the owning organization), so the copy asks
 * them to get in touch rather than offering a button.
 */
export function relationshipMessageKey(relationship: DuplicateRelationship): string {
  switch (relationship) {
    case 'own':
      return 'duplicates.relationshipOwn';
    case 'co_organized':
      return 'duplicates.relationshipCoOrganized';
    default:
      return 'duplicates.relationshipOtherOrg';
  }
}

/** "Open" for something the user owns, "View" for another organization's event. */
export function relationshipOpenLabelKey(relationship: DuplicateRelationship): string {
  return relationship === 'other_org' ? 'duplicates.view' : 'duplicates.open';
}

/**
 * The non-blocking "looks similar to X" line for a SUCCESSFUL create or publish
 * (`warnings.possibleDuplicates`), or null when the backend flagged nothing.
 *
 * This is warn mode's whole client surface: the event was created/published, we
 * just tell the organizer what it resembles.
 */
export function duplicateWarningNote(
  report: DuplicateWarningReport,
  locale: string = 'en'
): string | null {
  const matches = report.possibleDuplicates;
  if (!matches || matches.length === 0) return null;

  const first = matches[0];
  const distinct = countDistinctDuplicates(matches);
  const note =
    distinct === 1
      ? t('duplicates.warningNote', { title: duplicateTitle(first) })
      : t('duplicates.warningNoteMany', {
          title: duplicateTitle(first),
          count: distinct - 1,
        });

  // On a series, say which of the submitted dates clashed, each one once.
  const clashing = [
    ...new Set(
      matches
        .map((match) => match.occurrence_start_time)
        .filter((start): start is string => !!start && !Number.isNaN(new Date(start).getTime()))
    ),
  ].sort();
  if (clashing.length === 0) return note;
  const dates = clashing.map((start) => formatOccurrenceDate(start, locale)).join(', ');
  return `${note}\n${t('duplicates.clashingDates', { dates })}`;
}

/**
 * Success alert that appends the duplicate warning when there is one, with a
 * button that opens the match. With no warning it is exactly the alert the
 * screen showed before the guard existed — that is the "a plain 201/200 behaves
 * as today" rule.
 *
 * `onView` receives the first match; the caller navigates (this file stays free
 * of the router so it can be imported from anywhere). `onClean` replaces the
 * plain alert when there is nothing to warn about — the drafts list announces a
 * clean publish with a transient toast instead, and passing it here keeps that
 * branch from recomputing the note.
 */
export function alertWithDuplicateWarning(
  title: string,
  message: string,
  report: DuplicateWarningReport,
  onView: (duplicate: DuplicateSummary) => void,
  onClean?: () => void,
  locale?: string
): void {
  const note = duplicateWarningNote(report, locale);
  if (!note) {
    if (onClean) onClean();
    else Alert.alert(title, message);
    return;
  }

  const first = report.possibleDuplicates![0];
  Alert.alert(title, `${message}\n\n${note}`, [
    { text: t(relationshipOpenLabelKey(first.relationship)), onPress: () => onView(first) },
    { text: t('common.ok'), style: 'cancel' },
  ]);
}
