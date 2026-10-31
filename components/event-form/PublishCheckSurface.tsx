import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomButton from '@/components/CustomButton';
import { FormRow } from '@/components/event-form/FormRow';
import { useTabBarBelowForm } from '@/components/FormScreenScaffold';
import { EventMapPreview } from '@/components/EventMapPreview';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import type { FormRowSummary } from '@/utils/eventWhen';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface PublishCheckSurfaceProps {
  when: FormRowSummary | null;
  where: FormRowSummary | null;
  pin: { latitude: number; longitude: number } | null;
  /** The sheet stops below it, and its details scroll on a short screen. */
  statusBarHeight: number;
  inSheet: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** One look at the date and the place before an event goes public. */
export function PublishCheckSurface({
  when,
  where,
  pin,
  statusBarHeight,
  inSheet,
  onConfirm,
  onClose,
}: PublishCheckSurfaceProps) {
  const themeColors = getThemeColors(useColorScheme());
  const { bottom } = useSafeAreaInsets();
  const bottomInset = useTabBarBelowForm(inSheet) > 0 ? 0 : bottom;
  const headingRef = useOverlayFocus();

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { paddingTop: statusBarHeight }]}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={onClose}
        accessible={false}
        accessibilityRole="none"
        aria-hidden
      />
      <Animated.View
        entering={FadeInDown.duration(200)}
        style={[
          styles.sheet,
          { backgroundColor: themeColors.cardBackground, paddingBottom: bottomInset + Spacing.lg },
        ]}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        testID="surface-publish"
      >
        <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
          <View ref={headingRef} accessible accessibilityRole="header">
            <ThemedText type="subtitleBold">{t('createEvent.publishCheckTitle')}</ThemedText>
          </View>
          <ThemedText style={[styles.body, { color: themeColors.secondaryText }]}>
            {t('createEvent.publishCheckBody')}
          </ThemedText>

          <View style={[styles.card, { borderColor: themeColors.cardBorder }]}>
            {when && (
              <FormRow
                icon="calendar"
                tone="red"
                title={when.title}
                subtitle={when.subtitle && t('createEvent.brusselsTime', { time: when.subtitle })}
              />
            )}
            {!!when && !!where && (
              <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />
            )}
            {where && (
              <FormRow
                icon="mappin.and.ellipse"
                tone="blue"
                title={where.title}
                subtitle={where.subtitle}
              />
            )}
          </View>

          {!!pin && (
            <View style={styles.map}>
              <EventMapPreview latitude={pin.latitude} longitude={pin.longitude} />
            </View>
          )}
        </ScrollView>

        <CustomButton
          testID="btn-publish-confirm"
          title={t('createEvent.publishNow')}
          handlePress={onConfirm}
          pill
          isLoading={false}
        />
        <CustomButton
          testID="btn-publish-keep-editing"
          title={t('eventEdit.keepEditing')}
          handlePress={onClose}
          pill
          containerStyles={[
            styles.secondary,
            {
              backgroundColor: themeColors.buttonSecondaryBackground,
              borderColor: themeColors.buttonSecondaryBorder,
            },
          ]}
          textStyles={{ color: themeColors.text }}
          isLoading={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    justifyContent: 'flex-end',
  },
  sheet: {
    flexShrink: 1,
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  details: {
    flexGrow: 0,
    flexShrink: 1,
  },
  detailsContent: {
    gap: Spacing.sm,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  map: {
    height: 92,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  secondary: {
    borderWidth: 1,
  },
});
