import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { MAX_EVENT_IMAGES } from '@/constants/EventConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventImages } from '@/hooks/useEventImages';
import type { FormState } from '@/types/eventForm.types';
import { HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface ImagesSectionProps {
  form: FormState;
  images: EventImages;
  isTemplateMode: boolean;
  isDark: boolean;
  /** Leave out the label where the screen is already titled Photos. */
  hideLabel?: boolean;
}

/** The cover photo and the images after it. */
export function ImagesSection({
  form,
  images,
  isTemplateMode,
  isDark,
  hideLabel = false,
}: ImagesSectionProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const iconColor = isDark ? 'white' : 'black';
  const { isPickingImage, pickImage, handleRemoveImage, handleMoveImage } = images;

  const renderImages = () => {
    if (form.images.length === 0) {
      return (
        <TouchableOpacity
          onPress={pickImage}
          accessibilityLabel={t('createEvent.addCoverPhoto')}
          accessibilityHint={t('createEvent.imageAccessibilityHint')}
          accessibilityRole="button"
        >
          <ThemedView style={styles.uploadImageBoxSection}>
            <ThemedView style={styles.uploadImageBox}>
              {isPickingImage ? (
                <ActivityIndicator color={themeColors.tint} />
              ) : (
                <IconSymbol name="photo.badge.plus" size={60} color={iconColor} />
              )}
            </ThemedView>
            <ThemedText style={styles.addCoverText}>{t('createEvent.addCoverPhoto')}</ThemedText>
          </ThemedView>
        </TouchableOpacity>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Nested ScrollViews don't inherit this, and a first tap would only close the keyboard.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.imageThumbRow}
      >
        {form.images.map((img, index) => {
          const uri = typeof img === 'string' ? img : img.uri;
          return (
            // Plain Views: ThemedView would paint the theme background over the image.
            <View key={`${uri}-${index}`} style={styles.imageThumbWrapper}>
              <Image accessibilityIgnoresInvertColors source={{ uri }} style={styles.imageThumb} />
              {index === 0 && (
                <View style={[styles.mainImageBadge, { backgroundColor: themeColors.cta }]}>
                  <ThemedText style={styles.mainImageBadgeText}>
                    {t('createEvent.mainImageBadge')}
                  </ThemedText>
                </View>
              )}
              <TouchableOpacity
                onPress={() => handleRemoveImage(index)}
                style={styles.imageThumbRemove}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('createEvent.removeImageAccessibilityLabel')}
                accessibilityHint={t('a11y.hints.removeImage')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={12} color="white" />
              </TouchableOpacity>
              {form.images.length > 1 && (
                <View style={styles.imageThumbActions}>
                  <TouchableOpacity
                    onPress={() => handleMoveImage(index, -1)}
                    disabled={index === 0}
                    style={[styles.imageMoveButton, index === 0 && styles.imageMoveButtonDisabled]}
                    accessibilityLabel={t('createEvent.moveImageLeftAccessibilityLabel')}
                    accessibilityHint={t('a11y.hints.moveImage')}
                    accessibilityRole="button"
                  >
                    <IconSymbol name="chevron.left" size={16} color={themeColors.icon} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveImage(index, 1)}
                    disabled={index === form.images.length - 1}
                    style={[
                      styles.imageMoveButton,
                      index === form.images.length - 1 && styles.imageMoveButtonDisabled,
                    ]}
                    accessibilityLabel={t('createEvent.moveImageRightAccessibilityLabel')}
                    accessibilityHint={t('a11y.hints.moveImage')}
                    accessibilityRole="button"
                  >
                    <IconSymbol name="chevron.right" size={16} color={themeColors.icon} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        {form.images.length < MAX_EVENT_IMAGES && (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.imageAddTile, { borderColor: themeColors.inputBorder }]}
            accessibilityLabel={t('createEvent.addImageAccessibilityLabel')}
            accessibilityHint={t('createEvent.imageAccessibilityHint')}
            accessibilityRole="button"
          >
            {isPickingImage ? (
              <ActivityIndicator color={themeColors.tint} />
            ) : (
              <IconSymbol name="photo.badge.plus" size={28} color={iconColor} />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.uploadImageContainer}>
      {!hideLabel && (
        <ThemedView style={styles.imageTitleWrapper}>
          <ThemedText style={styles.imageTitle}>
            {t('createEvent.uploadImage')} (
            {form.images.length > 0
              ? `${form.images.length}/${MAX_EVENT_IMAGES}`
              : t('common.optional')}
            )
          </ThemedText>
        </ThemedView>
      )}
      {renderImages()}
      <HelperText
        text={isTemplateMode ? t('template.imageHelper') : t('createEvent.imageHelper')}
        isDark={isDark}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  imageTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
  },
  imageThumbRow: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  imageThumbWrapper: {
    width: 96,
  },
  imageThumb: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  imageThumbRemove: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    // Constant dark overlay so the white xmark stays readable on any photo.
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImageBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  mainImageBadgeText: {
    color: 'white',
    fontSize: Typography.sizes.xxs,
    fontFamily: Typography.families.semiBold,
  },
  imageThumbActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  imageMoveButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMoveButtonDisabled: {
    opacity: 0.3,
  },
  imageAddTile: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadImageBoxSection: {
    width: '100%',
    height: 160,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCoverText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  uploadImageBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#A0AEC0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadImageContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
});
