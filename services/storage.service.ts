import api from './api';
import { PickedImage } from '@/types/event.types';

/** Narrow a mixed images-list entry to a picked file (vs a hosted URL string). */
function isPickedImage(value: PickedImage | string): value is PickedImage {
  return typeof value === 'object' && value !== null && 'uri' in value;
}

/**
 * Upload a single picked image to backend storage (POST /storage/upload).
 *
 * Returns the hosted https URL (`data.fileUrl`), which is valid as an event
 * `images` entry or a template `image_urls` entry. Used by the template
 * screens because the templates API is JSON-only and cannot carry file parts.
 *
 * @param image - The picked image file to upload
 * @returns The hosted file URL
 */
export async function uploadImage(image: PickedImage): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: image.uri,
      type: image.mimeType || 'image/jpeg',
      name: image.fileName || `upload_${Date.now()}.jpg`,
    } as unknown as Blob);

    const response = await api.post<{
      success: boolean;
      data: { fileUrl: string };
    }>('/storage/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });

    if (!response.data.success || !response.data.data?.fileUrl) {
      throw new Error('Failed to upload image');
    }

    return response.data.data.fileUrl;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Please log in to upload images');
    }
    if (error.response?.status === 413) {
      throw new Error('Image is too large to upload');
    }

    throw new Error(error.response?.data?.error || error.message || 'Failed to upload image');
  }
}

/**
 * Resolve a mixed images list (hosted URL strings + new picked files) into
 * hosted URLs, preserving order. URL strings pass through verbatim; each
 * picked file is uploaded. Uploads run sequentially so a failure aborts early
 * instead of leaving several orphaned files behind.
 *
 * @param images - Ordered mixed list from the form state
 * @returns Ordered hosted URLs, one per input entry
 */
export async function resolveImageUrls(images: (PickedImage | string)[]): Promise<string[]> {
  const urls: string[] = [];
  for (const entry of images) {
    urls.push(isPickedImage(entry) ? await uploadImage(entry) : entry);
  }
  return urls;
}
