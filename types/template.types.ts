/**
 * CreateEventRequest fields that can be stored in a template.
 * Mirrors the create-event payload from event.service.ts.
 *
 * Template images are NOT part of event_data — they live in the template's
 * top-level `image_urls` column so the backend can reference-count them.
 */
export interface TemplateEventData {
  organization_id?: string;

  title?: string;
  description?: string;

  street_address?: string;
  city?: string;
  region?: string;
  country?: string;
  postal_code?: number;

  website_url?: string;

  // Backend coerces a single string to a 1-element array.
  categories?: string | string[];

  disclaimer?: string;
  co_organizers?: string[];
  help_needed?: boolean;
  help_description?: string;
}

/**
 * EventTemplate as returned from the backend API.
 * `event_data` is a JSON string and needs to be parsed.
 */
export interface EventTemplate {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description?: string;
  organizer_id: string;
  event_data: string;
  /** Legacy single image — always mirrors image_urls[0] ?? null. */
  image_url?: string | null;
  /** Ordered hosted image URLs (max 5). */
  image_urls?: string[];
}

/**
 * EventTemplate after parsing `event_data` into a typed object. Used in the UI.
 */
export interface ParsedEventTemplate {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  description?: string;
  organizer_id: string;
  event_data: TemplateEventData;
  /** Legacy single image — always mirrors image_urls[0] ?? null. */
  image_url?: string | null;
  /** Ordered hosted image URLs (max 5). */
  image_urls?: string[];
}

export interface CreateTemplateRequest {
  // Templates must belong to an organization.
  organization_id: string;
  name: string;
  description?: string;
  event_data: TemplateEventData;
  /** Ordered hosted https URLs (max 5). Omitted/empty → template has no images. */
  image_urls?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  event_data?: TemplateEventData;
  /**
   * Authoritative ordered final list of hosted https URLs (max 5); `[]` (or
   * `null`) clears all images; omitted leaves them unchanged.
   */
  image_urls?: string[] | null;
}

export interface GetTemplatesQuery {
  limit?: number;
  offset?: number;
  organization_id?: string;
}

export interface GetTemplatesResponse {
  success: boolean;
  data: EventTemplate[];
}

export interface GetTemplateResponse {
  success: boolean;
  data: EventTemplate;
}

/**
 * Past event item formatted for the "Create from Past" section.
 * Combines display info with pre-extracted template data so the picker can
 * navigate to the create-template screen without further lookups.
 */
export interface PastEventForTemplate {
  $id: string;
  title: string;
  // Display format, e.g. "Oct 26, 2025".
  formattedDate: string;
  city?: string | null;
  // First category for badge display.
  firstCategory?: string;
  templateData: TemplateEventData;
  // Hosted image URLs from the source event, offered as template images.
  images?: string[];
}
