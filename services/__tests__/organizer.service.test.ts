// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import api from '@/services/api';
import {
  getOrganizersBackend,
  getAllOrganizers,
  getMyOrganizations,
} from '@/services/organizer.service';
import type { UserOrganization } from '@/types/organization.types';

const mockApi = api as jest.Mocked<typeof api>;

const makeOrg = (id: string): UserOrganization => ({
  $id: id,
  Name: `Org ${id}`,
  role: 'admin',
  $createdAt: '2025-01-01T00:00:00Z',
  $updatedAt: '2025-01-01T00:00:00Z',
});

const makeDropdownItem = (id: string) => ({ label: `Org ${id}`, value: id });

const makePaginationInfo = (overrides = {}) => ({
  total: 1,
  limit: 100,
  offset: 0,
  hasMore: false,
  ...overrides,
});

describe('organizer.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // getOrganizersBackend
  // ============================================================
  describe('getOrganizersBackend', () => {
    it('returns organizations, dropdownItems and pagination on success with no query', async () => {
      const org = makeOrg('org-1');
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [org],
            dropdownItems: [makeDropdownItem('org-1')],
            pagination: makePaginationInfo({ total: 1 }),
          },
        },
      });

      const result = await getOrganizersBackend();

      expect(result.organizations).toHaveLength(1);
      expect(result.dropdownItems).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(mockApi.get).toHaveBeenCalledWith('/organizations', { params: {} });
    });

    it('passes limit in params object when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0 }),
          },
        },
      });

      await getOrganizersBackend({ limit: 10 });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations', {
        params: { limit: 10 },
      });
    });

    it('passes offset in params object when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0 }),
          },
        },
      });

      await getOrganizersBackend({ offset: 20 });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations', {
        params: { offset: 20 },
      });
    });

    it('passes page in params object when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0 }),
          },
        },
      });

      await getOrganizersBackend({ page: 2 });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations', {
        params: { page: 2 },
      });
    });

    it('passes search in params object when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0 }),
          },
        },
      });

      await getOrganizersBackend({ search: 'climate' });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations', {
        params: { search: 'climate' },
      });
    });

    it('passes multiple params when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0 }),
          },
        },
      });

      await getOrganizersBackend({ limit: 5, offset: 10, search: 'green' });

      expect(mockApi.get).toHaveBeenCalledWith('/organizations', {
        params: { limit: 5, offset: 10, search: 'green' },
      });
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(getOrganizersBackend()).rejects.toThrow('Failed to fetch organizations');
    });

    it('throws when data is null', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      await expect(getOrganizersBackend()).rejects.toThrow('Failed to fetch organizations');
    });

    it('throws with backend error message on API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Database unavailable' } },
        message: 'Request failed',
      });

      await expect(getOrganizersBackend()).rejects.toThrow('Database unavailable');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(getOrganizersBackend()).rejects.toThrow('Network Error');
    });

    it('throws generic message when no error details available', async () => {
      mockApi.get.mockRejectedValueOnce({});

      await expect(getOrganizersBackend()).rejects.toThrow('Failed to fetch organizations');
    });
  });

  // ============================================================
  // getAllOrganizers
  // ============================================================
  describe('getAllOrganizers', () => {
    it('returns all organizations from a single page', async () => {
      const orgs = [makeOrg('org-1'), makeOrg('org-2')];
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: orgs,
            dropdownItems: [makeDropdownItem('org-1'), makeDropdownItem('org-2')],
            pagination: makePaginationInfo({ total: 2, hasMore: false }),
          },
        },
      });

      const result = await getAllOrganizers();

      expect(result.organizations).toHaveLength(2);
      expect(result.dropdownItems).toHaveLength(2);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('fetches multiple pages when hasMore is true', async () => {
      const page1Orgs = [makeOrg('org-1')];
      const page2Orgs = [makeOrg('org-2')];

      mockApi.get
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              organizations: page1Orgs,
              dropdownItems: [makeDropdownItem('org-1')],
              pagination: makePaginationInfo({ total: 2, hasMore: true, limit: 100, offset: 0 }),
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              organizations: page2Orgs,
              dropdownItems: [makeDropdownItem('org-2')],
              pagination: makePaginationInfo({ total: 2, hasMore: false, limit: 100, offset: 100 }),
            },
          },
        });

      const result = await getAllOrganizers();

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0].$id).toBe('org-1');
      expect(result.organizations[1].$id).toBe('org-2');
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    it('throws when getOrganizersBackend throws', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Server error' } },
        message: 'Request failed',
      });

      await expect(getAllOrganizers()).rejects.toThrow('Server error');
    });

    it('returns empty arrays when no organizations exist', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            organizations: [],
            dropdownItems: [],
            pagination: makePaginationInfo({ total: 0, hasMore: false }),
          },
        },
      });

      const result = await getAllOrganizers();

      expect(result.organizations).toHaveLength(0);
      expect(result.dropdownItems).toHaveLength(0);
    });
  });

  // ============================================================
  // getMyOrganizations
  // ============================================================
  describe('getMyOrganizations', () => {
    it('returns organizations and formatted dropdown items on success', async () => {
      const orgs = [makeOrg('org-1'), makeOrg('org-2')];
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { organizations: orgs },
        },
      });

      const result = await getMyOrganizations();

      expect(result.organizations).toHaveLength(2);
      expect(result.dropdownItems).toHaveLength(2);
      expect(result.dropdownItems[0]).toEqual({ label: 'Org org-1', value: 'org-1' });
      expect(result.dropdownItems[1]).toEqual({ label: 'Org org-2', value: 'org-2' });
      expect(mockApi.get).toHaveBeenCalledWith('/organizations/my');
    });

    it('returns empty arrays when organizations list is empty', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { organizations: [] },
        },
      });

      const result = await getMyOrganizations();

      expect(result.organizations).toHaveLength(0);
      expect(result.dropdownItems).toHaveLength(0);
    });

    it('returns empty arrays when organizations property is missing', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {},
        },
      });

      const result = await getMyOrganizations();

      expect(result.organizations).toHaveLength(0);
      expect(result.dropdownItems).toHaveLength(0);
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(getMyOrganizations()).rejects.toThrow('Failed to fetch user organizations');
    });

    it('throws when data is null', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      await expect(getMyOrganizations()).rejects.toThrow('Failed to fetch user organizations');
    });

    it('throws with backend error message on API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'User not authenticated' } },
        message: 'Request failed',
      });

      await expect(getMyOrganizations()).rejects.toThrow('User not authenticated');
    });

    it('throws with network error when no response body', async () => {
      mockApi.get.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(getMyOrganizations()).rejects.toThrow('Network Error');
    });

    it('throws generic message when no error details available', async () => {
      mockApi.get.mockRejectedValueOnce({});

      await expect(getMyOrganizations()).rejects.toThrow('Failed to fetch user organizations');
    });
  });
});
