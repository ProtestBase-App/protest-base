/**
 * Connection Error Screen
 *
 * BLOCKING screen displayed when the backend is unreachable at app startup.
 * Shows a friendly message and a retry button.
 *
 * Matches the design language of MaintenanceScreen / UpdateRequiredScreen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Image, Animated, Easing } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import CustomButton from '@/components/CustomButton';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, Typography, BorderRadius } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface ConnectionErrorScreenProps {
  onRetry: () => Promise<void>;
}

/**
 * Full-screen blocking connection error display with retry
 */
export function ConnectionErrorScreen({ onRetry }: ConnectionErrorScreenProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [isRetrying, setIsRetrying] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const logoSource =
    colorScheme === 'dark'
      ? require('@/assets/images/auth-icon-dark.png')
      : require('@/assets/images/auth-icon-light.png');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          {/* Logo */}
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="ProtestBase"
          />

          {/* Cloud-offline icon with pulse animation */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="cloud-offline-outline" size={56} color={themeColors.tint} />
          </Animated.View>

          {/* Title */}
          <ThemedText style={styles.title}>{t('version.connectionError.title')}</ThemedText>

          {/* Subtitle */}
          <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
            {t('version.connectionError.message')}
          </ThemedText>

          {/* Retry button */}
          <CustomButton
            title={t('version.connectionError.button')}
            handlePress={handleRetry}
            isLoading={isRetrying}
            containerStyles={styles.button}
          />

          {/* Pill badge */}
          <ThemedView style={[styles.pill, { backgroundColor: themeColors.tint }]}>
            <ThemedText style={styles.pillText}>{t('version.connectionError.badge')}</ThemedText>
          </ThemedView>
        </ThemedView>
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
  button: {
    width: '100%',
    maxWidth: 300,
    marginBottom: Spacing.xl,
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
});
