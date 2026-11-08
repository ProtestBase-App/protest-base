import { foldForSearch } from '@/utils/locationFilterOptions';

/** A row's name keys carry the data's language: `sub_municipality_name_english`, … */
function nameAt(row: object, prefix: string): string {
  const value = Object.entries(row).find(([key]) => key.startsWith(prefix))?.[1];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The place to show for one postcode, in the data's language, given every row for that
 * postcode and the city stored on the event.
 *
 * A Belgian postcode can cover several places, in no useful order: 3000 lists Heverlee before
 * Leuven, and 4000 lists Angleur before Liège. So the first row is often the wrong one:
 * 1. one place: that place;
 * 2. the event's city names one of them ("Ixelles - Elsene"): that one;
 * 3. they all belong to one municipality (3000 → Leuven): the municipality;
 * 4. otherwise (1050 is Ixelles and Saint-Gilles): the event's city as entered, or the first
 *    place when it has none. Never empty while a row exists, so a caller that tries another
 *    country next doesn't label a Belgian code with a Dutch town.
 */
export function pickPostalCodePlace(rows: readonly object[], city?: string | null): string {
  const fallback = (city ?? '').trim();
  const places = rows
    .map((row) => ({
      name: nameAt(row, 'sub_municipality_name'),
      municipality: nameAt(row, 'municipality_name'),
    }))
    .filter((place) => place.name);
  if (places.length === 0) return fallback;
  if (places.length === 1) return places[0].name;

  const cityWords = ` ${foldForSearch(fallback).spaced} `;
  const named = places.find((place) => cityWords.includes(` ${foldForSearch(place.name).spaced} `));
  if (named) return named.name;

  const municipalities = new Set(places.map((place) => place.municipality));
  if (municipalities.size === 1 && !municipalities.has('')) return places[0].municipality;

  return fallback || places[0].name;
}
