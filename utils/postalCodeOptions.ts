import { useState, useEffect, useMemo } from 'react';
import { usePostalCodes } from '@/context/PostalCodeProvider';

export interface PostalCodeOption {
  /** Display label, e.g. "Brussels (1000)". */
  label: string;
  /** Postal code as a string, e.g. "1000". */
  value: string;
  postalCode: number;
  cityName: string;
  country: string;
  /** Lowercased "city postalcode" string for search filtering. */
  searchText: string;
}

/**
 * Hook to generate postal code options for filter dropdowns
 * @param countries - Array of countries to load postal codes for (e.g., ['belgium', 'netherlands'])
 * @returns Object containing postal code options and loading state
 */
export function usePostalCodeOptions(countries: string[]): {
  options: PostalCodeOption[];
  loading: boolean;
} {
  const { loadPostalCodesForCountry, cacheVersion, getPostalCodeData } = usePostalCodes();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const loadPromises = countries.map((country) => loadPostalCodesForCountry(country));

    Promise.all(loadPromises).finally(() => setLoading(false));
  }, [countries.join(','), loadPostalCodesForCountry]);

  const options = useMemo(() => {
    const opts: PostalCodeOption[] = [];
    const seen = new Set<number>();

    countries.forEach((country) => {
      const postalCodeData = getPostalCodeData(country);

      postalCodeData.forEach((pc: any) => {
        if (seen.has(pc.post_code)) return;
        seen.add(pc.post_code);

        // Belgium has 'sub_municipality_name_english/french/dutch';
        // Netherlands has plain 'sub_municipality_name'.
        const subMunicipalityKey = Object.keys(pc).find((key) =>
          key.startsWith('sub_municipality_name')
        );

        if (subMunicipalityKey && pc[subMunicipalityKey]) {
          const cityName = pc[subMunicipalityKey];
          opts.push({
            label: `${cityName} (${pc.post_code})`,
            value: String(pc.post_code),
            postalCode: pc.post_code,
            cityName: cityName,
            country: country,
            searchText: `${cityName.toLowerCase()} ${pc.post_code}`,
          });
        }
      });
    });

    return opts.sort((a, b) => a.cityName.localeCompare(b.cityName));
  }, [cacheVersion, countries.join(','), getPostalCodeData]);

  return { options, loading };
}

/**
 * Get city name from a postal code value, or the postal code itself when not found.
 */
export function getCityNameFromPostalCode(postalCode: string, options: PostalCodeOption[]): string {
  const option = options.find((opt) => opt.value === postalCode);
  return option ? option.cityName : postalCode;
}

/**
 * Get the full "City (postal_code)" label, or the postal code itself when not found.
 */
export function getLabelFromPostalCode(postalCode: string, options: PostalCodeOption[]): string {
  const option = options.find((opt) => opt.value === postalCode);
  return option ? option.label : postalCode;
}
