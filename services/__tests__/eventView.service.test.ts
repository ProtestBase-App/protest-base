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
import { trackEventView } from '@/services/eventView.service';

const mockApi = api as jest.Mocked<typeof api>;

describe('eventView.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEventView', () => {
    it('returns success result with view_count from data.view_count format', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { view_count: 42 },
        },
      });

      const result = await trackEventView('event-123');

      expect(result).toEqual({ success: true, view_count: 42 });
      expect(mockApi.post).toHaveBeenCalledWith('/events/event-123/view', {}, { skipAuth: true });
    });

    it('returns success result with view_count from top-level format', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          view_count: 15,
        },
      });

      const result = await trackEventView('event-abc');

      expect(result).toEqual({ success: true, view_count: 15 });
    });

    it('returns default response (success: false, view_count: 0) when success is false', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: false },
      });

      const result = await trackEventView('event-123');

      expect(result).toEqual({ success: false, view_count: 0 });
    });

    it('returns default response on network error without throwing', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await trackEventView('event-123');

      expect(result).toEqual({ success: false, view_count: 0 });
    });

    it('returns default response on 401 error without throwing', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
        message: 'Request failed with status code 401',
      });

      const result = await trackEventView('event-123');

      expect(result).toEqual({ success: false, view_count: 0 });
    });

    it('returns default response on 500 server error without throwing', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal Server Error' } },
        message: 'Request failed with status code 500',
      });

      const result = await trackEventView('event-500');

      expect(result).toEqual({ success: false, view_count: 0 });
    });

    it('returns 0 for view_count when neither data.view_count nor view_count is present', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          // no view_count in either location
        },
      });

      const result = await trackEventView('event-123');

      expect(result).toEqual({ success: true, view_count: 0 });
    });

    it('never throws even when error has no response property', async () => {
      mockApi.post.mockRejectedValueOnce(new TypeError('Cannot read property of undefined'));

      await expect(trackEventView('event-123')).resolves.toEqual({
        success: false,
        view_count: 0,
      });
    });
  });
});
