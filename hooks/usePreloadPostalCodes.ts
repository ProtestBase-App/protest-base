import { useEffect } from 'react';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { FormattedEventListItem } from '@/utils/eventFormatters';

/**
 * Preloads postal-code data for every unique country represented in `events`,
 * so subsequent `getSubMunicipalityName` lookups resolve without additional
 * I/O. Mirrors the lazy-loading contract of `PostalCodeProvider`.
 */
export function usePreloadPostalCodes(events: FormattedEventListItem[]) {
  const { loadPostalCodesForCountry } = usePostalCodes();

  useEffect(() => {
    const uniqueCountries = [...new Set(events.map((event) => event.country).filter(Boolean))];
    uniqueCountries.forEach((country) => {
      if (country) {
        loadPostalCodesForCountry(country);
      }
    });
  }, [events, loadPostalCodesForCountry]);
}
