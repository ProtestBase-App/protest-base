import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface CreatorActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onEditDetails: () => void;
  /**
   * Invoked when the user taps "Cancel event". The parent is responsible for
   * showing the confirmation + reason prompt and calling the cancelEvent API.
   * Kept as a thin callback so the action sheet stays presentational.
   */
  onCancelEvent: () => void;
  /** When true, disables the "Cancel event" row (already-cancelled events). */
  cancelDisabled?: boolean;
}

export default function CreatorActionSheet({
  visible,
  onClose,
  onEditDetails,
  onCancelEvent,
  cancelDisabled = false,
}: CreatorActionSheetProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const showComingSoon = () => {
    Alert.alert(t('events.comingSoon'), '');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheetWrapper} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={[styles.sheet, { backgroundColor: themeColors.surfaceBackground }]}>
            <View style={[styles.handle, { backgroundColor: themeColors.separator }]} />

            <ActionRow
              icon="pencil"
              label={t('events.editDetails')}
              description={t('events.editDetailsDesc')}
              iconColor={themeColors.text}
              onPress={() => {
                onClose();
                onEditDetails();
              }}
            />

            <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

            <ActionRow
              icon="chart.bar"
              label={t('events.viewStats')}
              description={t('events.viewStatsDesc')}
              iconColor={themeColors.text}
              disabled
              onPress={showComingSoon}
            />

            <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

            <ActionRow
              icon="bell.badge"
              label={t('events.notifyParticipants')}
              description={t('events.notifyParticipantsDesc')}
              iconColor={themeColors.text}
              disabled
              onPress={showComingSoon}
            />

            <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

            <ActionRow
              icon="eye"
              label={t('events.visitorPreview')}
              description={t('events.visitorPreviewDesc')}
              iconColor={themeColors.text}
              disabled
              onPress={showComingSoon}
            />

            <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

            <ActionRow
              icon="xmark.circle"
              label={t('events.cancelEvent')}
              description={t('events.cancelEventDesc')}
              iconColor={themeColors.tint}
              labelColor={themeColors.tint}
              disabled={cancelDisabled}
              onPress={() => {
                if (cancelDisabled) {
                  Alert.alert(t('events.alreadyCancelled'), '');
                  return;
                }
                onClose();
                onCancelEvent();
              }}
            />
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ActionRowProps {
  icon: 'pencil' | 'chart.bar' | 'bell.badge' | 'eye' | 'xmark.circle';
  label: string;
  description: string;
  iconColor: string;
  labelColor?: string;
  disabled?: boolean;
  onPress: () => void;
}

function ActionRow({
  icon,
  label,
  description,
  iconColor,
  labelColor,
  disabled,
  onPress,
}: ActionRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconContainer, { backgroundColor: themeColors.badgeBg }]}>
        <IconSymbol name={icon} size={IconSizes.md} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <ThemedText style={[styles.rowLabel, labelColor ? { color: labelColor } : undefined]}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.rowDesc, { color: themeColors.subtleText }]}>
          {description}
        </ThemedText>
      </View>
      {disabled && (
        <ThemedText style={[styles.comingSoonBadge, { color: themeColors.subtleText }]}>
          {t('events.comingSoon')}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  separator: {
    height: 0.5,
    marginHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  rowDesc: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  comingSoonBadge: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xxs,
  },
});
