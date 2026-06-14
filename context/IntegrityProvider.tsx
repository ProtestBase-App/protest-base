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
import {
  getInstallToken,
  isBypassMode,
  setFallbackMode,
  IntegrityError,
} from '@/services/integrity.service';
import { setIntegrityFallbackRejectedCallback } from '@/services/api';
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
      setFallbackMode(false);
      setStatus(isBypassMode() ? 'bypassed' : 'ready');
    } catch (error) {
      if (!mounted.current) return;
      const reason: IntegrityFailureReason =
        error instanceof IntegrityError ? error.reason : 'unknown';

      // Dev-only: a missing bypass secret keeps the hard dev-setup screen — the
      // actionable hint beats a silently broken app. Never reached in production.
      if (reason === 'missing_dev_secret') {
        logger.warn('[Integrity] Dev bypass secret missing', {
          error: error instanceof Error ? error.message : String(error),
        });
        setFailureReason(reason);
        setStatus('failed');
        return;
      }

      // Never hard-block in production: any other failure falls open to
      // x-api-key auth (api.ts reads isFallbackMode()).
      logger.warn('[Integrity] Attestation failed; entering API-key fallback', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      setFailureReason(reason);
      setFallbackMode(true);
      setStatus('fallback');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Off-ramp: api.ts fires this when the backend rejects x-api-key auth (server
    // kill-switch off). Show the "please update" screen. Deliberately leave
    // fallbackMode true — clearing it here would let other in-flight 401s slip
    // past the off-ramp into the token-less retry loop.
    setIntegrityFallbackRejectedCallback(() => {
      if (!mounted.current) return;
      setFailureReason('update_required');
      setStatus('failed');
    });

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
