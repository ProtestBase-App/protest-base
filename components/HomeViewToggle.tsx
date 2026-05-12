import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, BorderRadius, Typography, IconSizes, Shadows } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import type { HomeViewMode } from '@/hooks/useHomeViewPreference';

interface HomeViewToggleProps {
  value: HomeViewMode;
  onChange: (next: HomeViewMode) => void;
}

interface ToggleOption {
  mode: HomeViewMode;
  label: string;
  icon: 'calendar' | 'list.bullet';
}

export default function HomeViewToggle({ value, onChange }: HomeViewToggleProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const options: ToggleOption[] = [
    { mode: 'calendar', label: t('home.viewToggleCalendar'), icon: 'calendar' },
    { mode: 'list', label: t('home.viewToggleList'), icon: 'list.bullet' },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surfaceBackground,
          borderColor: themeColors.border,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.mode === value;
        return (
          <TouchableOpacity
            key={option.mode}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            activeOpacity={0.7}
            onPress={() => onChange(option.mode)}
            style={[
              styles.option,
              selected && {
                backgroundColor: themeColors.cardBackground,
                shadowColor: Shadows.card.ios.shadowColor,
              },
              selected && styles.optionSelected,
            ]}
          >
            <IconSymbol
              name={option.icon}
              size={IconSizes.sm}
              color={selected ? themeColors.tint : themeColors.subtleText}
            />
            <ThemedText
              style={[
                styles.label,
                { color: selected ? themeColors.text : themeColors.subtleText },
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  optionSelected: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
});
