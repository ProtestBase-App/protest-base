/**
 * Tests for hooks/useThemeColor.ts
 *
 * useThemeColor resolves a color by checking:
 * 1. If a color is provided in props for the current theme → use that
 * 2. Otherwise → fall back to Colors[theme][colorName]
 */

let mockColorScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

describe('useThemeColor', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
  });

  describe('prop color override', () => {
    it('returns the light prop color when scheme is light and prop is provided', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() =>
        useThemeColor({ light: '#FFFFFF', dark: '#000000' }, 'text')
      );

      expect(result.current).toBe('#FFFFFF');
    });

    it('returns the dark prop color when scheme is dark and prop is provided', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() =>
        useThemeColor({ light: '#FFFFFF', dark: '#000000' }, 'text')
      );

      expect(result.current).toBe('#000000');
    });

    it('returns the light prop color even when dark prop is omitted', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useThemeColor({ light: '#ABCDEF' }, 'text'));

      expect(result.current).toBe('#ABCDEF');
    });

    it('falls back to Colors when dark prop is omitted and scheme is dark', () => {
      mockColorScheme = 'dark';

      // Only light prop provided, scheme is dark → no prop for dark → use Colors
      const { result } = renderHook(() => useThemeColor({ light: '#ABCDEF' }, 'text'));

      expect(result.current).toBe(Colors.dark.text);
    });
  });

  describe('Colors fallback', () => {
    it('returns Colors.light[colorName] when no props provided and scheme is light', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useThemeColor({}, 'background'));

      expect(result.current).toBe(Colors.light.background);
    });

    it('returns Colors.dark[colorName] when no props provided and scheme is dark', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() => useThemeColor({}, 'background'));

      expect(result.current).toBe(Colors.dark.background);
    });

    it('returns Colors.light.tint when no props and light mode', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useThemeColor({}, 'tint'));

      expect(result.current).toBe(Colors.light.tint);
      expect(result.current).toBe('#F94460');
    });

    it('returns Colors.dark.tint when no props and dark mode', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() => useThemeColor({}, 'tint'));

      expect(result.current).toBe(Colors.dark.tint);
      expect(result.current).toBe('#F94460');
    });

    it('returns Colors.light.icon in light mode', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useThemeColor({}, 'icon'));

      expect(result.current).toBe(Colors.light.icon);
      expect(result.current).toBe('#687076');
    });

    it('returns Colors.dark.icon in dark mode', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() => useThemeColor({}, 'icon'));

      expect(result.current).toBe(Colors.dark.icon);
      expect(result.current).toBe('#CDCDE0');
    });
  });

  describe('prop takes priority over Colors fallback', () => {
    it('uses prop color over Colors value when both are present', () => {
      mockColorScheme = 'light';

      const customColor = '#CUSTOM1';
      const { result } = renderHook(() => useThemeColor({ light: customColor }, 'tint'));

      expect(result.current).toBe(customColor);
      expect(result.current).not.toBe(Colors.light.tint);
    });
  });

  describe('all Colors keys work as colorName', () => {
    const lightKeys = Object.keys(Colors.light) as Array<keyof typeof Colors.light>;

    lightKeys.forEach((colorKey) => {
      it(`resolves "${colorKey}" from Colors.light in light mode`, () => {
        mockColorScheme = 'light';

        const { result } = renderHook(() => useThemeColor({}, colorKey));

        expect(result.current).toBe(Colors.light[colorKey]);
      });

      it(`resolves "${colorKey}" from Colors.dark in dark mode`, () => {
        mockColorScheme = 'dark';

        const { result } = renderHook(() => useThemeColor({}, colorKey));

        expect(result.current).toBe(Colors.dark[colorKey]);
      });
    });
  });
});
