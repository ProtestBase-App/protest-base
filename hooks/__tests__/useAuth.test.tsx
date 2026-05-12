/**
 * Tests for hooks/useAuth.tsx
 *
 * useAuth is a thin wrapper around useGlobalContext that extracts only
 * auth-related state: isLogged, user, loading.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/auth.types';

// ============================================
// Mock GlobalProvider
// ============================================

const mockGlobalContextValue: {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  setIsLogged: jest.Mock;
  setUser: jest.Mock;
  setLoading: jest.Mock;
  userLanguage: string;
  eventsCache: Record<string, never>;
  eventsLoading: boolean;
  refetchEvents: jest.Mock;
  userEventCounts: null;
  userEventCountsLoading: boolean;
  refreshUserEventCounts: jest.Mock;
  clearAuthState: jest.Mock;
} = {
  isLogged: false,
  user: null,
  loading: false,
  setIsLogged: jest.fn(),
  setUser: jest.fn(),
  setLoading: jest.fn(),
  userLanguage: 'en',
  eventsCache: {},
  eventsLoading: false,
  refetchEvents: jest.fn(),
  userEventCounts: null,
  userEventCountsLoading: false,
  refreshUserEventCounts: jest.fn(),
  clearAuthState: jest.fn(),
};

jest.mock('@/context/GlobalProvider', () => ({
  useGlobalContext: () => mockGlobalContextValue,
}));

describe('useAuth', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockGlobalContextValue.isLogged = false;
    mockGlobalContextValue.user = null;
    mockGlobalContextValue.loading = false;
  });

  describe('when user is not logged in', () => {
    it('returns isLogged as false', () => {
      mockGlobalContextValue.isLogged = false;

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLogged).toBe(false);
    });

    it('returns user as null', () => {
      mockGlobalContextValue.user = null;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
    });

    it('returns loading as false when auth check is complete', () => {
      mockGlobalContextValue.loading = false;

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);
    });
  });

  describe('when user is logged in', () => {
    const mockUser = {
      $id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerification: true,
      status: true,
      registration: '2025-01-01T00:00:00.000Z',
    };

    it('returns isLogged as true', () => {
      mockGlobalContextValue.isLogged = true;
      mockGlobalContextValue.user = mockUser;

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLogged).toBe(true);
    });

    it('returns the full user object', () => {
      mockGlobalContextValue.user = mockUser;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
    });

    it('returns user.$id correctly', () => {
      mockGlobalContextValue.user = mockUser;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user?.$id).toBe('user-123');
    });

    it('returns user.email correctly', () => {
      mockGlobalContextValue.user = mockUser;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('loading state', () => {
    it('returns loading as true when auth check is in progress', () => {
      mockGlobalContextValue.loading = true;

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
    });

    it('returns loading as false when auth check is complete', () => {
      mockGlobalContextValue.loading = false;

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(false);
    });
  });

  describe('returned shape', () => {
    it('returns only isLogged, user, and loading — no extra GlobalContext fields', () => {
      const { result } = renderHook(() => useAuth());

      const keys = Object.keys(result.current);

      expect(keys).toEqual(expect.arrayContaining(['isLogged', 'user', 'loading']));
      expect(keys).toHaveLength(3);
    });

    it('does not expose setIsLogged, setUser, or other GlobalContext setters', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).not.toHaveProperty('setIsLogged');
      expect(result.current).not.toHaveProperty('setUser');
      expect(result.current).not.toHaveProperty('eventsCache');
      expect(result.current).not.toHaveProperty('refetchEvents');
    });
  });

  describe('reactivity', () => {
    it('updates when isLogged changes', () => {
      mockGlobalContextValue.isLogged = false;

      const { result, rerender } = renderHook(() => useAuth());
      expect(result.current.isLogged).toBe(false);

      mockGlobalContextValue.isLogged = true;
      rerender({});

      expect(result.current.isLogged).toBe(true);
    });

    it('updates when loading changes', () => {
      mockGlobalContextValue.loading = true;

      const { result, rerender } = renderHook(() => useAuth());
      expect(result.current.loading).toBe(true);

      mockGlobalContextValue.loading = false;
      rerender({});

      expect(result.current.loading).toBe(false);
    });
  });
});
