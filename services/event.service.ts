import type { AxiosRequestConfig } from 'axios';
import api from './api';
import {
  Event,
  CreateEventRequest,
  CreateDraftRequest,
  DuplicateReason,
  DuplicateRelationship,
  DuplicateStrength,
  DuplicateSummary,
  DuplicateWarningReport,
  EventCreatedVia,
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
  DuplicateSummary,
  DuplicateWarningReport,
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

/** A page of events, plus the cache metadata the cold-start fetch revalidates with. */
export interface EventsPageResponse {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
  /** ETag of this response, when the backend sent one. */
  etag?: string;
  /**
   * True when the backend answered 304 Not Modified — `events` is empty and the
   * caller's existing copy is still current. Only ever set for requests made
   * with `ifNoneMatch`.
   */
  notModified?: boolean;
}

/**
 * Read the ETag off a response. Axios lowercases header names, but fall back to
 * the canonical casings so a different adapter can't silently drop the header
 * (which would just disable revalidation, invisibly).
 */
function readETag(headers: unknown): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  const bag = headers as Record<string, unknown>;
  const value = bag.etag ?? bag.ETag ?? bag.Etag;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
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
 *
 * @param options.timeout - Per-request timeout override in ms. The global events
 *   cache uses this for its single large (up to EVENTS_MAX) fetch, which needs a
 *   bigger budget than the axios instance default sized for small pages.
 * @param options.ifNoneMatch - ETag of a previously fetched window. When the
 *   backend answers 304 the result carries `notModified: true` and no events —
 *   the caller keeps what it already has instead of re-downloading it.
 * @param options.skipAuth - Send without the user's JWT. The listing is public,
 *   so callers that run outside the authenticated app shell (the cold-start
 *   window fetch, which starts before GlobalProvider mounts) use this to stay
 *   clear of the 401/refresh machinery entirely.
 */
export async function getEventsBackend(
  filters: EventFilterParams = {},
  options?: { timeout?: number; ifNoneMatch?: string; skipAuth?: boolean }
): Promise<EventsPageResponse> {
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

    const config: AxiosRequestConfig = { params };

    if (options?.timeout !== undefined) {
      config.timeout = options.timeout;
    }

    if (options?.skipAuth) {
      config.skipAuth = true;
    }

    if (options?.ifNoneMatch) {
      config.headers = { 'If-None-Match': options.ifNoneMatch };
      // Axios treats anything outside 2xx as an error, so without this a 304
      // would arrive as a thrown exception instead of a response.
      config.validateStatus = (status) => (status >= 200 && status < 300) || status === 304;
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
    }>('/events', config);

    // 304 is bodyless by definition, so this must precede any `data` access —
    // the success check below would otherwise throw on an empty body.
    if (response.status === 304) {
      return {
        events: [],
        total: 0,
        limit,
        offset,
        etag: readETag(response.headers) ?? options?.ifNoneMatch,
        notModified: true,
      };
    }

    if (!response.data.success) {
      throw new Error('Failed to fetch events');
    }

    return { ...response.data.data, etag: readETag(response.headers) };
  } catch (error: any) {
    // Network-level failures (timeout, DNS, offline) are rethrown untouched so
    // callers' isNetworkError() checks keep working — wrapping into a plain
    // Error would hide the axios error code they rely on. The message callers
    // display is the same either way.
    if (isNetworkError(error)) {
      throw error;
    }
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
    } else if (key === 'geocod_lat' || key === 'geocod_lng') {
      // Adopted-suggestion coordinates: multipart carries them as decimal
      // strings (the server coerces them back to numbers). The JSON path sends
      // them verbatim as numbers — it does not coerce.
      formData.append(key, String(value));
    } else if (
      key === 'help_needed' ||
      key === 'is_draft' ||
      key === 'all_day' ||
      key === 'duplicate_override'
    ) {
      // Booleans must be listed here explicitly: the string branch below would
      // drop them silently, and `all_day: false` is precisely the value that
      // converts a scraped date-only event into a timed one. `duplicate_override`
      // is the same trap — dropped here, the override retry 409s again.
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

// ---------------------------------------------------------------------------
// Duplicate-event guard
//
// Shared by create (POST /events) and publish (POST /events/:id/publish). The
// backend runs in one of two modes and the app has to be right in both:
//
//   warn  (what production runs today) — nothing is blocked; a 201/200 MAY carry
//         `warnings.possibleDuplicates[]` next to `data`. A response without it
//         is byte-identical to before the guard existed.
//   block — a match is refused with 409 DUPLICATE_EVENT carrying `duplicates[]`
//         and `canOverride`. The same request re-sent with `duplicate_override`
//         goes through: the multipart STRING "true" on a multipart create, the
//         JSON boolean `true` on a JSON create and on publish.
//
// Never auto-retry a 409 — the override is an explicit user decision. (The
// api.ts response interceptor only replays 401 integrity codes and 403
// UNTRUSTED_INSTALL, so nothing replays a 409 behind our back.)
// ---------------------------------------------------------------------------

const DUPLICATE_RELATIONSHIPS: DuplicateRelationship[] = ['own', 'co_organized', 'other_org'];
const DUPLICATE_REASONS: DuplicateReason[] = ['url', 'content', 'url-recurring', 'fuzzy'];
const DUPLICATE_STRENGTHS: DuplicateStrength[] = ['strong', 'weak'];

const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/**
 * Narrow one wire entry to a DuplicateSummary, or null when it carries no id.
 *
 * Only `id`, `relationship`, `reason` and `strength` are required by the backend
 * schema; the display fields are nullable and may be missing outright. Unknown
 * enum values (a backend that grew a fifth `reason`) fall back to the most
 * conservative option rather than being dropped — a match we cannot label is
 * still a match worth showing.
 */
function parseDuplicateSummary(raw: unknown): DuplicateSummary | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const entry = raw as Record<string, unknown>;
  const id = stringOrNull(entry.id);
  if (!id) return null;

  const relationship = DUPLICATE_RELATIONSHIPS.includes(entry.relationship as DuplicateRelationship)
    ? (entry.relationship as DuplicateRelationship)
    : 'other_org';
  const reason = DUPLICATE_REASONS.includes(entry.reason as DuplicateReason)
    ? (entry.reason as DuplicateReason)
    : 'content';
  const strength = DUPLICATE_STRENGTHS.includes(entry.strength as DuplicateStrength)
    ? (entry.strength as DuplicateStrength)
    : 'strong';

  return {
    id,
    title: stringOrNull(entry.title),
    start_time: stringOrNull(entry.start_time),
    city: stringOrNull(entry.city),
    status: stringOrNull(entry.status),
    organization_id: stringOrNull(entry.organization_id),
    relationship,
    reason,
    strength,
    ...(typeof entry.similarity === 'number' ? { similarity: entry.similarity } : {}),
  };
}

/** Parse a `duplicates[]` / `possibleDuplicates[]` array, skipping malformed entries. */
function parseDuplicateSummaries(raw: unknown): DuplicateSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseDuplicateSummary)
    .filter((entry): entry is DuplicateSummary => entry !== null);
}

/**
 * Copy `warnings.possibleDuplicates` off a successful response into the caller's
 * report. A response without warnings leaves the report untouched, so warn mode
 * with no match behaves exactly as it did before the guard shipped.
 */
function collectDuplicateWarnings(
  responseData: unknown,
  report: DuplicateWarningReport | undefined,
  // The backend reports the matches even when the override cleared them, so an
  // acknowledged duplicate would otherwise be announced again on the success the
  // user just asked for. Drop them: they have already been seen and dismissed.
  wasOverridden = false
): void {
  if (!report || wasOverridden) return;
  const warnings = (responseData as { warnings?: { possibleDuplicates?: unknown } } | undefined)
    ?.warnings?.possibleDuplicates;
  const parsed = parseDuplicateSummaries(warnings);
  if (parsed.length > 0) {
    report.possibleDuplicates = parsed;
  }
}

/**
 * Thrown when create or publish returns 409 DUPLICATE_EVENT — the backend is in
 * block mode and this submission looks like an event that already exists.
 *
 * Carries the matches so the caller can show them, and `canOverride` telling it
 * whether re-sending with `duplicate_override` would go through. Treated as a
 * capability signal: absent means "do not offer to override".
 */
export class DuplicateEventError extends Error {
  code = 'DUPLICATE_EVENT' as const;
  duplicates: DuplicateSummary[];
  canOverride: boolean;
  constructor(message: string, duplicates: DuplicateSummary[], canOverride: boolean) {
    super(message);
    this.name = 'DuplicateEventError';
    this.duplicates = duplicates;
    this.canOverride = canOverride;
  }
}

/** True when an axios error is the backend's 409 DUPLICATE_EVENT. */
function isDuplicateEventResponse(error: {
  response?: { status?: number; data?: { code?: string } };
}): boolean {
  return error.response?.status === 409 && error.response?.data?.code === 'DUPLICATE_EVENT';
}

/**
 * Build a DuplicateEventError from the 409 body. The backend's `error` message
 * is English-only, so callers show localized copy — it is kept as the Error
 * message purely so an unhandled path still logs something meaningful.
 */
function duplicateEventErrorFrom(
  data: { error?: string; duplicates?: unknown; canOverride?: unknown } | undefined,
  fallbackMessage: string
): DuplicateEventError {
  return new DuplicateEventError(
    data?.error || fallbackMessage,
    parseDuplicateSummaries(data?.duplicates),
    data?.canOverride === true
  );
}

/** Options shared by the create entry points. */
export interface CreateEventOptions {
  /** Acknowledge a previous 409 DUPLICATE_EVENT and create the event anyway. */
  duplicateOverride?: boolean;
  /** Filled with the backend's non-blocking duplicate warnings, when any. */
  report?: DuplicateWarningReport;
}

/**
 * Create a new event via backend API.
 * The backend handles image upload, geocoding, URL validation and category
 * formatting, and fills in organizer_id and organizer_name from the JWT.
 *
 * `images` (max 5) may mix new picked files with already-hosted URL strings —
 * the latter are attached verbatim (create-from-template), leaving the source
 * template's own images untouched. Lists with at least one new file go as
 * ordered multipart parts; all-URL lists go as plain JSON. Falls back to the
 * legacy single image field when `images` is absent.
 *
 * @param eventData - Event data object
 * @param options - Duplicate-guard override and warnings out-parameter
 * @returns The created event object from the backend
 * @throws DuplicateEventError on 409 DUPLICATE_EVENT (backend in block mode)
 */
export async function createEventBackend(
  eventData: CreateEventRequest,
  options?: CreateEventOptions
): Promise<Event> {
  try {
    logger.debug('[EventService] createEventBackend called', {
      title: eventData.title,
      hasImage: !!eventData.image,
      imageCount: eventData.images?.length ?? 0,
      duplicateOverride: options?.duplicateOverride === true,
    });
    const normalized = normalizeEventPayload(eventData as unknown as Record<string, unknown>);
    // Only ever sent when acknowledging a 409 — a normal create carries no such
    // field (the backend schema is additionalProperties:false but tolerates
    // `false`; omitting it keeps the request identical to today's).
    if (options?.duplicateOverride) {
      (normalized as Record<string, unknown>).duplicate_override = true;
    }
    const hasImagesList = Array.isArray(eventData.images) && eventData.images.length > 0;
    const imagesHasNewFile = hasImagesList && eventData.images!.some(isPickedImage);
    const hasImageFile = !!eventData.image?.uri;

    let payload: FormData | Record<string, unknown>;
    let headers: Record<string, string> = {};

    if (imagesHasNewFile) {
      ({ payload, headers } = buildEventFormData(normalized, null, eventData.images));
    } else if (!hasImagesList && hasImageFile) {
      ({ payload, headers } = buildEventFormData(normalized, eventData.image!));
    } else {
      // JSON path: images is either absent/empty or an all-URL kept list
      // (create-from-template) — both are JSON-safe.
      payload = normalized;
      if (hasImagesList) {
        // images is authoritative — drop the legacy field so a file object
        // never leaks into the JSON body.
        delete (payload as Record<string, unknown>).image;
      } else {
        // An empty images list is the same as absent (backend default image) —
        // drop it so the JSON body never carries a redundant [].
        delete (payload as Record<string, unknown>).images;
      }
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

    collectDuplicateWarnings(response.data, options?.report, options?.duplicateOverride);

    return response.data.data;
  } catch (error: any) {
    // The api.ts interceptor rewrites a 429 into a RateLimitError carrying NO
    // `.response`, so this MUST come before any error.response read or the flags
    // are flattened away (see the auth error-swallow contract, and publishDraft).
    if (error?.isRateLimited || error?.code === 'RATE_LIMIT_EXCEEDED') {
      throw error;
    }
    if (isDuplicateEventResponse(error)) {
      throw duplicateEventErrorFrom(error.response.data, 'This event already exists');
    }
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
 * uses an endDate filter; draft sums the dedicated drafts endpoint's total over
 * every organization.
 *
 * Note: upcoming and past still count the FIRST organization only.
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

    const [upcomingResponse, pastResponse, draftTotal] = await Promise.all([
      getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: lookbackDate,
        limit: API_LIMITS.EVENTS_DEFAULT,
      }),
      getOrganizationPastEvents(organizationIds[0], { limit: 1 }),
      // Drafts count every org the user belongs to — the drafts list shows them
      // all, so a first-org-only badge would under-report unpublished work.
      getDraftsTotalForOrganizations(organizationIds),
    ]);

    const ongoingCount = upcomingResponse.events.filter((event) => isEventOngoing(event)).length;

    return {
      upcoming: ongoingCount,
      past: pastResponse.total,
      draft: draftTotal,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch event counts');
  }
}

/**
 * Summed draft total across organizations, for the badge counts only.
 *
 * Unlike `getDraftEventsForOrganizations` (which backs the drafts list and fails
 * loud), a single org's failure here degrades to a lower count instead of
 * rejecting: this call sits inside `fetchEventCounts`' Promise.all, so throwing
 * would blank the whole organizer dashboard — including the upcoming and past
 * counts, which have nothing to do with drafts. The list remains the
 * authoritative surface and still errors loudly.
 */
async function getDraftsTotalForOrganizations(organizationIds: string[]): Promise<number> {
  const results = await Promise.allSettled(
    organizationIds.map((organizationId) => getDraftEvents(organizationId, { limit: 1 }))
  );

  let total = 0;
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      total += result.value.total;
    } else {
      logger.warn('[EventService] Draft count failed for one organization', {
        organizationId: organizationIds[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return total;
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
 * The duplicate guard runs on drafts too (it is a create), so this can throw
 * DuplicateEventError in block mode exactly like a published create.
 *
 * @param eventData - Draft event data (description/start_time optional)
 * @param options - Duplicate-guard override and warnings out-parameter
 * @returns The created draft event
 */
export async function createDraftEvent(
  eventData: CreateDraftRequest,
  options?: CreateEventOptions
): Promise<Event> {
  // The runtime body-builder tolerates the missing required fields; only the
  // static signature is loosened relative to a published create.
  return createEventBackend({ ...eventData, is_draft: true } as CreateEventRequest, options);
}

/**
 * Server-side filters supported by GET /events/drafts, alongside pagination.
 * All optional; an absent filter means "no restriction".
 *
 * When any filter is set the backend scans the org's drafts, filters in memory
 * and paginates the FILTERED set, so `total` stays the exact post-filter count —
 * pagination therefore needs no special handling on the client.
 */
export interface DraftEventsQuery {
  limit?: number;
  offset?: number;
  /** Organizer/co-organizer avatars. Off by default — the drafts UI shows none. */
  includeAvatars?: boolean;
  /** Substring match over title OR description OR any category (max 200 chars). */
  search?: string;
  /** Exact category membership. */
  category?: string;
  /** Event origin: 'user' (created in the app/website) or 'automation'. */
  createdVia?: EventCreatedVia;
}

/**
 * List draft events for an organization. Auth + membership gated; the public
 * /events list never returns drafts.
 *
 * @param organizationId - The organization whose drafts to fetch
 * @param options - Optional pagination and server-side filters
 * @returns Object containing the draft events array and total count
 */
export async function getDraftEvents(
  organizationId: string,
  options?: DraftEventsQuery
): Promise<OrganizationEventsResponse> {
  try {
    const params: Record<string, string | number | boolean> = {
      organization_id: organizationId,
    };
    // Opt-in only: no drafts surface renders an organizer avatar, and asking for
    // them costs two extra backend queries plus a larger payload for the JS
    // thread to parse — which is felt as jank on a 500-row page.
    if (options?.includeAvatars) params.includeAvatars = true;
    if (options?.limit) params.limit = options.limit;
    if (options?.offset) params.offset = options.offset;
    // Backend caps search at 200 chars and 400s a longer one.
    if (options?.search?.trim()) params.search = options.search.trim().slice(0, 200);
    if (options?.category) params.category = options.category;
    if (options?.createdVia) params.created_via = options.createdVia;

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
 * List draft events across several organizations (typically all of the user's
 * own). `/events/drafts` takes a single organization_id, so each org is queried
 * in parallel with the same limit/offset and the pages are merged: events
 * concatenated (deduped by $id) and totals summed.
 *
 * Ordering is not meaningful across a merged page — the backend sorts each org's
 * drafts by start_time and callers re-sort the accumulated list (see
 * draft-events.tsx). Completeness is preserved: the union of the per-org pages
 * covers every draft, at the cost of a possible empty tail request for orgs that
 * ran out of rows earlier than others.
 *
 * A single org's failure rejects the whole call on purpose — a silently short
 * list of unpublished work is worse than an error state.
 *
 * @param organizationIds - The organizations whose drafts to fetch
 * @param options - Optional pagination and filters, applied per organization
 * @returns Object containing the merged draft events array and summed total
 */
export async function getDraftEventsForOrganizations(
  organizationIds: string[],
  options?: DraftEventsQuery
): Promise<OrganizationEventsResponse> {
  if (organizationIds.length === 0) {
    return { events: [], total: 0 };
  }
  if (organizationIds.length === 1) {
    return getDraftEvents(organizationIds[0], options);
  }

  const responses = await Promise.all(
    organizationIds.map((organizationId) => getDraftEvents(organizationId, options))
  );

  const seen = new Set<string>();
  const events: Event[] = [];
  let total = 0;

  for (const response of responses) {
    total += response.total;
    for (const event of response.events) {
      if (seen.has(event.$id)) continue;
      seen.add(event.$id);
      events.push(event);
    }
  }

  return { events, total };
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
 * Thrown when POST /events/:id/publish returns 409 EVENT_NOT_DRAFT — the event
 * is no longer a draft, i.e. it was already published (typically from the web
 * dashboard, or a duplicate tap) while this client still listed it as one.
 * Callers should treat it as success-in-effect: drop the row and refresh.
 *
 * The publish endpoint shares its 409 with DUPLICATE_EVENT, which is the exact
 * opposite (nothing was published), so the mapping below MUST branch on `code`.
 */
export class EventNotDraftError extends Error {
  code = 'EVENT_NOT_DRAFT' as const;
  constructor() {
    super('This event has already been published');
    this.name = 'EventNotDraftError';
  }
}

/**
 * Publish a draft event. The backend returns the resulting status: 'active' for
 * a future-dated event, 'past' for a past-dated one (the backend does NOT block
 * past-dated publishes — callers must run the client readiness check first).
 *
 * @param eventId - The ID of the draft to publish
 * @param options - Duplicate-guard override and warnings out-parameter
 * @returns The resulting { $id, status }
 * @throws EventIncompleteError on 422 (missing required fields)
 * @throws EventNotDraftError on 409 EVENT_NOT_DRAFT (already published)
 * @throws DuplicateEventError on 409 DUPLICATE_EVENT (backend in block mode)
 */
export async function publishDraft(
  eventId: string,
  options?: { duplicateOverride?: boolean; report?: DuplicateWarningReport }
): Promise<PublishDraftResponse> {
  try {
    // Empty object body — Fastify rejects a no-body POST (415); the axios
    // instance default Content-Type is application/json. The override field is
    // added only when acknowledging a 409, so a normal publish sends `{}` as before.
    const body = options?.duplicateOverride ? { duplicate_override: true } : {};
    const response = await api.post<{
      success: boolean;
      data: PublishDraftResponse;
    }>(`/events/${eventId}/publish`, body);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to publish draft');
    }

    collectDuplicateWarnings(response.data, options?.report, options?.duplicateOverride);

    return response.data.data;
  } catch (error: any) {
    // The api.ts interceptor rewrites a 429 into a RateLimitError that carries NO
    // `.response`, so this guard MUST come before any error.response reads or the
    // message degrades to the generic fallback (see auth error-swallow contract).
    if (error?.isRateLimited || error?.code === 'RATE_LIMIT_EXCEEDED') {
      throw error;
    }
    if (error.response?.status === 422 && error.response?.data?.code === 'EVENT_INCOMPLETE') {
      throw new EventIncompleteError(error.response.data.fields ?? []);
    }
    // Two very different 409s share this status. DUPLICATE_EVENT means nothing
    // was published; every other 409 (EVENT_NOT_DRAFT, or a 409 with no code at
    // all — `code` is not required by the error schema) keeps the old meaning:
    // already public.
    if (isDuplicateEventResponse(error)) {
      throw duplicateEventErrorFrom(error.response.data, 'This event already exists');
    }
    if (error.response?.status === 409) {
      throw new EventNotDraftError();
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
