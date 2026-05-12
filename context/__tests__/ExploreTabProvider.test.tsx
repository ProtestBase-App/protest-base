/**
 * ExploreTabProvider Tests
 *
 * Tests all state values and setters exposed by the ExploreTabProvider.
 * This provider is pure state (no async, no API), so tests are straightforward.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ExploreTabProvider, useExploreTabContext } from '@/context/ExploreTabProvider';

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

    expect(result.current.valueCategoryOpeningModal).toBe('allCategories');
    expect(result.current.valueDateOpeningModal).toBe('allDates');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.locationFilter).toEqual([]);
    expect(result.current.valueLocationOpeningModal).toEqual([]);
    expect(result.current.globalLocationFilterValue).toEqual([]);
    expect(result.current.organizationFilter).toEqual([]);
    expect(result.current.valueOrganizationOpeningModal).toEqual([]);
    expect(result.current.globalOrganizationFilterValue).toEqual([]);
    expect(result.current.shouldScrollToTop).toBe(false);
  });

  it('should update category filter via setValueCategoryOpeningModal', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueCategoryOpeningModal('environment');
    });

    expect(result.current.valueCategoryOpeningModal).toBe('environment');
  });

  it('should allow category filter to be set to null', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueCategoryOpeningModal(null);
    });

    expect(result.current.valueCategoryOpeningModal).toBeNull();
  });

  it('should update date filter via setValueDateOpeningModal', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueDateOpeningModal('thisWeek');
    });

    expect(result.current.valueDateOpeningModal).toBe('thisWeek');
  });

  it('should allow date filter to be set to null', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueDateOpeningModal(null);
    });

    expect(result.current.valueDateOpeningModal).toBeNull();
  });

  it('should update search query via setSearchQuery', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setSearchQuery('climate');
    });

    expect(result.current.searchQuery).toBe('climate');
  });

  it('should update locationFilter via setLocationFilter', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setLocationFilter(['1000', '1040']);
    });

    expect(result.current.locationFilter).toEqual(['1000', '1040']);
  });

  it('should update valueLocationOpeningModal via setValueLocationOpeningModal', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueLocationOpeningModal(['2000']);
    });

    expect(result.current.valueLocationOpeningModal).toEqual(['2000']);
  });

  it('should update globalLocationFilterValue via setGlobalLocationFilterValue', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setGlobalLocationFilterValue(['3000', '9000']);
    });

    expect(result.current.globalLocationFilterValue).toEqual(['3000', '9000']);
  });

  it('should update organizationFilter via setOrganizationFilter', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setOrganizationFilter(['org-1', 'org-2']);
    });

    expect(result.current.organizationFilter).toEqual(['org-1', 'org-2']);
  });

  it('should update valueOrganizationOpeningModal via setValueOrganizationOpeningModal', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setValueOrganizationOpeningModal(['org-3']);
    });

    expect(result.current.valueOrganizationOpeningModal).toEqual(['org-3']);
  });

  it('should update globalOrganizationFilterValue via setGlobalOrganizationFilterValue', () => {
    const { result } = renderHook(() => useExploreTabContext(), { wrapper });

    act(() => {
      result.current.setGlobalOrganizationFilterValue(['org-4', 'org-5']);
    });

    expect(result.current.globalOrganizationFilterValue).toEqual(['org-4', 'org-5']);
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
      result.current.setValueCategoryOpeningModal('environment');
    });

    expect(result.current.searchQuery).toBe('protest');
    expect(result.current.valueCategoryOpeningModal).toBe('environment');
    // Other fields remain at defaults
    expect(result.current.locationFilter).toEqual([]);
    expect(result.current.organizationFilter).toEqual([]);
  });
});
