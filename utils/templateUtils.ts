import { Event } from '@/types/event.types';
import { TemplateEventData } from '@/types/template.types';

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
  if (event.postal_code) templateData.postal_code = event.postal_code;
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
 * @returns Formatted date (e.g., "Oct 26, 2025")
 */
export function formatPastEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
