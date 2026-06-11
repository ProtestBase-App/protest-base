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
    surfaceAltBackground: c.surfaceAltBackground,
    inputBackground: c.inputBackground,
    headerBackground: c.headerBackground,

    border: c.border,
    inputBorder: c.inputBorder,
    inputBorderFocused: c.inputBorderFocused,
    separator: c.separator,
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',

    badgeBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    // Alias for badgeBg, used in PastEventSummaryCard.
    viewBadgeBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    categoryBadgeBg: isDark ? 'rgba(249, 68, 96, 0.15)' : 'rgba(249, 68, 96, 0.1)',

    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',

    // "En cours" (in-progress) badge — live green, identical in both themes.
    live: '#3DBE7B',
    liveBg: 'rgba(61, 190, 123, 0.14)',

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

    // Map tab overlays — translucent surfaces floating over the basemap.
    // Dark values follow the designer handoff (surface #1E1F27 ≈ cardBackground
    // #1E1E2D at 0.88–0.94 alpha); light values mirror them on white.
    mapOverlay: isDark ? 'rgba(30, 30, 45, 0.9)' : 'rgba(255, 255, 255, 0.92)',
    mapOverlayStrong: isDark ? 'rgba(30, 30, 45, 0.94)' : 'rgba(255, 255, 255, 0.96)',
    mapOverlayBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
    mapOverlayBorderActive: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)',
    // Inactive overlay-chip text sits brighter than secondaryText for contrast
    // against the basemap.
    mapChipText: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.7)',
    // Soft accent for active time chips / active filter button icon — the
    // handoff's #FF9CAB reads better than the raw tint on dark surfaces.
    mapAccentSoftText: isDark ? '#FF9CAB' : c.tint,
    // Header fade-out gradient over the map (background color at 0.95 → 0.72 → 0).
    mapHeaderGradientStart: isDark ? 'rgba(22, 22, 34, 0.95)' : 'rgba(250, 250, 250, 0.95)',
    mapHeaderGradientMid: isDark ? 'rgba(22, 22, 34, 0.72)' : 'rgba(250, 250, 250, 0.72)',
  };
};

export type ThemeColors = ReturnType<typeof getThemeColors>;
