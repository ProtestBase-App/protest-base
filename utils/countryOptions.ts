import { countries } from '@/constants/Countries';
import type { EventCountry } from '@/types/event.types';

export interface CountryFilterOption {
  /** Canonical country value, e.g. 'belgium'. */
  value: EventCountry;
  /** Localized country name. */
  label: string;
}

/** Localized label for a backend country value; falls back to the raw value. */
export function getCountryLabel(value: string, locale: string): string {
  const entry = countries.find((country) => country.value === value.toLowerCase());
  if (!entry) return value;
  return entry.label[locale as keyof typeof entry.label] ?? entry.label.en;
}

/**
 * The countries that can be picked, in `constants/Countries.ts` order. France is
 * listed only while the backend serves it (PostalCodeProvider's `franceEnabled`).
 */
export function getSelectableCountries({ franceEnabled }: { franceEnabled: boolean }) {
  return countries.filter(({ value }) => value !== 'france' || franceEnabled);
}

/** The countries a filter can be narrowed to, in `constants/Countries.ts` order. */
export function getCountryFilterOptions(
  locale: string,
  { franceEnabled }: { franceEnabled: boolean }
): CountryFilterOption[] {
  return getSelectableCountries({ franceEnabled }).map(({ value }) => ({
    value: value as EventCountry,
    label: getCountryLabel(value, locale),
  }));
}
