import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Event } from '@/types/event.types';
import { hexAlpha } from '@/utils/colorAlpha';
import {
  ConfidenceCheck,
  ConfidenceCheckState,
  countChecksRan,
  DraftStatus,
  formatDraftDateLine,
  getConfidenceBand,
  getConfidenceChecks,
  hasConfidenceScore,
  isCappedByStartDate,
  RescheduleOption,
} from '@/utils/draftStatusUtils';
import { parseAsUTC } from '@/utils/eventFormatters';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface TriageCardProps {
  event: Event;
  status: DraftStatus;
  userLanguage: string;
  /** Render-stable clock shared with the screen's status derivation. */
  now: Date;
  /** Reschedule shortcuts for a past-dated draft (empty otherwise). */
  rescheduleOptions: RescheduleOption[];
  /** Date chosen this session but not yet saved. */
  pendingDate?: string;
  onPickDate: (isoDate: string) => void;
  /** Opens the platform date picker for a free choice. */
  onOpenDatePicker: () => void;
  onOpenEditor: () => void;
  /** Inline error from a failed save/publish, shown instead of an Alert. */
  errorMessage?: string | null;
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  start_date: 'drafts.fieldStartDate',
  start_time_of_day: 'drafts.fieldStartTime',
  title: 'drafts.fieldTitle',
  city: 'drafts.fieldCity',
};

const CHECK_META: Record<
  ConfidenceCheckState,
  { icon: IconSymbolName; labelKey: string; tone: 'live' | 'warning' | 'destructive' | 'muted' }
> = {
  found: { icon: 'checkmark', labelKey: 'drafts.checkFound', tone: 'live' },
  partial: { icon: 'minus', labelKey: 'drafts.checkPartly', tone: 'warning' },
  notFound: { icon: 'xmark', labelKey: 'drafts.checkNotFound', tone: 'destructive' },
  notChecked: { icon: 'questionmark.circle', labelKey: 'drafts.checkNotChecked', tone: 'muted' },
};

/**
 * The card under the user's thumb in triage mode: everything needed to decide a
 * single draft, without opening the editor.
 *
 * Three variants share this shell — a past-dated draft (date block + reschedule
 * shortcuts), a ready draft (date confirmation + description preview, because
 * publishing is what makes the description public), and a human-made draft
 * (no confidence anything, stated explicitly rather than left blank).
 */
export default function TriageCard({
  event,
  status,
  userLanguage,
  now,
  rescheduleOptions,
  pendingDate,
  onPickDate,
  onOpenDatePicker,
  onOpenEditor,
  errorMessage,
}: TriageCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';

  const category = event.categories?.[0];
  const categoryColors = getCategoryColors(category);
  const isAutomation = event.created_via === 'automation';
  const showConfidence = hasConfidenceScore(event);
  const score = event.confidence_score as number | undefined;

  const bandColor =
    showConfidence && typeof score === 'number'
      ? getConfidenceBand(score) === 'high'
        ? themeColors.liveText
        : getConfidenceBand(score) === 'medium'
          ? themeColors.warning
          : themeColors.destructive
      : themeColors.subtleText;

  const checks = showConfidence ? getConfidenceChecks(event.confidence_details) : [];
  const ranCount = countChecksRan(checks);
  const cappedByDate = isCappedByStartDate(event.confidence_details);

  // A pending date turns the block green: the decision is made, the save isn't.
  const effectiveDate = pendingDate ?? event.start_time;
  const dateResolved = !!pendingDate || status.kind !== 'pastDate';
  const dateLine = formatDraftDateLine(effectiveDate, userLanguage, event.all_day);

  const location = [event.street_address, event.city].filter(Boolean).join(', ');

  const toneColor = (tone: 'live' | 'warning' | 'destructive' | 'muted') =>
    tone === 'live'
      ? themeColors.liveText
      : tone === 'warning'
        ? themeColors.warning
        : tone === 'destructive'
          ? themeColors.destructive
          : themeColors.placeholder;

  const toneBackground = (tone: 'live' | 'warning' | 'destructive' | 'muted') =>
    tone === 'muted' ? themeColors.badgeBg : hexAlpha(toneColor(tone), 0.12);

  // Measured against the screen's render-stable clock, the same instant every
  // card status is derived from — a fresh Date.now() here would also be an
  // impure call during render.
  const relativeDays = (() => {
    if (!effectiveDate) return null;
    const ms = parseAsUTC(effectiveDate).getTime();
    if (!Number.isFinite(ms)) return null;
    const days = Math.round((ms - now.getTime()) / (24 * 60 * 60 * 1000));
    return days > 0 ? days : null;
  })();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeColors.cardBackground,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : themeColors.cardBorder,
          shadowOpacity: isDark ? 0.5 : 0.18,
        },
      ]}
      testID={`triage-card-${event.$id}`}
    >
      <View style={styles.chipRow}>
        {category && (
          <View style={[styles.categoryChip, { backgroundColor: categoryColors.badgeBg }]}>
            <ThemedText style={[styles.categoryChipText, { color: categoryColors.color }]}>
              {t(`categories.${category.toLowerCase()}`)}
            </ThemedText>
          </View>
        )}

        {isAutomation && (
          <View style={[styles.sourceChip, { backgroundColor: themeColors.badgeBg }]}>
            <IconSymbol name="bolt" size={11} color={themeColors.subtleText} />
            <ThemedText style={[styles.sourceChipText, { color: themeColors.subtleText }]}>
              {t('drafts.sourceAutomation')}
            </ThemedText>
          </View>
        )}

        {showConfidence && typeof score === 'number' && (
          <View
            style={[styles.confidenceChip, { backgroundColor: hexAlpha(bandColor, 0.15) }]}
            testID="triage-confidence-chip"
          >
            <View style={[styles.confidenceDot, { backgroundColor: bandColor }]} />
            <ThemedText style={[styles.confidenceText, { color: bandColor }]}>
              {t('drafts.confidenceLabel', { score })}
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText style={styles.title} numberOfLines={3}>
        {event.title || t('drafts.untitled')}
      </ThemedText>

      {!!location && (
        <View style={styles.locationRow}>
          <IconSymbol name="mappin.and.ellipse" size={16} color={themeColors.placeholder} />
          <ThemedText
            style={[styles.locationText, { color: themeColors.secondaryText }]}
            numberOfLines={1}
          >
            {location}
          </ThemedText>
        </View>
      )}

      {status.kind === 'pastDate' && !pendingDate ? (
        <View
          style={[
            styles.dateBlock,
            {
              backgroundColor: themeColors.warningBg,
              borderColor: hexAlpha(themeColors.warning, 0.3),
            },
          ]}
        >
          <View style={styles.dateHeaderRow}>
            <IconSymbol name="exclamationmark.triangle" size={16} color={themeColors.warning} />
            <ThemedText style={[styles.dateHeaderText, { color: themeColors.warning }]}>
              {t('drafts.triageDatePassed', {
                date: formatDraftDateLine(event.start_time, userLanguage, event.all_day) ?? '',
              })}
            </ThemedText>
          </View>

          <View style={styles.shortcutRow}>
            {rescheduleOptions.map((option) => (
              <Pressable
                key={option.isoDate}
                onPress={() => onPickDate(option.isoDate)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                testID={`triage-reschedule-${option.isoDate}`}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  {
                    backgroundColor: themeColors.badgeBg,
                    borderColor: isDark ? 'rgba(255,255,255,0.14)' : themeColors.cardBorder,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.shortcutLabel}>{option.label}</ThemedText>
              </Pressable>
            ))}

            <Pressable
              onPress={onOpenDatePicker}
              accessibilityRole="button"
              accessibilityLabel={t('drafts.triagePickDate')}
              testID="triage-pick-date"
              style={({ pressed }) => [
                styles.shortcutChip,
                styles.shortcutChipDashed,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : themeColors.cardBorder,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="calendar" size={13} color={themeColors.secondaryText} />
              <ThemedText style={[styles.shortcutLabel, { color: themeColors.secondaryText }]}>
                {t('drafts.triagePickDate')}
              </ThemedText>
            </Pressable>
          </View>

          {cappedByDate && (
            <ThemedText style={[styles.cappedNote, { color: themeColors.destructive }]}>
              {t('drafts.triageCappedByDate')}
            </ThemedText>
          )}
        </View>
      ) : (
        <View style={styles.dateConfirmRow} testID="triage-date-confirmed">
          <IconSymbol
            name={dateResolved ? 'calendar.badge.checkmark' : 'calendar'}
            size={16}
            color={dateResolved ? themeColors.live : themeColors.placeholder}
          />
          <ThemedText style={styles.dateConfirmText}>{dateLine ?? ''}</ThemedText>
          {relativeDays !== null && (
            <ThemedText style={[styles.dateRelative, { color: themeColors.placeholder }]}>
              {t('drafts.triageRelativeHint', { count: relativeDays })}
            </ThemedText>
          )}
        </View>
      )}

      {status.kind === 'ready' && !!event.description && (
        <View
          style={[
            styles.descriptionBlock,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F8F8',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <ThemedText
            style={[styles.descriptionText, { color: themeColors.secondaryText }]}
            numberOfLines={3}
          >
            {event.description}
          </ThemedText>
          <Pressable onPress={onOpenEditor} accessibilityRole="button">
            <ThemedText style={[styles.descriptionLink, { color: themeColors.tint }]}>
              {t('drafts.triageReadFullDescription')}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {showConfidence ? (
        <View style={styles.breakdown}>
          <View style={styles.breakdownHeader}>
            <ThemedText style={[styles.breakdownLabel, { color: themeColors.placeholder }]}>
              {t('drafts.triageCorroborated')}
            </ThemedText>
            <ThemedText style={[styles.breakdownRan, { color: themeColors.placeholder }]}>
              {t('drafts.triageChecksRan', { ran: ranCount, total: checks.length })}
            </ThemedText>
          </View>

          <View style={styles.checkRow}>
            {checks.map((check) => (
              <CheckChip
                key={check.field}
                check={check}
                color={toneColor(CHECK_META[check.state].tone)}
                background={toneBackground(CHECK_META[check.state].tone)}
              />
            ))}
          </View>
        </View>
      ) : (
        // The visible consequence of null ≠ 0: say why there is no score rather
        // than leaving a gap the user has to interpret.
        <View style={[styles.notScoredRow, { backgroundColor: themeColors.badgeBg }]}>
          <IconSymbol name="person.crop.circle" size={16} color={themeColors.placeholder} />
          <ThemedText style={[styles.notScoredText, { color: themeColors.placeholder }]}>
            {t('drafts.triageNotScored')}
          </ThemedText>
        </View>
      )}

      {!!errorMessage && (
        <ThemedText style={[styles.errorText, { color: themeColors.destructive }]}>
          {errorMessage}
        </ThemedText>
      )}

      <Pressable
        onPress={onOpenEditor}
        accessibilityRole="button"
        accessibilityLabel={t('drafts.triageOpenEditor')}
        testID="triage-open-editor"
        style={[styles.footer, { borderTopColor: themeColors.cardBorder }]}
      >
        <IconSymbol name="pencil" size={17} color={themeColors.tint} />
        <ThemedText style={[styles.footerLabel, { color: themeColors.tint }]}>
          {t('drafts.triageOpenEditor')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CheckChip({
  check,
  color,
  background,
}: {
  check: ConfidenceCheck;
  color: string;
  background: string;
}) {
  const meta = CHECK_META[check.state];
  const fieldLabel = t(FIELD_LABEL_KEYS[check.field] ?? 'drafts.fieldTitle');
  const stateLabel = t(meta.labelKey);
  return (
    <View
      style={[styles.checkChip, { backgroundColor: background }]}
      // A ratio is a word-overlap measure, not a correctness percentage — it
      // belongs in assistive text only, matching the website.
      accessibilityLabel={
        check.ratio !== undefined
          ? `${fieldLabel}: ${stateLabel} (${Math.round(check.ratio * 100)}%)`
          : `${fieldLabel}: ${stateLabel}`
      }
    >
      <IconSymbol name={meta.icon} size={12} color={color} />
      <ThemedText style={[styles.checkChipText, { color }]}>
        {fieldLabel} · {stateLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: Spacing.xl - 4,
    shadowColor: '#000',
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryChip: {
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: Typography.families.semiBold,
    lineHeight: 15,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 9,
  },
  sourceChipText: {
    fontSize: 11,
    fontFamily: Typography.families.semiBold,
    lineHeight: 15,
  },
  confidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
    borderRadius: BorderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontFamily: Typography.families.semiBold,
    lineHeight: 15,
  },
  title: {
    fontSize: 21,
    fontFamily: Typography.families.bold,
    lineHeight: 28,
    marginTop: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.families.regular,
  },
  dateBlock: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateHeaderText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: Typography.families.semiBold,
    lineHeight: 17,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 11,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  shortcutChipDashed: {
    borderStyle: 'dashed',
  },
  shortcutLabel: {
    fontSize: 12,
    fontFamily: Typography.families.semiBold,
  },
  cappedNote: {
    fontSize: 11.5,
    fontFamily: Typography.families.medium,
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
  dateConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  dateConfirmText: {
    fontSize: 13,
    fontFamily: Typography.families.medium,
  },
  dateRelative: {
    fontSize: 12.5,
    fontFamily: Typography.families.regular,
  },
  descriptionBlock: {
    marginTop: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 6,
  },
  descriptionText: {
    fontSize: 12.5,
    fontFamily: Typography.families.regular,
    lineHeight: 19,
  },
  descriptionLink: {
    fontSize: 11.5,
    fontFamily: Typography.families.semiBold,
  },
  breakdown: {
    marginTop: Spacing.lg,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: 10.5,
    fontFamily: Typography.families.semiBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  breakdownRan: {
    fontSize: 10.5,
    fontFamily: Typography.families.regular,
  },
  checkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: Spacing.sm,
  },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: BorderRadius.lg,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  checkChipText: {
    fontSize: 11.5,
    fontFamily: Typography.families.medium,
  },
  notScoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  notScoredText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12.5,
    fontFamily: Typography.families.medium,
    lineHeight: 17,
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footerLabel: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
});
