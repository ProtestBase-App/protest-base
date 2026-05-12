import React from 'react';
import { StyleSheet, TouchableOpacity, Linking, StyleProp, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { IconSymbol, IconSymbolName } from './ui/IconSymbol';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/DesignTokens';

interface SettingsButtonProps {
  leftIcon?: IconSymbolName;
  text: string;
  navigationTarget?: string;
  onPressCallback?: () => Promise<void> | void;
  style?: StyleProp<ViewStyle>;
  badge?: number | string;
  badgeColor?: string;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({
  leftIcon,
  text,
  navigationTarget,
  onPressCallback,
  style,
  badge,
  badgeColor,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const iconColor = themeColors.text;
  const defaultBadgeColor = themeColors.error;

  const router = useRouter();

  const handlePress = async () => {
    if (onPressCallback) {
      try {
        await onPressCallback();
      } catch {
        // Error handled silently
      }
    }

    if (!navigationTarget) {
      return;
    }
    if (navigationTarget.startsWith('http://') || navigationTarget.startsWith('https://')) {
      const supported = await Linking.canOpenURL(navigationTarget);
      if (supported) {
        try {
          await Linking.openURL(navigationTarget);
        } catch {
          // Failed to open URL
        }
      }
    } else {
      try {
        router.push(navigationTarget as any);
      } catch {
        // Navigation error handled silently
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!navigationTarget && !onPressCallback}
      style={style}
      accessibilityLabel={badge !== undefined ? `${text}, ${badge} items` : text}
    >
      <ThemedView
        style={[styles.container, { backgroundColor: themeColors.buttonSecondaryBackground }]}
      >
        {leftIcon && <IconSymbol name={leftIcon} size={20} color={iconColor} style={styles.icon} />}

        <ThemedText style={[styles.text, { color: iconColor }]}>{text}</ThemedText>

        {badge !== undefined && (
          <ThemedView style={[styles.badge, { backgroundColor: badgeColor ?? defaultBadgeColor }]}>
            <ThemedText style={styles.badgeText}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </ThemedText>
          </ThemedView>
        )}

        <IconSymbol name="arrow.right" size={14} color={iconColor} />
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '92%',
    marginVertical: 6,
    height: 58,
  },
  icon: {
    marginRight: 18,
  },
  text: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
    color: 'white',
  },
});

export default SettingsButton;
