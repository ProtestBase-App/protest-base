/**
 * Tests for hooks/useEventImages.ts
 *
 * A picked photo is re-encoded before it joins the form, which strips its EXIF/GPS metadata.
 * Saving uploads whatever is in `form.images`, so the property that matters is that a photo
 * the optimizer can't process never enters `form.images` as its original.
 */

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/utils/imageOptimization', () => {
  const actual = jest.requireActual('@/utils/imageOptimization');
  return { ...actual, optimizeImageForUpload: jest.fn() };
});

jest.mock('@/utils/i18n', () => ({
  t: (key: string, options?: { count?: number }) =>
    options?.count !== undefined ? `${key}:${options.count}` : key,
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { act, renderHook } from '@testing-library/react-native';

import { useEventImages } from '@/hooks/useEventImages';
import type { FormState } from '@/types/eventForm.types';
import { ImageProcessingError, optimizeImageForUpload } from '@/utils/imageOptimization';

const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockOptimize = optimizeImageForUpload as jest.Mock;

function asset(name: string) {
  return {
    uri: `file:///original/${name}.heic`,
    mimeType: 'image/heic',
    fileName: `${name}.heic`,
    width: 4032,
    height: 3024,
    fileSize: 5_000_000,
  };
}

function stripped(image: { uri: string; fileName?: string | null }) {
  return {
    uri: image.uri.replace('/original/', '/stripped/').replace('.heic', '.jpg'),
    mimeType: 'image/jpeg',
    fileName: (image.fileName ?? 'photo.heic').replace('.heic', '.jpg'),
  };
}

/** Runs pickImage and returns the URIs of the images the form ends up with. */
async function pick(): Promise<string[]> {
  const form = { images: [] } as unknown as FormState;
  const setForm = jest.fn();
  const { result } = renderHook(() => useEventImages({ form, setForm }));
  await act(async () => {
    await result.current.pickImage();
  });
  const update = setForm.mock.calls.at(-1)?.[0] as ((prev: FormState) => FormState) | undefined;
  // A form image is a picked file, or the URL string of a photo already saved.
  return (update ? update(form).images : form.images).map((image) =>
    typeof image === 'string' ? image : image.uri
  );
}

describe('useEventImages pickImage', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('adds the re-encoded copies, not the originals', async () => {
    mockLaunch.mockResolvedValue({ canceled: false, assets: [asset('a'), asset('b')] });
    mockOptimize.mockImplementation(async (image) => stripped(image));

    expect(await pick()).toEqual(['file:///stripped/a.jpg', 'file:///stripped/b.jpg']);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('drops a photo it cannot process, keeps the others and says so once', async () => {
    mockLaunch.mockResolvedValue({
      canceled: false,
      assets: [asset('a'), asset('bad'), asset('c')],
    });
    mockOptimize.mockImplementation(async (image) => {
      if (image.fileName === 'bad.heic') throw new ImageProcessingError();
      return stripped(image);
    });

    const uris = await pick();

    expect(uris).toEqual(['file:///stripped/a.jpg', 'file:///stripped/c.jpg']);
    // No original, with its metadata, reaches the form and so the upload.
    expect(uris.some((uri) => uri.includes('/original/'))).toBe(false);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'common.error',
      'createEvent.imageProcessingError:1',
      expect.any(Array)
    );
  });

  it('adds nothing when every photo fails, and gives the count', async () => {
    mockLaunch.mockResolvedValue({ canceled: false, assets: [asset('a'), asset('b')] });
    mockOptimize.mockRejectedValue(new ImageProcessingError());

    expect(await pick()).toEqual([]);
    expect(alertSpy).toHaveBeenCalledWith(
      'common.error',
      'createEvent.imageProcessingError:2',
      expect.any(Array)
    );
  });

  it('reports any other failure as a picker error and adds nothing', async () => {
    mockLaunch.mockResolvedValue({ canceled: false, assets: [asset('a')] });
    mockOptimize.mockRejectedValue(new Error('unexpected'));

    expect(await pick()).toEqual([]);
    expect(alertSpy).toHaveBeenCalledWith(
      'common.error',
      'createEvent.imagePickerError',
      expect.any(Array)
    );
  });
});
