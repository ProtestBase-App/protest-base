import api from './api';
import {
  Event,
  CreateEventRequest,
  CreateDraftRequest,
  UpdateEventRequest,
  PublishDraftResponse,
  PickedImage,
} from '@/types/event.types';
import { API_LIMITS } from '@/constants/ApiConfig';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { isEventOngoing } from '@/utils/eventStatus';
import { isNetworkError } from '@/utils/networkError';
import { logger } from '@/utils/logger';

export type {
  Event,
  CreateEventRequest,
  CreateDraftRequest,
  UpdateEventRequest,
  PublishDraftResponse,
  PickedImage,
};

/**
 * Filter parameters for server-side event filtering
 * Used with getEventsBackend() for server-side pagination and filtering
 */
export interface EventFilterParams {
  /** ISO date string - only return events starting after this date */
  startDate?: string;
  /** Maximum number of events to return (1-500, default: 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Date filter preset: 'today', 'tomorrow', 'thisWeek', 'thisWeekend', 'thisMonth' */
  dateFilter?: 'today' | 'tomorrow' | 'thisWeek' | 'thisWeekend' | 'thisMonth';
  /** Array of postal codes to filter by (will be sent as comma-separated string) */
  postalCodes?: string[];
  /** Array of organization IDs to filter by (will be sent as comma-separated string) */
  organizers?: string[];
  /** Category filter: 'Protest', 'Act', 'Learn', 'Support', 'Strike' */
  category?: string;
  /** Full-text search query */
  search?: string;
  /** Include events that have already ended (default: false) */
  includeEnded?: boolean;
  /** Filter by specific organizer ID */
  organizerId?: string;
  /** Filter by specific organization ID */
  organizationId?: string;
}

/**
 * Get all events with optional filters
 *
 * @param filters - Optional filter parameters for server-side filtering
 * @returns Object containing events array, total count, limit, and offset
 *
 * @example
 * // Basic usage (backwards compatible)
 * const result = await getEventsBackend({ startDate: new Date().toISOString() });
 *
 * @example
 * // With server-side filters for explore screen
 * const result = await getEventsBackend({
 *   limit: 20,
 *   offset: 0,
 *   dateFilter: 'thisWeek',
 *   postalCodes: ['1000', '1040'],
 *   category: 'Protest',
 *   search: 'climate'
 * });
 */
export async function getEventsBackend(filters: EventFilterParams = {}): Promise<{
  events: Event[];
  total: number;
  limit: number;
  offset: number;
}> {
  try {
    const {
      startDate,
      limit = API_LIMITS.EVENTS_DEFAULT,
      offset = 0,
      dateFilter,
      postalCodes,
      organizers,
      category,
      search,
      includeEnded,
      organizerId,
      organizationId,
    } = filters;

    logger.debug('[EventService] getEventsBackend called', {
      startDate,
      limit,
      offset,
      dateFilter,
      postalCodes,
      organizers,
      category,
      search,
      includeEnded,
      organizerId,
      organizationId,
    });

    const params: Record<string, string | number | boolean> = {
      limit,
      offset,
    };

    if (startDate) {
      params.startDate = startDate;
    }

    if (dateFilter) {
      params.dateFilter = dateFilter;
    }

    if (postalCodes && postalCodes.length > 0) {
      params.postalCodes = postalCodes.join(',');
    }

    if (organizers && organizers.length > 0) {
      params.organizers = organizers.join(',');
    }

    if (category) {
      params.category = category;
    }

    if (search && search.trim()) {
      params.search = search.trim();
    }

    if (includeEnded !== undefined) {
      params.includeEnded = includeEnded;
    }

    if (organizerId) {
      params.organizer_id = organizerId;
    }

    if (organizationId) {
      params.organization_id = organizationId;
    }

    const response = await api.get<{
      success: boolean;
      data: {
        events: Event[];
        total: number;
        limit: number;
        offset: number;
        filters_applied?: Record<string, unknown>;
      };
    }>('/events', { params });

    if (!response.data.success) {
      throw new Error('Failed to fetch events');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch events');
  }
}

/**
 * Options for fetching organization events
 */
export interface OrganizationEventsOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  includeAvatars?: boolean;
}

/**
 * Response structure for organization events
 */
export interface OrganizationEventsResponse {
  events: Event[];
  total: number;
}

/**
 * Get upcoming events for a specific organization.
 *
 * @param organizationId - The organization ID to fetch events for
 * @param options - Optional parameters (startDate, limit, offset, includeAvatars)
 * @returns Object containing events array and total count
 */
export async function getOrganizationUpcomingEvents(
  organizationId: string,
  options?: Omit<OrganizationEventsOptions, 'endDate'>
): Promise<OrganizationEventsResponse> {
  try {
    const params: Record<string, string | number | boolean> = {};

    params.startDate = options?.startDate || new Date().toISOString();

    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.includeAvatars) params.includeAvatars = true;

    logger.debug('[EventService] getOrganizationUpcomingEvents called', {
      organizationId,
      params,
    });

    const response = await api.get<{
      success: boolean;
      data: {
        events: Event[];
        total: number;
      };
      message: string;
    }>(`/organizations/${organizationId}/events`, { params });

    if (!response.data.success) {
      throw new Error('Failed to fetch organization events');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch organization events'
    );
  }
}

/**
 * Get past events for a specific organization.
 *
 * @param organizationId - The organization ID to fetch events for
 * @param options - Optional parameters (endDate, limit, offset, includeAvatars)
 * @returns Object containing events array and total count
 */
export async function getOrganizationPastEvents(
  organizationId: string,
  options?: Omit<OrganizationEventsOptions, 'startDate'>
): Promise<OrganizationEventsResponse> {
  try {
    const params: Record<string, string | number | boolean> = {};

    params.endDate = options?.endDate || new Date().toISOString();

    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    if (options?.includeAvatars) params.includeAvatars = true;

    logger.debug('[EventService] getOrganizationPastEvents called', {
      organizationId,
      params,
    });

    const response = await api.get<{
      success: boolean;
      data: {
        events: Event[];
        total: number;
      };
      message: string;
    }>(`/organizations/${organizationId}/events`, { params });

    if (!response.data.success) {
      throw new Error('Failed to fetch organization past events');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch organization past events'
    );
  }
}

/**
 * Thrown when GET /events/:id returns 404. Lets callers (e.g. SavedEventsProvider's
 * hydration path) clean up dangling references via instanceof check rather than
 * brittle message parsing.
 */
export class EventNotFoundError extends Error {
  code = 'EVENT_NOT_FOUND' as const;
  constructor(eventId: string) {
    super(`Event with ID ${eventId} not found`);
    this.name = 'EventNotFoundError';
  }
}

/**
 * Thrown when GET /events/:id failed at the network level (timeout, DNS, no
 * connectivity) — the event may well exist, we just couldn't reach the backend.
 * Lets the detail screen show a connectivity message instead of the misleading
 * "event not found" one.
 */
export class EventNetworkError extends Error {
  code = 'EVENT_NETWORK_ERROR' as const;
  constructor(eventId: string) {
    super(`Network failure while loading event ${eventId}`);
    this.name = 'EventNetworkError';
  }
}

/**
 * Get a single event by ID
 *
 * @param eventId - The ID of the event to fetch
 * @param includeAvatars - Whether to include organizer and co-organizer avatars (default: false)
 * @returns The event object
 * @throws EventNotFoundError on 404
 * @throws EventNetworkError when the backend is unreachable
 */
export async function getEventByIdBackend(
  eventId: string,
  includeAvatars: boolean = false
): Promise<Event> {
  try {
    const config = includeAvatars ? { params: { includeAvatars: true } } : undefined;

    const response = await api.get<{
      success: boolean;
      data: Event;
    }>(`/events/${eventId}`, config);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch event');
    }

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new EventNotFoundError(eventId);
    }

    if (isNetworkError(error)) {
      throw new EventNetworkError(eventId);
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch event');
  }
}

/**
 * Coerce an array-typed field into a clean string[] (or undefined to omit it).
 *
 * The event form stores `categories` as a single string (single-select dropdown), but
 * the backend's Ajv schema validator requires `array`. We normalize at the service
 * boundary so callers don't have to:
 *  - already an array → filter out empty/nullish items
 *  - non-empty string → wrap into a one-element array
 *  - empty string / null / undefined → undefined (field is omitted from the payload)
 *
 * The backend should also be configured with `coerceTypes: 'array'` so a single
 * repeated multipart field (which arrives as a string) is coerced to a 1-element array.
 */
function normalizeArrayField(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const cleaned = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value];
  }
  return undefined;
}

/**
 * Apply boundary-level normalizations that both the JSON and multipart paths need.
 * Returns a fresh object — never mutates the caller's data.
 */
function normalizeEventPayload<T extends Record<string, unknown>>(eventData: T): T {
  return {
    ...eventData,
    categories: normalizeArrayField(eventData.categories),
    co_organizers: normalizeArrayField(eventData.co_organizers),
    postal_code:
      eventData.postal_code !== null && eventData.postal_code !== undefined
        ? String(eventData.postal_code)
        : undefined,
  } as T;
}

/** Narrow a mixed images-list entry to a picked file (vs a kept URL string). */
function isPickedImage(value: unknown): value is PickedImage {
  return typeof value === 'object' && value !== null && 'uri' in value;
}

/** React Native FormData file part for a picked image. */
function toImageFilePart(image: PickedImage): Blob {
  return {
    uri: image.uri,
    type: image.mimeType || 'image/jpeg',
    name: image.fileName || `event_${Date.now()}.jpg`,
  } as unknown as Blob;
}

/**
 * Build a FormData payload from event data and its image(s).
 * Shared by createEventBackend and updateEvent to avoid duplication.
 *
 * Caller is expected to have run the data through `normalizeEventPayload` first,
 * so categories/co_organizers are either undefined or a non-empty string[].
 *
 * When `images` is provided it is authoritative: the backend receives one text
 * field `images` — a JSON array in display order where kept URLs appear
 * verbatim and each new file is the literal `"new"` — followed by each new
 * file as a file part named `images`, in that same order (FormData preserves
 * append order). The legacy `image` part is never sent alongside it.
 */
function buildEventFormData(
  eventData: Record<string, unknown>,
  image: PickedImage | null,
  images?: (PickedImage | string)[]
): { payload: FormData; headers: Record<string, string> } {
  const formData = new FormData();

  Object.keys(eventData).forEach((key) => {
    if (key === 'image' || key === 'images') return; // Handled separately below

    const value = eventData[key];

    if (value === null || value === undefined) return;

    if (key === 'categories' || key === 'co_organizers') {
      // Backend expects a single JSON-array string for these list fields
      // (matches frontend-protest-base's buildEventFormData). After
      // normalization the value is a non-empty string[] when present.
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      }
    } else if (key === 'postal_code') {
      formData.append(key, String(value));
    } else if (key === 'help_needed' || key === 'is_draft') {
      formData.append(key, String(value));
    } else if (typeof value === 'string') {
      formData.append(key, value);
    }
  });

  if (images) {
    formData.append(
      'images',
      JSON.stringify(images.map((entry) => (isPickedImage(entry) ? 'new' : entry)))
    );
    images
      .filter(isPickedImage)
      .forEach((file) => formData.append('images', toImageFilePart(file)));
  } else if (image) {
    formData.append('image', toImageFilePart(image));
  }

  return { payload: formData, headers: { 'Content-Type': 'multipart/form-data' } };
}

/**
 * Create a new event via backend API.
 * The backend handles image upload, geocoding, URL validation and category
 * formatting, and fills in organizer_id and organizer_name from the JWT.
 *
 * @param eventData - Event data object (images: up to 5 picked files, sent as
 *   ordered multipart parts; falls back to the legacy single image field)
 * @returns The created event object from the backend
 */
export async function createEventBackend(eventData: CreateEventRequest): Promise<Event> {
  try {
    logger.debug('[EventService] createEventBackend called', {
      title: eventData.title,
      hasImage: !!eventData.image,
      imageCount: eventData.images?.length ?? 0,
    });
    const normalized = normalizeEventPayload(eventData as unknown as Record<string, unknown>);
    const hasImagesList = Array.isArray(eventData.images) && eventData.images.length > 0;
    const hasImageFile = !!eventData.image?.uri;

    let payload: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (hasImagesList) {
      ({ payload, headers } = buildEventFormData(normalized, null, eventData.images));
    } else if (hasImageFile) {
      ({ payload, headers } = buildEventFormData(normalized, eventData.image!));
    } else {
      payload = normalized;
      // An empty images list is the same as absent (backend default image) —
      // drop it so the JSON body never carries a redundant [].
      delete (payload as Record<string, unknown>).images;
      headers['Content-Type'] = 'application/json';
    }

    const response = await api.post<{
      success: boolean;
      data: Event;
      message: string;
    }>('/events', payload, {
      headers,
      timeout: 60000,
    });

    if (!response.data.success || !response.data.data?.$id) {
      throw new Error('Failed to create event');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to create event');
  }
}

/**
 * Update an existing event via backend API.
 * The backend handles image upload/delete, geocoding, URL validation and
 * category formatting, and verifies the caller owns the event.
 *
 * organizer_name cannot be updated (tied to the event creator).
 *
 * `images`, when present, is the authoritative full ordered final list (kept
 * URL strings + new PickedImage files); `null` removes all images. When it is
 * absent, the legacy single `image` field behaves as before.
 *
 * @param eventId - The ID of the event to update
 * @param eventData - Updated event data
 * @returns The updated event object from the backend
 */
export async function updateEvent(eventId: string, eventData: UpdateEventRequest): Promise<Event> {
  try {
    logger.debug('[EventService] updateEvent called', { eventId });
    const normalized = normalizeEventPayload(eventData as unknown as Record<string, unknown>);
    const imagesHasNewFile =
      Array.isArray(eventData.images) && eventData.images.some(isPickedImage);
    const imageIsFile = isPickedImage(eventData.image);

    let payload: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (imagesHasNewFile) {
      ({ payload, headers } = buildEventFormData(normalized, null, eventData.images!));
    } else if (eventData.images === undefined && imageIsFile) {
      ({ payload, headers } = buildEventFormData(normalized, eventData.image as PickedImage));
    } else {
      // JSON path: images is undefined (unchanged), null (clear all), or an
      // all-URL kept list — every case is JSON-safe. When images is present it
      // is authoritative, so drop the legacy image field to avoid conflicts.
      payload = normalized;
      if (eventData.images !== undefined) {
        delete (payload as Record<string, unknown>).image;
      }
      headers['Content-Type'] = 'application/json';
    }

    const response = await api.put<{
      success: boolean;
      data: Event;
      message: string;
    }>(`/events/${eventId}`, payload, {
      headers,
      timeout: 60000,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to update event');
    }

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this event');
    }
    if (error.response?.status === 404) {
      throw new Error('Event not found');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to update event');
  }
}

/**
 * Cancelled event response — subset of Event fields returned by POST /events/:id/cancel
 */
export interface CancelEventResponse {
  $id: string;
  status: 'cancelled';
  cancelled_at: string;
  cancellation_reason: string | null;
}

/**
 * Thrown when POST /events/:id/cancel returns 409 — event was already cancelled.
 * Callers can catch this to show a gentler "already cancelled" message instead of
 * a generic error.
 */
export class EventAlreadyCancelledError extends Error {
  code = 'EVENT_ALREADY_CANCELLED' as const;
  constructor(message = 'This event has already been cancelled') {
    super(message);
    this.name = 'EventAlreadyCancelledError';
  }
}

/**
 * Cancel an event (soft delete — keeps the record, flips status to 'cancelled').
 * Only the creator or an org member can cancel. Mirrors the backend spec.
 *
 * @param eventId - The ID of the event to cancel
 * @param reason - Optional free-text reason (≤1000 chars enforced server-side)
 * @returns The cancelled event fields to merge into the cached event
 * @throws EventAlreadyCancelledError on 409 (already cancelled)
 */
export async function cancelEvent(eventId: string, reason?: string): Promise<CancelEventResponse> {
  try {
    const body = reason && reason.trim() ? { reason: reason.trim() } : {};
    const response = await api.post<{
      success: boolean;
      data: CancelEventResponse;
    }>(`/events/${eventId}/cancel`, body);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to cancel event');
    }
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new EventAlreadyCancelledError();
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to cancel this event');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to cancel this event');
    }
    if (error.response?.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to cancel event');
  }
}

/**
 * Delete an event by ID
 *
 * @param eventId - The ID of the event to delete
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await api.delete(`/events/${eventId}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Event not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to delete this event');
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to delete this event');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to delete event');
  }
}

/**
 * Event counts interface for badge display
 */
export interface EventCounts {
  upcoming: number;
  past: number;
  draft: number;
}

/**
 * Fetch event counts (upcoming/ongoing, past and draft) for the current user's
 * organizations. Upcoming uses a startDate filter then filters for ongoing; past
 * uses an endDate filter; draft uses the dedicated drafts endpoint's total.
 *
 * @param organizationIds - Array of organization IDs to fetch event counts for
 * @returns Object containing upcoming, past and draft event counts
 */
export async function fetchEventCounts(organizationIds: string[]): Promise<EventCounts> {
  try {
    if (organizationIds.length === 0) {
      return { upcoming: 0, past: 0, draft: 0 };
    }

    // Look back to include ongoing events that started recently.
    const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();

    const [upcomingResponse, pastResponse, draftResponse] = await Promise.all([
      getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: lookbackDate,
        limit: API_LIMITS.EVENTS_DEFAULT,
      }),
      getOrganizationPastEvents(organizationIds[0], { limit: 1 }),
      getDraftEvents(organizationIds[0], { limit: 1 }),
    ]);

    const ongoingCount = upcomingResponse.events.filter((event) => isEventOngoing(event)).length;

    return {
      upcoming: ongoingCount,
      past: pastResponse.total,
      draft: draftResponse.total,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch event counts');
  }
}

// ---------------------------------------------------------------------------
// Draft events (status: 'draft')
//
// Drafts are a save-now-publish-later feature. They are excluded from every
// public list endpoint and from the global events cache; they are only
// reachable via the dedicated authenticated endpoints below.
// ---------------------------------------------------------------------------

/**
 * Create a draft event. Identical to createEventBackend but flags the event as a
 * draft (status: 'draft') at create time. Drafts may be incomplete — the fields
 * mandatory for a published event are optional here (see CreateDraftRequest).
 *
 * @param eventData - Draft event data (description/start_time optional)
 * @returns The created draft event
 */
export async function createDraftEvent(eventData: CreateDraftRequest): Promise<Event> {
  // The runtime body-builder tolerates the missing required fields; only the
  // static signature is loosened relative to a published create.
  return createEventBackend({ ...eventData, is_draft: true } as CreateEventRequest);
}

/**
 * List draft events for an organization. Auth + membership gated; the public
 * /events list never returns drafts.
 *
 * @param organizationId - The organization whose drafts to fetch
 * @param options - Optional pagination (limit, offset)
 * @returns Object containing the draft events array and total count
 */
export async function getDraftEvents(
  organizationId: string,
  options?: { limit?: number; offset?: number }
): Promise<OrganizationEventsResponse> {
  try {
    const params: Record<string, string | number | boolean> = {
      organization_id: organizationId,
      includeAvatars: true,
    };
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;

    logger.debug('[EventService] getDraftEvents called', { organizationId, params });

    const response = await api.get<{
      success: boolean;
      data: {
        events: Event[];
        total: number;
      };
    }>('/events/drafts', { params });

    if (!response.data.success) {
      throw new Error('Failed to fetch draft events');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch draft events');
  }
}

/**
 * Load a single draft (or published) event for editing via the preview endpoint.
 * The public GET /events/:id 404s on drafts, so draft editors must use this.
 *
 * @param eventId - The ID of the draft to load
 * @returns The raw event (map directly to form state; do NOT run through
 *   formatEventForDisplay, which assumes a non-empty start_time)
 * @throws EventNotFoundError on 404
 */
export async function getDraftEventPreview(eventId: string): Promise<Event> {
  try {
    const response = await api.get<{
      success: boolean;
      data: Event;
    }>(`/events/${eventId}/preview`);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to load draft');
    }

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new EventNotFoundError(eventId);
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to load draft');
  }
}

/**
 * Partially update an event via PATCH (JSON). Lighter than the full PUT for
 * editing drafts on flaky mobile connections. Editing never changes the draft
 * status (is_draft is create-only; PUT/PATCH ignore it).
 *
 * When a NEW image file is supplied (legacy `image` or inside `images`) we fall
 * back to the existing multipart PUT (updateEvent) since the JSON path cannot
 * carry a file; otherwise images stay as kept URL strings (or are omitted).
 *
 * @param eventId - The ID of the event to patch
 * @param partial - The fields to update
 * @returns The updated event
 */
export async function patchEvent(eventId: string, partial: UpdateEventRequest): Promise<Event> {
  const imageIsFile = isPickedImage(partial.image);
  const imagesHasNewFile = Array.isArray(partial.images) && partial.images.some(isPickedImage);
  if (imageIsFile || imagesHasNewFile) {
    // Reuse the proven multipart PUT path for new-image edits.
    return updateEvent(eventId, partial);
  }

  try {
    logger.debug('[EventService] patchEvent called', { eventId });
    const normalized = normalizeEventPayload(partial as unknown as Record<string, unknown>);
    // images (when present) is authoritative — drop the legacy field to avoid conflicts.
    if (partial.images !== undefined) {
      delete (normalized as Record<string, unknown>).image;
    }

    const response = await api.patch<{
      success: boolean;
      data: Event;
      message: string;
    }>(`/events/${eventId}`, normalized, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to update draft');
    }

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to edit this event');
    }
    if (error.response?.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to update draft');
  }
}

/**
 * Thrown when POST /events/:id/publish returns 422 EVENT_INCOMPLETE — the draft
 * is missing fields required to publish. Carries the offending field names so
 * the caller can surface them all at once.
 */
export class EventIncompleteError extends Error {
  code = 'EVENT_INCOMPLETE' as const;
  fields: string[];
  constructor(fields: string[]) {
    super('This draft is missing required fields and cannot be published yet');
    this.name = 'EventIncompleteError';
    this.fields = fields;
  }
}

/**
 * Publish a draft event. The backend returns the resulting status: 'active' for
 * a future-dated event, 'past' for a past-dated one (the backend does NOT block
 * past-dated publishes — callers must run the client readiness check first).
 *
 * @param eventId - The ID of the draft to publish
 * @returns The resulting { $id, status }
 * @throws EventIncompleteError on 422 (missing required fields)
 */
export async function publishDraft(eventId: string): Promise<PublishDraftResponse> {
  try {
    // Empty object body — Fastify rejects a no-body POST (415); the axios
    // instance default Content-Type is application/json.
    const response = await api.post<{
      success: boolean;
      data: PublishDraftResponse;
    }>(`/events/${eventId}/publish`, {});

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to publish draft');
    }

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 422 && error.response?.data?.code === 'EVENT_INCOMPLETE') {
      throw new EventIncompleteError(error.response.data.fields ?? []);
    }
    if (error.response?.status === 401) {
      throw new Error('Please log in to publish this event');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to publish this event');
    }
    if (error.response?.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to publish draft');
  }
}
