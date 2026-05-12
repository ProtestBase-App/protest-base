/**
 * Tests for hooks/useLogoScheme.ts
 *
 * useLogoScheme returns a different logo asset based on the current color scheme:
 * - dark → auth-icon-dark.png
 * - light (or any other value) → auth-icon-light.png
 */

let mockColorScheme: 'light' | 'dark' | null = 'light';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

// Mock image assets so require() calls return deterministic values
jest.mock('@/assets/images/auth-icon-dark.png', () => 'mock-dark-logo', { virtual: true });
jest.mock('@/assets/images/auth-icon-light.png', () => 'mock-light-logo', { virtual: true });

import { renderHook } from '@testing-library/react-native';
import { useLogoScheme } from '@/hooks/useLogoScheme';

describe('useLogoScheme', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
  });

  describe('logo selection by scheme', () => {
    it('returns the dark logo when the color scheme is "dark"', () => {
      mockColorScheme = 'dark';

      const { result } = renderHook(() => useLogoScheme());

      expect(result.current).toBe('mock-dark-logo');
    });

    it('returns the light logo when the color scheme is "light"', () => {
      mockColorScheme = 'light';

      const { result } = renderHook(() => useLogoScheme());

      expect(result.current).toBe('mock-light-logo');
    });

    it('returns the light logo when the color scheme is null', () => {
      mockColorScheme = null;

      const { result } = renderHook(() => useLogoScheme());

      // null is not === 'dark', so the else branch fires → light logo
      expect(result.current).toBe('mock-light-logo');
    });
  });

  describe('logo switching', () => {
    it('switches from light to dark logo when scheme changes to dark', () => {
      mockColorScheme = 'light';

      const { result, rerender } = renderHook(() => useLogoScheme());
      expect(result.current).toBe('mock-light-logo');

      mockColorScheme = 'dark';
      rerender({});

      expect(result.current).toBe('mock-dark-logo');
    });

    it('switches from dark to light logo when scheme changes to light', () => {
      mockColorScheme = 'dark';

      const { result, rerender } = renderHook(() => useLogoScheme());
      expect(result.current).toBe('mock-dark-logo');

      mockColorScheme = 'light';
      rerender({});

      expect(result.current).toBe('mock-light-logo');
    });
  });

  describe('return value', () => {
    it('returns a truthy value in both schemes', () => {
      mockColorScheme = 'light';
      const { result: lightResult } = renderHook(() => useLogoScheme());
      expect(lightResult.current).toBeTruthy();

      mockColorScheme = 'dark';
      const { result: darkResult } = renderHook(() => useLogoScheme());
      expect(darkResult.current).toBeTruthy();
    });

    it('returns different values for light and dark schemes', () => {
      mockColorScheme = 'light';
      const { result: lightResult } = renderHook(() => useLogoScheme());

      mockColorScheme = 'dark';
      const { result: darkResult } = renderHook(() => useLogoScheme());

      expect(lightResult.current).not.toBe(darkResult.current);
    });
  });
});
