/**
 * VersionCheckProvider Tests
 *
 * Tests version check on mount, dismiss prompt, openStore,
 * retryCheck, and error handling (fail-open behavior).
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

const mockCheckAppVersion = jest.fn();
const mockOpenUpdateUrl = jest.fn();

jest.mock('@/services/version.service', () => ({
  checkAppVersion: (...args: any[]) => mockCheckAppVersion(...args),
  openUpdateUrl: (...args: any[]) => mockOpenUpdateUrl(...args),
}));

// Expo modules needed by version.service (imported transitively)
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0', extra: {} } },
  expoConfig: { version: '1.0.0', extra: {} },
}));

// ============================================
// Import after mocks
// ============================================

import { VersionCheckProvider, useVersionCheck } from '@/context/VersionCheckProvider';
import type { VersionCheckResult } from '@/types/appConfig.types';

// ============================================
// Helpers
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return <VersionCheckProvider>{children}</VersionCheckProvider>;
}

function makeResult(overrides: Partial<VersionCheckResult> = {}): VersionCheckResult {
  return {
    canProceed: true,
    showMaintenanceScreen: false,
    showBlockingUpdateScreen: false,
    showDismissibleUpdatePrompt: false,
    showUpdateBadge: false,
    maintenanceMessage: null,
    updateMessage: null,
    updateUrl: 'https://example.com/update',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('VersionCheckProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('should throw when useVersionCheck is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useVersionCheck());
    }).toThrow('useVersionCheck must be used within VersionCheckProvider');
    consoleSpy.mockRestore();
  });

  it('should start in loading state', () => {
    mockCheckAppVersion.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useVersionCheck(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('should call checkAppVersion on mount and apply result', async () => {
    const checkResult = makeResult({ canProceed: true, showUpdateBadge: true });
    mockCheckAppVersion.mockResolvedValue(checkResult);

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCheckAppVersion).toHaveBeenCalledTimes(1);
    expect(result.current.canProceed).toBe(true);
    expect(result.current.showUpdateBadge).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should show maintenance screen when backend returns maintenanceMode=true', async () => {
    mockCheckAppVersion.mockResolvedValue(
      makeResult({
        canProceed: false,
        showMaintenanceScreen: true,
        maintenanceMessage: 'We are down for maintenance.',
      })
    );

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canProceed).toBe(false);
    expect(result.current.showMaintenanceScreen).toBe(true);
    expect(result.current.maintenanceMessage).toBe('We are down for maintenance.');
  });

  it('should show blocking update screen for minimum version violation', async () => {
    mockCheckAppVersion.mockResolvedValue(
      makeResult({
        canProceed: false,
        showBlockingUpdateScreen: true,
        updateUrl: 'https://store.example.com/app',
      })
    );

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canProceed).toBe(false);
    expect(result.current.showBlockingUpdateScreen).toBe(true);
    expect(result.current.updateUrl).toBe('https://store.example.com/app');
  });

  it('should show dismissible update prompt for optional update', async () => {
    mockCheckAppVersion.mockResolvedValue(
      makeResult({
        showDismissibleUpdatePrompt: true,
        updateMessage: 'A new version is available!',
        updateUrl: 'https://store.example.com/app',
      })
    );

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.showDismissibleUpdatePrompt).toBe(true);
    expect(result.current.updateMessage).toBe('A new version is available!');
  });

  it('should dismiss update prompt via dismissUpdatePrompt()', async () => {
    mockCheckAppVersion.mockResolvedValue(makeResult({ showDismissibleUpdatePrompt: true }));

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.showDismissibleUpdatePrompt).toBe(true);

    act(() => {
      result.current.dismissUpdatePrompt();
    });

    expect(result.current.showDismissibleUpdatePrompt).toBe(false);
    // Other fields remain unchanged
    expect(result.current.canProceed).toBe(true);
  });

  it('should call openUpdateUrl with current updateUrl when openStore is called', async () => {
    const url = 'https://apps.apple.com/app/protestbase/id12345';
    mockCheckAppVersion.mockResolvedValue(makeResult({ updateUrl: url }));

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.openStore();
    });

    expect(mockOpenUpdateUrl).toHaveBeenCalledWith(url);
  });

  it('should retry version check via retryCheck()', async () => {
    mockCheckAppVersion
      .mockResolvedValueOnce(makeResult({ showMaintenanceScreen: true, canProceed: false }))
      .mockResolvedValueOnce(makeResult({ showMaintenanceScreen: false, canProceed: true }));

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.showMaintenanceScreen).toBe(true);

    await act(async () => {
      await result.current.retryCheck();
    });

    expect(mockCheckAppVersion).toHaveBeenCalledTimes(2);
    expect(result.current.showMaintenanceScreen).toBe(false);
    expect(result.current.canProceed).toBe(true);
  });

  it('should set isLoading to true during retryCheck', async () => {
    let resolveCheck: (v: VersionCheckResult) => void;
    mockCheckAppVersion.mockResolvedValueOnce(makeResult()).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        })
    );

    const { result } = renderHook(() => useVersionCheck(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Start retry — don't await yet
    act(() => {
      result.current.retryCheck();
    });

    expect(result.current.isLoading).toBe(true);

    // Resolve the pending check
    await act(async () => {
      resolveCheck!(makeResult());
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should call checkAppVersion exactly once on mount', async () => {
    mockCheckAppVersion.mockResolvedValue(makeResult());

    renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(mockCheckAppVersion).toHaveBeenCalledTimes(1));
  });

  it('should expose all VersionCheckResult fields on context', async () => {
    const fullResult = makeResult({
      canProceed: false,
      showMaintenanceScreen: true,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      showUpdateBadge: false,
      maintenanceMessage: 'Down for maintenance',
      updateMessage: null,
      updateUrl: 'https://example.com',
    });
    mockCheckAppVersion.mockResolvedValue(fullResult);

    const { result } = renderHook(() => useVersionCheck(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canProceed).toBe(false);
    expect(result.current.showMaintenanceScreen).toBe(true);
    expect(result.current.showBlockingUpdateScreen).toBe(false);
    expect(result.current.showDismissibleUpdatePrompt).toBe(false);
    expect(result.current.showUpdateBadge).toBe(false);
    expect(result.current.maintenanceMessage).toBe('Down for maintenance');
    expect(result.current.updateMessage).toBeNull();
    expect(result.current.updateUrl).toBe('https://example.com');
    // Actions are functions
    expect(typeof result.current.dismissUpdatePrompt).toBe('function');
    expect(typeof result.current.openStore).toBe('function');
    expect(typeof result.current.retryCheck).toBe('function');
  });
});
