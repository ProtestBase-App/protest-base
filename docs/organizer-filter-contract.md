# Backend Contract: Organizer ↔ Event Matching

**Status:** the mobile frontend already sends everything below. The defect is purely
in backend matching: org→event queries currently match an event's **main organizer
only** (`organization_id`), ignoring the `co_organizers` array. This document states
exactly what the mobile app expects so the backend can be fixed and covered by tests.

## Core rule

> An organization is considered "associated with" an event when its ID equals the
> event's `organization_id` **OR** appears in the event's `co_organizers[]` array.

This rule must hold **identically** across all three endpoints below. The frontend does
no client-side organizer filtering — it relies entirely on the backend applying this rule.

### ID format

- Org IDs sent by the app are the org's `$id` (mostly UUIDs; some legacy 20-char
  Appwrite IDs still exist in data).
- `co_organizers[]` **must store the same ID format** as `organization_id` and as the
  IDs the dropdown/profile send. If co-organizers were ever stored as names or a
  different ID scheme, the `OR` match will silently fail — worth a data audit.

---

## Endpoints the frontend calls

### 1. `GET /events` — `organizers` param (Explore tab filter)

- **Caller:** `useExplorePagination` → `getEventsBackend` (`services/event.service.ts`).
- **Request params:**
  | param | type | notes |
  |-------|------|-------|
  | `organizers` | string | **comma-joined** list of org IDs, e.g. `id1,id2` |
  | `limit`, `offset` | number | pagination |
  | `includeEnded` | boolean | explore always sends `false` |
  | `dateFilter` | string | `today` \| `tomorrow` \| `thisWeek` \| `thisWeekend` (optional) |
  | `postalCodes` | string | comma-joined (optional) |
  | `category` | string | (optional) |
  | `search` | string | (optional) |
- **Expected matching:** return events where **any** of the requested org IDs matches
  `organization_id` **OR** is contained in `co_organizers[]`. (Multiple IDs = OR across them.)
- **Response shape (unchanged):**
  ```json
  { "success": true, "data": { "events": [...], "total": 11, "limit": 20, "offset": 0, "filters_applied": { "organizers": ["id1"] } } }
  ```

### 2. `GET /events` — `organization_id` param (Organizer profile page)

- **Caller:** `app/organizer/[id].tsx` → `getEventsBackend({ organizationId })`.
- **Request params:** `organization_id` (single ID), `startDate` (ISO, "now" → upcoming only), `limit`, `offset`.
- **Expected matching:** return events where the ID matches `organization_id` **OR** is in `co_organizers[]`.
- **Response shape:** same wrapper as #1.

### 3. `GET /organizations/:id/events` (My Events screens)

- **Caller:** `getOrganizationUpcomingEvents` / `getOrganizationPastEvents`
  (`upcoming.tsx`, `past.tsx`, `my-events.tsx`).
- **Request params:**
  - upcoming: `startDate` (ISO, default now), `limit`, `offset`, `includeAvatars`
  - past: `endDate` (ISO, default now), `limit`, `offset`, `includeAvatars`
- **Expected matching:** return events where `:id` matches `organization_id` **OR** is in
  `co_organizers[]`. (Product decision: My Events shows co-organized events too.)
- **Response shape:**
  ```json
  { "success": true, "data": { "events": [...], "total": 10 }, "message": "..." }
  ```

---

## Event fields the frontend reads (must be present & consistent)

From `types/event.types.ts`:

- `organization_id?: string` — main organizer ID
- `co_organizers?: string[]` — co-organizer IDs (same format as `organization_id`)
- `organizer_name: string`, `organizer_id?`, `start_time`, `end_time?`, `categories?`,
  `postal_code`, `country`, `view_count?`, `help_needed?`, `status?`
- `organizer_avatar?`, `co_organizer_avatars?` — only when `includeAvatars=true`

---

## Test cases (apply to all three endpoints)

Given an org `O` and events:

| Event | `organization_id` | `co_organizers` | Should match `O`?                             |
| ----- | ----------------- | --------------- | --------------------------------------------- |
| E1    | `O`               | `[]`            | ✅ yes (main organizer)                       |
| E2    | `X`               | `[O]`           | ✅ yes (co-organizer) — **currently failing** |
| E3    | `X`               | `[Y, O, Z]`     | ✅ yes (co-organizer among several)           |
| E4    | `X`               | `[Y]`           | ❌ no                                         |
| E5    | `O`               | `[O]`           | ✅ yes, returned **once** (no duplicates)     |

Additional cases:

- **Multi-ID (`organizers=O,P`):** event matches if it's associated with `O` **or** `P`
  (via either field). De-duplicate so an event isn't returned twice.
- **`includeEnded=false`:** an org with only past events returns `[]` with `total: 0`
  (this is correct behavior, not the co-organizer bug — keep them distinct in tests).
- **ID format:** an event co-organized via a legacy/non-UUID ID still matches when that
  same ID is requested.
- **`total` accuracy:** `total` reflects the OR-matched count (used for pagination and
  the profile page's event count badge).
