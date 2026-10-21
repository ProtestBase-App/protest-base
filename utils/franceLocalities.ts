/**
 * The event form's French locality picker: one entry per (postcode, commune)
 * pair of the backend's dataset, and the search over them.
 *
 * Without a French address-search instance this picker is how a French event
 * gets its postcode, city and région, so it writes the same text French address
 * search stores: the 5-digit postcode as a string, the commune's official name
 * and the région's official name.
 *
 * Pure module — no React, no i18n.
 */

import type { FranceAreas } from '@/constants/PostalCodes_FR';
import { foldForSearch } from '@/utils/locationFilterOptions';

export interface FranceLocality {
  /**
   * "<postcode>|<INSEE code>": unique, since one postcode can cover dozens of
   * communes and a few commune names repeat.
   */
  value: string;
  /** "Commune (75011)". */
  label: string;
  /** The département's name, to tell apart communes that share a name. */
  sublabel: string;
  /** The commune's name, folded (no accents, spaces for hyphens), for the search. */
  searchText: string;
  /** The 5-digit postcode, a string ("01000"). */
  postalCode: string;
  /** The commune's official name, stored as the event's city. */
  city: string;
  /** Its région's official name, stored as the event's region. */
  region: string;
}

/** Every (postcode, commune) pair, by postcode, then the most populous commune first. */
export function buildFranceLocalities(data: FranceAreas): FranceLocality[] {
  const regionName = new Map(data.regions.map((region) => [region.token, region.name]));
  const departements = new Map(data.departements.map((d) => [d.code, d]));
  const foldedNames = new Map<string, string>();
  const localities: FranceLocality[] = [];
  // Object.keys lists integer-like codes ("10000") before "01000": sort as text.
  for (const postalCode of Object.keys(data.postcodes).sort()) {
    for (const [city, insee, departementCode] of data.postcodes[postalCode]) {
      const departement = departements.get(departementCode);
      let searchText = foldedNames.get(city);
      if (searchText === undefined) {
        searchText = foldForSearch(city).spaced;
        foldedNames.set(city, searchText);
      }
      localities.push({
        value: `${postalCode}|${insee}`,
        label: `${city} (${postalCode})`,
        sublabel: departement?.name ?? '',
        searchText,
        postalCode,
        city,
        region: (departement && regionName.get(departement.region)) ?? '',
      });
    }
  }
  return localities;
}

/**
 * The value of the locality an event's stored postcode and city name, or null
 * when they name none (e.g. a city filled in by address search that differs).
 */
export function findFranceLocalityValue(
  data: FranceAreas,
  postalCode: string | null,
  city: string
): string | null {
  if (!postalCode) return null;
  const commune = data.postcodes[postalCode]?.find(([name]) => name === city);
  return commune ? `${postalCode}|${commune[1]}` : null;
}

/**
 * The localities matching a query, best first. Digits match a postcode from its
 * start ("750" → 75001…, "75 011" → 75011). Words match the commune's name
 * however it is accented or hyphenated: the whole name first, then its start,
 * then the start of a word, then anywhere. Words and digits together
 * ("paris 11") need both, the digits anywhere in the postcode.
 */
export function matchFranceLocalities<T extends { value: string; searchText?: string }>(
  options: T[],
  query: string
): T[] {
  const parts = foldForSearch(query).spaced.split(' ').filter(Boolean);
  const digits = parts.filter((part) => /^\d+$/.test(part)).join('');
  const words = parts.filter((part) => !/^\d+$/.test(part)).join(' ');
  // value starts with the postcode: "<postcode>|<INSEE code>".
  const postalCodeOf = (option: T) => option.value.slice(0, 5);

  if (!words) return options.filter((option) => postalCodeOf(option).startsWith(digits));

  const ranked: T[][] = [[], [], [], []];
  for (const option of options) {
    if (digits && !postalCodeOf(option).includes(digits)) continue;
    const name = option.searchText ?? '';
    const index = name.indexOf(words);
    if (index === -1) continue;
    const rank = name === words ? 0 : index === 0 ? 1 : name.includes(` ${words}`) ? 2 : 3;
    ranked[rank].push(option);
  }
  return ranked.flat();
}
