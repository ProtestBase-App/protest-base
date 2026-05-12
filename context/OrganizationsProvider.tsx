import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { getAllOrganizers, Organization } from '@/services/organizer.service';
import { OrganizationDropdownItem } from '@/types/organization.types';
import { logger } from '@/utils/logger';

interface OrganizationsContextType {
  organizations: Organization[];
  dropdownItems: OrganizationDropdownItem[];
  loading: boolean;
  error: string | null;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationsContext = createContext<OrganizationsContextType | undefined>(undefined);

interface OrganizationsProviderProps {
  children: ReactNode;
}

export function OrganizationsProvider({ children }: OrganizationsProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [dropdownItems, setDropdownItems] = useState<OrganizationDropdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const refreshOrganizations = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await getAllOrganizers();
      setOrganizations(result.organizations);
      setDropdownItems(result.dropdownItems);
      logger.info('Organizations loaded', { count: result.organizations.length });
    } catch (err: any) {
      logger.error('Failed to fetch organizations:', { error: err });
      setError(err.message || 'Failed to fetch organizations');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const value: OrganizationsContextType = {
    organizations,
    dropdownItems,
    loading,
    error,
    refreshOrganizations,
  };

  return <OrganizationsContext.Provider value={value}>{children}</OrganizationsContext.Provider>;
}

export function useOrganizations(): OrganizationsContextType {
  const context = useContext(OrganizationsContext);
  if (context === undefined) {
    throw new Error('useOrganizations must be used within an OrganizationsProvider');
  }
  return context;
}
