import React from 'react';
import { Pressable, StyleSheet, View, type ViewInstance } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

const TONE_CATEGORIES = { red: 'Protest', blue: 'Learn' } as const;

export interface FormRowProps {
  icon: IconSymbolName;
  tone?: keyof typeof TONE_CATEGORIES;
  title: string;
  subtitle?: string;
  /** Leave out for a row that only informs. */
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
  rowRef?: React.Ref<ViewInstance>;
}

/** The tile, title and chevron row of the form's cards. */
export function FormRow({
  icon,
  tone,
  title,
  subtitle,
  onPress,
  accessibilityHint,
  testID,
  rowRef,
}: FormRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const colors = tone ? getCategoryColors(TONE_CATEGORIES[tone]) : null;

  return (
    <Pressable
      ref={rowRef}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <View style={[styles.tile, { backgroundColor: colors?.bg ?? themeColors.badgeBg }]}>
        <IconSymbol
          name={icon}
          size={IconSizes.md}
          color={colors?.color ?? themeColors.secondaryText}
        />
      </View>
      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {!!subtitle && (
          <ThemedText style={[styles.subtitle, { color: themeColors.secondaryText }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {!!onPress && (
        <IconSymbol name="chevron.forward" size={IconSizes.sm} color={themeColors.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 64,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.families.regular,
    lineHeight: 18,
  },
});
