import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';
import type { HomeViewMode } from '@/hooks/useHomeViewPreference';

export interface HomeViewToggleProps {
  value: HomeViewMode;
  onChange: (next: HomeViewMode) => void;
}

interface ToggleOption {
  mode: HomeViewMode;
  label: string;
  icon: IconSymbolName;
}

/** Segmented month/agenda switch for the calendar tab header. */
export default function HomeViewToggle({ value, onChange }: HomeViewToggleProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const options: ToggleOption[] = [
    { mode: 'month', label: t('home.viewToggleMonth'), icon: 'square.grid.2x2' },
    { mode: 'agenda', label: t('home.viewToggleAgenda'), icon: 'list.bullet' },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: themeColors.cardBackground,
          borderColor: themeColors.cardBorder,
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
              styles.segment,
              {
                backgroundColor: selected ? themeColors.surfaceAltBackground : 'transparent',
                borderColor: selected ? themeColors.cardBorder : 'transparent',
              },
            ]}
          >
            <IconSymbol
              name={option.icon}
              size={14}
              color={selected ? themeColors.text : themeColors.placeholder}
            />
            <ThemedText
              style={[
                styles.label,
                { color: selected ? themeColors.text : themeColors.placeholder },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
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
    // flexBasis stays 'auto' (not flex: 1) so the control is never allocated
    // less than its content width by siblings competing for free space.
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 220,
    borderRadius: 30,
    borderWidth: 1,
    padding: 3,
    // Whatever happens at extreme font scales, nothing may paint outside the pill.
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minWidth: 0,
    height: 30,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xs,
  },
  label: {
    fontFamily: Typography.families.semiBold,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
});
