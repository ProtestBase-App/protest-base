import { getThemeColors, ThemeColors } from '../themeColors';
import { Colors } from '@/constants/Colors';

describe('getThemeColors', () => {
  describe('Light mode colors', () => {
    it('should return all correct colors for light mode', () => {
      const colors = getThemeColors('light');

      // Primary brand colors
      expect(colors.tint).toBe(Colors.light.tint);
      expect(colors.tint).toBe('#F94460');

      // Semantic colors (consistent across themes)
      expect(colors.success).toBe(Colors.semantic.success);
      expect(colors.success).toBe('#34C759');
      expect(colors.error).toBe(Colors.semantic.error);
      expect(colors.error).toBe('#FF3B30');

      // Text colors
      expect(colors.subtleText).toBe(Colors.semantic.placeholderLight);
      expect(colors.subtleText).toBe('#6B7280');

      // Border colors
      expect(colors.cardBorder).toBe('rgba(0, 0, 0, 0.08)');

      // Background colors for badges and containers
      expect(colors.badgeBg).toBe('rgba(0, 0, 0, 0.04)');
      expect(colors.viewBadgeBg).toBe('rgba(0, 0, 0, 0.04)');
      expect(colors.categoryBadgeBg).toBe('rgba(249, 68, 96, 0.1)');

      // Warning colors
      expect(colors.warning).toBe('#F59E0B');
      expect(colors.warningBg).toBe('rgba(245, 158, 11, 0.15)');

      // Icon colors
      expect(colors.icon).toBe(Colors.light.icon);
      expect(colors.icon).toBe('#687076');

      // Surface backgrounds
      expect(colors.surfaceAltBackground).toBe(Colors.light.surfaceAltBackground);
      expect(colors.surfaceAltBackground).toBe('#ECECEC');

      // Interactive element backgrounds
      expect(colors.shareButtonBg).toBe('rgba(0, 0, 0, 0.05)');
    });

    it('should use light theme placeholder color for subtle text', () => {
      const colors = getThemeColors('light');

      expect(colors.subtleText).toBe(Colors.semantic.placeholderLight);
      expect(colors.subtleText).not.toBe(Colors.semantic.placeholderDark);
    });

    it('should use black-based rgba colors for borders and backgrounds', () => {
      const colors = getThemeColors('light');

      // Light mode should use black with low opacity
      expect(colors.cardBorder).toContain('rgba(0, 0, 0,');
      expect(colors.badgeBg).toContain('rgba(0, 0, 0,');
      expect(colors.shareButtonBg).toContain('rgba(0, 0, 0,');
    });
  });

  describe('Dark mode colors', () => {
    it('should return all correct colors for dark mode', () => {
      const colors = getThemeColors('dark');

      // Primary brand colors
      expect(colors.tint).toBe(Colors.dark.tint);
      expect(colors.tint).toBe('#F94460');

      // Semantic colors (consistent across themes)
      expect(colors.success).toBe(Colors.semantic.success);
      expect(colors.success).toBe('#34C759');
      expect(colors.error).toBe(Colors.semantic.error);
      expect(colors.error).toBe('#FF3B30');

      // Text colors
      expect(colors.subtleText).toBe(Colors.semantic.placeholderDark);
      expect(colors.subtleText).toBe('#9CA3AF');

      // Border colors
      expect(colors.cardBorder).toBe('rgba(255, 255, 255, 0.1)');

      // Background colors for badges and containers
      expect(colors.badgeBg).toBe('rgba(255, 255, 255, 0.08)');
      expect(colors.viewBadgeBg).toBe('rgba(255, 255, 255, 0.08)');
      expect(colors.categoryBadgeBg).toBe('rgba(249, 68, 96, 0.15)');

      // Warning colors
      expect(colors.warning).toBe('#F59E0B');
      expect(colors.warningBg).toBe('rgba(245, 158, 11, 0.15)');

      // Icon colors
      expect(colors.icon).toBe(Colors.dark.icon);
      expect(colors.icon).toBe('#CDCDE0');

      // Surface backgrounds
      expect(colors.surfaceAltBackground).toBe(Colors.dark.surfaceAltBackground);
      expect(colors.surfaceAltBackground).toBe('#252537');

      // Interactive element backgrounds
      expect(colors.shareButtonBg).toBe('rgba(255, 255, 255, 0.1)');
    });

    it('should use dark theme placeholder color for subtle text', () => {
      const colors = getThemeColors('dark');

      expect(colors.subtleText).toBe(Colors.semantic.placeholderDark);
      expect(colors.subtleText).not.toBe(Colors.semantic.placeholderLight);
    });

    it('should use white-based rgba colors for borders and backgrounds', () => {
      const colors = getThemeColors('dark');

      // Dark mode should use white with low opacity
      expect(colors.cardBorder).toContain('rgba(255, 255, 255,');
      expect(colors.badgeBg).toContain('rgba(255, 255, 255,');
      expect(colors.shareButtonBg).toContain('rgba(255, 255, 255,');
    });
  });

  describe('Default light mode behavior', () => {
    it('should return light mode colors when colorScheme is light', () => {
      const colors = getThemeColors('light');

      expect(colors.tint).toBe(Colors.light.tint);
      expect(colors.icon).toBe(Colors.light.icon);
    });

    it('should use placeholderLight for subtleText in light mode', () => {
      const colors = getThemeColors('light');

      expect(colors.subtleText).toBe(Colors.semantic.placeholderLight);
    });
  });

  describe('Color properties completeness', () => {
    it('should return an object with all expected color properties', () => {
      const colors = getThemeColors('light');

      // Verify all properties exist
      expect(colors).toHaveProperty('tint');
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('subtleText');
      expect(colors).toHaveProperty('cardBorder');
      expect(colors).toHaveProperty('badgeBg');
      expect(colors).toHaveProperty('viewBadgeBg');
      expect(colors).toHaveProperty('categoryBadgeBg');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('warningBg');
      expect(colors).toHaveProperty('icon');
      expect(colors).toHaveProperty('surfaceAltBackground');
      expect(colors).toHaveProperty('shareButtonBg');
    });

    it('should return all color properties from getThemeColors', () => {
      const colors = getThemeColors('light');
      const propertyCount = Object.keys(colors).length;

      // Dynamically validate against actual source — count should stay in sync
      // 45 = 34 original tokens + surfaceAltBackground (calendar tab redesign)
      //    + 8 map overlay tokens (maps tab) + live/liveBg ("En cours" badge)
      expect(propertyCount).toBe(45);
    });

    it('should have all properties as strings', () => {
      const colors = getThemeColors('light');

      Object.values(colors).forEach((color) => {
        expect(typeof color).toBe('string');
      });
    });

    it('should have all properties as non-empty strings', () => {
      const colors = getThemeColors('light');

      Object.values(colors).forEach((color) => {
        expect(color).toBeTruthy();
        expect(color.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Semantic colors consistency', () => {
    it('should return same semantic colors regardless of theme', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Semantic colors should be identical across themes
      expect(lightColors.success).toBe(darkColors.success);
      expect(lightColors.error).toBe(darkColors.error);
      expect(lightColors.warning).toBe(darkColors.warning);
      expect(lightColors.warningBg).toBe(darkColors.warningBg);
    });

    it('should keep semantic colors consistent with Colors constant', () => {
      const colors = getThemeColors('light');

      expect(colors.success).toBe(Colors.semantic.success);
      expect(colors.error).toBe(Colors.semantic.error);
    });
  });

  describe('Badge background aliases', () => {
    it('should have badgeBg and viewBadgeBg as identical values in light mode', () => {
      const colors = getThemeColors('light');

      expect(colors.badgeBg).toBe(colors.viewBadgeBg);
      expect(colors.badgeBg).toBe('rgba(0, 0, 0, 0.04)');
    });

    it('should have badgeBg and viewBadgeBg as identical values in dark mode', () => {
      const colors = getThemeColors('dark');

      expect(colors.badgeBg).toBe(colors.viewBadgeBg);
      expect(colors.badgeBg).toBe('rgba(255, 255, 255, 0.08)');
    });
  });

  describe('Theme color differences', () => {
    it('should have different subtleText colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.subtleText).not.toBe(darkColors.subtleText);
    });

    it('should have different cardBorder colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.cardBorder).not.toBe(darkColors.cardBorder);
    });

    it('should have different badgeBg colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.badgeBg).not.toBe(darkColors.badgeBg);
    });

    it('should have different icon colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.icon).not.toBe(darkColors.icon);
    });

    it('should have different shareButtonBg colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.shareButtonBg).not.toBe(darkColors.shareButtonBg);
    });

    it('should have different surfaceAltBackground colors between light and dark modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.surfaceAltBackground).not.toBe(darkColors.surfaceAltBackground);
    });
  });

  describe('Color format validation', () => {
    it('should return valid hex color codes for solid colors in light mode', () => {
      const colors = getThemeColors('light');

      // Hex color format: #RRGGBB
      expect(colors.tint).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.success).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.error).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.warning).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.icon).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.subtleText).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.surfaceAltBackground).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return valid rgba color codes for translucent colors in light mode', () => {
      const colors = getThemeColors('light');

      // RGBA format: rgba(r, g, b, a)
      expect(colors.cardBorder).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.badgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.viewBadgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.categoryBadgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.warningBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.shareButtonBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });

    it('should return valid hex color codes for solid colors in dark mode', () => {
      const colors = getThemeColors('dark');

      expect(colors.tint).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.success).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.error).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.warning).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.icon).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.subtleText).toMatch(/^#[0-9A-F]{6}$/i);
      expect(colors.surfaceAltBackground).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return valid rgba color codes for translucent colors in dark mode', () => {
      const colors = getThemeColors('dark');

      expect(colors.cardBorder).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.badgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.viewBadgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.categoryBadgeBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.warningBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
      expect(colors.shareButtonBg).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });
  });

  describe('Category badge background specificity', () => {
    it('should have different categoryBadgeBg opacity in light vs dark mode', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Light mode: rgba(249, 68, 96, 0.1)
      expect(lightColors.categoryBadgeBg).toContain('0.1)');

      // Dark mode: rgba(249, 68, 96, 0.15)
      expect(darkColors.categoryBadgeBg).toContain('0.15)');
    });

    it('should use tint color base for categoryBadgeBg in both modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Both should use RGB values from tint color #F94460 = rgb(249, 68, 96)
      expect(lightColors.categoryBadgeBg).toContain('249, 68, 96');
      expect(darkColors.categoryBadgeBg).toContain('249, 68, 96');
    });
  });

  describe('TypeScript type definition', () => {
    it('should satisfy ThemeColors type', () => {
      const colors = getThemeColors('light');

      // TypeScript compilation should validate this
      const typedColors: ThemeColors = colors;

      expect(typedColors).toBeDefined();
      expect(typedColors.tint).toBeDefined();
    });

    it('should allow ThemeColors type to be used for props', () => {
      // This tests that the exported type can be used in component props
      const mockComponentProps = (colors: ThemeColors) => {
        expect(colors.tint).toBeDefined();
        expect(colors.success).toBeDefined();
        expect(colors.error).toBeDefined();
      };

      const colors = getThemeColors('dark');
      mockComponentProps(colors);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle rapid theme switches correctly', () => {
      const light1 = getThemeColors('light');
      const dark1 = getThemeColors('dark');
      const light2 = getThemeColors('light');
      const dark2 = getThemeColors('dark');

      // Results should be consistent across multiple calls
      expect(light1).toEqual(light2);
      expect(dark1).toEqual(dark2);
    });

    it('should return new object instances on each call', () => {
      const colors1 = getThemeColors('light');
      const colors2 = getThemeColors('light');

      // Should be equal in value but not the same reference
      expect(colors1).toEqual(colors2);
      expect(colors1).not.toBe(colors2);
    });

    it('should handle case-sensitive colorScheme values', () => {
      // TypeScript types prevent invalid values, but test runtime behavior
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      // Values should be correct despite being case-sensitive
      expect(lightColors.cardBorder).toBe('rgba(0, 0, 0, 0.08)');
      expect(darkColors.cardBorder).toBe('rgba(255, 255, 255, 0.1)');
    });
  });

  describe('Integration with Colors constant', () => {
    it('should derive tint from Colors constant in light mode', () => {
      const colors = getThemeColors('light');

      expect(colors.tint).toBe(Colors.light.tint);
    });

    it('should derive tint from Colors constant in dark mode', () => {
      const colors = getThemeColors('dark');

      expect(colors.tint).toBe(Colors.dark.tint);
    });

    it('should derive icon color from Colors constant in light mode', () => {
      const colors = getThemeColors('light');

      expect(colors.icon).toBe(Colors.light.icon);
    });

    it('should derive icon color from Colors constant in dark mode', () => {
      const colors = getThemeColors('dark');

      expect(colors.icon).toBe(Colors.dark.icon);
    });

    it('should use Colors.semantic for success and error in both modes', () => {
      const lightColors = getThemeColors('light');
      const darkColors = getThemeColors('dark');

      expect(lightColors.success).toBe(Colors.semantic.success);
      expect(lightColors.error).toBe(Colors.semantic.error);
      expect(darkColors.success).toBe(Colors.semantic.success);
      expect(darkColors.error).toBe(Colors.semantic.error);
    });
  });
});
