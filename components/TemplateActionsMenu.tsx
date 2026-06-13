import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { TemplateMenuAnchor } from '@/components/TemplateTiles';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

const MENU_WIDTH = 178;
/** 3 rows ≈ 44pt each + container padding; used only for edge flipping. */
const MENU_HEIGHT_ESTIMATE = 140;
const MENU_MARGIN = 8;

export interface TemplateActionsMenuProps {
  visible: boolean;
  /** Window frame of the tile's ··· button; null hides the menu. */
  anchor: TemplateMenuAnchor | null;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

interface MenuRowProps {
  icon: IconSymbolName;
  label: string;
  color: string;
  separatorColor?: string;
  onPress: () => void;
}

function MenuRow({ icon, label, color, separatorColor, onPress }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        separatorColor
          ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separatorColor }
          : null,
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol name={icon} size={15} color={color} />
      <ThemedText style={[styles.rowLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

/**
 * Per-tile ··· popover (Edit / Duplicate / Delete) anchored to the pressed
 * button, with a dimmed backdrop. Management lives here so the tile itself
 * stays a one-tap event launcher.
 */
export default function TemplateActionsMenu({
  visible,
  anchor,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateActionsMenuProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!anchor) return null;

  const left = Math.min(
    Math.max(anchor.x + anchor.width - MENU_WIDTH, MENU_MARGIN),
    windowWidth - MENU_WIDTH - MENU_MARGIN
  );
  const fitsBelow =
    anchor.y + anchor.height + 4 + MENU_HEIGHT_ESTIMATE < windowHeight - MENU_MARGIN;
  const top = fitsBelow
    ? anchor.y + anchor.height + 4
    : Math.max(anchor.y - MENU_HEIGHT_ESTIMATE - 4, MENU_MARGIN);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      />
      <View
        style={[
          styles.menu,
          {
            left,
            top,
            backgroundColor: themeColors.surfaceAltBackground,
            borderColor: themeColors.cardBorder,
          },
        ]}
        accessibilityRole="menu"
      >
        <MenuRow
          icon="pencil"
          label={t('templates.editTemplate')}
          color={themeColors.text}
          onPress={onEdit}
        />
        <MenuRow
          icon="doc.on.doc"
          label={t('templates.duplicate')}
          color={themeColors.text}
          separatorColor={themeColors.separator}
          onPress={onDuplicate}
        />
        <MenuRow
          icon="trash"
          label={t('common.delete')}
          color={themeColors.tint}
          separatorColor={themeColors.separator}
          onPress={onDelete}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    // Modal scrim — theme-independent overlay per the handoff's dimmed state.
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  rowLabel: {
    fontSize: 13.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
});
