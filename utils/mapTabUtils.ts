/**
 * Pure helpers for the Maps (Carte) tab: coordinate guards, time-window and
 * filter matching, chronological sorting, filter-option derivation, and the
 * compact card date label.
 *
 * All day keys are Belgium-timezone YYYY-MM-DD strings, consistent with
 * `utils/calendarUtils.ts` (events display in Europe/Brussels regardless of
 * device timezone).
 */

import { countries } from '@/constants/Countries';
import { Event } from '@/types/event.types';
import { getEventDateKeyInBelgium } from '@/utils/calendarUtils';
import { EVENT_TIMEZONE, parseAsUTC } from '@/utils/eventFormatters';

export type MapTimeFilter = 'all' | 'today' | 'week';

export interface MapFilters {
  /** Backend category values, e.g. ['Protest', 'Strike']. Empty = all. */
  categories: string[];
  /** Backend country value ('belgium' | 'netherlands') or null = all. */
  country: string | null;
  /** Postal-code tokens (see `postalTokenForEvent`). Empty = all. */
  postalCodes: string[];
  /** Organization IDs. Empty = all. */
  organizations: string[];
  savedOnly: boolean;
  helpNeeded: boolean;
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  categories: [],
  country: null,
  postalCodes: [],
  organizations: [],
  savedOnly: false,
  helpNeeded: false,
};

export interface MapFilterContext {
  isSaved: (eventId: string) => boolean;
}

/** Events without geocoded coordinates (incl. online events) are excluded. */
export function hasMapCoordinates(event: Event): boolean {
  return (
    typeof event.geocod_lat === 'number' &&
    Number.isFinite(event.geocod_lat) &&
    typeof event.geocod_lng === 'number' &&
    Number.isFinite(event.geocod_lng)
  );
}

/** Belgium-TZ day key the event ends on (start day when no end_time). */
function eventEndDateKey(event: Event): string {
  return event.end_time
    ? getEventDateKeyInBelgium(event.end_time)
    : getEventDateKeyInBelgium(event.start_time);
}

/** Shift a YYYY-MM-DD key by `days` (date-only math, no timezone involved). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Past events (ended before today in Belgium) never appear on the map. */
export function isNotEnded(event: Event, todayKey: string): boolean {
  if (!event.start_time) return false;
  return eventEndDateKey(event) >= todayKey;
}

/**
 * Quick time chips. 'today' includes multi-day events spanning today;
 * 'week' = events starting within the next 7 days (ongoing ones included).
 */
export function matchesTimeWindow(
  event: Event,
  timeFilter: MapTimeFilter,
  todayKey: string
): boolean {
  if (!isNotEnded(event, todayKey)) return false;
  if (timeFilter === 'all') return true;

  const startKey = getEventDateKeyInBelgium(event.start_time);
  if (timeFilter === 'today') return startKey <= todayKey;
  // 'week'
  return startKey <= addDaysToDateKey(todayKey, 7);
}

/**
 * Postal-code filter token. Prefixed with the country value so identical
 * numeric codes in Belgium and the Netherlands don't collide.
 */
export function postalTokenForEvent(event: Event): string | null {
  if (event.postal_code === null || event.postal_code === undefined) return null;
  if (!event.country) return null;
  return `${event.country.toLowerCase()}:${event.postal_code}`;
}

/** Country value a postal token belongs to ('belgium:1000' → 'belgium'). */
export function countryOfPostalToken(token: string): string {
  return token.split(':')[0];
}

/**
 * Client-side filter matching for the map, mirroring the calendar tab's
 * semantics (categories overlap, organizations via `organization_id`).
 */
export function matchesMapFilters(
  event: Event,
  filters: MapFilters,
  context: MapFilterContext
): boolean {
  if (filters.categories.length > 0) {
    const eventCategories = event.categories ?? [];
    if (!eventCategories.some((category) => filters.categories.includes(category))) {
      return false;
    }
  }

  if (filters.country) {
    if (!event.country || event.country.toLowerCase() !== filters.country) return false;
  }

  if (filters.postalCodes.length > 0) {
    const token = postalTokenForEvent(event);
    if (!token || !filters.postalCodes.includes(token)) return false;
  }

  if (filters.organizations.length > 0) {
    if (!event.organization_id || !filters.organizations.includes(event.organization_id)) {
      return false;
    }
  }

  if (filters.savedOnly && !context.isSaved(event.$id)) return false;

  if (filters.helpNeeded && event.help_needed !== true) return false;

  return true;
}

/** Soonest first; stable tiebreak on id so reorderings don't flicker. */
export function sortEventsChronologically(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const diff = parseAsUTC(a.start_time).getTime() - parseAsUTC(b.start_time).getTime();
    if (diff !== 0) return diff;
    return a.$id.localeCompare(b.$id);
  });
}

/**
 * Active-filter count for the header badge: categories count as one group,
 * country as one, postal codes and organizations one per selection.
 */
export function countActiveMapFilters(filters: MapFilters): number {
  return (
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.country ? 1 : 0) +
    filters.postalCodes.length +
    filters.organizations.length +
    (filters.savedOnly ? 1 : 0) +
    (filters.helpNeeded ? 1 : 0)
  );
}

export function hasActiveMapFilters(filters: MapFilters): boolean {
  return countActiveMapFilters(filters) > 0;
}

export interface MapCountryOption {
  /** Backend country value, e.g. 'belgium'. */
  value: string;
  /** Localized country name. */
  label: string;
}

/** Localized label for a backend country value; falls back to the raw value. */
export function getCountryLabel(value: string, locale: string): string {
  const entry = countries.find((country) => country.value === value.toLowerCase());
  if (!entry) return value;
  return entry.label[locale as keyof typeof entry.label] ?? entry.label.en;
}

/**
 * Distinct countries among the given (geocoded, upcoming) events, ordered as
 * in `constants/Countries.ts`. Unknown country values are listed last, as-is.
 */
export function buildCountryOptions(events: Event[], locale: string): MapCountryOption[] {
  const present = new Set<string>();
  for (const event of events) {
    if (event.country) present.add(event.country.toLowerCase());
  }

  const known = countries
    .filter((country) => present.has(country.value))
    .map((country) => ({ value: country.value, label: getCountryLabel(country.value, locale) }));

  const unknown = [...present]
    .filter((value) => !countries.some((country) => country.value === value))
    .sort()
    .map((value) => ({ value, label: value }));

  return [...known, ...unknown];
}

export interface MapPostalCodeOption {
  /** Filter token, e.g. 'belgium:1000'. */
  value: string;
  /** Display label, e.g. '1000 · Bruxelles'. */
  label: string;
  /** Lowercased haystack so users can search by code or commune name. */
  searchText: string;
  /** Country value the code belongs to, for country scoping. */
  country: string;
}

/**
 * Distinct postal codes among the given events, labeled "{code} · {commune}".
 * `resolveCommune` is PostalCodeProvider's `getSubMunicipalityName`.
 */
export function buildPostalCodeOptions(
  events: Event[],
  resolveCommune: (postalCode: string, country: string, fallbackCity?: string | null) => string
): MapPostalCodeOption[] {
  const byToken = new Map<string, MapPostalCodeOption>();

  for (const event of events) {
    const token = postalTokenForEvent(event);
    if (!token || byToken.has(token)) continue;

    const country = event.country!.toLowerCase();
    const code = String(event.postal_code);
    const commune = resolveCommune(code, country, event.city);
    const label = commune ? `${code} · ${commune}` : code;

    byToken.set(token, {
      value: token,
      label,
      searchText: label.toLowerCase(),
      country,
    });
  }

  return [...byToken.values()].sort((a, b) => a.label.localeCompare(b.label));
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  nl: 'nl-NL',
};

function belgianDateParts(isoString: string, locale: string) {
  const resolvedLocale = LOCALE_MAP[locale] || 'en-GB';
  const date = parseAsUTC(isoString);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(resolvedLocale, { timeZone: EVENT_TIMEZONE, ...options }).format(date);
  return {
    weekday: part({ weekday: 'short' }),
    day: part({ day: 'numeric' }),
    monthLong: part({ month: 'long' }),
    monthShort: part({ month: 'short' }),
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Compact date label for the carousel cards (priority order mirrors the
 * design prototype — the range wins even when the event spans today):
 * - multi-day, same month:  "19–22 juin"
 * - multi-day, two months:  "28 juin – 1 juil."
 * - single-day, today:      the localized "Today" label (`todayLabel`)
 * - otherwise:              "Sam. 20 juin"
 */
export function formatMapCardDateLabel(
  event: Event,
  locale: string,
  todayKey: string,
  todayLabel: string
): string {
  const startKey = getEventDateKeyInBelgium(event.start_time);
  const endKey = eventEndDateKey(event);

  if (endKey > startKey && event.end_time) {
    const start = belgianDateParts(event.start_time, locale);
    const end = belgianDateParts(event.end_time, locale);
    if (start.monthLong === end.monthLong) {
      return `${start.day}–${end.day} ${start.monthLong}`;
    }
    return `${start.day} ${start.monthShort} – ${end.day} ${end.monthShort}`;
  }

  if (startKey === todayKey) return todayLabel;

  const { weekday, day, monthLong } = belgianDateParts(event.start_time, locale);
  return `${capitalize(weekday)} ${day} ${monthLong}`;
}
