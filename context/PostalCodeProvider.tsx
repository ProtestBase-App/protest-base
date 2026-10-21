import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import type { FranceAreas } from '@/constants/PostalCodes_FR';
import type { LuxembourgCanton, LuxembourgCommune } from '@/constants/PostalCodes_LU';
import { probeFranceSupport } from '@/services/event.service';
import { logger } from '@/utils/logger';
import {
  buildLocationFilterOptions,
  buildLocationMatch,
  expandLocationTokens,
  isLocationSelectionTooBroad,
  resolveLocationLabel,
  type Lang,
  type LocationFilterOption,
  type LocationMatch,
} from '@/utils/locationFilterOptions';

export type Country = 'belgium' | 'netherlands';

const isValidCountry = (country: string): country is Country => {
  return country === 'belgium' || country === 'netherlands';
};

interface PostalCodeContextType {
  /**
   * Resolve a postal code to its localized municipality name from the bundled
   * dataset. `fallbackCity` (e.g. the event's stored `city`) is returned when the
   * code isn't in the static set — common for NL and edge OSM postcodes sourced
   * from address autocomplete — so the location still displays instead of blank.
   */
  getSubMunicipalityName: (
    postalCode: string,
    country: string,
    fallbackCity?: string | null
  ) => string;
  loading: boolean;
  loadPostalCodesForCountry: (country: string) => Promise<void>;
  /** Bumped when the cache updates so consumers can re-render. */
  cacheVersion: number;
  getPostalCodeData: (country: string) => any[];
  /**
   * Administrative-hierarchy options (region/province/municipality) for the
   * explore location filter, in the user's language. Empty until data loads.
   */
  locationFilterOptions: LocationFilterOption[];
  /** Expand hierarchy tokens (or raw codes) to deduped postal codes for the backend. */
  expandLocationTokens: (values: string[]) => { codes: string[]; truncated: boolean };
  /** Resolve a token or raw postal code to a display label. */
  resolveLocationLabel: (value: string) => string;
  /** True when a selection would expand past the backend-safe postal-code limit. */
  isLocationSelectionTooBroad: (values: string[]) => boolean;
  /** Prepare a selection for matching events on the device (country-scoped, like the server). */
  buildLocationMatch: (values: string[]) => LocationMatch;
  /**
   * France is offered: the backend answered 200 to `probeFranceSupport` and the
   * French area data has loaded. Every France feature waits on this, and it
   * stays false whenever the backend has not answered 200.
   */
  franceEnabled: boolean;
  /** True until the backend's first answer about France (and its data, after a yes). */
  franceLoading: boolean;
}

const PostalCodeContext = createContext<PostalCodeContextType>({
  getSubMunicipalityName: () => '',
  loading: false,
  loadPostalCodesForCountry: async () => {},
  cacheVersion: 0,
  getPostalCodeData: () => [],
  locationFilterOptions: [],
  expandLocationTokens: () => ({ codes: [], truncated: false }),
  resolveLocationLabel: (value) => value,
  isLocationSelectionTooBroad: () => false,
  buildLocationMatch: () => ({
    codesByCountry: new Map(),
    wholeCountries: new Set(),
    rawCodes: new Set(),
  }),
  franceEnabled: false,
  franceLoading: false,
});

interface PostalCodeProviderProps {
  children: ReactNode;
}

type PostalCodesCache = {
  [K in Country]?: any[];
};

export const PostalCodeProvider: React.FC<PostalCodeProviderProps> = ({ children }) => {
  const { userLanguage } = useGlobalContext();
  const [postalCodesCache, setPostalCodesCache] = useState<PostalCodesCache>({});
  const [loading, setLoading] = useState(true);
  const [cacheVersion, setCacheVersion] = useState(0);
  // Ref-tracked so we can no-op without triggering a dependency change.
  const loadedCountriesRef = useRef<Set<Country>>(new Set());
  // Luxembourg areas feed only the location options; display uses the stored city.
  const [luxembourgAreas, setLuxembourgAreas] = useState<{
    cantons: LuxembourgCanton[];
    communes: LuxembourgCommune[];
  } | null>(null);
  const luxembourgRequestedRef = useRef(false);

  // The France gate. Separate from `loading`, which holds the splash and the
  // screens' loaders: a slow answer must never block or re-show them.
  const { isOffline } = useConnectivity();
  const [franceStatus, setFranceStatus] = useState<'pending' | 'on' | 'off'>('pending');
  const [franceAreas, setFranceAreas] = useState<FranceAreas | null>(null);
  // Settled once the backend answered either way; a failed request is asked again.
  const franceProbeRef = useRef({ inFlight: false, settled: false });

  const probeFrance = useCallback(async () => {
    const probe = franceProbeRef.current;
    if (probe.inFlight || probe.settled) return;
    probe.inFlight = true;
    const support = await probeFranceSupport();
    probe.inFlight = false;
    probe.settled = support !== 'unknown';
    if (support !== 'available') {
      setFranceStatus('off');
      return;
    }
    try {
      const module = await import('@/constants/PostalCodes_FR');
      setFranceAreas(module.FR_AREAS);
      setFranceStatus('on');
    } catch (error) {
      logger.error('Failed to load postal codes for country:', { country: 'france', error });
      setFranceStatus('off');
    }
  }, []);

  // Asked at start, and again after a failed request once back online or back
  // in the foreground, so a backend that starts serving France is picked up.
  useEffect(() => {
    if (!isOffline) void probeFrance();
  }, [isOffline, probeFrance]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void probeFrance();
    });
    return () => subscription.remove();
  }, [probeFrance]);

  const loadPostalCodesForCountry = useCallback(
    async (country: string) => {
      if (country === 'luxembourg') {
        if (luxembourgRequestedRef.current) return;
        luxembourgRequestedRef.current = true;
        setLoading(true);
        try {
          const module = await import('@/constants/PostalCodes_LU');
          setLuxembourgAreas({ cantons: module.LU_CANTONS, communes: module.LU_COMMUNES });
          setCacheVersion((v) => v + 1);
        } catch (error) {
          luxembourgRequestedRef.current = false;
          logger.error('Failed to load postal codes for country:', { country, error });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!isValidCountry(country)) {
        return;
      }

      if (loadedCountriesRef.current.has(country)) {
        return;
      }

      setLoading(true);
      try {
        if (country === 'netherlands') {
          const module = await import('@/constants/PostalCodes_NL');
          setPostalCodesCache((prev) => ({ ...prev, netherlands: module.POSTAL_CODES_NL_NL }));
          loadedCountriesRef.current.add('netherlands');
          setCacheVersion((v) => v + 1);
        } else if (country === 'belgium') {
          let postalCodes;
          if (userLanguage === 'en') {
            const module = await import('@/constants/PostalCodes_BE_EN');
            postalCodes = module.POSTAL_CODES_EN;
          } else if (userLanguage === 'fr') {
            const module = await import('@/constants/PostalCodes_BE_FR');
            postalCodes = module.POSTAL_CODES_FR;
          } else if (userLanguage === 'nl') {
            const module = await import('@/constants/PostalCodes_BE_NL');
            postalCodes = module.POSTAL_CODES_NL;
          } else {
            // Fall back to English for unsupported languages.
            const module = await import('@/constants/PostalCodes_BE_EN');
            postalCodes = module.POSTAL_CODES_EN;
          }
          setPostalCodesCache((prev) => ({ ...prev, belgium: postalCodes }));
          loadedCountriesRef.current.add('belgium');
          setCacheVersion((v) => v + 1);
        }
      } catch (error) {
        logger.error('Failed to load postal codes for country:', { country, error });
      } finally {
        setLoading(false);
      }
    },
    [userLanguage]
  );

  useEffect(() => {
    const preloadAll = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadPostalCodesForCountry('belgium'),
          loadPostalCodesForCountry('netherlands'),
          loadPostalCodesForCountry('luxembourg'),
        ]);
      } catch (error) {
        logger.error('Failed to preload postal codes:', { error });
      } finally {
        setLoading(false);
      }
    };

    preloadAll();
  }, [loadPostalCodesForCountry]);

  const getSubMunicipalityName = useCallback(
    (postalCode: string, country: string, fallbackCity?: string | null): string => {
      const fallback = (fallbackCity ?? '').trim();

      if (!isValidCountry(country)) {
        return fallback;
      }

      const codes = postalCodesCache[country];
      if (!codes || !postalCode) return fallback;

      // Postal codes are stored as numbers in the data set.
      const postalCodeNum = parseInt(postalCode, 10);
      if (isNaN(postalCodeNum)) return fallback;

      const postalCodeData = codes.find((pc: any) => pc.post_code === postalCodeNum);
      if (!postalCodeData) return fallback;

      // Pick the locale-specific 'sub_municipality_name_*' field at runtime.
      const subMunicipalityKey = Object.keys(postalCodeData).find((key) =>
        key.startsWith('sub_municipality_name')
      );

      return subMunicipalityKey ? postalCodeData[subMunicipalityKey] : fallback;
    },
    [postalCodesCache]
  );

  const getPostalCodeData = useCallback(
    (country: string): any[] => {
      if (!isValidCountry(country)) {
        return [];
      }

      return postalCodesCache[country] || [];
    },
    [postalCodesCache]
  );

  // Build hierarchy options + lookup maps once per (data, language) change.
  // Tokens are language-independent, so building from the single loaded BE file
  // is correct; the language only selects region/province display labels.
  const locationData = useMemo(() => {
    const lang: Lang = userLanguage === 'fr' || userLanguage === 'nl' ? userLanguage : 'en';
    return buildLocationFilterOptions({
      belgiumRows: postalCodesCache.belgium,
      netherlandsRows: postalCodesCache.netherlands,
      luxembourg: luxembourgAreas ?? undefined,
      // Loaded only after the backend answered that it serves France.
      france: franceAreas ?? undefined,
      lang,
    });
  }, [postalCodesCache, luxembourgAreas, franceAreas, userLanguage]);

  const resolveRawCode = useCallback(
    (code: string): string => {
      // The BE/NL lookup parses the code as a number, which would read a French
      // "01000" as Brussels' 1000.
      if (code.length > 4) return code;
      const city =
        getSubMunicipalityName(code, 'belgium') || getSubMunicipalityName(code, 'netherlands');
      return city ? `${city} (${code})` : code;
    },
    [getSubMunicipalityName]
  );

  const expandLocationTokensCb = useCallback(
    (values: string[]) => expandLocationTokens(values, locationData.tokenToCodes),
    [locationData]
  );

  const resolveLocationLabelCb = useCallback(
    (value: string) => resolveLocationLabel(value, locationData.tokenToLabel, resolveRawCode),
    [locationData, resolveRawCode]
  );

  const isLocationSelectionTooBroadCb = useCallback(
    (values: string[]) => isLocationSelectionTooBroad(values, locationData.tokenToCodes),
    [locationData]
  );

  const buildLocationMatchCb = useCallback(
    (values: string[]) => buildLocationMatch(values, locationData.tokenToCodes),
    [locationData]
  );

  const contextValue = useMemo(
    () => ({
      getSubMunicipalityName,
      loading,
      loadPostalCodesForCountry,
      cacheVersion,
      getPostalCodeData,
      locationFilterOptions: locationData.options,
      expandLocationTokens: expandLocationTokensCb,
      resolveLocationLabel: resolveLocationLabelCb,
      isLocationSelectionTooBroad: isLocationSelectionTooBroadCb,
      buildLocationMatch: buildLocationMatchCb,
      franceEnabled: franceStatus === 'on',
      franceLoading: franceStatus === 'pending',
    }),
    [
      getSubMunicipalityName,
      loading,
      loadPostalCodesForCountry,
      cacheVersion,
      getPostalCodeData,
      locationData,
      expandLocationTokensCb,
      resolveLocationLabelCb,
      isLocationSelectionTooBroadCb,
      buildLocationMatchCb,
      franceStatus,
    ]
  );

  return <PostalCodeContext.Provider value={contextValue}>{children}</PostalCodeContext.Provider>;
};

export const usePostalCodes = () => {
  const context = useContext(PostalCodeContext);
  if (!context) {
    throw new Error('usePostalCodes must be used within a PostalCodeProvider');
  }
  return context;
};
