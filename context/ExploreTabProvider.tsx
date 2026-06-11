import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';

/**
 * Applied filters for the Explore tab. The filter bottom sheet keeps its own
 * draft state, so the provider only stores what has been applied.
 */
export interface ExploreAppliedFilters {
  /** Backend category value (e.g. 'Protest') or null for all. */
  category: string | null;
  /** Date preset: 'today' | 'tomorrow' | 'thisWeek' | 'thisWeekend', or null for all dates. */
  dateFilter: string | null;
  /** Administrative-hierarchy location tokens (expanded to postal codes by consumers). */
  locations: string[];
  /** Organization IDs. */
  organizations: string[];
}

export const DEFAULT_EXPLORE_FILTERS: ExploreAppliedFilters = Object.freeze({
  category: null,
  dateFilter: null,
  locations: [],
  organizations: [],
});

/**
 * Filtering state shared by the Explore tab.
 */
export interface ExploreTabContextValue {
  // Search
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  // Applied filters (null / empty arrays mean "all")
  appliedFilters: ExploreAppliedFilters;
  setAppliedFilters: Dispatch<SetStateAction<ExploreAppliedFilters>>;

  // Scroll reset trigger (used when filters are applied from the sheet)
  shouldScrollToTop: boolean;
  setShouldScrollToTop: Dispatch<SetStateAction<boolean>>;
}

interface ExploreTabProviderProps {
  children: ReactNode;
}

const ExploreTabContext = createContext<ExploreTabContextValue | undefined>(undefined);

export const useExploreTabContext = (): ExploreTabContextValue => {
  const context = useContext(ExploreTabContext);
  if (!context) {
    throw new Error('useExploreTabContext must be used within an ExploreTabProvider');
  }
  return context;
};

export const ExploreTabProvider: React.FC<ExploreTabProviderProps> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [appliedFilters, setAppliedFilters] =
    useState<ExploreAppliedFilters>(DEFAULT_EXPLORE_FILTERS);

  // Toggled when filters are applied from the sheet, so the list scrolls to top.
  const [shouldScrollToTop, setShouldScrollToTop] = useState<boolean>(false);

  const contextValue = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      appliedFilters,
      setAppliedFilters,
      shouldScrollToTop,
      setShouldScrollToTop,
    }),
    [searchQuery, appliedFilters, shouldScrollToTop]
  );

  return <ExploreTabContext.Provider value={contextValue}>{children}</ExploreTabContext.Provider>;
};
