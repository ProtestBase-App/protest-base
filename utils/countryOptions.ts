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

/** The countries a filter can be narrowed to, in `constants/Countries.ts` order. */
export function getCountryFilterOptions(locale: string): CountryFilterOption[] {
  return countries.map(({ value }) => ({
    value: value as EventCountry,
    label: getCountryLabel(value, locale),
  }));
}
