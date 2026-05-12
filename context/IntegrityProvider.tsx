/**
 * IntegrityProvider
 *
 * Drives the install-token attestation lifecycle on app start. Mirrors
 * VersionCheckProvider's "fetch on mount, expose state" shape so children can
 * gate UI on the result.
 *
 * Must sit OUTSIDE GlobalProvider in the tree so the install token exists
 * before any auth-sensitive request runs. See app/_layout.tsx.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { logger } from '@/utils/logger';
import { getInstallToken, isBypassMode, IntegrityError } from '@/services/integrity.service';
import type { IntegrityFailureReason, IntegrityStatus } from '@/types/integrity.types';

interface IntegrityContextType {
  status: IntegrityStatus;
  failureReason: IntegrityFailureReason | null;
  retry: () => Promise<void>;
}

const IntegrityContext = createContext<IntegrityContextType | undefined>(undefined);

export function useIntegrity(): IntegrityContextType {
  const context = useContext(IntegrityContext);
  if (!context) {
    throw new Error('useIntegrity must be used within IntegrityProvider');
  }
  return context;
}

interface IntegrityProviderProps {
  children: ReactNode;
}

export function IntegrityProvider({ children }: IntegrityProviderProps): React.ReactElement {
  const [status, setStatus] = useState<IntegrityStatus>('pending');
  const [failureReason, setFailureReason] = useState<IntegrityFailureReason | null>(null);

  // Guard against state updates after unmount (e.g., if the user kills the app
  // mid-attestation). Refs avoid React 19 strict-mode double-fire churn here.
  const mounted = useRef(true);

  const performCheck = useCallback(async () => {
    setStatus('pending');
    setFailureReason(null);
    try {
      // Hardware Key Attestation has no warmup analogue to Play Integrity's
      // prepare-token-provider step; the Keystore operations in
      // services/integrity.service.ts run inline.
      await getInstallToken();
      if (!mounted.current) return;
      setStatus(isBypassMode() ? 'bypassed' : 'ready');
    } catch (error) {
      if (!mounted.current) return;
      const reason: IntegrityFailureReason =
        error instanceof IntegrityError ? error.reason : 'unknown';
      logger.warn('[Integrity] Initial attestation failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      setFailureReason(reason);
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    performCheck();
    return () => {
      mounted.current = false;
    };
  }, [performCheck]);

  const retry = useCallback(async () => {
    await performCheck();
  }, [performCheck]);

  const value: IntegrityContextType = {
    status,
    failureReason,
    retry,
  };

  return <IntegrityContext.Provider value={value}>{children}</IntegrityContext.Provider>;
}
