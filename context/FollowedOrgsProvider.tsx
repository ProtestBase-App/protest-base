import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  fetchFollowedOrgIdsLocally,
  writeFollowedOrgIdsLocally,
} from '@/services/localStorageService';
import {
  followOrganizationOnServer,
  unfollowOrganizationOnServer,
} from '@/services/engagement.service';
import { logger } from '@/utils/logger';

/**
 * Device-local organization state: which orgs the user follows, and which the
 * backend has confirmed no longer exist. Encrypted at rest via
 * expo-secure-store. The server has no per-user "am I following" flag, only the
 * aggregate follower_count.
 *
 * Unlike saved/liked events, follows do not have a retention window — orgs
 * don't expire. They can, however, be hard-deleted server-side (an owner
 * deleting their account takes the org with it), which is what
 * `markOrganizationDeleted` cleans up after.
 */
interface FollowedOrgsContextType {
  followedOrgIds: string[];
  /** Returns the new server follower_count so the caller can update `org.follower_count`. */
  followOrganization: (organizationId: string) => Promise<number | null>;
  unfollowOrganization: (organizationId: string) => Promise<number | null>;
  isFollowing: (organizationId: string) => boolean;
  /**
   * Record that the backend confirmed this org is gone (404
   * ORGANIZATION_NOT_FOUND): drop any follow for it and remember the ID so
   * callers can skip re-fetching it. No server call — the org no longer exists,
   * so its follower_count is moot.
   */
  markOrganizationDeleted: (organizationId: string) => void;
  /** Whether this org 404'd earlier in the current app run. */
  isKnownDeletedOrg: (organizationId: string) => boolean;
  loading: boolean;
}

const FollowedOrgsContext = createContext<FollowedOrgsContextType | undefined>(undefined);

export function FollowedOrgsProvider({ children }: { children: ReactNode }) {
  const [followedOrgIds, setFollowedOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Orgs the backend has confirmed are deleted. Session-scoped on purpose: the
  // follow entry itself is pruned from storage below, so this only has to stop
  // repeat fetches driven by references we don't own — an organizer link on a
  // cached event outlives the org it points at.
  const knownDeletedOrgIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const ids = await fetchFollowedOrgIdsLocally();
        if (isMounted) setFollowedOrgIds(ids);
      } catch (error) {
        logger.warn('[FollowedOrgs] Failed to load', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (isMounted) setFollowedOrgIds([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback(async (ids: string[]) => {
    try {
      await writeFollowedOrgIdsLocally(ids);
    } catch (error) {
      logger.warn('[FollowedOrgs] Failed to persist', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const followOrganization = useCallback(
    async (organizationId: string): Promise<number | null> => {
      const previous = followedOrgIds;
      if (!previous.includes(organizationId)) {
        const next = [...previous, organizationId];
        setFollowedOrgIds(next);
        persist(next);
      }
      try {
        return await followOrganizationOnServer(organizationId);
      } catch (error) {
        logger.warn('[FollowedOrgs] follow failed, rolling back', {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
        setFollowedOrgIds(previous);
        persist(previous);
        return null;
      }
    },
    [followedOrgIds, persist]
  );

  const unfollowOrganization = useCallback(
    async (organizationId: string): Promise<number | null> => {
      const previous = followedOrgIds;
      const next = previous.filter((id) => id !== organizationId);
      setFollowedOrgIds(next);
      persist(next);
      try {
        return await unfollowOrganizationOnServer(organizationId);
      } catch (error) {
        logger.warn('[FollowedOrgs] unfollow failed, rolling back', {
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
        setFollowedOrgIds(previous);
        persist(previous);
        return null;
      }
    },
    [followedOrgIds, persist]
  );

  const isFollowing = useCallback(
    (organizationId: string): boolean => followedOrgIds.includes(organizationId),
    [followedOrgIds]
  );

  const markOrganizationDeleted = useCallback(
    (organizationId: string): void => {
      knownDeletedOrgIdsRef.current.add(organizationId);
      if (!followedOrgIds.includes(organizationId)) return;
      const next = followedOrgIds.filter((id) => id !== organizationId);
      setFollowedOrgIds(next);
      persist(next);
      logger.info('[FollowedOrgs] dropped follow for deleted organization', { organizationId });
    },
    [followedOrgIds, persist]
  );

  const isKnownDeletedOrg = useCallback(
    (organizationId: string): boolean => knownDeletedOrgIdsRef.current.has(organizationId),
    []
  );

  const value = useMemo<FollowedOrgsContextType>(
    () => ({
      followedOrgIds,
      followOrganization,
      unfollowOrganization,
      isFollowing,
      markOrganizationDeleted,
      isKnownDeletedOrg,
      loading,
    }),
    [
      followedOrgIds,
      followOrganization,
      unfollowOrganization,
      isFollowing,
      markOrganizationDeleted,
      isKnownDeletedOrg,
      loading,
    ]
  );

  return <FollowedOrgsContext.Provider value={value}>{children}</FollowedOrgsContext.Provider>;
}

export function useFollowedOrgs(): FollowedOrgsContextType {
  const context = useContext(FollowedOrgsContext);
  if (!context) {
    throw new Error('useFollowedOrgs must be used within a FollowedOrgsProvider');
  }
  return context;
}
