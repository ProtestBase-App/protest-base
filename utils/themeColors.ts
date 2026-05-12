import { Colors } from '@/constants/Colors';

/**
 * Theme-aware color utility
 *
 * Provides a centralized function to get theme-aware colors based on the current color scheme.
 * This eliminates duplicated color logic across components and screens.
 *
 * @param colorScheme - The current color scheme ('light', 'dark', null, or undefined)
 * @returns An object containing all theme-aware color values
 *
 * @example
 * ```typescript
 * const colorScheme = useColorScheme();
 * const themeColors = getThemeColors(colorScheme);
 *
 * // Use specific colors
 * <ActivityIndicator color={themeColors.tint} />
 * <Text style={{ color: themeColors.subtleText }}>Metadata</Text>
 * <View style={{ borderColor: themeColors.cardBorder }} />
 * ```
 */
export const getThemeColors = (colorScheme: 'light' | 'dark') => {
  const isDark = colorScheme === 'dark';

  const scheme = colorScheme ?? 'light';
  const c = Colors[scheme];

  return {
    tint: c.tint,

    // Semantic colors (consistent across themes).
    success: Colors.semantic.success,
    error: Colors.semantic.error,

    text: c.text,
    secondaryText: c.secondaryText,
    subtleText: isDark ? Colors.semantic.placeholderDark : Colors.semantic.placeholderLight,
    placeholder: c.placeholder,
    chevron: c.chevron,

    background: c.background,
    cardBackground: c.cardBackground,
    surfaceBackground: c.surfaceBackground,
    inputBackground: c.inputBackground,
    headerBackground: c.headerBackground,

    border: c.border,
    inputBorder: c.inputBorder,
    separator: c.separator,
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',

    badgeBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    // Alias for badgeBg, used in PastEventSummaryCard.
    viewBadgeBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    categoryBadgeBg: isDark ? 'rgba(249, 68, 96, 0.15)' : 'rgba(249, 68, 96, 0.1)',

    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',

    icon: c.icon,

    link: c.link,
    destructive: c.destructive,

    buttonSecondaryBackground: c.buttonSecondaryBackground,
    buttonSecondaryBorder: c.buttonSecondaryBorder,

    highlightBackground: c.highlightBackground,
    highlightBorder: c.highlightBorder,
    highlightIconBackground: c.highlightIconBackground,

    shareButtonBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',

    calendarAccent: c.calendarAccent,
    calendarDotDefault: c.calendarDotDefault,
  };
};

export type ThemeColors = ReturnType<typeof getThemeColors>;
