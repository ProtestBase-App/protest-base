import React, { useEffect, useRef } from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PUBLISH_PILL_TEXT } from '@/components/ui/ActionPill';
import { getCategoryColors } from '@/constants/CategoryColors';
import { Spacing, Typography, BorderRadius } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { hexAlpha } from '@/utils/colorAlpha';
import {
  DraftStatus,
  formatDraftDateLine,
  getConfidenceBand,
  hasConfidenceScore,
  isNewDraft,
} from '@/utils/draftStatusUtils';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface DraftListRowProps {
  event: Event;
  status: DraftStatus;
  /** Pre-resolved "Edited 2 h ago" label; empty string hides it. */
  editedLabel: string;
  userLanguage: string;
  /** Render-stable clock, so the "New" window doesn't drift mid-list. */
  now: Date;
  /**
   * Handlers receive the event so the list can pass stable callbacks — a fresh
   * closure per row would defeat the memo below on every parent render.
   */
  onEdit: (event: Event) => void;
  onPublish: (event: Event) => void;
  onDelete: (event: Event) => void;
  /** Disables interaction while a publish/delete is in flight. */
  busy?: boolean;
  onSwipeOpen?: (methods: SwipeableMethods | null) => void;
  /**
   * One-shot teaching animation: opens the publish underlay ~96pt, holds, then
   * springs closed. Only ever set on the first row of a first visit.
   */
  demoSwipe?: boolean;
  /** Fired once the teaching animation has finished. */
  onDemoSwipeDone?: () => void;
}

const STATUS_ICON = {
  ready: 'checkmark',
  pastDate: 'exclamationmark.triangle',
  missing: 'ellipsis',
} as const;

/**
 * Compact drafts list row (~64pt, down from the ~230pt card it replaced). The
 * list's job is deciding, not editing, so the inline action pills are gone:
 * publish and delete are swipe actions, and the body opens the editor.
 *
 * Because there are no visible buttons, two things are load-bearing rather than
 * decorative — the one-shot `demoSwipe` teaching animation, and the
 * `accessibilityActions` below, which are the ONLY way a screen-reader user can
 * reach publish/delete.
 */
function DraftListRowComponent({
  event,
  status,
  editedLabel,
  userLanguage,
  now,
  onEdit,
  onPublish,
  onDelete,
  busy = false,
  onSwipeOpen,
  demoSwipe = false,
  onDemoSwipeDone,
}: DraftListRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const swipeableRef = useRef<SwipeableMethods>(null);

  const category = event.categories?.[0];
  const categoryColors = getCategoryColors(category);
  const ready = status.kind === 'ready';

  const statusColor =
    status.kind === 'ready'
      ? themeColors.live
      : status.kind === 'pastDate'
        ? themeColors.warning
        : themeColors.subtleText;

  const dateLine = formatDraftDateLine(event.start_time, userLanguage, event.all_day);
  const missingList = status.missingFieldKeys.map((key) => t(key)).join(', ');

  // Latest-ref for the completion callback so the teaching animation depends only
  // on whether it should run — a new callback identity must not restart it.
  const onDemoSwipeDoneRef = useRef(onDemoSwipeDone);
  useEffect(() => {
    onDemoSwipeDoneRef.current = onDemoSwipeDone;
  });

  // Teaching animation. Runs once, and only when this row is the designated
  // first row of a first visit.
  useEffect(() => {
    if (!demoSwipe) return;
    const open = setTimeout(() => swipeableRef.current?.openLeft(), 420);
    const close = setTimeout(() => {
      swipeableRef.current?.close();
      onDemoSwipeDoneRef.current?.();
    }, 1420);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [demoSwipe]);

  const commit = (action: () => void) => {
    swipeableRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    action();
  };

  // Underlays duplicate actions already exposed via accessibilityActions, so they
  // stay out of the a11y tree — otherwise they read as phantom nodes while the row
  // is closed. role="none" states that intent explicitly (and satisfies the a11y
  // lint, which cannot tell a deliberately hidden control from a missing label).
  const renderDeleteAction = () => (
    <Pressable
      onPress={() => commit(() => onDelete(event))}
      role="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.deleteAction, { backgroundColor: themeColors.destructive }]}
    >
      <IconSymbol name="trash" size={20} color="white" />
    </Pressable>
  );

  // Returning undefined (not an empty view) means a non-ready row simply does
  // not open that way — the gesture has nothing to reveal.
  const renderPublishAction = ready
    ? () => (
        <Pressable
          onPress={() => commit(() => onPublish(event))}
          role="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.publishAction, { backgroundColor: themeColors.live }]}
        >
          <IconSymbol name="checkmark" size={19} color={PUBLISH_PILL_TEXT} />
          <ThemedText style={styles.publishActionLabel}>{t('drafts.publish')}</ThemedText>
        </Pressable>
      )
    : undefined;

  const handleAccessibilityAction = (nativeEvent: AccessibilityActionEvent) => {
    if (busy) return;
    const action = nativeEvent.nativeEvent.actionName;
    if (action === 'publish' && ready) onPublish(event);
    if (action === 'delete') onDelete(event);
  };

  const accessibilityActions = ready
    ? [
        { name: 'publish', label: t('drafts.accessibilityPublish') },
        { name: 'delete', label: t('drafts.delete') },
      ]
    : [{ name: 'delete', label: t('drafts.delete') }];

  const showConfidence = hasConfidenceScore(event);
  const confidenceColor = showConfidence
    ? getConfidenceBand(event.confidence_score as number) === 'high'
      ? themeColors.liveText
      : getConfidenceBand(event.confidence_score as number) === 'medium'
        ? themeColors.warning
        : themeColors.destructive
    : undefined;

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={36}
      leftThreshold={36}
      overshootRight={false}
      overshootLeft={false}
      renderRightActions={renderDeleteAction}
      renderLeftActions={renderPublishAction}
      onSwipeableWillOpen={() => onSwipeOpen?.(swipeableRef.current)}
    >
      <Pressable
        onPress={() => onEdit(event)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={event.title || t('drafts.untitled')}
        accessibilityHint={
          ready ? t('drafts.accessibilityRowHint') : t('drafts.accessibilityRowHintNotReady')
        }
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
        testID={`draft-row-${event.$id}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: themeColors.cardBorder,
            borderLeftColor: statusColor,
          },
          pressed && styles.pressed,
        ]}
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
          <IconSymbol name="pencil" size={17} color={categoryColors.color} />
        </View>

        <View style={styles.info}>
          <View style={styles.metaRow}>
            {category && (
              <ThemedText style={[styles.categoryLabel, { color: categoryColors.color }]}>
                {t(`categories.${category.toLowerCase()}`)}
              </ThemedText>
            )}

            {event.created_via === 'automation' && (
              <View style={[styles.sourceChip, { backgroundColor: themeColors.badgeBg }]}>
                <IconSymbol name="bolt" size={11} color={themeColors.subtleText} />
                <ThemedText style={[styles.sourceChipText, { color: themeColors.subtleText }]}>
                  {t('drafts.sourceAutomation')}
                </ThemedText>
              </View>
            )}

            {/* "New" is a nudge for drafts the user just made; on an automation
                drop it would light up the whole list and mean nothing. */}
            {event.created_via !== 'automation' && isNewDraft(event, now) && (
              <View style={[styles.newChip, { backgroundColor: themeColors.categoryBadgeBg }]}>
                <ThemedText style={[styles.newChipText, { color: themeColors.tint }]}>
                  {t('drafts.badgeNew')}
                </ThemedText>
              </View>
            )}

            {!!editedLabel && (
              <ThemedText
                style={[styles.editedText, { color: themeColors.placeholder }]}
                numberOfLines={1}
              >
                {editedLabel}
              </ThemedText>
            )}
          </View>

          <ThemedText style={styles.title} numberOfLines={1}>
            {event.title || t('drafts.untitled')}
          </ThemedText>

          {status.kind === 'pastDate' ? (
            <ThemedText
              style={[styles.subline, { color: themeColors.placeholder }]}
              numberOfLines={1}
            >
              {t('drafts.pastDateShort')}
            </ThemedText>
          ) : status.kind === 'missing' ? (
            <ThemedText
              style={[styles.subline, { color: themeColors.secondaryText }]}
              numberOfLines={1}
            >
              {t('drafts.missingFields', { fields: missingList })}
            </ThemedText>
          ) : (
            !!dateLine && (
              <ThemedText
                style={[styles.subline, { color: themeColors.secondaryText }]}
                numberOfLines={1}
              >
                {dateLine}
              </ThemedText>
            )
          )}
        </View>

        <View style={styles.statusColumn}>
          <View
            style={[
              styles.statusGlyph,
              { backgroundColor: hexAlpha(statusColor, isDark ? 0.16 : 0.12) },
            ]}
          >
            <IconSymbol name={STATUS_ICON[status.kind]} size={15} color={statusColor} />
          </View>
          {showConfidence && (
            <ThemedText
              style={[styles.confidence, { color: confidenceColor }]}
              testID={`draft-confidence-${event.$id}`}
            >
              {`${event.confidence_score}%`}
            </ThemedText>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 13,
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
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 10.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 14,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: BorderRadius.full,
    paddingVertical: 1,
    paddingLeft: 5,
    paddingRight: 7,
  },
  sourceChipText: {
    fontSize: 10,
    fontFamily: Typography.families.semiBold,
    lineHeight: 14,
  },
  newChip: {
    borderRadius: BorderRadius.full,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  newChipText: {
    fontSize: 10,
    fontFamily: Typography.families.semiBold,
    lineHeight: 14,
  },
  editedText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontFamily: Typography.families.regular,
    lineHeight: 14,
  },
  title: {
    fontSize: 14.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 19,
  },
  subline: {
    fontSize: 12,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
  statusColumn: {
    alignItems: 'center',
    gap: 5,
  },
  statusGlyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidence: {
    fontSize: 9.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 12,
  },
  deleteAction: {
    width: 72,
    marginRight: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishAction: {
    width: 96,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  publishActionLabel: {
    color: PUBLISH_PILL_TEXT,
    fontSize: 12,
    fontFamily: Typography.families.semiBold,
  },
});

/**
 * Memoized: every row owns a Swipeable (gesture handler + reanimated shared
 * values), so re-rendering all visible rows on an unrelated parent state change
 * — a toast appearing, a keystroke in the search field — was costing frames.
 */
const DraftListRow = React.memo(DraftListRowComponent);
DraftListRow.displayName = 'DraftListRow';

export default DraftListRow;
