/**
 * Recurring events: the backend's series API.
 *
 * A series is one rule plus N ordinary events sharing `series_id`. The server
 * computes every date; the app sends a rule and never an instant, and everything
 * here is in Brussels terms (`HH:MM`, `YYYY-MM-DD`) unless it is named `*_time`.
 */

import type {
  CreateDraftRequest,
  CreateEventRequest,
  DuplicateWarningReport,
  EventStatus,
  UpdateEventRequest,
} from '@/types/event.types';

export type RecurrenceFrequency = 'weekly' | 'every_2_weeks' | 'monthly';

/** A string on the wire, never a number: JS `getDay()` and ISO disagree on what 1 means. */
export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/** Monthly only: the 1st to 4th `<weekday>` of the month, or -1 = the last one. */
export type WeekOfMonth = 1 | 2 | 3 | 4 | -1;

/**
 * The `recurrence` input of POST /events and of the preview. The backend rejects
 * unknown keys and a `null` in any of these, so optional fields are left out.
 */
export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  weekday: Weekday;
  /** Required for `monthly`, forbidden otherwise. */
  week_of_month?: WeekOfMonth;
  start_local: string;
  /** Earlier than `start_local` ends the next day. */
  end_local?: string;
  /** Defaults to today on the server; never in the past. */
  starts_on?: string;
  /** Inclusive. Exactly one of `until` / `count` on a create; neither on an open preview. */
  until?: string;
  /** Includes the first date. */
  count?: number;
}

type WithRecurrence<T> = Omit<T, 'start_time' | 'end_time' | 'all_day'> & {
  recurrence: RecurrenceInput;
};

/** A create that makes a whole series. `start_time` cannot be sent next to the rule. */
export type CreateSeriesRequest = WithRecurrence<CreateEventRequest>;
export type CreateSeriesDraftRequest = WithRecurrence<CreateDraftRequest>;

export interface RecurrenceOccurrence {
  start_time: string;
  /** `null` when the rule has no `end_local`. */
  end_time: string | null;
}

/** POST /events/recurrence/preview. `count` is what the create would make, `max` the cap. */
export interface RecurrencePreview {
  occurrences: RecurrenceOccurrence[];
  count: number;
  max: number;
  window_end: string;
}

interface EventSeriesRule {
  id: string;
  frequency: RecurrenceFrequency;
  weekday: Weekday;
  week_of_month: WeekOfMonth | null;
  /** `null` on an all-day series. */
  start_local: string | null;
  end_local: string | null;
  starts_on: string;
  /** 3 calendar months after the first date; no action ever moves it. */
  window_end: string;
  max_occurrences: number;
}

/** The `series` next to `data` on the 201 of a recurring create. */
export interface EventSeriesSummary extends EventSeriesRule {
  until: string;
  occurrence_count: number;
  occurrences: (RecurrenceOccurrence & { $id: string })[];
}

export interface EventSeriesOccurrence extends RecurrenceOccurrence {
  $id: string;
  status: EventStatus;
}

/**
 * GET /events/series/:id. `occurrences` is what the caller may see: members also
 * get the drafts, everyone else only `active`, `cancelled` and `past`.
 */
export interface EventSeries extends EventSeriesRule {
  until_date: string;
  occurrences: EventSeriesOccurrence[];
  can_add_dates: boolean;
}

/** "Only this event" goes through the single-event endpoints, so it is no series call. */
export type SeriesScope = 'only' | 'following';

/**
 * PUT /events/series/:id. The content fields of an event update plus the times; the
 * schedule is immutable, so `start_time`, `end_time` and `all_day` are out of reach.
 * `end_local: null` clears the end time.
 */
export type SeriesEditRequest = Omit<UpdateEventRequest, 'start_time' | 'end_time' | 'all_day'> & {
  start_local?: string;
  end_local?: string | null;
};

export interface SeriesEditResult {
  updated: number;
  series: EventSeries;
}

/** `series` is `null` when the action left nothing and the series went with it. */
export interface SeriesCancelResult {
  cancelled: number;
  deleted: number;
  series: EventSeries | null;
}

export interface SeriesDeleteResult {
  deleted: number;
  series: EventSeries | null;
}

export interface SeriesPublishResult {
  published: number;
  series: EventSeries;
}

export interface SeriesAddDatesResult {
  created: number;
  series: EventSeries;
}

/** Exactly one of the two. */
export type SeriesAddDatesRequest = { add_count: number } | { until: string };

/** Out-parameter of a create: the duplicate warnings, and the series when one was made. */
export interface CreateEventReport extends DuplicateWarningReport {
  series?: EventSeriesSummary;
}

/** The Repeat control's choice; `once` is an ordinary single event. */
export type RepeatFrequency = 'once' | RecurrenceFrequency;

/** How the series ends: after a number of dates, or on a date. */
export type RepeatEndMode = 'count' | 'until';

/** The Repeat control's values, as the form holds them. Empty strings are "not filled". */
export interface RepeatFormState {
  frequency: RepeatFrequency;
  weekday: Weekday;
  weekOfMonth: WeekOfMonth;
  startLocal: string;
  endLocal: string;
  startsOn: string;
  endMode: RepeatEndMode;
  until: string;
  /** As typed, so a half-entered number survives a render. */
  count: string;
}
