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
 * Resize and compress a picked image so it fits the backend upload limit.
 * Falls back to the original asset if manipulation fails — the upload may still
 * succeed if the original is small enough, and we log the failure for diagnosis.
 */
export async function optimizeImageForUpload(image: OptimizableImage): Promise<PickedImage> {
  const longEdge = Math.max(image.width ?? 0, image.height ?? 0);
  const alreadySmall =
    image.fileSize !== undefined &&
    image.fileSize < TARGET_MAX_BYTES &&
    longEdge > 0 &&
    longEdge <= MAX_DIMENSION;

  if (alreadySmall) {
    return image;
  }

  // Only specify the longer dimension so aspect is preserved automatically.
  // If we don't know the dimensions, resize by width — the manipulator will keep ratio.
  const resizeBy: ImageManipulator.ActionResize['resize'] =
    (image.height ?? 0) > (image.width ?? 0) ? { height: MAX_DIMENSION } : { width: MAX_DIMENSION };

  try {
    const result = await ImageManipulator.manipulateAsync(image.uri, [{ resize: resizeBy }], {
      compress: COMPRESSION_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const baseName = image.fileName?.replace(/\.[^.]+$/, '') ?? `event_${Date.now()}`;

    return {
      uri: result.uri,
      mimeType: 'image/jpeg',
      fileName: `${baseName}.jpg`,
    };
  } catch (error) {
    logger.warn('[ImageOptimization] Manipulation failed, falling back to original', {
      error: error instanceof Error ? error.message : String(error),
    });
    return image;
  }
}
