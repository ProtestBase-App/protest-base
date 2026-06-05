import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { parseAsUTC, EVENT_TIMEZONE } from '@/utils/eventFormatters';
import { DynamicRoutes } from '@/constants/Routes';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';

export interface DraftEventsListItemProps {
  event: Event;
  userLanguage?: string;
}

/**
 * List card for a draft event. Drafts may be incomplete, so every field beyond
 * the title is rendered defensively (no crash on a missing start_time/location).
 * Tapping opens the dedicated draft editor.
 */
export default function DraftEventsListItem({ event, userLanguage }: DraftEventsListItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const dateLabel = formatDraftDate(event.start_time, userLanguage);
  const locationLabel = event.city?.trim() || event.street_address?.trim() || '';
  const categoryKey = event.categories?.[0]?.toLowerCase();

  return (
    <TouchableOpacity
      onPress={() => router.push(DynamicRoutes.draftEdit(event.$id))}
      activeOpacity={0.7}
      testID={`draft-item-${event.$id}`}
    >
      <ThemedView style={[styles.cardContainer, { borderColor: themeColors.cardBorder }]}>
        <View style={styles.headerRow}>
          <IconSymbol name="square.and.pencil" size={IconSizes.md} color={themeColors.subtleText} />
          <ThemedText style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {event.title || t('drafts.editTitle')}
          </ThemedText>
        </View>

        {dateLabel && (
          <ThemedText style={[styles.metaText, { color: themeColors.tint }]}>
            {dateLabel}
          </ThemedText>
        )}

        {!!locationLabel && (
          <View style={styles.metaRow}>
            <IconSymbol name="location.fill" size={IconSizes.xs} color={themeColors.subtleText} />
            <ThemedText
              style={[styles.metaText, { color: themeColors.subtleText }]}
              numberOfLines={1}
            >
              {locationLabel}
            </ThemedText>
          </View>
        )}

        {categoryKey && (
          <View style={[styles.categoryBadge, { backgroundColor: themeColors.categoryBadgeBg }]}>
            <ThemedText style={[styles.categoryBadgeText, { color: themeColors.tint }]}>
              {t(`categories.${categoryKey}`)}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', nl: 'nl-NL' };

function formatDraftDate(startTime?: string, userLanguage?: string): string | null {
  if (!startTime || startTime.trim() === '') return null;
  const date = parseAsUTC(startTime);
  if (Number.isNaN(date.getTime())) return null;
  const locale = LOCALE_MAP[userLanguage ?? 'en'] ?? 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: EVENT_TIMEZONE,
  }).format(date);
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Shadows.card.ios.shadowColor,
        shadowOffset: Shadows.card.ios.shadowOffset,
        shadowOpacity: Shadows.card.ios.shadowOpacity,
        shadowRadius: Shadows.card.ios.shadowRadius,
      },
      android: {
        elevation: Shadows.card.android.elevation,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.relaxed,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  categoryBadgeText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
  },
});
