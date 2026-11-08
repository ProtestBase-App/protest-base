import React, { useCallback, useState } from 'react';
import { Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { MAX_EVENT_IMAGES } from '@/constants/EventConfig';
import type { PickedImage } from '@/types/event.types';
import type { FormState } from '@/types/eventForm.types';
import { t } from '@/utils/i18n';
import { ImageProcessingError, optimizeImageForUpload } from '@/utils/imageOptimization';
import { logger } from '@/utils/logger';

// LayoutAnimation is opt-in on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface UseEventImagesOptions {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

/** Picking, removing and reordering the images on an event form. */
export function useEventImages({ form, setForm }: UseEventImagesOptions) {
  const [isPickingImage, setIsPickingImage] = useState(false);

  const pickImage = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);

    try {
      const remaining = MAX_EVENT_IMAGES - form.images.length;
      if (remaining <= 0) {
        Alert.alert(
          t('common.error'),
          t('createEvent.maxImagesReached', { max: MAX_EVENT_IMAGES }),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // The system picker needs no media permission, so READ_MEDIA_* is never requested.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length) {
        // selectionLimit is best-effort on some Android pickers — enforce the cap.
        const selectedAssets = result.assets.slice(0, remaining);

        // The backend refuses over 15 MB. One at a time: decoding 5 photos at once spikes memory.
        const optimized: PickedImage[] = [];
        let dropped = 0;
        for (const asset of selectedAssets) {
          try {
            optimized.push(
              await optimizeImageForUpload({
                uri: asset.uri,
                mimeType: asset.mimeType,
                fileName: asset.fileName,
                width: asset.width,
                height: asset.height,
                fileSize: asset.fileSize,
              })
            );
          } catch (error) {
            if (!(error instanceof ImageProcessingError)) throw error;
            // Never add the original instead: it would be uploaded with its EXIF/GPS metadata.
            dropped += 1;
          }
        }

        if (dropped > 0) {
          Alert.alert(
            t('common.error'),
            t('createEvent.imageProcessingError', { count: dropped }),
            [{ text: t('common.ok') }]
          );
        }

        if (result.assets.length > remaining) {
          Alert.alert(
            t('common.error'),
            t('createEvent.maxImagesReached', { max: MAX_EVENT_IMAGES }),
            [{ text: t('common.ok') }]
          );
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...optimized].slice(0, MAX_EVENT_IMAGES),
        }));
      }
    } catch (error) {
      logger.warn('Image picker failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t('common.error'), t('createEvent.imagePickerError'), [{ text: t('common.ok') }]);
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemoveImage = useCallback(
    (index: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setForm((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    },
    [setForm]
  );

  const handleMoveImage = useCallback(
    (index: number, direction: -1 | 1) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setForm((prev) => {
        const target = index + direction;
        if (target < 0 || target >= prev.images.length) return prev;
        const reordered = [...prev.images];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        return { ...prev, images: reordered };
      });
    },
    [setForm]
  );

  return { isPickingImage, pickImage, handleRemoveImage, handleMoveImage };
}

export type EventImages = ReturnType<typeof useEventImages>;
