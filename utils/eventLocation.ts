/**
 * Event location helpers shared by the edit screens and the display surfaces.
 *
 * Import-free on purpose (the name resolver is passed in), so this module can
 * never take part in an import cycle.
 */

/** The location fields an event edit can clear. */
export const CLEARABLE_LOCATION_FIELDS = [
  'street_address',
  'city',
  'region',
  'country',
  'postal_code',
] as const;

export type ClearableLocationField = (typeof CLEARABLE_LOCATION_FIELDS)[number];

export type LocationValues = Partial<Record<ClearableLocationField, string | null>>;

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Normalise a postcode to the string form the backend stores (VARCHAR; bare
 * digits for LU/NL). The API sends strings, but legacy templates hold numbers.
 * Blank or non-text values become null.
 */
export function toPostalCodeString(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return null;
}

/**
 * Location part of an event update. The backend reads an omitted field as
 * "unchanged" and '' as "cleared", while null is rejected on a JSON PUT (400)
 * and silently dropped for the postcode. So: a field with a value is sent as
 * is, a field the user emptied (filled when loaded, blank now) is sent as '',
 * and a field that was already blank is omitted.
 */
export function buildLocationUpdate(
  current: LocationValues,
  loaded: LocationValues | null
): Partial<Record<ClearableLocationField, string>> {
  const update: Partial<Record<ClearableLocationField, string>> = {};
  for (const field of CLEARABLE_LOCATION_FIELDS) {
    const value = current[field];
    if (hasText(value)) {
      update[field] = value;
    } else if (hasText(loaded?.[field])) {
      update[field] = '';
    }
  }
  return update;
}

/**
 * The spellings the backend treats as each country (mirror of its
 * COUNTRY_VARIANTS), compared after NFC + trim + lowercase.
 */
const COUNTRY_VARIANTS: Record<string, readonly string[]> = {
  belgium: ['belgium', 'belgique', 'belgie', 'belgië', 'be'],
  netherlands: ['netherlands', 'pays-bas', 'nederland', 'nl', 'the netherlands'],
  luxembourg: ['luxembourg', 'luxemburg', 'lëtzebuerg', 'letzebuerg', 'lu'],
};

/** Canonical country ('belgium' | 'netherlands' | 'luxembourg') for a stored spelling, else null. */
export function canonicalCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.normalize('NFC').trim().toLowerCase();
  for (const [country, variants] of Object.entries(COUNTRY_VARIANTS)) {
    if (variants.includes(normalized)) return country;
  }
  return null;
}

/**
 * The 4-digit part of an event postcode, which the bundled datasets key on:
 * "1000" → "1000", a legacy NL "5611 EC" → "5611", "L-1611" → "1611".
 */
export function normalizeEventPostcode(postalCode: string | number): string | null {
  const match = String(postalCode).match(/\d{4}/);
  return match ? match[0] : null;
}

/** Resolves a postcode to its localized name, falling back to `fallbackCity`. */
export type PostalCodeNameResolver = (
  postalCode: string,
  country: string,
  fallbackCity?: string | null
) => string;

interface CityLabelSource {
  postal_code?: string | null;
  country?: string | null;
  city?: string | null;
}

/**
 * Display city for an event: the bundled-dataset name for its postcode when it
 * has one, otherwise the stored `city` — so an event entered without a
 * postcode still shows where it is.
 */
export function resolveEventCityLabel(
  event: CityLabelSource,
  resolveName: PostalCodeNameResolver
): string {
  if (event.postal_code && event.country) {
    const resolved = resolveName(String(event.postal_code), event.country, event.city);
    if (resolved) return resolved;
  }
  return event.city ?? '';
}
