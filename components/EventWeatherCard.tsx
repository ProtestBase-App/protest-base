import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { useColorScheme } from '@/hooks/useColorScheme';
import { EventWeather } from '@/types/weather.types';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { openExternalUrlSafely } from '@/utils/urlSafety';
import {
  buildWeatherMetrics,
  getWeatherConditionMeta,
  getWeatherTips,
  getWeatherUpdatedHoursAgo,
  getWeatherWindowNote,
} from '@/utils/weatherTips';

export interface EventWeatherCardProps {
  weather: EventWeather;
  userLanguage: string;
  /** The event's own window (ISO). A time is shown only when the forecast covers less than it. */
  eventStart?: string | null;
  eventEnd?: string | null;
}

// Only a stale card carries the "updated N h ago" caption; the age is read
// against the clock at render time, outside the component body.
const staleHoursAgo = (weather: EventWeather): number | null =>
  weather.stale ? getWeatherUpdatedHoursAgo(weather.generated_at, new Date()) : null;

// A metric never wraps in the middle ("gusts 49 / km/h"): only between metrics.
// NBSP covers the spaces; a word joiner is needed too, since line breaking
// allows a break right after "/" ("km/" + "h").
const unbreakable = (text: string): string =>
  text.replace(/ /g, '\u00A0').replace(/\//g, '/\u2060');

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * "Protest forecast": the forecast for the event's own window plus up to three
 * preparation tips. Renders the first day only — one card, one window. The
 * caller decides whether there is anything to show; this component never
 * renders an error or empty state.
 */
export function EventWeatherCard({
  weather,
  userLanguage,
  eventStart,
  eventEnd,
}: EventWeatherCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const day = weather.days[0];
  if (!day) return null;

  const condition = getWeatherConditionMeta(day.condition, day.is_night);
  const conditionLabel = t(condition.labelKey);
  const { temperature, details } = buildWeatherMetrics(day);
  const headline = temperature
    ? `${conditionLabel}, ${unbreakable(t(`weather.metrics.${temperature.key}`, temperature.params))}`
    : conditionLabel;
  const detailLine = capitalise(
    details.map((item) => unbreakable(t(`weather.metrics.${item.key}`, item.params))).join(' · ')
  );
  const windowNote = getWeatherWindowNote(day, eventStart, eventEnd, userLanguage);
  const windowText = windowNote
    ? t(
        windowNote.key === 'fromNow' ? 'weather.windowFromNow' : 'weather.windowForDay',
        windowNote.params
      )
    : null;
  const tips = getWeatherTips(day, userLanguage, eventStart);
  const title = t('weather.title');
  const mayChange = day.confidence !== 'high' ? t('weather.mayChange') : null;
  const staleHours = staleHoursAgo(weather);
  const updatedNote =
    staleHours === null ? null : t('weather.updatedHoursAgo', { count: staleHours });

  const summaryLabel = [title, mayChange, headline, detailLine, windowText]
    .filter((part): part is string => !!part)
    .join('. ');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
      ]}
      testID="event-weather-card"
    >
      <View
        style={styles.header}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={summaryLabel}
      >
        <View
          style={[
            styles.iconTile,
            { backgroundColor: themeColors.badgeBg, borderColor: themeColors.cardBorder },
          ]}
        >
          <IconSymbol name={condition.icon} size={IconSizes.lg} color={themeColors.secondaryText} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <ThemedText style={[styles.title, { color: themeColors.secondaryText }]}>
              {title.toUpperCase()}
            </ThemedText>
            {mayChange && (
              <View
                style={[styles.tag, { backgroundColor: themeColors.badgeBg }]}
                testID="weather-may-change"
              >
                <ThemedText style={[styles.tagText, { color: themeColors.secondaryText }]}>
                  {mayChange}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={styles.headline}>{headline}</ThemedText>
          {detailLine ? (
            <ThemedText style={[styles.details, { color: themeColors.subtleText }]}>
              {detailLine}
            </ThemedText>
          ) : null}
          {windowText ? (
            <ThemedText style={[styles.details, { color: themeColors.subtleText }]}>
              {windowText}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />

      <View style={styles.tips}>
        {tips.map((tip) => {
          const text = t(`weather.tips.${tip.textKey}`, tip.params);
          return (
            <View
              key={tip.key}
              style={[styles.tipRow, tip.serious && { backgroundColor: themeColors.warningBg }]}
              accessible
              accessibilityLabel={text}
              testID={`weather-tip-${tip.key}`}
            >
              <IconSymbol
                name={tip.icon}
                size={IconSizes.md}
                color={tip.serious ? themeColors.warning : themeColors.secondaryText}
              />
              <ThemedText style={styles.tipText}>{text}</ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        {updatedNote && (
          <ThemedText style={[styles.footnote, { color: themeColors.subtleText }]}>
            {updatedNote}
          </ThemedText>
        )}
        <TouchableOpacity
          onPress={() => {
            void openExternalUrlSafely(ExternalLinks.OPEN_METEO, 'weather-attribution');
          }}
          accessibilityRole="link"
          accessibilityLabel={t('weather.attributionLinkA11y')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ThemedText style={[styles.attribution, { color: themeColors.subtleText }]}>
            {t('weather.attribution')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors the detail screen's infoCard / actionCard recipes.
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xxs,
    letterSpacing: 0.8,
  },
  tag: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xxs,
  },
  headline: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  details: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  separator: {
    height: 0.5,
    marginHorizontal: Spacing.lg,
  },
  tips: {
    paddingVertical: Spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  footnote: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
  },
  // Required by the data licence, kept as quiet as possible.
  attribution: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xxs,
  },
});

export default EventWeatherCard;
