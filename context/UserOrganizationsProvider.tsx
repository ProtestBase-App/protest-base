import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from './GlobalProvider';
import { getMyOrganizations } from '@/services/organizer.service';
import { UserOrganization, OrganizationDropdownItem } from '@/types/organization.types';
import { STORAGE_KEYS } from '@/constants/StorageConfig';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';

interface UserOrganizationsContextType {
  /** List of organizations the user belongs to */
  userOrganizations: UserOrganization[];
  /** Dropdown-formatted items for organization pickers */
  dropdownItems: OrganizationDropdownItem[];
  /** Currently selected organization ID */
  selectedOrganizationId: string | null;
  /** Set the selected organization ID */
  setSelectedOrganizationId: (id: string | null) => void;
  /** Whether user has any organizations */
  hasOrganizations: boolean;
  /** Whether user has exactly one organization (auto-select behavior) */
  hasSingleOrganization: boolean;
  /** Whether user has multiple organizations (show picker) */
  hasMultipleOrganizations: boolean;
  /** Loading state for initial fetch */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh organizations from API */
  refreshOrganizations: () => Promise<void>;
}

interface UserOrganizationsProviderProps {
  children: ReactNode;
}

const UserOrganizationsContext = createContext<UserOrganizationsContextType | undefined>(undefined);

export const useUserOrganizations = (): UserOrganizationsContextType => {
  const context = useContext(UserOrganizationsContext);
  if (!context) {
    throw new Error('useUserOrganizations must be used within a UserOrganizationsProvider');
  }
  return context;
};

export const UserOrganizationsProvider: React.FC<UserOrganizationsProviderProps> = ({
  children,
}) => {
  const { isLogged, loading: authLoading, refreshUserEventCounts } = useGlobalContext();

  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [dropdownItems, setDropdownItems] = useState<OrganizationDropdownItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const hasOrganizations = userOrganizations.length > 0;
  const hasSingleOrganization = userOrganizations.length === 1;
  const hasMultipleOrganizations = userOrganizations.length > 1;

  const loadPersistedSelection = useCallback(async (): Promise<string | null> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ORGANIZATION_ID);
      return stored;
    } catch (err) {
      logger.warn('[UserOrganizationsProvider] Failed to load persisted selection:', {
        error: err,
      });
      return null;
    }
  }, []);

  const persistSelection = useCallback(async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ORGANIZATION_ID, id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_ORGANIZATION_ID);
      }
    } catch (err) {
      logger.warn('[UserOrganizationsProvider] Failed to persist selection:', { error: err });
    }
  }, []);

  const setSelectedOrganizationId = useCallback(
    (id: string | null) => {
      setSelectedOrganizationIdState(id);
      persistSelection(id);
    },
    [persistSelection]
  );

  const fetchOrganizations = useCallback(async () => {
    if (!isLogged) {
      setUserOrganizations([]);
      setDropdownItems([]);
      setSelectedOrganizationIdState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getMyOrganizations();

      setUserOrganizations(result.organizations);
      setDropdownItems(result.dropdownItems);

      if (result.organizations.length === 1) {
        const singleOrgId = result.organizations[0].$id;
        setSelectedOrganizationIdState(singleOrgId);
        persistSelection(singleOrgId);
        logger.debug('[UserOrganizationsProvider] Auto-selected single organization', {
          organizationId: singleOrgId,
        });
      } else {
        setSelectedOrganizationIdState(null);
        persistSelection(null);
      }

      logger.info('[UserOrganizationsProvider] Loaded user organizations', {
        count: result.organizations.length,
      });

      // Refresh event counts inline (not in a separate effect) to avoid a race
      // where counts refresh with empty orgs before the fetch completes.
      const orgIds = result.organizations.map((org) => org.$id);
      await refreshUserEventCounts(orgIds);
    } catch (err: any) {
      const errorMessage = err.message || t('errors.organizationsLoadFailed');
      setError(errorMessage);
      logger.error('[UserOrganizationsProvider] Failed to fetch organizations:', { error: err });
      // Set counts to zero on error so the More screen doesn't stay in its loading state.
      await refreshUserEventCounts([]);
    } finally {
      setLoading(false);
    }
  }, [isLogged, persistSelection, refreshUserEventCounts]);

  useEffect(() => {
    if (!authLoading) {
      fetchOrganizations();
    }
  }, [authLoading, fetchOrganizations]);

  useEffect(() => {
    if (!isLogged && !authLoading) {
      setUserOrganizations([]);
      setDropdownItems([]);
      setSelectedOrganizationIdState(null);
      persistSelection(null);
      setLoading(false);
      setError(null);
    }
  }, [isLogged, authLoading, persistSelection]);

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <UserOrganizationsContext.Provider
      value={{
        userOrganizations,
        dropdownItems,
        selectedOrganizationId,
        setSelectedOrganizationId,
        hasOrganizations,
        hasSingleOrganization,
        hasMultipleOrganizations,
        loading,
        error,
        refreshOrganizations,
      }}
    >
      {children}
    </UserOrganizationsContext.Provider>
  );
};
