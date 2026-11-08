import { ImageProcessingError, optimizeImageForUpload } from '@/utils/imageOptimization';

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

  it('re-encodes already-small images with no resize action to strip EXIF/GPS metadata', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///stripped.jpg', width: 1200, height: 800 });
    const result = await optimizeImageForUpload({
      uri: 'file:///small.jpg',
      width: 1200,
      height: 800,
      fileSize: 500_000,
      mimeType: 'image/jpeg',
      fileName: 'small.jpg',
    });
    // Re-encode happens (empty action list = no resize) so metadata is dropped.
    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///small.jpg',
      [],
      expect.objectContaining({ format: 'jpeg', compress: 0.85 })
    );
    expect(result.uri).toBe('file:///stripped.jpg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.fileName).toBe('small.jpg');
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

  it('retries once as a plain re-encode when the resize fails', async () => {
    mockManipulate
      .mockRejectedValueOnce(new Error('out of memory'))
      .mockResolvedValueOnce({ uri: 'file:///reencoded.jpg', width: 6048, height: 4032 });
    const result = await optimizeImageForUpload({
      uri: 'file:///big.heic',
      width: 6048,
      height: 4032,
      fileSize: 22_000_000,
      mimeType: 'image/heic',
      fileName: 'IMG_0001.heic',
    });
    expect(mockManipulate).toHaveBeenCalledTimes(2);
    expect(mockManipulate).toHaveBeenNthCalledWith(
      2,
      'file:///big.heic',
      [],
      expect.objectContaining({ format: 'jpeg', compress: 0.85 })
    );
    expect(result).toEqual({
      uri: 'file:///reencoded.jpg',
      mimeType: 'image/jpeg',
      fileName: 'IMG_0001.jpg',
    });
  });

  it('throws ImageProcessingError when re-encoding fails twice, never returning the original', async () => {
    mockManipulate.mockRejectedValue(new Error('boom'));
    const original = {
      uri: 'file:///big.heic',
      width: 6048,
      height: 4032,
      fileSize: 22_000_000,
      mimeType: 'image/heic',
      fileName: 'IMG_0001.heic',
    };
    await expect(optimizeImageForUpload(original)).rejects.toBeInstanceOf(ImageProcessingError);
    expect(mockManipulate).toHaveBeenCalledTimes(2);
  });

  it('keeps ImageProcessingError recognisable with instanceof', () => {
    const error = new ImageProcessingError();
    expect(error).toBeInstanceOf(ImageProcessingError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ImageProcessingError');
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
