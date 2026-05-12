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
 * Filtering state shared by the Explore tab.
 */
export interface ExploreTabContextValue {
  // Category filter (null treated as 'allCategories')
  valueCategoryOpeningModal: string | null;
  setValueCategoryOpeningModal: Dispatch<SetStateAction<string | null>>;

  // Date filter (null treated as 'allDates')
  valueDateOpeningModal: string | null;
  setValueDateOpeningModal: Dispatch<SetStateAction<string | null>>;

  // Search
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  // Location filter (postal codes as strings)
  locationFilter: string[];
  setLocationFilter: Dispatch<SetStateAction<string[]>>;
  valueLocationOpeningModal: string[];
  setValueLocationOpeningModal: Dispatch<SetStateAction<string[]>>;
  globalLocationFilterValue: string[];
  setGlobalLocationFilterValue: Dispatch<SetStateAction<string[]>>;

  // Organization filter
  organizationFilter: string[];
  setOrganizationFilter: Dispatch<SetStateAction<string[]>>;
  valueOrganizationOpeningModal: string[];
  setValueOrganizationOpeningModal: Dispatch<SetStateAction<string[]>>;
  globalOrganizationFilterValue: string[];
  setGlobalOrganizationFilterValue: Dispatch<SetStateAction<string[]>>;

  // Scroll reset trigger (used when filters are applied from modal)
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
  // null is treated as 'allCategories'.
  const [valueCategoryOpeningModal, setValueCategoryOpeningModal] = useState<string | null>(
    'allCategories'
  );

  // null is treated as 'allDates'.
  const [valueDateOpeningModal, setValueDateOpeningModal] = useState<string | null>('allDates');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Postal codes as strings, e.g. ["1000", "1040"].
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [globalLocationFilterValue, setGlobalLocationFilterValue] = useState<string[]>([]);
  const [valueLocationOpeningModal, setValueLocationOpeningModal] = useState<string[]>([]);

  const [organizationFilter, setOrganizationFilter] = useState<string[]>([]);
  const [valueOrganizationOpeningModal, setValueOrganizationOpeningModal] = useState<string[]>([]);
  const [globalOrganizationFilterValue, setGlobalOrganizationFilterValue] = useState<string[]>([]);

  // Toggled when filters are applied from the modal, so the list scrolls to top.
  const [shouldScrollToTop, setShouldScrollToTop] = useState<boolean>(false);

  const contextValue = useMemo(
    () => ({
      valueCategoryOpeningModal,
      setValueCategoryOpeningModal,
      valueDateOpeningModal,
      setValueDateOpeningModal,
      searchQuery,
      setSearchQuery,
      locationFilter,
      setLocationFilter,
      valueLocationOpeningModal,
      setValueLocationOpeningModal,
      organizationFilter,
      setOrganizationFilter,
      valueOrganizationOpeningModal,
      setValueOrganizationOpeningModal,
      globalLocationFilterValue,
      setGlobalLocationFilterValue,
      globalOrganizationFilterValue,
      setGlobalOrganizationFilterValue,
      shouldScrollToTop,
      setShouldScrollToTop,
    }),
    [
      valueCategoryOpeningModal,
      valueDateOpeningModal,
      searchQuery,
      locationFilter,
      globalLocationFilterValue,
      valueLocationOpeningModal,
      organizationFilter,
      valueOrganizationOpeningModal,
      globalOrganizationFilterValue,
      shouldScrollToTop,
    ]
  );

  return <ExploreTabContext.Provider value={contextValue}>{children}</ExploreTabContext.Provider>;
};
