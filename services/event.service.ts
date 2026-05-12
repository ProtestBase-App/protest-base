import api from './api';
import { Event, CreateEventRequest, UpdateEventRequest, PickedImage } from '@/types/event.types';
import { API_LIMITS } from '@/constants/ApiConfig';
import { MAX_EVENT_LOOKBACK_MS } from '@/constants/EventConfig';
import { isEventOngoing } from '@/utils/eventStatus';
import { logger } from '@/utils/logger';

export type { Event, CreateEventRequest, UpdateEventRequest, PickedImage };

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
  /** Date filter preset: 'today', 'tomorrow', 'thisWeek', 'thisWeekend' */
  dateFilter?: 'today' | 'tomorrow' | 'thisWeek' | 'thisWeekend';
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
 * Get a single event by ID
 *
 * @param eventId - The ID of the event to fetch
 * @param includeAvatars - Whether to include organizer and co-organizer avatars (default: false)
 * @returns The event object
 * @throws EventNotFoundError on 404
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
        ? eventData.postal_code
        : undefined,
  } as T;
}

/**
 * Build a FormData payload from event data and an image file.
 * Shared by createEventBackend and updateEvent to avoid duplication.
 *
 * Caller is expected to have run the data through `normalizeEventPayload` first,
 * so categories/co_organizers are either undefined or a non-empty string[].
 */
function buildEventFormData(
  eventData: Record<string, unknown>,
  image: PickedImage
): { payload: FormData; headers: Record<string, string> } {
  const formData = new FormData();

  Object.keys(eventData).forEach((key) => {
    if (key === 'image') return; // Handle image separately

    const value = eventData[key];

    if (value === null || value === undefined) return;

    if (key === 'categories' || key === 'co_organizers') {
      // After normalization these are always string[] when present.
      if (Array.isArray(value)) {
        (value as string[]).forEach((item) => formData.append(key, item));
      }
    } else if (key === 'postal_code') {
      formData.append(key, (value as number).toString());
    } else if (key === 'help_needed') {
      formData.append(key, String(value));
    } else if (typeof value === 'string') {
      formData.append(key, value);
    }
  });

  const imageFile = {
    uri: image.uri,
    type: image.mimeType || 'image/jpeg',
    name: image.fileName || `event_${Date.now()}.jpg`,
  } as unknown as Blob;
  formData.append('image', imageFile);

  return { payload: formData, headers: { 'Content-Type': 'multipart/form-data' } };
}

/**
 * Create a new event via backend API.
 * The backend handles image upload, geocoding, URL validation and category
 * formatting, and fills in organizer_id and organizer_name from the JWT.
 *
 * @param eventData - Event data object (can include image file object or URL string)
 * @returns The created event object from the backend
 */
export async function createEventBackend(eventData: CreateEventRequest): Promise<Event> {
  try {
    logger.debug('[EventService] createEventBackend called', {
      title: eventData.title,
      hasImage: !!eventData.image,
    });
    const normalized = normalizeEventPayload(eventData as unknown as Record<string, unknown>);
    const hasImageFile = !!eventData.image?.uri;

    let payload: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (hasImageFile) {
      ({ payload, headers } = buildEventFormData(normalized, eventData.image!));
    } else {
      payload = normalized;
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
 * @param eventId - The ID of the event to update
 * @param eventData - Updated event data (can include image file object or URL string)
 * @returns The updated event object from the backend
 */
export async function updateEvent(eventId: string, eventData: UpdateEventRequest): Promise<Event> {
  try {
    logger.debug('[EventService] updateEvent called', { eventId });
    const normalized = normalizeEventPayload(eventData as unknown as Record<string, unknown>);
    const imageIsFile =
      typeof eventData.image === 'object' && eventData.image !== null && 'uri' in eventData.image;

    let payload: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (imageIsFile) {
      ({ payload, headers } = buildEventFormData(normalized, eventData.image as PickedImage));
    } else {
      payload = normalized;
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
}

/**
 * Fetch event counts (upcoming/ongoing and past) for the current user's organizations.
 * Upcoming uses a startDate filter then filters for ongoing; past uses an endDate filter.
 *
 * @param organizationIds - Array of organization IDs to fetch event counts for
 * @returns Object containing upcoming and past event counts
 */
export async function fetchEventCounts(organizationIds: string[]): Promise<EventCounts> {
  try {
    if (organizationIds.length === 0) {
      return { upcoming: 0, past: 0 };
    }

    // Look back to include ongoing events that started recently.
    const lookbackDate = new Date(Date.now() - MAX_EVENT_LOOKBACK_MS).toISOString();

    const [upcomingResponse, pastResponse] = await Promise.all([
      getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: lookbackDate,
        limit: API_LIMITS.EVENTS_DEFAULT,
      }),
      getOrganizationPastEvents(organizationIds[0], { limit: 1 }),
    ]);

    const ongoingCount = upcomingResponse.events.filter((event) => isEventOngoing(event)).length;

    return {
      upcoming: ongoingCount,
      past: pastResponse.total,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch event counts');
  }
}
