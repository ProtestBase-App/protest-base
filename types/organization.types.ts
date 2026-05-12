/**
 * Shared fields present on every organization response from the backend.
 * Both UserOrganization (from /organizations/my) and public org responses
 * include these fields — safe to read on listing endpoints.
 */
export interface OrganizationBase {
  $id: string;
  Name: string;
  $createdAt: string;
  $updatedAt: string;

  // Present on list + detail; defaults supplied by the backend.
  bio?: string | null;
  website_url?: string | null;
  location?: string | null;
  is_verified?: boolean;
  follower_count?: number;
  member_count?: number;
  avatar?: string | null;
}

/** Organization the current user belongs to (GET /organizations/my). */
export interface UserOrganization extends OrganizationBase {
  role: string;
}

/**
 * Full organization detail from GET /organizations/:id.
 * `event_count` is only populated on the detail endpoint.
 */
export interface OrganizationDetail extends OrganizationBase {
  event_count?: number;
}

export interface OrganizationMember {
  $id: string;
  user_id: string;
  organization_id: string;
  joined_at: string;
  added_by?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface OrganizationDropdownItem {
  label: string;
  value: string;
}

export interface GetMyOrganizationsResponse {
  success: boolean;
  data: {
    organizations: UserOrganization[];
  };
}
