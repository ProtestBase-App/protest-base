import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Typography } from '@/constants/DesignTokens';

interface OrganizerAvatarProps {
  /** Avatar URL - if null, shows initials fallback */
  avatarUrl: string | null | undefined;
  /** Name to extract initials from when avatar is not available */
  name: string;
  /** Size of the avatar in pixels */
  size?: number;
}

/**
 * Extracts initials from a name (first letter of first two words)
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * OrganizerAvatar - Displays an avatar image or initials fallback
 *
 * The initials are always the base layer and the image fades in on top of them,
 * so a request that hangs (or fails) leaves a readable avatar rather than a
 * spinner: `onLoadEnd` is synthesized in JS from the native load/error events,
 * so a request that never resolves would never clear a loading flag.
 */
export const OrganizerAvatar: React.FC<OrganizerAvatarProps> = ({ avatarUrl, name, size = 42 }) => {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);

  // Calculate font size relative to avatar size
  const fontSize = Math.floor(size * 0.4);

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius: BorderRadius.full,
          backgroundColor: themeColors.tint,
        },
      ]}
    >
      <ThemedText style={[styles.initialsText, { fontSize, color: '#FFFFFF' }]}>
        {initials}
      </ThemedText>

      {!!avatarUrl && !hasError && (
        <Image
          source={avatarUrl}
          // No backgroundColor: it would hide the initials underneath until —
          // or unless — the image paints.
          style={[styles.avatar, { width: size, height: size, borderRadius: BorderRadius.full }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onError={() => setHasError(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: Typography.families.semiBold,
    textAlign: 'center',
  },
});

export default OrganizerAvatar;
