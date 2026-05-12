/**
 * OrganizationsProvider Tests
 *
 * Tests organization fetch on mount, error state, concurrent fetch prevention,
 * manual refresh, and the hook guard.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

const mockGetAllOrganizers = jest.fn();

jest.mock('@/services/organizer.service', () => ({
  getAllOrganizers: (...args: any[]) => mockGetAllOrganizers(...args),
  getMyOrganizations: jest.fn(),
}));

// ============================================
// Imports after mocks
// ============================================

import { OrganizationsProvider, useOrganizations } from '@/context/OrganizationsProvider';
import type { Organization } from '@/services/organizer.service';
import type { OrganizationDropdownItem } from '@/types/organization.types';

// ============================================
// Helpers
// ============================================

function wrapper({ children }: { children: React.ReactNode }) {
  return <OrganizationsProvider>{children}</OrganizationsProvider>;
}

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    $id: 'org-1',
    Name: 'Test Org',
    role: 'admin',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('OrganizationsProvider', () => {
  afterEach(() => jest.clearAllMocks());

  it('should throw when useOrganizations is used outside the provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useOrganizations());
    }).toThrow('useOrganizations must be used within an OrganizationsProvider');
    consoleSpy.mockRestore();
  });

  it('should start with loading=true', () => {
    mockGetAllOrganizers.mockResolvedValue({
      organizations: [],
      dropdownItems: [],
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('should load organizations on mount', async () => {
    const org1 = makeOrg({ $id: 'org-1', Name: 'Greenpeace' });
    const org2 = makeOrg({ $id: 'org-2', Name: 'Amnesty' });
    const dropdownItems: OrganizationDropdownItem[] = [
      { label: 'Greenpeace', value: 'org-1' },
      { label: 'Amnesty', value: 'org-2' },
    ];

    mockGetAllOrganizers.mockResolvedValue({
      organizations: [org1, org2],
      dropdownItems,
    });

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.organizations).toHaveLength(2);
    expect(result.current.organizations[0].Name).toBe('Greenpeace');
    expect(result.current.organizations[1].Name).toBe('Amnesty');
    expect(result.current.dropdownItems).toEqual(dropdownItems);
    expect(result.current.error).toBeNull();
  });

  it('should expose error message when fetch fails', async () => {
    mockGetAllOrganizers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.organizations).toEqual([]);
    expect(result.current.dropdownItems).toEqual([]);
  });

  it('should expose generic error when error has no message', async () => {
    mockGetAllOrganizers.mockRejectedValue({});

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch organizations');
  });

  it('should refresh organizations via refreshOrganizations()', async () => {
    const org1 = makeOrg({ $id: 'org-1', Name: 'Greenpeace' });
    const org2 = makeOrg({ $id: 'org-2', Name: 'New Org' });

    mockGetAllOrganizers
      .mockResolvedValueOnce({ organizations: [org1], dropdownItems: [] })
      .mockResolvedValueOnce({
        organizations: [org1, org2],
        dropdownItems: [],
      });

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organizations).toHaveLength(1);

    await act(async () => {
      await result.current.refreshOrganizations();
    });

    expect(result.current.organizations).toHaveLength(2);
    expect(result.current.organizations[1].Name).toBe('New Org');
  });

  it('should set loading=true during refresh', async () => {
    let resolveSecond: (v: any) => void;
    mockGetAllOrganizers
      .mockResolvedValueOnce({ organizations: [], dropdownItems: [] })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result } = renderHook(() => useOrganizations(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Start refresh — don't await
    act(() => {
      result.current.refreshOrganizations();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSecond!({ organizations: [], dropdownItems: [] });
    });

    expect(result.current.loading).toBe(false);
  });

  it('should prevent concurrent fetches (isFetchingRef guard)', async () => {
    // Two simultaneous calls to refreshOrganizations — only one fetch should happen
    let callCount = 0;
    mockGetAllOrganizers.mockImplementation(
      () =>
        new Promise((resolve) => {
          callCount++;
          setTimeout(() => resolve({ organizations: [], dropdownItems: [] }), 50);
        })
    );

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    // The mount already triggers a fetch
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCallCount = callCount;

    // Trigger two rapid refreshes
    act(() => {
      result.current.refreshOrganizations();
      result.current.refreshOrganizations();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only one additional fetch should have occurred
    expect(callCount).toBe(initialCallCount + 1);
  });

  it('should clear error state on successful refresh after failure', async () => {
    mockGetAllOrganizers
      .mockRejectedValueOnce(new Error('Initial error'))
      .mockResolvedValueOnce({ organizations: [], dropdownItems: [] });

    const { result } = renderHook(() => useOrganizations(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Initial error');

    await act(async () => {
      await result.current.refreshOrganizations();
    });

    expect(result.current.error).toBeNull();
  });
});
