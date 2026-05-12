import { optimizeImageForUpload } from '@/utils/imageOptimization';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('@/utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as ImageManipulator from 'expo-image-manipulator';
const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;

describe('optimizeImageForUpload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the original asset untouched when it is already small', async () => {
    const result = await optimizeImageForUpload({
      uri: 'file:///small.jpg',
      width: 1200,
      height: 800,
      fileSize: 500_000,
      mimeType: 'image/jpeg',
      fileName: 'small.jpg',
    });
    expect(mockManipulate).not.toHaveBeenCalled();
    expect(result.uri).toBe('file:///small.jpg');
  });

  it('resizes large images by the longer edge (landscape)', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///out.jpg', width: 1920, height: 1280 });
    await optimizeImageForUpload({
      uri: 'file:///big.heic',
      width: 6048,
      height: 4032,
      fileSize: 22_000_000,
      mimeType: 'image/heic',
      fileName: 'IMG_0001.heic',
    });
    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///big.heic',
      [{ resize: { width: 1920 } }],
      expect.objectContaining({ format: 'jpeg', compress: 0.85 })
    );
  });

  it('resizes large images by the longer edge (portrait)', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///out.jpg', width: 1280, height: 1920 });
    await optimizeImageForUpload({
      uri: 'file:///portrait.heic',
      width: 4032,
      height: 6048,
      fileSize: 22_000_000,
    });
    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///portrait.heic',
      [{ resize: { height: 1920 } }],
      expect.any(Object)
    );
  });

  it('rewrites the filename to .jpg', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///out.jpg', width: 1920, height: 1280 });
    const result = await optimizeImageForUpload({
      uri: 'file:///big.heic',
      width: 6048,
      height: 4032,
      fileSize: 22_000_000,
      fileName: 'IMG_0001.HEIC',
    });
    expect(result.fileName).toBe('IMG_0001.jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('falls back to the original asset when manipulation throws', async () => {
    mockManipulate.mockRejectedValue(new Error('boom'));
    const original = {
      uri: 'file:///big.heic',
      width: 6048,
      height: 4032,
      fileSize: 22_000_000,
      mimeType: 'image/heic',
      fileName: 'IMG_0001.heic',
    };
    const result = await optimizeImageForUpload(original);
    expect(result.uri).toBe(original.uri);
    expect(result.mimeType).toBe('image/heic');
  });

  it('still optimizes when fileSize is unknown but dimensions are large', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///out.jpg', width: 1920, height: 1280 });
    await optimizeImageForUpload({
      uri: 'file:///unknown.jpg',
      width: 4000,
      height: 3000,
    });
    expect(mockManipulate).toHaveBeenCalled();
  });
});
