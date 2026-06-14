/**
 * Address autocomplete types.
 *
 * Consumed from the backend `GET /address/autocomplete` endpoint (a Photon/OSM
 * proxy). A suggestion is the canonical, anti-corruption source for an event's
 * street address: the value the user types is never saved directly — only a
 * value derived from a chosen suggestion is.
 *
 * @see services/address.service.ts
 */

/** Lowercase ISO country code accepted by the autocomplete endpoint. */
export type AddressCountryCode = 'be' | 'nl';

/** Language hint accepted by the autocomplete endpoint. */
export type AddressLang = 'en' | 'nl' | 'fr' | 'de';

/**
 * A single address/POI suggestion returned by the backend.
 *
 * The backend already trims every field to the DB caps (street ≤75, postal ≤10,
 * city/region ≤35) and filters to address/POI level (max 8 results). The three
 * nullable fields arrive as explicit JSON `null`, not omitted.
 */
export interface AddressSuggestion {
  /** Canonical OSM text — the value written to `street_address`. Always present. */
  street_address: string;
  /** e.g. "1000" (BE) or "1234 AB" (NL). Null for sparse POIs. */
  postal_code: string | null;
  city: string | null;
  region: string | null;
  /** Full name, "belgium" | "netherlands". */
  country: string;
  /**
   * Latitude. When the suggestion is accepted via a live pick this session, it
   * is forwarded on save as `geocod_lat` so the backend adopts the confirmed pin
   * instead of re-geocoding (see the geocod_* fields on CreateEventRequest).
   */
  lat: number;
  /** Longitude — forwarded on save as `geocod_lng` alongside `lat` (see above). */
  lng: number;
  /** Pre-composed display label, e.g. "Rue de la Loi 16, 1000, Brussels". */
  label: string;
}
