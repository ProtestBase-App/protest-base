/**
 * Maintenance Screen
 *
 * BLOCKING screen displayed when the app is in maintenance mode.
 * User cannot dismiss or proceed - no navigation allowed.
 *
 * Matches the website maintenance page layout with wrench icon,
 * branded messaging, pill badge, and social media links.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing, TouchableOpacity, Linking } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, Typography, BorderRadius } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface MaintenanceScreenProps {
  /** Message from backend, or null for default message */
  message: string | null;
}

const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    icon: 'logo-instagram' as const,
    url: 'https://www.instagram.com/protestbase/',
  },
  {
    name: 'TikTok',
    icon: 'logo-tiktok' as const,
    url: 'https://www.tiktok.com/@protestbase',
  },
];

/**
 * Full-screen blocking maintenance display
 */
export function MaintenanceScreen({ message }: MaintenanceScreenProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  const logoSource =
    colorScheme === 'dark'
      ? require('@/assets/images/auth-icon-dark.png')
      : require('@/assets/images/auth-icon-light.png');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(wobbleAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [wobbleAnim]);

  const rotation = wobbleAnim.interpolate({
    inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
    outputRange: ['0deg', '-12deg', '10deg', '-8deg', '6deg', '-3deg', '0deg'],
  });

  const handleSocialPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Logo */}
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="ProtestBase"
          />

          {/* Wrench icon with wobble animation */}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="build-outline" size={56} color={themeColors.tint} />
          </Animated.View>

          {/* Title */}
          <ThemedText style={styles.title}>
            {t('version.maintenance.titlePrefix')}
            <ThemedText style={[styles.title, { color: themeColors.tint }]}>
              {t('version.maintenance.titleHighlight')}
            </ThemedText>
          </ThemedText>

          {/* Subtitle */}
          <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
            {message || t('version.maintenance.message')}
          </ThemedText>

          {/* Pill badge */}
          <View style={[styles.pill, { backgroundColor: themeColors.tint }]}>
            <ThemedText style={styles.pillText}>{t('version.maintenance.badge')}</ThemedText>
          </View>

          {/* Social media links */}
          <View style={styles.socialRow}>
            {SOCIAL_LINKS.map((link) => (
              <TouchableOpacity
                key={link.name}
                onPress={() => handleSocialPress(link.url)}
                accessibilityLabel={link.name}
                accessibilityRole="link"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={link.icon} size={28} color={themeColors.secondaryText} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
  },
  logo: {
    height: 160,
    width: 160,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Typography.families.bold,
    fontSize: 28,
    lineHeight: 40,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.sizes.lg * 1.6,
    textAlign: 'center',
    maxWidth: 460,
    marginBottom: Spacing['2xl'],
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.full,
  },
  pillText: {
    color: 'white',
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.sm,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: Spacing['2xl'],
  },
});
