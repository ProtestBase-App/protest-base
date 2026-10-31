import { Event } from '@/types/event.types';
import { PastEventForTemplate, TemplateEventData } from '@/types/template.types';
import { toPostalCodeString } from '@/utils/eventLocation';

/**
 * Extracts template-compatible fields from an Event.
 *
 * INCLUDED fields:
 * - title, description
 * - street_address, city, region, country, postal_code
 * - website_url, categories, disclaimer
 * - co_organizers, help_needed, help_description
 *
 * EXCLUDED fields:
 * - $id, $createdAt, $updatedAt (metadata)
 * - start_time, end_time (event-specific timing)
 * - image (requires re-upload)
 * - organizer_id, organizer_name (auto-populated)
 * - view_count (analytics)
 * - geocod_status, geocod_lat, geocod_lng (derived from address)
 */
export function extractTemplateData(event: Event): TemplateEventData {
  const templateData: TemplateEventData = {};

  if (event.title) templateData.title = event.title;
  if (event.description) templateData.description = event.description;
  if (event.street_address) templateData.street_address = event.street_address;
  if (event.city) templateData.city = event.city;
  if (event.region) templateData.region = event.region;
  if (event.country) templateData.country = event.country;
  const postalCode = toPostalCodeString(event.postal_code);
  if (postalCode) templateData.postal_code = postalCode;
  if (event.website_url) templateData.website_url = event.website_url;
  if (event.categories?.length) templateData.categories = event.categories;
  if (event.disclaimer) templateData.disclaimer = event.disclaimer;
  if (event.co_organizers?.length) templateData.co_organizers = event.co_organizers;
  if (event.help_needed) {
    templateData.help_needed = event.help_needed;
    if (event.help_description) templateData.help_description = event.help_description;
  }

  return templateData;
}

/**
 * Formats a date string for display in past event cards.
 * @param isoDate - ISO date string (e.g., "2025-10-26T14:00:00Z")
 * @param locale - The app's language
 * @returns Formatted date (e.g., "Oct 26, 2025")
 */
export function formatPastEventDate(isoDate: string, locale = 'en'): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** A past event as the reuse rows show it. */
export function toPastEventForTemplate(event: Event, locale?: string): PastEventForTemplate {
  return {
    $id: event.$id,
    title: event.title,
    formattedDate: formatPastEventDate(event.start_time, locale),
    city: event.city,
    firstCategory: event.categories?.[0],
  };
}

/** What a form reusing a past event starts from: its details, not its dates. */
export function templateStartFromEvent(event: Event) {
  return {
    event_data: { ...extractTemplateData(event), organization_id: event.organization_id },
    image_urls: event.images ?? [],
  };
}

export const TEMPLATE_PARTS = [
  'text',
  'category',
  'location',
  'photos',
  'link',
  'coOrganizers',
  'volunteers',
  'goodToKnow',
] as const;

export type TemplatePart = (typeof TEMPLATE_PARTS)[number];

const PART_FIELDS: Record<TemplatePart, (keyof TemplateEventData)[]> = {
  text: ['title', 'description'],
  category: ['categories'],
  location: ['street_address', 'city', 'region', 'country', 'postal_code'],
  photos: [],
  link: ['website_url'],
  coOrganizers: ['co_organizers'],
  volunteers: ['help_needed', 'help_description'],
  goodToKnow: ['disclaimer'],
};

/** The parts of an event kept in a new template. Never its dates. */
export function templateFromEvent(event: Event, kept: readonly TemplatePart[]) {
  const data = extractTemplateData(event);
  const fields = kept.flatMap((part) => PART_FIELDS[part]);
  const eventData = Object.fromEntries(
    Object.entries(data).filter(([field]) => fields.includes(field as keyof TemplateEventData))
  ) as TemplateEventData;

  return {
    organization_id: event.organization_id ?? '',
    event_data: { ...eventData, organization_id: event.organization_id },
    image_urls: kept.includes('photos') ? (event.images ?? []) : [],
  };
}
