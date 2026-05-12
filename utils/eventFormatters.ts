import { Event, CoOrganizerAvatar } from '@/types/event.types';

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
function formatInBelgiumTimezone(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: EVENT_TIMEZONE,
  }).format(date);
}

function getDatePartsInBelgium(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
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

  status: 'active' | 'cancelled' | 'past';
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

  const formattedStartTime = formatInBelgiumTimezone(startDateObj, resolvedLocale, timeOptions);
  const formattedStartDate = `${startDayOfWeek}, ${startMonth} ${startDayOfMonth}`;
  const startDateNoFormat = event.start_time.split('T')[0];

  let formattedEndDate = '';
  let formattedEndTime = '';
  let endDateNoFormat = null;

  if (event.end_time) {
    const endDateObj = parseAsUTC(event.end_time);
    const endParts = getDatePartsInBelgium(endDateObj);
    const endDayOfMonth = endParts.day.toString().padStart(2, '0');
    const endMonth = capitalize(
      formatInBelgiumTimezone(endDateObj, resolvedLocale, { month: 'long' })
    );

    formattedEndDate = `${endMonth} ${endDayOfMonth}`;
    formattedEndTime = formatInBelgiumTimezone(endDateObj, resolvedLocale, timeOptions);
    endDateNoFormat = event.end_time.split('T')[0];
  }

  return {
    $id: event.$id,
    id: event.$id,
    title: event.title,
    description: event.description,
    image: event.image || '',
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
  start_time: string; // Formatted: "Monday 15/03 - 14:30"
  startDateNoFormat: string; // ISO date format: "2025-10-26"
  startDateFull: string; // Full ISO DateTime: "2025-10-26T14:30:00Z" (for ongoing checks)
  endDateFull: string | null; // Full ISO DateTime or null (for ongoing checks)
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

  const formattedStartTime = `${dayOfWeek} ${dayOfMonth}/${month} - ${hours}:${minutes}`;
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
