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
import { uploadImage, resolveImageUrls } from '@/services/storage.service';

const mockApi = api as jest.Mocked<typeof api>;

const fileA = { uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' };
const fileB = { uri: 'file:///b.png', mimeType: 'image/png', fileName: 'b.png' };

describe('storage.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // uploadImage
  // ============================================================
  describe('uploadImage', () => {
    it('uploads the file as multipart and returns the hosted URL', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { fileUrl: 'https://cdn.example.com/a.jpg' } },
      });

      const url = await uploadImage(fileA);

      expect(url).toBe('https://cdn.example.com/a.jpg');
      const [endpoint, payload, config]: any[] = mockApi.post.mock.calls[0];
      expect(endpoint).toBe('/storage/upload');
      expect(payload).toBeInstanceOf(FormData);
      expect((payload as FormData).getAll('file')).toHaveLength(1);
      expect(config.headers['Content-Type']).toBe('multipart/form-data');
    });

    it('throws when success is false', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(uploadImage(fileA)).rejects.toThrow('Failed to upload image');
    });

    it('throws when fileUrl is missing from the response', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: {} },
      });

      await expect(uploadImage(fileA)).rejects.toThrow('Failed to upload image');
    });

    it('throws "Please log in" on 401', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(uploadImage(fileA)).rejects.toThrow('Please log in to upload images');
    });

    it('throws a size message on 413', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 413, data: { error: 'Payload too large' } },
      });

      await expect(uploadImage(fileA)).rejects.toThrow('Image is too large to upload');
    });

    it('throws with backend error message on generic error', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 400, data: { error: 'Invalid file type', code: 'INVALID_IMAGE_TYPE' } },
        message: 'Request failed',
      });

      await expect(uploadImage(fileA)).rejects.toThrow('Invalid file type');
    });
  });

  // ============================================================
  // resolveImageUrls
  // ============================================================
  describe('resolveImageUrls', () => {
    it('keeps URL strings verbatim and uploads picked files in order', async () => {
      mockApi.post
        .mockResolvedValueOnce({
          data: { success: true, data: { fileUrl: 'https://cdn.example.com/new1.jpg' } },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: { fileUrl: 'https://cdn.example.com/new2.png' } },
        });

      const urls = await resolveImageUrls(['https://cdn.example.com/keep.jpg', fileA, fileB]);

      expect(urls).toEqual([
        'https://cdn.example.com/keep.jpg',
        'https://cdn.example.com/new1.jpg',
        'https://cdn.example.com/new2.png',
      ]);
      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });

    it('returns an empty list without calling the API', async () => {
      await expect(resolveImageUrls([])).resolves.toEqual([]);
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('aborts on the first failed upload', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'S3 down' } },
      });

      await expect(resolveImageUrls([fileA, fileB])).rejects.toThrow('S3 down');
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });
  });
});
