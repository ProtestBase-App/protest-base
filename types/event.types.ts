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

  // Date-only event: a date with no clock time. The timestamps above are then a
  // STORAGE CONVENTION (Brussels 00:00 → 23:59:59.999), not a claim about time.
  // Always branch on this flag — never infer it from the time being midnight, or
  // a genuine midnight-starting vigil renders as "All day". Optional here (not in
  // the API contract, where it is always present) because the persisted events
  // cache can rehydrate objects written before this field existed.
  all_day?: boolean;

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

  // Origin of the event: 'user' (app/website) or 'automation' (scraper pipeline).
  // The backend defaults it to 'user' in every response; only drafts surface it
  // in the UI, where an automation draft is labelled as such.
  created_via?: EventCreatedVia;

  // Automation drafts only. 0-100 corroboration score with its per-check
  // breakdown. `null` means NEVER SCORED (human draft, or an uncrawlable
  // source) and must render nothing — distinct from a scored 0, which means
  // nothing could be corroborated and renders loudly. Always test with
  // `hasConfidenceScore()`, never `!score`.
  confidence_score?: number | null;
  // Free-form by backend design: the checks live in the automation workflow and
  // evolve without a backend deploy, so parse defensively.
  confidence_details?: Record<string, unknown> | null;

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

/**
 * How the event entered the system. Drafts ingested by the scraping pipeline are
 * 'automation'; anything a human created in the app or on the website is 'user'.
 */
export type EventCreatedVia = 'user' | 'automation';

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

  // Date-only event. There is no authoring UI for this — the scraper sets it, and
  // the app only ever sends it from the edit screens to PRESERVE or CLEAR the flag
  // on an event that already has it (see the all-day handling in event-edit). The
  // server ignores any clock time sent alongside `true` and re-pins to the Brussels
  // day, so sending `false` is the only way to give a scraped event a real time.
  all_day?: boolean;

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

  // Coordinates of an accepted address suggestion. When the client sends both
  // (and they fall inside the BE/NL bbox) the backend ADOPTS them as the event
  // pin and skips geocoding; otherwise it silently falls back to Nominatim. Send
  // them only for a suggestion picked in the current session. `geocod_status` is
  // minted server-side and must NEVER be sent — a client value is ignored.
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

// ---------------------------------------------------------------------------
// Duplicate-event guard (backend `eventDedup.service.ts`)
//
// The backend runs a duplicate check on create (POST /events) and on publish
// (POST /events/:id/publish). It has two modes:
//   - warn  — nothing is blocked; a success response MAY carry
//             `warnings.possibleDuplicates[]`.
//   - block — a match returns 409 DUPLICATE_EVENT with `duplicates[]` and
//             `canOverride`, re-sendable with `duplicate_override`.
// The app must be correct in both; warn mode is what production runs today.
// ---------------------------------------------------------------------------

/**
 * How the submitting organization relates to the matched event.
 * - `own` — the same organization created it (typically a double submit).
 * - `co_organized` — the match already lists the submitting org as co-organizer.
 * - `other_org` — somebody else's event.
 */
export type DuplicateRelationship = 'own' | 'co_organized' | 'other_org';

/**
 * Why the backend considers the two events the same.
 * - `url` — same link, close in time.
 * - `content` — same title + place, close in time.
 * - `url-recurring` — same link, different time (a reused series/campaign page).
 * - `fuzzy` — similar title, same place, close in time.
 */
export type DuplicateReason = 'url' | 'content' | 'url-recurring' | 'fuzzy';

/** `strong` blocks a create; `weak` only annotates one (both block a publish). */
export type DuplicateStrength = 'strong' | 'weak';

/**
 * One matched event, as the backend summarizes it. Only `id`, `relationship`,
 * `reason` and `strength` are guaranteed — every display field is nullable and
 * may be absent entirely, so render defensively.
 *
 * Note there is no `all_day` here, so a date-only match cannot be rendered as
 * such from this payload alone (see `formatDuplicateWhen`).
 */
export interface DuplicateSummary {
  id: string;
  title: string | null;
  start_time: string | null;
  city: string | null;
  /** Event status, e.g. 'active' | 'past' | 'draft'. Free-form on the wire. */
  status: string | null;
  organization_id: string | null;
  relationship: DuplicateRelationship;
  reason: DuplicateReason;
  strength: DuplicateStrength;
  /** Trigram similarity, present on `fuzzy` matches only. */
  similarity?: number;
}

/**
 * Out-parameter filled by the create/publish service calls with the backend's
 * non-blocking duplicate verdicts (`warnings.possibleDuplicates`).
 *
 * An out-parameter rather than a changed return type: every existing caller
 * reads the returned Event / status directly and none of them care about
 * warnings, and the value is needed AFTER the await (both screens navigate away
 * as soon as the call resolves), which rules out a callback.
 */
export interface DuplicateWarningReport {
  possibleDuplicates?: DuplicateSummary[];
}
