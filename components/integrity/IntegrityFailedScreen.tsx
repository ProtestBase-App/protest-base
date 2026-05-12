/**
 * Integrity Failed Screen
 *
 * Blocking screen displayed when the install-token attestation flow fails
 * permanently — either a hard verification failure in production (rooted
 * device, sideloaded install, etc.) or a missing dev-bypass secret in local
 * development. Both cases get the same shape; only the copy differs.
 *
 * Mirrors MaintenanceScreen's layout so the visual language stays consistent
 * for "the app refuses to load" states.
 */

import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, Typography, BorderRadius } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import type { IntegrityFailureReason } from '@/types/integrity.types';

interface IntegrityFailedScreenProps {
  /** Whether to show the developer-setup variant of the copy. */
  isDevSetupIssue: boolean;
  /** Tagged failure reason from the integrity flow — drives copy + retry visibility. */
  failureReason: IntegrityFailureReason | null;
  /** Invoked when the user taps the retry button. */
  onRetry: () => void;
}

interface BucketCopy {
  copyKey: string;
  showRetry: boolean;
}

/**
 * Maps a tagged failure reason to (copy key, whether the retry button shows).
 * Hard-fail buckets (device too old, device-state untrusted, app config bad)
 * hide the retry button — those won't recover by tapping again.
 */
function resolveBucket(
  isDevSetupIssue: boolean,
  failureReason: IntegrityFailureReason | null
): BucketCopy {
  if (isDevSetupIssue) {
    return { copyKey: 'integrity.devSetup', showRetry: true };
  }
  switch (failureReason) {
    case 'unsupported_device':
      return { copyKey: 'integrity.unsupportedDevice', showRetry: false };
    case 'device_state_unsupported':
      return { copyKey: 'integrity.deviceStateUnsupported', showRetry: false };
    case 'app_config_issue':
      return { copyKey: 'integrity.appConfig', showRetry: false };
    case 'attestation_retryable':
    case 'network':
      return { copyKey: 'integrity.retryable', showRetry: true };
    default:
      return { copyKey: 'integrity.failed', showRetry: true };
  }
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

export function IntegrityFailedScreen({
  isDevSetupIssue,
  failureReason,
  onRetry,
}: IntegrityFailedScreenProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const logoSource =
    colorScheme === 'dark'
      ? require('@/assets/images/auth-icon-dark.png')
      : require('@/assets/images/auth-icon-light.png');

  const { copyKey, showRetry } = resolveBucket(isDevSetupIssue, failureReason);

  const handleSocialPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="ProtestBase"
          />

          <Ionicons name="shield-outline" size={56} color={themeColors.tint} />

          <ThemedText style={styles.title}>{t(`${copyKey}.title`)}</ThemedText>

          <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
            {t(`${copyKey}.message`)}
          </ThemedText>

          {showRetry && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColors.tint }]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t(`${copyKey}.button`)}
            >
              <ThemedText style={styles.buttonText}>{t(`${copyKey}.button`)}</ThemedText>
            </TouchableOpacity>
          )}

          <View style={[styles.pill, { backgroundColor: themeColors.tint }]}>
            <ThemedText style={styles.pillText}>{t(`${copyKey}.badge`)}</ThemedText>
          </View>

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
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  buttonText: {
    color: 'white',
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
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
