/**
 * Integrity Gate
 *
 * Wraps the app and blocks rendering until the install-token attestation
 * resolves. Mirrors VersionGate's loading-then-render pattern.
 *
 * Must be placed inside IntegrityProvider.
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useIntegrity } from '@/context/IntegrityProvider';
import { IntegrityFailedScreen } from './IntegrityFailedScreen';

interface IntegrityGateProps {
  children: ReactNode;
}

export function IntegrityGate({ children }: IntegrityGateProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const { status, failureReason, retry } = useIntegrity();

  if (status === 'pending') {
    const backgroundColor =
      colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;
    return (
      <View style={[styles.loading, { backgroundColor }]}>
        <BrandLoader />
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <IntegrityFailedScreen
        isDevSetupIssue={__DEV__ && failureReason === 'missing_dev_secret'}
        failureReason={failureReason}
        onRetry={retry}
      />
    );
  }

  // 'ready' (attested), 'bypassed' (dev), and 'fallback' (couldn't attest →
  // x-api-key safety net) all render normally. Only 'failed' — the dev-setup or
  // fallback-rejected off-ramp above — blocks.
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
