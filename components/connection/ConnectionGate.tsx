/**
 * Connection Gate
 *
 * Wrapper component that blocks access to children when the backend
 * is unreachable. Shows the ConnectionErrorScreen with retry.
 *
 * Must be placed inside GlobalProvider (consumes its context).
 */

import React, { ReactNode } from 'react';
import { useGlobalContext } from '@/context/GlobalProvider';
import { ConnectionErrorScreen } from '@/components/connection/ConnectionErrorScreen';

interface ConnectionGateProps {
  children: ReactNode;
}

export function ConnectionGate({ children }: ConnectionGateProps): React.ReactElement {
  const { connectionError, retryConnection } = useGlobalContext();

  if (connectionError) {
    return <ConnectionErrorScreen onRetry={retryConnection} />;
  }

  return <>{children}</>;
}
