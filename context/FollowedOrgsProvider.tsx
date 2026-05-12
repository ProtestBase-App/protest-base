import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
 * Tracks which organizations the user follows. Device-local; encrypted at rest
 * via expo-secure-store. The server has no per-user "am I following" flag,
 * only the aggregate follower_count.
 *
 * Unlike saved/liked events, follows do not have a retention window — orgs
 * don't expire.
 */
interface FollowedOrgsContextType {
  followedOrgIds: string[];
  /** Returns the new server follower_count so the caller can update `org.follower_count`. */
  followOrganization: (organizationId: string) => Promise<number | null>;
  unfollowOrganization: (organizationId: string) => Promise<number | null>;
  isFollowing: (organizationId: string) => boolean;
  loading: boolean;
}

const FollowedOrgsContext = createContext<FollowedOrgsContextType | undefined>(undefined);

export function FollowedOrgsProvider({ children }: { children: ReactNode }) {
  const [followedOrgIds, setFollowedOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  const value = useMemo<FollowedOrgsContextType>(
    () => ({ followedOrgIds, followOrganization, unfollowOrganization, isFollowing, loading }),
    [followedOrgIds, followOrganization, unfollowOrganization, isFollowing, loading]
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
