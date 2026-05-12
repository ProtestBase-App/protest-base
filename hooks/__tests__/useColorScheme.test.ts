/**
 * Tests for hooks/useColorScheme.ts
 *
 * The hook wraps react-native's useColorScheme and normalizes the return
 * value to always be 'light' or 'dark' (never null or 'unspecified').
 */

let mockColorScheme: string | null = 'light';

jest.mock('react-native', () => ({
  useColorScheme: () => mockColorScheme,
}));

import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('useColorScheme', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
  });

  describe('module export', () => {
    it('exports useColorScheme as a named export', () => {
      expect(typeof useColorScheme).toBe('function');
    });
  });

  describe('return values', () => {
    it('returns "light" when device is in light mode', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useColorScheme());

      expect(result.current).toBe('light');
    });

    it('returns "dark" when device is in dark mode', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() => useColorScheme());

      expect(result.current).toBe('dark');
    });

    it('returns "light" when color scheme is null', () => {
      mockColorScheme = null;

      const { result } = renderHook(() => useColorScheme());

      expect(result.current).toBe('light');
    });

    it('returns "light" when color scheme is "unspecified"', () => {
      mockColorScheme = 'unspecified';

      const { result } = renderHook(() => useColorScheme());

      expect(result.current).toBe('light');
    });
  });

  describe('reactivity', () => {
    it('updates when the device color scheme changes', () => {
      mockColorScheme = 'light';

      const { result, rerender } = renderHook(() => useColorScheme());
      expect(result.current).toBe('light');

      mockColorScheme = 'dark';
      rerender({});

      expect(result.current).toBe('dark');
    });
  });
});
