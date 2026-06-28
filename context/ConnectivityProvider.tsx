import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useNetworkState } from 'expo-network';

/**
 * ConnectivityProvider
 *
 * A LIVE, non-blocking connectivity signal that complements the existing
 * startup-only blocking `ConnectionGate`. Consumes expo-network's reactive
 * `useNetworkState()` and exposes a debounced `isOffline` flag for the offline
 * banner and the mutation guards.
 *
 * Privacy: reads ONLY `isConnected` / `isInternetReachable`. It never touches
 * `getIpAddressAsync()` (device IP) or any SSID/BSSID detail. Aligned with the
 * app's no-tracking rule.
 */

/** Ride out brief handoffs (cell↔wifi, tunnels) before declaring offline. */
const OFFLINE_DEBOUNCE_MS = 1800;

interface ConnectivityContextType {
  /** Debounced offline state — true only after the device has been offline for
   * `OFFLINE_DEBOUNCE_MS`. Recovery flips back to false immediately. */
  isOffline: boolean;
  /** Raw expo-network value; `undefined` when the OS hasn't reported yet. */
  isConnected: boolean | undefined;
  /** Raw expo-network value; `undefined` when the OS hasn't reported yet. */
  isInternetReachable: boolean | undefined;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

interface ConnectivityProviderProps {
  children: ReactNode;
}

export function ConnectivityProvider({ children }: ConnectivityProviderProps) {
  const networkState = useNetworkState();
  const { isConnected, isInternetReachable } = networkState;

  // Policy: treat null/undefined (unknown) as ONLINE so there's no false
  // offline flash at cold start. Strict `=== false` — never `!isConnected`.
  const rawOffline = isConnected === false || isInternetReachable === false;

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!rawOffline) {
      // Recovery: flip back online immediately so reconnect feels instant.
      setIsOffline(false);
      return;
    }
    // Going offline: debounce. If connectivity recovers before the timer
    // fires, the cleanup clears it and the next effect run sets online.
    const timer = setTimeout(() => setIsOffline(true), OFFLINE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawOffline]);

  const value = useMemo<ConnectivityContextType>(
    () => ({ isOffline, isConnected, isInternetReachable }),
    [isOffline, isConnected, isInternetReachable]
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityContextType {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
}
