/**
 * CreateEventRequest fields that can be stored in a template.
 * Mirrors the create-event payload from event.service.ts.
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
}

export interface CreateTemplateRequest {
  // Templates must belong to an organization.
  organization_id: string;
  name: string;
  description?: string;
  event_data: TemplateEventData;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  event_data?: TemplateEventData;
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
}
