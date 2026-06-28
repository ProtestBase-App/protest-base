/**
 * ConnectivityProvider Tests
 *
 * Covers the isOffline policy matrix (null/unknown = online), the going-offline
 * debounce, the immediate online recovery, and the hook guard.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';

import { ConnectivityProvider, useConnectivity } from '@/context/ConnectivityProvider';

const mockUseNetworkState = useNetworkState as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ConnectivityProvider>{children}</ConnectivityProvider>;
}

function setNetwork(state: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
  type?: string;
}) {
  mockUseNetworkState.mockReturnValue(state);
}

describe('ConnectivityProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseNetworkState.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('throws when useConnectivity is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useConnectivity())).toThrow(
      'useConnectivity must be used within a ConnectivityProvider'
    );
    consoleSpy.mockRestore();
  });

  describe('isOffline policy', () => {
    it('is online when fully connected', () => {
      setNetwork({ isConnected: true, isInternetReachable: true });
      const { result } = renderHook(() => useConnectivity(), { wrapper });
      expect(result.current.isOffline).toBe(false);
    });

    it('treats both-unknown (undefined) as online — no cold-start flash', () => {
      setNetwork({ isConnected: undefined, isInternetReachable: undefined });
      const { result } = renderHook(() => useConnectivity(), { wrapper });

      expect(result.current.isOffline).toBe(false);
      // Even after any debounce window, unknown never flips offline.
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.isOffline).toBe(false);
    });

    it('stays online when connected but reachability is unknown (null)', () => {
      setNetwork({ isConnected: true, isInternetReachable: undefined });
      const { result } = renderHook(() => useConnectivity(), { wrapper });

      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(result.current.isOffline).toBe(false);
    });

    it('goes offline (after debounce) when isConnected === false', () => {
      setNetwork({ isConnected: false, isInternetReachable: false });
      const { result } = renderHook(() => useConnectivity(), { wrapper });

      // Debounced: not offline immediately.
      expect(result.current.isOffline).toBe(false);

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.isOffline).toBe(true);
    });

    it('goes offline (after debounce) when isInternetReachable === false (captive portal)', () => {
      setNetwork({ isConnected: true, isInternetReachable: false });
      const { result } = renderHook(() => useConnectivity(), { wrapper });

      expect(result.current.isOffline).toBe(false);
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('debounce + recovery', () => {
    it('does not flip offline if connectivity recovers before the debounce elapses', () => {
      setNetwork({ isConnected: false, isInternetReachable: false });
      const { result, rerender } = renderHook(() => useConnectivity(), { wrapper });

      // Partway through the debounce window.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.isOffline).toBe(false);

      // Recover, then let the original timer's deadline pass.
      setNetwork({ isConnected: true, isInternetReachable: true });
      act(() => {
        rerender({});
      });
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(result.current.isOffline).toBe(false);
    });

    it('flips back online immediately on recovery (no debounce on the way back)', () => {
      setNetwork({ isConnected: false, isInternetReachable: false });
      const { result, rerender } = renderHook(() => useConnectivity(), { wrapper });

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(result.current.isOffline).toBe(true);

      setNetwork({ isConnected: true, isInternetReachable: true });
      act(() => {
        rerender({});
      });
      // No timer advance — recovery is instant.
      expect(result.current.isOffline).toBe(false);
    });
  });

  it('exposes the raw isConnected / isInternetReachable values', () => {
    setNetwork({ isConnected: true, isInternetReachable: true });
    const { result } = renderHook(() => useConnectivity(), { wrapper });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });
});
