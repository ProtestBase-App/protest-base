/**
 * FollowedOrgsProvider Tests
 *
 * Covers follow/unfollow optimistic updates with rollback, and the
 * deleted-organization cleanup path (REQ-FE-002): a confirmed 404 must drop the
 * follow locally and stop the ID from being fetched again.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// ============================================
// Mocks BEFORE imports
// ============================================

const mockFetchFollowedOrgIds = jest.fn();
const mockWriteFollowedOrgIds = jest.fn();

jest.mock('@/services/localStorageService', () => ({
  fetchFollowedOrgIdsLocally: (...args: any[]) => mockFetchFollowedOrgIds(...args),
  writeFollowedOrgIdsLocally: (...args: any[]) => mockWriteFollowedOrgIds(...args),
}));

const mockFollowOnServer = jest.fn();
const mockUnfollowOnServer = jest.fn();

jest.mock('@/services/engagement.service', () => ({
  followOrganizationOnServer: (...args: any[]) => mockFollowOnServer(...args),
  unfollowOrganizationOnServer: (...args: any[]) => mockUnfollowOnServer(...args),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ============================================
// Imports after mocks
// ============================================

import { FollowedOrgsProvider, useFollowedOrgs } from '@/context/FollowedOrgsProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <FollowedOrgsProvider>{children}</FollowedOrgsProvider>;
}

async function renderProvider(initialIds: string[] = []) {
  mockFetchFollowedOrgIds.mockResolvedValue(initialIds);
  const view = renderHook(() => useFollowedOrgs(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchFollowedOrgIds.mockResolvedValue([]);
  mockWriteFollowedOrgIds.mockResolvedValue(undefined);
  mockFollowOnServer.mockResolvedValue(1);
  mockUnfollowOnServer.mockResolvedValue(0);
});

describe('FollowedOrgsProvider', () => {
  it('hydrates followed IDs from local storage', async () => {
    const { result } = await renderProvider(['org-1', 'org-2']);

    expect(result.current.followedOrgIds).toEqual(['org-1', 'org-2']);
    expect(result.current.isFollowing('org-1')).toBe(true);
    expect(result.current.isFollowing('org-3')).toBe(false);
  });

  it('optimistically adds a follow and persists it', async () => {
    const { result } = await renderProvider();

    await act(async () => {
      await result.current.followOrganization('org-1');
    });

    expect(result.current.isFollowing('org-1')).toBe(true);
    expect(mockWriteFollowedOrgIds).toHaveBeenCalledWith(['org-1']);
  });

  it('rolls back the follow when the server call fails', async () => {
    mockFollowOnServer.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderProvider();

    await act(async () => {
      await result.current.followOrganization('org-1');
    });

    expect(result.current.isFollowing('org-1')).toBe(false);
  });

  describe('markOrganizationDeleted', () => {
    it('drops the follow for a deleted organization and persists the removal', async () => {
      const { result } = await renderProvider(['org-1', 'dead-org']);

      act(() => {
        result.current.markOrganizationDeleted('dead-org');
      });

      expect(result.current.followedOrgIds).toEqual(['org-1']);
      expect(result.current.isFollowing('dead-org')).toBe(false);
      expect(mockWriteFollowedOrgIds).toHaveBeenCalledWith(['org-1']);
    });

    it('never calls the server — the organization no longer exists', async () => {
      const { result } = await renderProvider(['dead-org']);

      act(() => {
        result.current.markOrganizationDeleted('dead-org');
      });

      expect(mockUnfollowOnServer).not.toHaveBeenCalled();
      expect(mockFollowOnServer).not.toHaveBeenCalled();
    });

    it('remembers the ID even when it was never followed', async () => {
      const { result } = await renderProvider([]);

      act(() => {
        result.current.markOrganizationDeleted('dead-org');
      });

      expect(result.current.isKnownDeletedOrg('dead-org')).toBe(true);
      // Nothing to remove, so storage must not be rewritten.
      expect(mockWriteFollowedOrgIds).not.toHaveBeenCalled();
    });

    it('reports unknown organizations as not deleted', async () => {
      const { result } = await renderProvider(['org-1']);

      expect(result.current.isKnownDeletedOrg('org-1')).toBe(false);
      expect(result.current.isKnownDeletedOrg('never-seen')).toBe(false);
    });

    it('keeps other follows and other dead IDs intact across calls', async () => {
      const { result } = await renderProvider(['org-1', 'dead-a', 'dead-b']);

      act(() => {
        result.current.markOrganizationDeleted('dead-a');
      });
      act(() => {
        result.current.markOrganizationDeleted('dead-b');
      });

      expect(result.current.followedOrgIds).toEqual(['org-1']);
      expect(result.current.isKnownDeletedOrg('dead-a')).toBe(true);
      expect(result.current.isKnownDeletedOrg('dead-b')).toBe(true);
    });
  });

  it('throws when the hook is used outside the provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFollowedOrgs())).toThrow(
      'useFollowedOrgs must be used within a FollowedOrgsProvider'
    );
    spy.mockRestore();
  });
});
