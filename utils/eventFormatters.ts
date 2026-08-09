import { Event, CoOrganizerAvatar, EventStatus } from '@/types/event.types';
import { t } from '@/utils/i18n';

/**
 * Event timezone — all events are displayed in Belgium time to match the
 * website behavior for consistency.
 */
export const EVENT_TIMEZONE = 'Europe/Brussels';

/**
 * Parse an ISO date string ensuring it's interpreted as UTC.
 * Fixes timezone issues where dates without the 'Z' suffix would otherwise be
 * interpreted as local time by JavaScript.
 *
 * @param isoString - ISO date string (with or without timezone indicator)
 * @returns Date object correctly representing the UTC time
 */
export function parseAsUTC(isoString: string): Date {
  if (isoString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoString)) {
    return new Date(isoString);
  }
  return new Date(isoString + 'Z');
}

/**
 * Format a date in the Belgium timezone, regardless of the user's local timezone.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Cached `Intl.DateTimeFormat`. Construction resolves locale data and is orders of
 * magnitude more expensive than formatting, while the instances themselves are
 * stateless — and list screens build them per row per render, where that cost
 * dominated the frame budget. Cache key is locale + options.
 */
export function getDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function formatInBelgiumTimezone(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return getDateFormatter(locale, { ...options, timeZone: EVENT_TIMEZONE }).format(date);
}

function getDatePartsInBelgium(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = getDateFormatter('en-US', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
    hour: getValue('hour'),
    minute: getValue('minute'),
  };
}

/** Minimum an event needs to expose for the all-day helpers below. */
type TimedEvent = Pick<Event, 'start_time' | 'all_day'>;

/**
 * True when the instant is Brussels local midnight — the storage convention an
 * all-day event's `start_time` follows.
 *
 * This is NOT a way to detect an all-day event (a genuine midnight vigil looks
 * identical): only `all_day` says that. It exists for the edit form, where an
 * event already known to be all-day stops being one once the organizer moves it
 * off midnight.
 */
export function isBelgiumMidnight(isoString: string): boolean {
  const parts = getDatePartsInBelgium(parseAsUTC(isoString));
  return parts.hour === 0 && parts.minute === 0;
}

/** Localised "All day", shown wherever a timed event would show a clock time. */
export function getAllDayLabel(locale: string = 'en'): string {
  return t('events.allDay', { locale });
}

/**
 * The `all_day` field an edit screen should submit, as a spreadable fragment.
 *
 * Only an event that ARRIVED all-day says anything about the flag — nothing else
 * in the app authors it. For one that did, the server would otherwise keep it
 * all-day and discard whatever time was sent, so the organizer's only way to
 * give a scraped date-only event a real time is for us to send `false` once they
 * move the start off midnight.
 *
 * `{}` for an event that was never all-day, so the field stays absent from the
 * payload rather than being sent as a redundant `false`.
 */
export function allDaySubmitField(
  wasAllDay: boolean,
  startTime: string | undefined
): { all_day?: boolean } {
  if (!wasAllDay) return {};
  return { all_day: !!startTime && isBelgiumMidnight(startTime) };
}

/**
 * Backend Event mapped for display in the EventDetailed component, with
 * pre-formatted date/time strings.
 */
export interface FormattedEvent {
  $id: string;
  id: string;
  title: string;
  description: string;
  image: string;
  images: string[];
  street_address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  startDateNoFormat: string;
  startDateFull: string;
  endDateNoFormat: string | null;
  endDateFull: string | null;

  // Date-only event: `start_time` above is the "All day" label, and `end_time` is
  // empty because an all-day event has no meaningful end clock time.
  all_day: boolean;

  /**
   * Whether the event spans more than one Brussels calendar day.
   *
   * Do NOT derive this by comparing `startDateNoFormat` / `endDateNoFormat`:
   * those are UTC dates, and Brussels midnight is on the far side of the offset,
   * so a single-day all-day event reads as 21 July → 22 July and every one of
   * them would look multi-day.
   */
  isMultiDay: boolean;

  organization_id: string;
  organizer_id: string;
  organizer_name: string;
  website_url: string | null;
  categories: string[];
  disclaimer: string | null;
  postal_code: number | null;
  geocod_status: string | null;
  geocod_lat: number | null;
  geocod_lng: number | null;
  co_organizers: string[];
  help_needed: boolean;
  help_description: string;
  // Only populated when includeAvatars=true
  organizer_avatar?: string | null;
  co_organizer_avatars?: CoOrganizerAvatar[];

  // Default 0 when the server omits these on older responses.
  view_count: number;
  participant_count: number;
  save_count: number;
  like_count: number;

  status: EventStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export function formatEventForDisplay(event: Event, locale: string = 'en'): FormattedEvent {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';

  const startDateObj = parseAsUTC(event.start_time);
  const startParts = getDatePartsInBelgium(startDateObj);
  const startDayOfWeek = capitalize(
    formatInBelgiumTimezone(startDateObj, resolvedLocale, { weekday: 'long' })
  );
  const startDayOfMonth = startParts.day.toString().padStart(2, '0');
  const startMonth = capitalize(
    formatInBelgiumTimezone(startDateObj, resolvedLocale, { month: 'long' })
  );

  // 12-hour with AM/PM for English; 24-hour for French/Dutch.
  const timeOptions: Intl.DateTimeFormatOptions =
    locale === 'en'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { hour: '2-digit', minute: '2-digit', hour12: false };

  const isAllDay = event.all_day === true;

  // All day replaces the clock time; the DATE range of a multi-day all-day event
  // is still meaningful, so only the times go away.
  const formattedStartTime = isAllDay
    ? getAllDayLabel(locale)
    : formatInBelgiumTimezone(startDateObj, resolvedLocale, timeOptions);
  const formattedStartDate = `${startDayOfWeek}, ${startMonth} ${startDayOfMonth}`;
  const startDateNoFormat = event.start_time.split('T')[0];

  let formattedEndDate = '';
  let formattedEndTime = '';
  let endDateNoFormat = null;
  let isMultiDay = false;

  if (event.end_time) {
    const endDateObj = parseAsUTC(event.end_time);
    const endParts = getDatePartsInBelgium(endDateObj);
    const endDayOfMonth = endParts.day.toString().padStart(2, '0');
    const endMonth = capitalize(
      formatInBelgiumTimezone(endDateObj, resolvedLocale, { month: 'long' })
    );

    formattedEndDate = `${endMonth} ${endDayOfMonth}`;
    formattedEndTime = isAllDay
      ? ''
      : formatInBelgiumTimezone(endDateObj, resolvedLocale, timeOptions);
    endDateNoFormat = event.end_time.split('T')[0];

    // Compared in Brussels, not UTC — see the isMultiDay doc comment.
    isMultiDay =
      startParts.year !== endParts.year ||
      startParts.month !== endParts.month ||
      startParts.day !== endParts.day;
  }

  return {
    $id: event.$id,
    id: event.$id,
    title: event.title,
    description: event.description,
    image: event.image || '',
    // Heal pre-multi-image responses: surface the legacy single image as slot 0.
    images: event.images?.length ? event.images : event.image ? [event.image] : [],
    street_address: event.street_address || null,
    city: event.city || null,
    region: event.region || null,
    country: event.country || '',
    start_date: formattedStartDate,
    start_time: formattedStartTime,
    end_date: formattedEndDate,
    end_time: formattedEndTime,
    startDateNoFormat,
    startDateFull: event.start_time,
    endDateNoFormat,
    endDateFull: event.end_time ?? null,
    all_day: isAllDay,
    isMultiDay,
    organization_id: event.organization_id ?? '',
    organizer_id: event.organizer_id ?? '',
    organizer_name: event.organizer_name,
    website_url: event.website_url || null,
    categories: event.categories || [],
    disclaimer: event.disclaimer || null,
    postal_code: event.postal_code || null,
    geocod_status: event.geocod_status || null,
    geocod_lat: event.geocod_lat || null,
    geocod_lng: event.geocod_lng || null,
    co_organizers: event.co_organizers || [],
    help_needed: event.help_needed || false,
    help_description: event.help_description || '',
    organizer_avatar: event.organizer_avatar,
    co_organizer_avatars: event.co_organizer_avatars,

    // Default 0 / 'active' for back-compat with older responses.
    view_count: event.view_count ?? 0,
    participant_count: event.participant_count ?? 0,
    save_count: event.save_count ?? 0,
    like_count: event.like_count ?? 0,

    status: event.status ?? 'active',
    cancelled_at: event.cancelled_at ?? null,
    cancellation_reason: event.cancellation_reason ?? null,
  };
}

/**
 * Simplified Event format for list display, with a pre-formatted time string.
 */
export interface FormattedEventListItem {
  $id: string;
  id: string;
  title: string;
  description: string;
  city: string;
  image: string;
  start_time: string; // Formatted: "Monday 15/03 - 14:30", or "- All day" when all_day
  startDateNoFormat: string; // ISO date format: "2025-10-26"
  startDateFull: string; // Full ISO DateTime: "2025-10-26T14:30:00Z" (for ongoing checks)
  endDateFull: string | null; // Full ISO DateTime or null (for ongoing checks)
  all_day: boolean; // Carried so consumers rebuilding an Event keep the flag
  categories: string[];
  country?: string;
  organization_id?: string;
  organizer_name?: string;
  co_organizers?: string[];
  postal_code?: number | null;
  view_count: number;
  help_needed: boolean;
}

export function formatEventForList(event: Event, locale: string = 'en'): FormattedEventListItem {
  // capitalize is needed for French/Dutch (lowercase weekday/month names).
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';

  const dateObj = parseAsUTC(event.start_time);
  const parts = getDatePartsInBelgium(dateObj);
  const dayOfWeek = capitalize(
    formatInBelgiumTimezone(dateObj, resolvedLocale, { weekday: 'long' })
  );
  const dayOfMonth = parts.day.toString().padStart(2, '0');
  const month = parts.month.toString().padStart(2, '0');
  const hours = parts.hour.toString().padStart(2, '0');
  const minutes = parts.minute.toString().padStart(2, '0');

  const isAllDay = event.all_day === true;
  const timeSegment = isAllDay ? getAllDayLabel(locale) : `${hours}:${minutes}`;

  const formattedStartTime = `${dayOfWeek} ${dayOfMonth}/${month} - ${timeSegment}`;
  const startDateNoFormat = event.start_time.split('T')[0];

  return {
    $id: event.$id,
    id: event.$id,
    title: event.title,
    description: event.description,
    city: event.city || '',
    image: event.image || '',
    start_time: formattedStartTime,
    startDateNoFormat,
    startDateFull: event.start_time,
    endDateFull: event.end_time ?? null,
    all_day: isAllDay,
    categories: event.categories || [],
    country: event.country,
    organization_id: event.organization_id,
    organizer_name: event.organizer_name,
    co_organizers: event.co_organizers,
    postal_code: event.postal_code,
    view_count: (event as any).view_count || 0,
    help_needed: event.help_needed || false,
  };
}

/**
 * Format today's date for display headers.
 * English: "December 7, 2025". French/Dutch: "7 décembre 2025" / "7 december 2025".
 */
export function formatTodayDate(locale: string = 'en'): string {
  const date = new Date();

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };

  const resolvedLocale = localeMap[locale] || 'en-US';

  // capitalize is needed for French/Dutch (lowercase month names).
  const month = capitalize(date.toLocaleDateString(resolvedLocale, { month: 'long' }));
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();

  if (locale === 'en') {
    return `${month} ${dayOfMonth}, ${year}`;
  }
  return `${dayOfMonth} ${month} ${year}`;
}

/**
 * Format just the clock time of an event for compact display, e.g. "6:00 PM"
 * (en) or "18:00" (fr/nl), in the Belgium timezone.
 */
export function formatEventTime(isoDateString: string, locale: string = 'en'): string {
  const date = parseAsUTC(isoDateString);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };

  const resolvedLocale = localeMap[locale] || 'en-US';

  // 12-hour with AM/PM for English; 24-hour for French/Dutch.
  const timeOptions: Intl.DateTimeFormatOptions =
    locale === 'en'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { hour: '2-digit', minute: '2-digit', hour12: false };

  return formatInBelgiumTimezone(date, resolvedLocale, timeOptions);
}

/**
 * Format the clock time as 24-hour HH:mm in the Belgium timezone for every
 * language. Notification copy uses the 24h format regardless of locale
 * (unlike `formatEventTime`, which is 12-hour for English).
 */
export function formatEventTime24h(isoDateString: string): string {
  const date = parseAsUTC(isoDateString);
  return formatInBelgiumTimezone(date, 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format event date and time for card display, e.g. "Sunday July 14 at 10:00 AM".
 */
export function formatEventDateTime(isoDateString: string, locale: string = 'en'): string {
  const date = parseAsUTC(isoDateString);

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };

  const resolvedLocale = localeMap[locale] || 'en-US';

  const parts = getDatePartsInBelgium(date);

  const dayOfWeek = capitalize(formatInBelgiumTimezone(date, resolvedLocale, { weekday: 'long' }));
  const month = capitalize(formatInBelgiumTimezone(date, resolvedLocale, { month: 'long' }));
  const dayOfMonth = parts.day;

  const timeOptions: Intl.DateTimeFormatOptions =
    locale === 'en'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { hour: '2-digit', minute: '2-digit', hour12: false };

  const time = formatInBelgiumTimezone(date, resolvedLocale, timeOptions);

  const connector = locale === 'en' ? 'at' : locale === 'fr' ? 'à' : 'om';

  return `${dayOfWeek} ${month} ${dayOfMonth} ${connector} ${time}`;
}

/*
 * All-day-aware wrappers.
 *
 * The three functions above take a bare ISO string and cannot know whether the
 * event has a clock time at all, so every screen that renders one goes through
 * the matching wrapper here instead. Branching lives in exactly this one place.
 */

/** `formatEventTime` for an event: "6:00 PM" / "18:00", or "All day". */
export function formatEventStartLabel(event: TimedEvent, locale: string = 'en'): string {
  if (event.all_day === true) return getAllDayLabel(locale);
  return formatEventTime(event.start_time, locale);
}

/**
 * `formatEventTime24h` for an event: "18:00" in every language, or "All day".
 * Unlike the function it wraps this needs a locale — the label is translated
 * even though the clock format is not.
 */
export function formatEventStartLabel24h(event: TimedEvent, locale: string = 'en'): string {
  if (event.all_day === true) return getAllDayLabel(locale);
  return formatEventTime24h(event.start_time);
}

/** `formatEventDateTime` for an event: "Sunday July 14 at 10:00 AM", or "Sunday July 14 · All day". */
export function formatEventDateTimeLabel(event: TimedEvent, locale: string = 'en'): string {
  if (event.all_day !== true) return formatEventDateTime(event.start_time, locale);

  const date = parseAsUTC(event.start_time);
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';

  const dayOfWeek = capitalize(formatInBelgiumTimezone(date, resolvedLocale, { weekday: 'long' }));
  const month = capitalize(formatInBelgiumTimezone(date, resolvedLocale, { month: 'long' }));
  const dayOfMonth = getDatePartsInBelgium(date).day;

  return `${dayOfWeek} ${month} ${dayOfMonth} · ${getAllDayLabel(locale)}`;
}
