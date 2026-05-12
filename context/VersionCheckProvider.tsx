/**
 * Version Check Provider
 *
 * Orchestrates app version checking on launch and provides state
 * for blocking screens and update prompts.
 *
 * Must be placed OUTSIDE GlobalProvider in the component tree
 * to ensure version check happens BEFORE authentication.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { checkAppVersion, openUpdateUrl } from '@/services/version.service';
import { VersionCheckResult } from '@/types/appConfig.types';

/**
 * Context value type extending VersionCheckResult with actions
 */
interface VersionCheckContextType extends VersionCheckResult {
  /** Whether the version check is in progress */
  isLoading: boolean;
  /** Dismiss the update prompt modal */
  dismissUpdatePrompt: () => void;
  /** Open the store URL for updates */
  openStore: () => void;
  /** Retry the version check (e.g., from maintenance screen) */
  retryCheck: () => Promise<void>;
}

const VersionCheckContext = createContext<VersionCheckContextType | undefined>(undefined);

/**
 * Hook to access version check state and actions
 *
 * @throws Error if used outside VersionCheckProvider
 */
export function useVersionCheck(): VersionCheckContextType {
  const context = useContext(VersionCheckContext);
  if (!context) {
    throw new Error('useVersionCheck must be used within VersionCheckProvider');
  }
  return context;
}

interface VersionCheckProviderProps {
  children: ReactNode;
}

/**
 * Provider component for version checking
 *
 * Performs version check on mount and exposes state/actions to children.
 */
export function VersionCheckProvider({ children }: VersionCheckProviderProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<VersionCheckResult>({
    canProceed: true,
    showMaintenanceScreen: false,
    showBlockingUpdateScreen: false,
    showDismissibleUpdatePrompt: false,
    showUpdateBadge: false,
    maintenanceMessage: null,
    updateMessage: null,
    updateUrl: '',
  });

  /**
   * Perform the version check
   */
  const performCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const checkResult = await checkAppVersion();
      setResult(checkResult);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check version on mount
  useEffect(() => {
    performCheck();
  }, [performCheck]);

  /**
   * Dismiss the dismissible update prompt
   */
  const dismissUpdatePrompt = useCallback(() => {
    setResult((prev) => ({
      ...prev,
      showDismissibleUpdatePrompt: false,
    }));
  }, []);

  /**
   * Open the store URL for the current platform
   */
  const openStore = useCallback(() => {
    openUpdateUrl(result.updateUrl);
  }, [result.updateUrl]);

  /**
   * Retry the version check (useful for maintenance screen retry button)
   */
  const retryCheck = useCallback(async () => {
    await performCheck();
  }, [performCheck]);

  const value: VersionCheckContextType = {
    ...result,
    isLoading,
    dismissUpdatePrompt,
    openStore,
    retryCheck,
  };

  return <VersionCheckContext.Provider value={value}>{children}</VersionCheckContext.Provider>;
}
