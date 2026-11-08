import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '@/utils/logger';
import type { PickedImage } from '@/types/event.types';

/**
 * Image optimization for upload.
 *
 * Backend rejects multipart bodies > 15 MB. iPhone Pro HEIC straight from the picker
 * routinely lands at 18-25 MB. We resize the long edge to MAX_DIMENSION and re-encode
 * as JPEG @ COMPRESSION_QUALITY before handing it to FormData.
 *
 * The result is reliably well under the limit while still looking sharp on phones
 * and tablets (event images are displayed at most ~1200px wide in the UI).
 *
 * Re-encoding also strips EXIF/GPS metadata (expo-image-manipulator does not copy
 * source metadata into its output), so we re-encode even already-small images to
 * avoid leaking the uploader's location — a privacy requirement for a protest app.
 */

const MAX_DIMENSION = 1920;
const COMPRESSION_QUALITY = 0.85;
// Stay well under the 15 MB hard limit so multipart boundary + form fields fit.
const TARGET_MAX_BYTES = 12 * 1024 * 1024;

export interface OptimizableImage extends PickedImage {
  width?: number;
  height?: number;
  fileSize?: number;
}

/**
 * The picked image could not be re-encoded. It still carries its EXIF/GPS metadata, so it must
 * not be uploaded: the caller drops it and tells the user.
 */
export class ImageProcessingError extends Error {
  constructor(message = 'The image could not be re-encoded') {
    super(message);
    this.name = 'ImageProcessingError';
    // Transpiled Error subclasses can lose their prototype, which breaks instanceof.
    Object.setPrototypeOf(this, ImageProcessingError.prototype);
  }
}

/**
 * Resize and compress a picked image so it fits the backend upload limit, and
 * strip its EXIF/GPS metadata.
 *
 * The image is re-encoded in EVERY case — including when it is already small
 * enough to skip resizing — because re-encoding is what removes the metadata.
 * If the resize fails, it retries once as a plain re-encode. If that fails too it
 * throws ImageProcessingError: the original is never returned, since it would be
 * uploaded with its metadata.
 */
export async function optimizeImageForUpload(image: OptimizableImage): Promise<PickedImage> {
  const longEdge = Math.max(image.width ?? 0, image.height ?? 0);
  const alreadySmall =
    image.fileSize !== undefined &&
    image.fileSize < TARGET_MAX_BYTES &&
    longEdge > 0 &&
    longEdge <= MAX_DIMENSION;

  // Resize only when the image exceeds the limits; an empty action list still
  // re-encodes (stripping metadata) without changing dimensions.
  // Only specify the longer dimension so aspect is preserved automatically.
  // If we don't know the dimensions, resize by width — the manipulator keeps ratio.
  const actions: ImageManipulator.Action[] = [];
  if (!alreadySmall) {
    const resizeBy: ImageManipulator.ActionResize['resize'] =
      (image.height ?? 0) > (image.width ?? 0)
        ? { height: MAX_DIMENSION }
        : { width: MAX_DIMENSION };
    actions.push({ resize: resizeBy });
  }

  const reencode = (steps: ImageManipulator.Action[]) =>
    ImageManipulator.manipulateAsync(image.uri, steps, {
      compress: COMPRESSION_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

  let result: ImageManipulator.ImageResult;
  try {
    result = await reencode(actions);
  } catch (error) {
    logger.warn('[ImageOptimization] Re-encoding failed, retrying without a resize', {
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      // A plain re-encode still strips the metadata, even if the image stays large.
      result = await reencode([]);
    } catch (retryError) {
      logger.warn('[ImageOptimization] Re-encoding failed twice, dropping the image', {
        error: retryError instanceof Error ? retryError.message : String(retryError),
      });
      throw new ImageProcessingError();
    }
  }

  const baseName = image.fileName?.replace(/\.[^.]+$/, '') ?? `event_${Date.now()}`;

  return {
    uri: result.uri,
    mimeType: 'image/jpeg',
    fileName: `${baseName}.jpg`,
  };
}
