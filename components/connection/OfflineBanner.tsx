/**
 * OfflineBanner
 *
 * A LIVE, non-blocking offline indicator. Renders `null` while online (so it
 * never intercepts touches), and a thin warning-colored strip pinned to the top
 * of the screen when the device has been offline past the provider's debounce.
 *
 * Distinct from the blocking `ConnectionGate` (a one-time, full-screen startup
 * gate): the two never co-show, since the gate replaces the tree before this
 * banner ever mounts. Auto-dismisses on reconnect because `isOffline` flips
 * back to false.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

export function OfflineBanner(): React.ReactElement | null {
  const { isOffline } = useConnectivity();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  if (!isOffline) {
    return null;
  }

  return (
    <View
      // `none`: the strip floats over the very top of the screen but never
      // blocks taps on whatever sits beneath it (e.g. a header back button).
      pointerEvents="none"
      style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.warningBg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('connectivity.banner')}
    >
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={16} color={themeColors.warning} />
        <ThemedText style={[styles.text, { color: themeColors.warning }]} numberOfLines={1}>
          {t('connectivity.banner')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  text: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
  },
});
