import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import {
  getHomeArea as readHomeArea,
  setHomeArea as persistHomeArea,
  clearHomeArea as removeHomeArea,
} from '@/services/localStorageService';
import { buildHomeAreaMatch, HomeAreaMatch } from '@/utils/homeArea';
import { countryOfLocationToken } from '@/utils/locationFilterOptions';
import { logger } from '@/utils/logger';

interface HomeAreaContextType {
  /** The stored home-area token (e.g. 'm:be:7500'), or null when unset. */
  homeAreaToken: string | null;
  /** Localized label for the token; '' when unset. */
  homeAreaLabel: string;
  /** Precomputed graduated postcode sets + country gate; null when unset/unresolvable. */
  homeAreaMatch: HomeAreaMatch | null;
  /** Persist (or clear, when null) the home-area token. */
  setHomeArea: (token: string | null) => Promise<void>;
  /** True until the persisted token has been read on mount. */
  loading: boolean;
}

const HomeAreaContext = createContext<HomeAreaContextType | undefined>(undefined);

export function HomeAreaProvider({ children }: { children: ReactNode }) {
  const {
    locationFilterOptions,
    expandLocationTokens,
    resolveLocationLabel,
    franceEnabled,
    franceLoading,
  } = usePostalCodes();
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  // A French home area exists only while France is offered: the stored token is
  // kept but hidden otherwise, and counts as loading until the gate answers.
  const isFrenchToken = !!storedToken && countryOfLocationToken(storedToken) === 'france';
  const homeAreaToken = isFrenchToken && !franceEnabled ? null : storedToken;
  const loading = storageLoading || (isFrenchToken && franceLoading);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await readHomeArea();
      if (active) {
        setStoredToken(stored);
        setStorageLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setHomeArea = useCallback(async (token: string | null) => {
    // Optimistic: update state immediately, persist in the background.
    setStoredToken(token);
    try {
      if (token === null) {
        await removeHomeArea();
      } else {
        await persistHomeArea(token);
      }
    } catch (error) {
      logger.warn('[HomeAreaProvider] Failed to persist home area', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  // Recomputes once postal data preloads (locationFilterOptions/expand identity
  // change) or when the token changes. Bounded cost, runs off the UI path.
  const homeAreaMatch = useMemo(
    () => buildHomeAreaMatch(homeAreaToken, locationFilterOptions, expandLocationTokens),
    [homeAreaToken, locationFilterOptions, expandLocationTokens]
  );

  const homeAreaLabel = useMemo(
    () => (homeAreaToken ? resolveLocationLabel(homeAreaToken) : ''),
    [homeAreaToken, resolveLocationLabel]
  );

  const value = useMemo<HomeAreaContextType>(
    () => ({ homeAreaToken, homeAreaLabel, homeAreaMatch, setHomeArea, loading }),
    [homeAreaToken, homeAreaLabel, homeAreaMatch, setHomeArea, loading]
  );

  return <HomeAreaContext.Provider value={value}>{children}</HomeAreaContext.Provider>;
}

export function useHomeArea(): HomeAreaContextType {
  const context = useContext(HomeAreaContext);
  if (context === undefined) {
    throw new Error('useHomeArea must be used within a HomeAreaProvider');
  }
  return context;
}
