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

import api from '@/services/api';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/services/template.service';
import type { EventTemplate } from '@/types/template.types';

const mockApi = api as jest.Mocked<typeof api>;

const makeTemplate = (overrides: Partial<EventTemplate> = {}): EventTemplate => ({
  $id: 'tmpl-1',
  $createdAt: '2025-01-01T00:00:00Z',
  $updatedAt: '2025-01-01T00:00:00Z',
  name: 'My Template',
  description: 'A test template',
  organizer_id: 'org-1',
  event_data: JSON.stringify({ title: 'Test Event', city: 'Brussels' }),
  ...overrides,
});

describe('template.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // getTemplates
  // ============================================================
  describe('getTemplates', () => {
    it('returns parsed templates when data is an array', async () => {
      const raw = makeTemplate();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: [raw] },
      });

      const result = await getTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].$id).toBe('tmpl-1');
      expect(result[0].event_data).toEqual({ title: 'Test Event', city: 'Brussels' });
      expect(mockApi.get).toHaveBeenCalledWith('/templates', {
        params: { limit: 100, offset: 0 },
      });
    });

    it('handles nested data.data array structure', async () => {
      const raw = makeTemplate();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { data: [raw] } },
      });

      const result = await getTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('My Template');
    });

    it('handles nested data.templates array structure', async () => {
      const raw = makeTemplate();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { templates: [raw] } },
      });

      const result = await getTemplates();

      expect(result).toHaveLength(1);
    });

    it('returns empty array when data is an unrecognized object shape', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { something: 'else' } },
      });

      const result = await getTemplates();

      expect(result).toEqual([]);
    });

    it('passes organization_id query param when provided', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      await getTemplates({ organization_id: 'org-abc' });

      expect(mockApi.get).toHaveBeenCalledWith('/templates', {
        params: { limit: 100, offset: 0, organization_id: 'org-abc' },
      });
    });

    it('passes custom limit and offset', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      await getTemplates({ limit: 10, offset: 20 });

      expect(mockApi.get).toHaveBeenCalledWith('/templates', {
        params: { limit: 10, offset: 20 },
      });
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false },
      });

      await expect(getTemplates()).rejects.toThrow('Failed to fetch templates');
    });

    it('throws with "Please log in" message on 401', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
        message: 'Request failed',
      });

      await expect(getTemplates()).rejects.toThrow('Please log in to view your templates');
    });

    it('throws with backend error message on generic API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server exploded' } },
        message: 'Request failed',
      });

      await expect(getTemplates()).rejects.toThrow('Server exploded');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(getTemplates()).rejects.toThrow('Network Error');
    });

    it('parses event_data as empty object when JSON is invalid', async () => {
      const raw = makeTemplate({ event_data: 'not-valid-json' });
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: [raw] },
      });

      const result = await getTemplates();

      expect(result[0].event_data).toEqual({});
    });
  });

  // ============================================================
  // getTemplate
  // ============================================================
  describe('getTemplate', () => {
    it('returns the parsed template on success', async () => {
      const raw = makeTemplate();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: raw },
      });

      const result = await getTemplate('tmpl-1');

      expect(result.$id).toBe('tmpl-1');
      expect(result.event_data).toEqual({ title: 'Test Event', city: 'Brussels' });
      expect(mockApi.get).toHaveBeenCalledWith('/templates/tmpl-1');
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(getTemplate('tmpl-1')).rejects.toThrow('Failed to fetch template');
    });

    it('throws "Template not found" on 404', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
      });

      await expect(getTemplate('tmpl-missing')).rejects.toThrow('Template not found');
    });

    it('throws "Access denied" on 403', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
      });

      await expect(getTemplate('tmpl-1')).rejects.toThrow('Access denied');
    });

    it('throws "Please log in" message on 401', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(getTemplate('tmpl-1')).rejects.toThrow('Please log in to view this template');
    });

    it('throws with backend error on other errors', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Database error' } },
        message: 'Request failed',
      });

      await expect(getTemplate('tmpl-1')).rejects.toThrow('Database error');
    });
  });

  // ============================================================
  // createTemplate
  // ============================================================
  describe('createTemplate', () => {
    const createRequest = {
      organization_id: 'org-1',
      name: 'New Template',
      event_data: { title: 'Climate Protest' },
    };

    it('returns the created parsed template on success', async () => {
      const raw = makeTemplate({ name: 'New Template' });
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: raw },
      });

      const result = await createTemplate(createRequest);

      expect(result.name).toBe('New Template');
      expect(mockApi.post).toHaveBeenCalledWith('/templates', createRequest);
    });

    it('throws when success is false', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(createTemplate(createRequest)).rejects.toThrow('Failed to create template');
    });

    it('throws "Please log in" on 401', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(createTemplate(createRequest)).rejects.toThrow(
        'Please log in to create a template'
      );
    });

    it('throws name too long error for TEMPLATE_NAME_TOO_LONG code', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { code: 'TEMPLATE_NAME_TOO_LONG', error: 'Name too long' },
        },
      });

      await expect(createTemplate(createRequest)).rejects.toThrow(
        'Template name is too long (max 100 characters)'
      );
    });

    it('throws data too large error for EVENT_DATA_TOO_LARGE code', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { code: 'EVENT_DATA_TOO_LARGE', error: 'Data too large' },
        },
      });

      await expect(createTemplate(createRequest)).rejects.toThrow('Template data is too large');
    });

    it('throws with backend error message on generic error', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal error' } },
        message: 'Request failed',
      });

      await expect(createTemplate(createRequest)).rejects.toThrow('Internal error');
    });
  });

  // ============================================================
  // updateTemplate
  // ============================================================
  describe('updateTemplate', () => {
    const updates = { name: 'Updated Name' };

    it('returns the updated parsed template on success', async () => {
      const raw = makeTemplate({ name: 'Updated Name' });
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: raw },
      });

      const result = await updateTemplate('tmpl-1', updates);

      expect(result.name).toBe('Updated Name');
      expect(mockApi.put).toHaveBeenCalledWith('/templates/tmpl-1', updates);
    });

    it('throws when success is false', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow('Failed to update template');
    });

    it('throws "Template not found" on 404', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
      });

      await expect(updateTemplate('tmpl-missing', updates)).rejects.toThrow('Template not found');
    });

    it('throws permission error on 403', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow(
        'You do not have permission to update this template'
      );
    });

    it('throws "Please log in" on 401', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow(
        'Please log in to update this template'
      );
    });

    it('throws name too long error for TEMPLATE_NAME_TOO_LONG code', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { code: 'TEMPLATE_NAME_TOO_LONG', error: 'Name too long' },
        },
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow(
        'Template name is too long (max 100 characters)'
      );
    });

    it('throws data too large error for EVENT_DATA_TOO_LARGE code', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { code: 'EVENT_DATA_TOO_LARGE', error: 'Data too large' },
        },
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow('Template data is too large');
    });

    it('throws with backend error message on generic error', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Unexpected server error' } },
        message: 'Request failed',
      });

      await expect(updateTemplate('tmpl-1', updates)).rejects.toThrow('Unexpected server error');
    });
  });

  // ============================================================
  // deleteTemplate
  // ============================================================
  describe('deleteTemplate', () => {
    it('resolves without error on successful deletion', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      await expect(deleteTemplate('tmpl-1')).resolves.toBeUndefined();
      expect(mockApi.delete).toHaveBeenCalledWith('/templates/tmpl-1');
    });

    it('throws "Template not found" on 404', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
      });

      await expect(deleteTemplate('tmpl-missing')).rejects.toThrow('Template not found');
    });

    it('throws permission error on 403', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
      });

      await expect(deleteTemplate('tmpl-1')).rejects.toThrow(
        'You do not have permission to delete this template'
      );
    });

    it('throws "Please log in" on 401', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(deleteTemplate('tmpl-1')).rejects.toThrow(
        'Please log in to delete this template'
      );
    });

    it('throws with backend error message on generic error', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server error' } },
        message: 'Request failed',
      });

      await expect(deleteTemplate('tmpl-1')).rejects.toThrow('Server error');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.delete.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(deleteTemplate('tmpl-1')).rejects.toThrow('Network Error');
    });

    it('throws generic message when no error details available', async () => {
      mockApi.delete.mockRejectedValueOnce({});

      await expect(deleteTemplate('tmpl-1')).rejects.toThrow('Failed to delete template');
    });
  });
});
