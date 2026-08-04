import api from './api';
import {
  UserOrganization,
  OrganizationDetail,
  OrganizationDropdownItem,
  GetMyOrganizationsResponse,
} from '@/types/organization.types';
import { logger } from '@/utils/logger';

// Organization is an alias for UserOrganization, kept for backwards compatibility.
export type Organization = UserOrganization;

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GetOrganizationsQuery {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
}

interface OrganizationsApiResponse {
  success: boolean;
  data: {
    organizations: Organization[];
    dropdownItems: OrganizationDropdownItem[];
    pagination: PaginationInfo;
  };
}

/**
 * Get organizations from backend API with pagination support
 *
 * @param query - Optional query parameters for pagination and search
 * @returns Object containing organizations, dropdownItems, and pagination info
 */
export async function getOrganizersBackend(query?: GetOrganizationsQuery): Promise<{
  organizations: Organization[];
  dropdownItems: OrganizationDropdownItem[];
  pagination: PaginationInfo;
}> {
  try {
    const params: Record<string, string | number> = {};
    if (query?.limit) params.limit = query.limit;
    if (query?.offset) params.offset = query.offset;
    if (query?.page) params.page = query.page;
    if (query?.search) params.search = query.search;

    const response = await api.get<OrganizationsApiResponse>('/organizations', { params });

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch organizations');
    }

    return response.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch organizations'
    );
  }
}

/**
 * Get every organization by walking all pages.
 * Used by dropdowns that need the complete list.
 *
 * @returns Object containing all organizations and dropdownItems
 */
export async function getAllOrganizers(): Promise<{
  organizations: Organization[];
  dropdownItems: OrganizationDropdownItem[];
}> {
  const allOrganizations: Organization[] = [];
  const allDropdownItems: OrganizationDropdownItem[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  const MAX_PAGES = 100; // Safeguard against an unbounded loop on a buggy response.
  let pageCount = 0;

  try {
    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;
      const response = await getOrganizersBackend({ limit, offset });
      allOrganizations.push(...response.organizations);
      allDropdownItems.push(...response.dropdownItems);
      hasMore = response.pagination.hasMore;
      offset += limit;
    }

    if (pageCount >= MAX_PAGES && hasMore) {
      logger.error('[organizer.service] Pagination limit exceeded', {
        pageCount,
        totalFetched: allOrganizations.length,
      });
    }

    return {
      organizations: allOrganizations,
      dropdownItems: allDropdownItems,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch all organizations');
  }
}

/**
 * Thrown when the backend confirms an organization is gone — a 404 carrying the
 * ORGANIZATION_NOT_FOUND code. Lets callers evict dangling references via an
 * instanceof check rather than brittle message parsing.
 *
 * Deliberately stricter than `EventNotFoundError`, which keys on the status
 * alone: a 404 here triggers destructive local cleanup (dropping a follow the
 * user created), and a routing or proxy 404 carries no `code` at all — so
 * matching on the status by itself would discard follows for organizations that
 * still exist. Keep the code check.
 */
export class OrganizationNotFoundError extends Error {
  code = 'ORGANIZATION_NOT_FOUND' as const;
  constructor(organizationId: string) {
    super(`Organization with ID ${organizationId} not found`);
    this.name = 'OrganizationNotFoundError';
  }
}

/**
 * Get a single organization by ID — returns the full detail payload including
 * bio, website_url, location, is_verified, follower_count, member_count,
 * and event_count (detail-only — not present on list endpoints).
 *
 * @param organizationId - The organization ID to fetch
 * @returns OrganizationDetail
 * @throws OrganizationNotFoundError on a 404 carrying ORGANIZATION_NOT_FOUND
 */
export async function getOrganizationById(organizationId: string): Promise<OrganizationDetail> {
  try {
    const response = await api.get<{
      success: boolean;
      data: OrganizationDetail;
    }>(`/organizations/${organizationId}`);

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch organization');
    }

    logger.debug('[organizer.service] getOrganizationById', { organizationId });
    return response.data.data;
  } catch (error: any) {
    // The response interceptor rejects rate-limit / lockout errors as a plain
    // Error carrying `code`/`isRateLimited` but no `.response`. Forward those
    // intact — the generic extraction below would collapse them.
    if (
      error?.isRateLimited ||
      error?.code === 'RATE_LIMIT_EXCEEDED' ||
      error?.code === 'ACCOUNT_LOCKED'
    ) {
      throw error;
    }
    if (error.response?.status === 404 && error.response?.data?.code === 'ORGANIZATION_NOT_FOUND') {
      throw new OrganizationNotFoundError(organizationId);
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch organization');
  }
}

/**
 * Get organizations the current user belongs to (GET /organizations/my).
 *
 * @returns Object containing user's organizations and dropdown-formatted items
 */
export async function getMyOrganizations(): Promise<{
  organizations: UserOrganization[];
  dropdownItems: OrganizationDropdownItem[];
}> {
  try {
    const response = await api.get<GetMyOrganizationsResponse>('/organizations/my');

    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to fetch user organizations');
    }

    const organizations = response.data.data.organizations || [];

    const dropdownItems: OrganizationDropdownItem[] = organizations.map((org) => ({
      label: org.Name,
      value: org.$id,
    }));

    return {
      organizations,
      dropdownItems,
    };
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch user organizations'
    );
  }
}
