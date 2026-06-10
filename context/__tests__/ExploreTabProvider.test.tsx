/**
 * ExploreTabProvider Tests
 *
 * Tests all state values and setters exposed by the ExploreTabProvider.
 * This provider is pure state (no async, no API), so tests are straightforward.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  ExploreTabProvider,
  useExploreTabContext,
  DEFAULT_EXPLORE_FILTERS,
} from '@/context/ExploreTabProvider';

// ============================================
// Wrapper
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return <ExploreTabProvider>{children}</ExploreTabProvider>;
}

// ============================================
// Tests
// ============================================

describe('ExploreTabProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('should throw when useExploreTabContext is used outside the provider', () => {
    // Silence the expected React error output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useExploreTabContext());
    }).toThrow('useExploreTabContext must be used within an ExploreTabProvider');
    consoleSpy.mockRestore();
  });

  it('should expose initial default values', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.appliedFilters).toEqual(DEFAULT_EXPLORE_FILTERS);
    expect(result.current.shouldScrollToTop).toBe(false);
  });

  it('should update search query via setSearchQuery', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setSearchQuery('climate');
    });

    expect(result.current.searchQuery).toBe('climate');
  });

  it('should replace appliedFilters via setAppliedFilters', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setAppliedFilters({
        category: 'Protest',
        dateFilter: 'thisWeek',
        locations: ['BE.BRU'],
        organizations: ['org-1'],
      });
    });

    expect(result.current.appliedFilters).toEqual({
      category: 'Protest',
      dateFilter: 'thisWeek',
      locations: ['BE.BRU'],
      organizations: ['org-1'],
    });
  });

  it('should support functional updates via setAppliedFilters', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setAppliedFilters((prev) => ({ ...prev, organizations: ['org-2'] }));
    });

    expect(result.current.appliedFilters).toEqual({
      category: null,
      dateFilter: null,
      locations: [],
      organizations: ['org-2'],
    });
  });

  it('should update shouldScrollToTop via setShouldScrollToTop', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setShouldScrollToTop(true);
    });

    expect(result.current.shouldScrollToTop).toBe(true);

    act(() => {
      result.current.setShouldScrollToTop(false);
    });

    expect(result.current.shouldScrollToTop).toBe(false);
  });

  it('should allow independent state updates without affecting other fields', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setSearchQuery('protest');
      result.current.setAppliedFilters((prev) => ({ ...prev, category: 'Environment' }));
    });

    expect(result.current.searchQuery).toBe('protest');
    expect(result.current.appliedFilters.category).toBe('Environment');
    // Other fields remain at defaults
    expect(result.current.appliedFilters.locations).toEqual([]);
    expect(result.current.appliedFilters.organizations).toEqual([]);
    expect(result.current.shouldScrollToTop).toBe(false);
  });

  it('should not mutate DEFAULT_EXPLORE_FILTERS when filters change', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setAppliedFilters({
        category: 'Strike',
        dateFilter: 'today',
        locations: ['NL.NH'],
        organizations: ['org-3'],
      });
    });

    expect(DEFAULT_EXPLORE_FILTERS).toEqual({
      category: null,
      dateFilter: null,
      locations: [],
      organizations: [],
    });
    expect(Object.isFrozen(DEFAULT_EXPLORE_FILTERS)).toBe(true);
  });
});
