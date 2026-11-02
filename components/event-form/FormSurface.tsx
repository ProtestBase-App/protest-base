import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';

import { FormScreenScaffold } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { IconSizes, Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

const SLIDE_MS = 220;

export interface FormSurfaceProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  inSheet?: boolean;
  testID?: string;
  children: ReactNode;
}

/** A focused step over the form, in the same screen: one back, one scroll, one keyboard. */
export function FormSurface({
  title,
  onClose,
  footer,
  inSheet = false,
  testID,
  children,
}: FormSurfaceProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const titleRef = useOverlayFocus();

  return (
    <Animated.View
      entering={SlideInRight.duration(SLIDE_MS)}
      exiting={SlideOutRight.duration(SLIDE_MS)}
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      testID={testID}
    >
      <FormScreenScaffold inSheet={inSheet} footer={footer} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={[styles.back, { borderColor: themeColors.cardBorder }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            accessibilityHint={t('a11y.hints.goBack')}
            testID={testID ? `${testID}-back` : undefined}
          >
            <IconSymbol name="chevron.left" size={IconSizes.md} color={themeColors.text} />
          </Pressable>
          <View ref={titleRef} accessible accessibilityRole="header" style={styles.title}>
            <ThemedText type="title">{title}</ThemedText>
          </View>
        </View>
        <View style={styles.body}>{children}</View>
      </FormScreenScaffold>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.lg,
  },
});
