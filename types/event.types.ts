/**
 * Co-organizer avatar information.
 * Only populated when fetching an event with `includeAvatars=true`.
 */
export interface CoOrganizerAvatar {
  id: string | null;
  name: string;
  avatar: string | null;
}

/** Event data as returned by the API. */
export interface Event {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;

  id: string;
  title: string;
  description: string;
  image?: string;
  // Ordered image URLs (max 5). The legacy `image` always equals `images[0] ?? null`.
  images?: string[];

  street_address?: string | null;
  city?: string | null;
  region?: string | null;
  country: string;
  postal_code?: number | null;

  geocod_status?: string | null;
  geocod_lat?: number | null;
  geocod_lng?: number | null;

  start_time: string;
  end_time?: string;

  organization_id?: string;

  // organizer_* fields are populated from the authenticated user who created the event.
  organizer_id?: string;
  organizer_name: string;
  co_organizers?: string[];

  website_url?: string | null;
  categories?: string[];
  disclaimer?: string | null;
  help_needed?: boolean;
  help_description?: string;

  // Populated by backend; default 0.
  view_count?: number;
  participant_count?: number;
  save_count?: number;
  like_count?: number;

  // 'active' default; 'cancelled' = creator cancelled; 'past' = nightly cron flip after end_time.
  status?: EventStatus;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  // Only populated when includeAvatars=true.
  organizer_avatar?: string | null;
  co_organizer_avatars?: CoOrganizerAvatar[];
}

/**
 * Event lifecycle status returned by the backend.
 *
 * - 'draft' events are excluded from all list endpoints (e.g. GET /events)
 *   unconditionally on the server, for every caller. They are only reachable
 *   via the dedicated authenticated drafts endpoint, so the public explore
 *   feed and the global events cache never contain them.
 * - Whether 'cancelled' events appear in list endpoints is controlled by the
 *   `includeCancelled` query param (defaults to false client-side).
 */
export type EventStatus = 'draft' | 'active' | 'cancelled' | 'past';

/** Image object from expo-image-picker. */
export interface PickedImage {
  uri: string;
  mimeType?: string;
  fileName?: string | null;
}

/** Request body for creating an event. */
export interface CreateEventRequest {
  organization_id: string;
  title: string;
  description: string;
  start_time: string;

  end_time?: string;
  street_address?: string;
  city?: string;
  region?: string;
  country?: string;
  postal_code?: number;

  // Either a picked image or omitted (backend supplies a default).
  image?: PickedImage;

  // Ordered list of images (max 5): PickedImages are new uploads, strings are
  // already-hosted https URLs attached verbatim (e.g. template images on
  // create-from-template). Authoritative when present — the legacy `image`
  // field is then ignored. Empty/omitted → backend assigns the default.
  images?: (PickedImage | string)[];

  website_url?: string;
  categories?: string | string[];
  disclaimer?: string;
  co_organizers?: string[];
  help_needed?: boolean;
  help_description?: string;

  // Create-only: when true the event is born status:'draft'. PUT/PATCH ignore it.
  is_draft?: boolean;

  // Geocoding is filled in server-side; clients should not set these.
  geocod_status?: string;
  geocod_lat?: number;
  geocod_lng?: number;
}

/**
 * Request body for creating a draft event. Drafts may be incomplete, so the
 * fields that are mandatory for a published event (`description`, `start_time`)
 * are optional here. Completeness is enforced at publish time, not create time.
 */
export type CreateDraftRequest = Omit<CreateEventRequest, 'description' | 'start_time'> & {
  description?: string;
  start_time?: string;
};

/**
 * Request body for updating an event. All fields are optional; image can be a
 * new file upload or an existing URL string (to keep the current image).
 */
export type UpdateEventRequest = Partial<
  Omit<CreateEventRequest, 'organization_id' | 'image' | 'images'>
> & {
  image?: PickedImage | string;

  /**
   * Authoritative ordered final list (max 5): strings are kept existing URLs,
   * PickedImages are new uploads. `null` removes all images; omitted leaves
   * them unchanged. When present, the legacy `image` field is ignored.
   */
  images?: (PickedImage | string)[] | null;
};

/**
 * Response from publishing a draft. The backend returns the resulting status:
 * 'active' for a future-dated event, 'past' for a past-dated one.
 */
export interface PublishDraftResponse {
  $id: string;
  status: 'active' | 'past';
}

/** Event extended with pre-formatted date/time strings for display components. */
export interface EventDisplay extends Event {
  startDateFull: string;
  endDateFull: string | null;
  startDateNoFormat: string;
  endDateNoFormat: string | null;
  start_date: string;
  end_date: string;
}
