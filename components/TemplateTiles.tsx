import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ParsedEventTemplate } from '@/types/template.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

/** Window-coordinate frame of a tile's ··· button, anchoring the popover. */
export interface TemplateMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateLaunchTileProps {
  template: ParsedEventTemplate;
  /** Pre-resolved "Edited 2 h ago" recency; empty string hides the line. */
  editedLabel: string;
  /** Tap on the tile body — launches Create Event pre-filled. */
  onLaunch: () => void;
  /** Tap on the ··· button, with its measured window frame. */
  onOpenMenu: (anchor: TemplateMenuAnchor) => void;
  disabled?: boolean;
}

/**
 * Launchpad grid tile for a saved template: category squircle (solid border =
 * saved, vs the drafts screen's dashed), 2-line name, recency meta and a
 * "⚡ New event" affordance. The body launches creation; ··· opens management.
 */
export function TemplateLaunchTile({
  template,
  editedLabel,
  onLaunch,
  onOpenMenu,
  disabled = false,
}: TemplateLaunchTileProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const menuButtonRef = useRef<View>(null);

  const category = Array.isArray(template.event_data.categories)
    ? template.event_data.categories[0]
    : template.event_data.categories;
  const categoryColors = getCategoryColors(category);

  const handleMenuPress = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      onOpenMenu({ x, y, width, height });
    });
  };

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
      ]}
    >
      <Pressable
        onPress={onLaunch}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={template.name}
        accessibilityHint={t('templates.hintDefault')}
        testID={`template-tile-${template.$id}`}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.squircle,
            { backgroundColor: categoryColors.bg, borderColor: categoryColors.border },
          ]}
        >
          <IconSymbol name="rectangle.stack" size={18} color={categoryColors.color} />
        </View>

        <ThemedText style={styles.name} numberOfLines={2}>
          {template.name}
        </ThemedText>

        {!!editedLabel && (
          <ThemedText style={[styles.meta, { color: themeColors.subtleText }]} numberOfLines={1}>
            {editedLabel}
          </ThemedText>
        )}

        <View style={styles.launchRow}>
          <IconSymbol name="bolt.fill" size={14} color={themeColors.tint} />
          <ThemedText style={[styles.launchText, { color: themeColors.tint }]}>
            {t('templates.newEventAction')}
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        ref={menuButtonRef}
        onPress={handleMenuPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('templates.tileMenu')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.menuButton}
        testID={`template-menu-${template.$id}`}
      >
        <IconSymbol name="ellipsis" size={17} color={themeColors.subtleText} />
      </Pressable>
    </View>
  );
}

export interface TemplateNewTileProps {
  onPress: () => void;
}

/** Dashed "New template" tile — always the first grid cell. */
export function TemplateNewTile({ onPress }: TemplateNewTileProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('templates.newTemplateTile')}
      testID="template-new-tile"
      style={({ pressed }) => [
        styles.tile,
        styles.tilePad,
        styles.newTile,
        { borderColor: themeColors.inputBorder },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.squircle,
          styles.newSquircle,
          { backgroundColor: themeColors.tint, shadowColor: themeColors.tint },
        ]}
      >
        <IconSymbol name="plus" size={22} color="white" />
      </View>
      <View>
        <ThemedText style={styles.newTitle}>{t('templates.newTemplateTile')}</ThemedText>
        <ThemedText style={[styles.newSub, { color: themeColors.secondaryText }]}>
          {t('templates.newTemplateTileSub')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Passive empty-state cell so the grid never collapses to a lone tile. */
export function TemplatePlaceholderTile() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <View
      style={[
        styles.tile,
        styles.tilePad,
        styles.placeholderTile,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
      ]}
    >
      <IconSymbol name="rectangle.stack" size={26} color={themeColors.subtleText} />
      <ThemedText style={[styles.placeholderText, { color: themeColors.secondaryText }]}>
        {t('templates.placeholderCard')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
  },
  // Compact tile padding (14/14/12). On the launch tile it lives on the body
  // Pressable so the whole tile — padding ring included — is the tap target.
  tilePad: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: Spacing.md,
  },
  body: {
    flex: 1,
    gap: Spacing.sm,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  squircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
    // Two-line slot keeps tile heights aligned across a grid row.
    minHeight: 36,
  },
  newTitle: {
    fontSize: 14.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 20,
  },
  meta: {
    fontSize: 11.5,
    fontFamily: Typography.families.medium,
    lineHeight: 15,
  },
  launchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  launchText: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
  menuButton: {
    position: 'absolute',
    top: 12,
    right: 10,
    padding: Spacing.xs,
  },
  newTile: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  newSquircle: {
    borderWidth: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 6,
  },
  newSub: {
    fontSize: Typography.sizes.xs,
    lineHeight: 17,
    marginTop: 3,
  },
  placeholderTile: {
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
