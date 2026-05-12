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
import { useGlobalContext } from '@/context/GlobalProvider';
import { logger } from '@/utils/logger';

export type Country = 'belgium' | 'netherlands';

const isValidCountry = (country: string): country is Country => {
  return country === 'belgium' || country === 'netherlands';
};

interface PostalCodeContextType {
  getSubMunicipalityName: (postalCode: string, country: string) => string;
  loading: boolean;
  loadPostalCodesForCountry: (country: string) => Promise<void>;
  /** Bumped when the cache updates so consumers can re-render. */
  cacheVersion: number;
  getPostalCodeData: (country: string) => any[];
}

const PostalCodeContext = createContext<PostalCodeContextType>({
  getSubMunicipalityName: () => '',
  loading: false,
  loadPostalCodesForCountry: async () => {},
  cacheVersion: 0,
  getPostalCodeData: () => [],
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

  const loadPostalCodesForCountry = useCallback(
    async (country: string) => {
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
    (postalCode: string, country: string): string => {
      if (!isValidCountry(country)) {
        return '';
      }

      const codes = postalCodesCache[country];
      if (!codes || !postalCode) return '';

      // Postal codes are stored as numbers in the data set.
      const postalCodeNum = parseInt(postalCode, 10);
      if (isNaN(postalCodeNum)) return '';

      const postalCodeData = codes.find((pc: any) => pc.post_code === postalCodeNum);
      if (!postalCodeData) return '';

      // Pick the locale-specific 'sub_municipality_name_*' field at runtime.
      const subMunicipalityKey = Object.keys(postalCodeData).find((key) =>
        key.startsWith('sub_municipality_name')
      );

      return subMunicipalityKey ? postalCodeData[subMunicipalityKey] : '';
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

  const contextValue = useMemo(
    () => ({
      getSubMunicipalityName,
      loading,
      loadPostalCodesForCountry,
      cacheVersion,
      getPostalCodeData,
    }),
    [getSubMunicipalityName, loading, loadPostalCodesForCountry, cacheVersion, getPostalCodeData]
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
