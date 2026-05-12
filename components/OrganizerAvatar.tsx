import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
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
 * Features:
 * - Displays avatar image when URL is provided
 * - Shows initials on brand pink background when avatar is null
 * - Uses expo-image with memory-disk caching
 * - Shows loading indicator while image loads
 * - Supports theming for initials text color
 */
export const OrganizerAvatar: React.FC<OrganizerAvatarProps> = ({ avatarUrl, name, size = 42 }) => {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);

  // Calculate font size relative to avatar size
  const fontSize = Math.floor(size * 0.4);
  const brandColor = themeColors.tint;
  const placeholderBg = colorScheme === 'dark' ? themeColors.border : themeColors.border;

  // Show initials if no avatar URL or if image failed to load
  if (!avatarUrl || hasError) {
    return (
      <View
        style={[
          styles.initialsContainer,
          {
            width: size,
            height: size,
            borderRadius: BorderRadius.full,
            backgroundColor: brandColor,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.initialsText,
            {
              fontSize,
              color: '#FFFFFF',
            },
          ]}
        >
          {initials}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {isLoading && (
        <View
          style={[
            styles.loadingContainer,
            {
              width: size,
              height: size,
              borderRadius: BorderRadius.full,
              backgroundColor: placeholderBg,
            },
          ]}
        >
          <ActivityIndicator size="small" color={brandColor} />
        </View>
      )}
      <Image
        source={avatarUrl}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: BorderRadius.full,
            backgroundColor: placeholderBg,
          },
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    position: 'absolute',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
