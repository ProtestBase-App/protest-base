/**
 * Version Gate
 *
 * Root wrapper component that gates access to the app based on
 * version check results. Renders blocking screens when needed,
 * otherwise renders children with optional dismissible prompt.
 *
 * Must be placed inside VersionCheckProvider.
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVersionCheck } from '@/context/VersionCheckProvider';
import { MaintenanceScreen } from './MaintenanceScreen';
import { UpdateRequiredScreen } from './UpdateRequiredScreen';
import { UpdatePrompt } from './UpdatePrompt';
import { Colors } from '@/constants/Colors';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

interface VersionGateProps {
  /** Children to render when version check passes */
  children: ReactNode;
}

/**
 * Gates app access based on version check results
 *
 * Render order:
 * 1. Loading spinner while checking
 * 2. Maintenance screen (blocking) if maintenanceMode
 * 3. Update required screen (blocking) if forceUpdate + below minimum
 * 4. Children + Update prompt modal (dismissible) if below minimum but not forced
 * 5. Children only if all checks pass
 */
export function VersionGate({ children }: VersionGateProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const {
    isLoading,
    showMaintenanceScreen,
    showBlockingUpdateScreen,
    showDismissibleUpdatePrompt,
    maintenanceMessage,
    updateMessage,
    openStore,
    dismissUpdatePrompt,
  } = useVersionCheck();

  // Loading state - show spinner while checking
  if (isLoading) {
    const backgroundColor =
      colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

    return (
      <View style={[styles.loading, { backgroundColor }]}>
        <BrandLoader />
      </View>
    );
  }

  // STEP 1: Maintenance mode - BLOCKING
  if (showMaintenanceScreen) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  // STEP 3: Force update required - BLOCKING
  if (showBlockingUpdateScreen) {
    return <UpdateRequiredScreen message={updateMessage} onUpdate={openStore} />;
  }

  // STEP 3 (alt) & STEP 4: Render children with optional dismissible prompt
  return (
    <>
      {children}
      <UpdatePrompt
        visible={showDismissibleUpdatePrompt}
        message={updateMessage}
        onUpdate={openStore}
        onDismiss={dismissUpdatePrompt}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
