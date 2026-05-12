import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { OrganizerAvatar } from '@/components/OrganizerAvatar';
import { Spacing, BorderRadius, Typography } from '@/constants/DesignTokens';

interface OrganizerChipProps {
  /** Name of the organizer */
  name: string;
  /** Optional avatar URL - if null, shows initials */
  avatarUrl?: string | null;
  /** Optional callback when chip is pressed (for future navigation) */
  onPress?: () => void;
}

/**
 * OrganizerChip - Displays an organizer as a chip/pill
 *
 * Features:
 * - Avatar circle with initials on the left
 * - Organizer name next to the avatar
 * - Subtle background with border for better definition
 * - Supports light/dark mode
 * - Touch feedback for future navigation functionality
 */
export const OrganizerChip: React.FC<OrganizerChipProps> = ({ name, avatarUrl, onPress }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
    },
  ];

  const content = (
    <>
      <OrganizerAvatar avatarUrl={avatarUrl} name={name} size={42} />
      <View style={styles.textContainer}>
        <ThemedText style={styles.name} numberOfLines={1}>
          {name}
        </ThemedText>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s profile`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
});

export default OrganizerChip;
