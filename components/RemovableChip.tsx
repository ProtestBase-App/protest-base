import React, { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';

interface RemovableChipProps {
  /** Display label for the chip */
  label: string;
  /** Unique identifier for removal */
  value: string;
  /** Callback when remove button is pressed */
  onRemove: (value: string) => void;
  /** Whether the chip is disabled */
  disabled?: boolean;
  /** Context for accessibility label (e.g., "co-organizers", "selected organizations") */
  accessibilityContext?: string;
}

/**
 * RemovableChip - A chip component with a remove button
 *
 * Features:
 * - Display label with truncation for long text
 * - X button to remove the chip
 * - Haptic feedback on press
 * - Supports light/dark mode
 * - Disabled state support
 * - Accessibility labels
 */
const RemovableChipComponent: React.FC<RemovableChipProps> = ({
  label,
  value,
  onRemove,
  disabled = false,
  accessibilityContext,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove(value);
  }, [onRemove, value]);

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    },
    disabled && styles.containerDisabled,
  ];

  const iconColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handleRemove}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label} from ${accessibilityContext || 'selection'}`}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <ThemedText style={styles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      <IconSymbol name="xmark" size={16} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    flexShrink: 1,
  },
});

export const RemovableChip = memo(RemovableChipComponent);
export default RemovableChip;
