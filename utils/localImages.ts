import { File } from 'expo-file-system';

import type { FormState } from '@/types/eventForm.types';
import { logger } from '@/utils/logger';

/** Picked images sit in a cache the OS can clear, so a resumed draft may have lost some. */
export function keepExistingImages(images: FormState['images']): FormState['images'] {
  return images.filter((image) => {
    if (typeof image === 'string') return true;
    try {
      return new File(image.uri).exists;
    } catch (error) {
      logger.warn('Could not check a picked image', {
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  });
}
