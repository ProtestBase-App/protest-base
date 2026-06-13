import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { PillButton } from '@/components/ui/PillButton';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface DashedEmptyStateProps {
  icon: IconSymbolName;
  iconSize?: number;
  title: string;
  helper: string;
  ctaLabel: string;
  onCtaPress: () => void;
  /** Optional underlined accent link below the CTA. */
  linkLabel?: string;
  onLinkPress?: () => void;
}

/**
 * Dashed empty-state card from the C2 design system (upcoming/drafts
 * redesigns): centered icon tile, title, helper copy, a full-width accent CTA
 * pill and an optional underlined link.
 */
export function DashedEmptyState({
  icon,
  iconSize = 34,
  title,
  helper,
  ctaLabel,
  onCtaPress,
  linkLabel,
  onLinkPress,
}: DashedEmptyStateProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View style={styles.container}>
      <View style={[styles.dashedCard, { borderColor: themeColors.inputBorder }]}>
        <View style={[styles.iconTile, { backgroundColor: themeColors.surfaceAltBackground }]}>
          <IconSymbol name={icon} size={iconSize} color={themeColors.subtleText} />
        </View>

        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={[styles.helper, { color: themeColors.secondaryText }]}>
          {helper}
        </ThemedText>

        <PillButton label={ctaLabel} onPress={onCtaPress} style={styles.ctaButton} />

        {linkLabel && onLinkPress && (
          <Pressable
            onPress={onLinkPress}
            accessibilityRole="link"
            accessibilityLabel={linkLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ThemedText style={[styles.link, { color: themeColors.tint }]}>{linkLabel}</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: Spacing['3xl'],
  },
  dashedCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.families.bold,
    lineHeight: 28,
    textAlign: 'center',
  },
  helper: {
    fontSize: Typography.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  ctaButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  link: {
    fontSize: 13.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
    textDecorationLine: 'underline',
    marginTop: Spacing.lg,
  },
});
