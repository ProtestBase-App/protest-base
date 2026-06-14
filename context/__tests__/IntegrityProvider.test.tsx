/**
 * IntegrityProvider Tests
 *
 * Focus: the production-incident "never hard-block" behaviour.
 *  - capable device → 'ready' / 'bypassed', fallback cleared
 *  - any real attestation failure → 'fallback' (NOT 'failed'), fallback enabled
 *  - dev-only missing bypass secret → keeps the hard 'failed' dev-setup screen
 *  - backend rejects fallback (off-ramp callback) → 'failed' / update_required
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

jest.mock('@/services/integrity.service', () => {
  class IntegrityError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.name = 'IntegrityError';
      this.reason = reason;
    }
  }
  return {
    __esModule: true,
    getInstallToken: jest.fn(),
    isBypassMode: jest.fn(),
    setFallbackMode: jest.fn(),
    IntegrityError,
  };
});

jest.mock('@/services/api', () => ({
  __esModule: true,
  setIntegrityFallbackRejectedCallback: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ============================================
// Import after mocks
// ============================================

import { IntegrityProvider, useIntegrity } from '@/context/IntegrityProvider';
import {
  getInstallToken,
  isBypassMode,
  setFallbackMode,
  IntegrityError,
} from '@/services/integrity.service';
import { setIntegrityFallbackRejectedCallback } from '@/services/api';

const mockGetInstallToken = getInstallToken as jest.Mock;
const mockIsBypassMode = isBypassMode as jest.Mock;
const mockSetFallbackMode = setFallbackMode as jest.Mock;
const mockSetOffRamp = setIntegrityFallbackRejectedCallback as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <IntegrityProvider>{children}</IntegrityProvider>;
}

/** Pulls the off-ramp callback IntegrityProvider registered with api.ts on mount. */
function getOffRampCallback(): () => void {
  const calls = mockSetOffRamp.mock.calls;
  return calls[calls.length - 1][0];
}

describe('IntegrityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInstallToken.mockResolvedValue('install-token');
    mockIsBypassMode.mockReturnValue(false);
  });

  it('throws when useIntegrity is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useIntegrity())).toThrow(
      'useIntegrity must be used within IntegrityProvider'
    );
    consoleSpy.mockRestore();
  });

  it('resolves to "ready" and clears fallback when attestation succeeds', async () => {
    mockIsBypassMode.mockReturnValue(false);

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.failureReason).toBeNull();
    expect(mockSetFallbackMode).toHaveBeenCalledWith(false);
  });

  it('resolves to "bypassed" on dev-bypass builds', async () => {
    mockIsBypassMode.mockReturnValue(true);

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('bypassed'));
    expect(mockSetFallbackMode).toHaveBeenCalledWith(false);
  });

  it('falls open to "fallback" (never "failed") on an unsupported device', async () => {
    mockGetInstallToken.mockRejectedValue(new IntegrityError('unsupported_device', 'no hardware'));

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.failureReason).toBe('unsupported_device');
    expect(mockSetFallbackMode).toHaveBeenCalledWith(true);
  });

  it('falls open to "fallback" on a transient network failure', async () => {
    mockGetInstallToken.mockRejectedValue(new IntegrityError('network', 'offline'));

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.failureReason).toBe('network');
    expect(mockSetFallbackMode).toHaveBeenCalledWith(true);
  });

  it('falls open to "fallback" on a non-IntegrityError (unknown reason)', async () => {
    mockGetInstallToken.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.failureReason).toBe('unknown');
    expect(mockSetFallbackMode).toHaveBeenCalledWith(true);
  });

  it('keeps the hard "failed" dev-setup screen for missing_dev_secret', async () => {
    mockGetInstallToken.mockRejectedValue(new IntegrityError('missing_dev_secret', 'no secret'));

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.failureReason).toBe('missing_dev_secret');
    // Must NOT fall open — dev needs the actionable hint, not a broken app.
    expect(mockSetFallbackMode).not.toHaveBeenCalledWith(true);
  });

  it('registers an off-ramp callback that blocks with update_required', async () => {
    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockSetOffRamp).toHaveBeenCalled();

    const callsBefore = mockSetFallbackMode.mock.calls.length;
    act(() => {
      getOffRampCallback()();
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.failureReason).toBe('update_required');
    // Must NOT touch fallbackMode — clearing it would let concurrent 401s slip
    // the off-ramp into the retry loop.
    expect(mockSetFallbackMode.mock.calls.length).toBe(callsBefore);
  });

  it('re-runs the check on retry()', async () => {
    mockGetInstallToken.mockRejectedValueOnce(new IntegrityError('network', 'offline'));

    const { result } = renderHook(() => useIntegrity(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('fallback'));

    mockGetInstallToken.mockResolvedValueOnce('install-token');
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.status).toBe('ready');
  });
});
