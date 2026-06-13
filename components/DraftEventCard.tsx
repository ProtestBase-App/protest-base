import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/ThemedText';
import { ActionPill } from '@/components/ui/ActionPill';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { DraftStatus, formatDraftDateLine } from '@/utils/draftStatusUtils';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface DraftEventCardProps {
  event: Event;
  status: DraftStatus;
  /** Pre-resolved "Edited 2 h ago" label; empty string hides it. */
  editedLabel: string;
  userLanguage: string;
  onEdit: () => void;
  onPublish: () => void;
  /** Opens the delete confirm; fired by both the trash icon and the swipe action. */
  onDelete: () => void;
  /** Disables every card action while a publish/delete is in flight. */
  busy?: boolean;
  /**
   * Reports this row's swipeable as it opens so the screen can close the
   * previously open row (one-open-row convention).
   */
  onSwipeOpen?: (methods: SwipeableMethods | null) => void;
}

/** Design: dashed tile border is the category color at ~53% alpha ({cat}88). */
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draft list card: dashed category tile (dashed = unfinished), category chip +
 * last-edited recency, title, date line, a status line answering "what's left
 * to finish, can I publish?", and Continue editing / Publish quick actions.
 * Swiping the card left reveals delete; the body opens the draft editor.
 */
export default function DraftEventCard({
  event,
  status,
  editedLabel,
  userLanguage,
  onEdit,
  onPublish,
  onDelete,
  busy = false,
  onSwipeOpen,
}: DraftEventCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const category = event.categories?.[0];
  const categoryColors = getCategoryColors(category);
  const ready = status.kind === 'ready';

  const dateLine = formatDraftDateLine(event.start_time, userLanguage);
  const missingList = status.missingFieldKeys.map((key) => t(key)).join(', ');

  const handleSwipeDelete = () => {
    swipeableRef.current?.close();
    onDelete();
  };

  // The swipe underlay duplicates the (visible, labeled) trash icon, so it
  // stays out of the accessibility tree — otherwise it reads as a phantom
  // node while the row is closed.
  const renderDeleteAction = () => (
    <Pressable
      onPress={handleSwipeDelete}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.deleteAction, { backgroundColor: themeColors.destructive }]}
    >
      <IconSymbol name="trash" size={20} color="white" />
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={renderDeleteAction}
      onSwipeableWillOpen={() => onSwipeOpen?.(swipeableRef.current)}
    >
      {/* Plain View card: the edit Pressable wraps only the tile+info block so
          the trash icon and action pills stay reachable for screen readers. */}
      <View
        style={[
          styles.card,
          { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
        ]}
        testID={`draft-card-${event.$id}`}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={onEdit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={event.title || t('drafts.untitled')}
            style={({ pressed }) => [styles.editArea, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.tile,
                {
                  backgroundColor: categoryColors.bg,
                  borderColor: hexAlpha(categoryColors.color, 0.53),
                },
              ]}
            >
              <IconSymbol name="pencil" size={18} color={categoryColors.color} />
            </View>

            <View style={styles.info}>
              <View style={styles.metaRow}>
                {category && (
                  <View style={[styles.categoryChip, { backgroundColor: categoryColors.badgeBg }]}>
                    <ThemedText style={[styles.categoryChipText, { color: categoryColors.color }]}>
                      {t(`categories.${category.toLowerCase()}`)}
                    </ThemedText>
                  </View>
                )}
                {!!editedLabel && (
                  <ThemedText
                    style={[styles.editedText, { color: themeColors.subtleText }]}
                    numberOfLines={1}
                  >
                    {editedLabel}
                  </ThemedText>
                )}
              </View>

              <ThemedText style={styles.title} numberOfLines={1}>
                {event.title || t('drafts.untitled')}
              </ThemedText>

              {dateLine && (
                <ThemedText
                  style={[
                    styles.dateLine,
                    status.kind === 'pastDate'
                      ? [styles.dateLinePast, { color: themeColors.subtleText }]
                      : { color: themeColors.secondaryText },
                  ]}
                  numberOfLines={1}
                >
                  {dateLine}
                </ThemedText>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('drafts.delete')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.trashButton}
          >
            <IconSymbol name="trash" size={17} color={themeColors.subtleText} />
          </Pressable>
        </View>

        {ready && (
          <View style={styles.statusRow}>
            <IconSymbol name="checkmark" size={14} color={themeColors.live} />
            <ThemedText style={[styles.statusText, { color: themeColors.live }]}>
              {t('drafts.readyToPublish')}
            </ThemedText>
          </View>
        )}
        {status.kind === 'missing' && (
          <View style={styles.statusRow}>
            <ThemedText
              style={[styles.statusTextRegular, { color: themeColors.secondaryText }]}
              numberOfLines={1}
            >
              {t('drafts.missingFields', { fields: missingList })}
            </ThemedText>
          </View>
        )}
        {status.kind === 'pastDate' && (
          <View style={styles.statusRow}>
            <IconSymbol name="exclamationmark.triangle" size={14} color={themeColors.warning} />
            <ThemedText
              style={[styles.statusText, { color: themeColors.warning }]}
              numberOfLines={2}
            >
              {t('drafts.pastDateWarning')}
            </ThemedText>
          </View>
        )}

        <View style={styles.actionsRow}>
          <ActionPill
            icon="pencil"
            label={t('drafts.continueEditing')}
            variant="primary"
            onPress={onEdit}
            disabled={busy}
          />
          {ready ? (
            <ActionPill
              icon="checkmark"
              label={t('drafts.publish')}
              variant="publish"
              onPress={onPublish}
              disabled={busy}
              testID={`draft-publish-${event.$id}`}
            />
          ) : (
            <ActionPill
              label={t('drafts.publish')}
              variant="disabled"
              testID={`draft-publish-disabled-${event.$id}`}
            />
          )}
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  editArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  categoryChip: {
    borderRadius: BorderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: Typography.families.semiBold,
    lineHeight: 15,
  },
  editedText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: Typography.families.medium,
    lineHeight: 15,
  },
  title: {
    fontSize: 15.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 20,
  },
  dateLine: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  dateLinePast: {
    textDecorationLine: 'line-through',
  },
  trashButton: {
    marginTop: Spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 17,
  },
  statusTextRegular: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: Typography.families.medium,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 11,
  },
  deleteAction: {
    width: 72,
    marginRight: Spacing.lg,
    marginBottom: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
