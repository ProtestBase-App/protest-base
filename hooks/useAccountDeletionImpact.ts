import { useEffect, useState } from 'react';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { getOrganizationMemberCount } from '@/services/organizer.service';
import { logger } from '@/utils/logger';

export interface OrganizationDeletionImpact {
  id: string;
  name: string;
  /** Other members keep the organization and everything in it. */
  shared: boolean;
  /** The user owns it, so its longest-standing other member becomes the owner. */
  owner: boolean;
}

export type AccountDeletionImpact =
  | { status: 'loading' }
  /** The organizations or their members couldn't be read: say what happens in both cases. */
  | { status: 'unknown' }
  | { status: 'ready'; organizations: OrganizationDeletionImpact[] };

/**
 * What deleting the account does to the user's organizations, as the backend decides it at
 * deletion time (accountDeletionRepository):
 *   - an organization with other members stays, with all its events, photos and templates;
 *     the user's events move to its owner and show the organization's name instead of theirs;
 *   - an organization whose last member is leaving is deleted, with all of them.
 * A failed lookup is never read as "no organization": that would promise to delete events
 * that other members keep.
 */
export function useAccountDeletionImpact(): AccountDeletionImpact {
  const { userOrganizations, loading, error } = useUserOrganizations();
  const [impact, setImpact] = useState<AccountDeletionImpact>({ status: 'loading' });

  useEffect(() => {
    if (loading) return;
    let active = true;

    const readImpact = async (): Promise<AccountDeletionImpact> => {
      if (error) return { status: 'unknown' };
      const organizations = await Promise.all(
        userOrganizations.map(async (organization) => ({
          id: organization.$id,
          name: organization.Name,
          shared: (await getOrganizationMemberCount(organization.$id)) > 1,
          owner: organization.role === 'owner',
        }))
      );
      return { status: 'ready', organizations };
    };

    readImpact()
      .catch((reason: unknown): AccountDeletionImpact => {
        logger.warn('[DeleteAccount] Could not read the organization members', {
          error: reason instanceof Error ? reason.message : String(reason),
        });
        return { status: 'unknown' };
      })
      .then((next) => {
        if (active) setImpact(next);
      });

    return () => {
      active = false;
    };
  }, [loading, error, userOrganizations]);

  return impact;
}
