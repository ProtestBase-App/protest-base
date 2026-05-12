/**
 * PermissionStatusItem Component
 *
 * Displays a single permission with its name, description, and current status.
 * Used in the Privacy Center to show app permission states.
 */

import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { PermissionStatus } from '@/utils/permissionHelpers';
import { getThemeColors } from '@/utils/themeColors';

interface PermissionStatusItemProps {
  /** Display name of the permission */
  name: string;
  /** Description of what the permission is used for */
  description: string;
  /** Current permission status */
  status: PermissionStatus;
  /** Localized status labels */
  statusLabels: {
    granted: string;
    denied: string;
    undetermined: string;
    notUsed?: string;
  };
  /** Callback when user wants to open settings (only for denied status) */
  onOpenSettings?: () => void;
  /** Label for the "Open Settings" button */
  openSettingsLabel?: string;
}

export function PermissionStatusItem({
  name,
  description,
  status,
  statusLabels,
  onOpenSettings,
  openSettingsLabel,
}: PermissionStatusItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const getStatusColor = (): string => {
    switch (status) {
      case 'granted':
        return themeColors.success;
      case 'denied':
        return themeColors.error;
      case 'notUsed':
      case 'undetermined':
      default:
        return Colors.semantic.neutral;
    }
  };

  const getStatusIcon = ():
    | 'checkmark.circle.fill'
    | 'xmark.circle.fill'
    | 'questionmark.circle'
    | 'minus.circle' => {
    switch (status) {
      case 'granted':
        return 'checkmark.circle.fill';
      case 'denied':
        return 'xmark.circle.fill';
      case 'notUsed':
        return 'minus.circle';
      case 'undetermined':
      default:
        return 'questionmark.circle';
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'granted':
        return statusLabels.granted;
      case 'denied':
        return statusLabels.denied;
      case 'notUsed':
        return statusLabels.notUsed ?? '-';
      case 'undetermined':
      default:
        return statusLabels.undetermined;
    }
  };

  const backgroundColor = themeColors.cardBackground;
  const borderColor = themeColors.border;

  return (
    <ThemedView style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <ThemedText style={styles.name}>{name}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>
        <View style={styles.statusContainer}>
          <IconSymbol name={getStatusIcon()} size={IconSizes.lg} color={getStatusColor()} />
          <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </ThemedText>
        </View>
      </View>
      {status === 'denied' && onOpenSettings && openSettingsLabel && (
        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel={openSettingsLabel}
        >
          <ThemedText style={styles.settingsButtonText}>{openSettingsLabel}</ThemedText>
          <IconSymbol name="arrow.up.forward" size={IconSizes.sm} color={themeColors.tint} />
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    opacity: 0.7,
  },
  statusContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.medium,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.semantic.info}1A`, // 10% opacity
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
  settingsButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    color: Colors.semantic.info,
    marginRight: Spacing.xs,
  },
});
