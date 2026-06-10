import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { dateKeyToDate } from '@/utils/calendarTabUtils';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface CalendarEmptyStateProps {
  /** Whether any calendar filters are active (changes the title copy). */
  filtered: boolean;
  /** Next day key (YYYY-MM-DD) with events, or null when none upcoming. */
  nextDateKey: string | null;
  onJumpToDate: (dateKey: string) => void;
  userLanguage: string;
}

/**
 * Format a YYYY-MM-DD day key for the "Next: ..." pill, e.g. "Thu, June 11"
 * (en) / "Jeu. 11 juin" (fr).
 */
function formatNextDate(dateKey: string, locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
  };
  const resolvedLocale = localeMap[locale] || 'en-US';

  const formatted = dateKeyToDate(dateKey).toLocaleDateString(resolvedLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  // capitalize is needed for French/Dutch (lowercase weekday names).
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function CalendarEmptyState({
  filtered,
  nextDateKey,
  onJumpToDate,
  userLanguage,
}: CalendarEmptyStateProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const pillLabel = nextDateKey
    ? t('home.nextEventPill', { date: formatNextDate(nextDateKey, userLanguage) })
    : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
      ]}
    >
      <IconSymbol name="calendar" size={28} color={themeColors.placeholder} />
      <ThemedText style={[styles.title, { color: themeColors.text }]}>
        {filtered ? t('home.emptyFilteredTitle') : t('home.emptyDayTitle')}
      </ThemedText>

      {nextDateKey && pillLabel && (
        <Pressable
          onPress={() => onJumpToDate(nextDateKey)}
          accessibilityRole="button"
          accessibilityLabel={pillLabel}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: themeColors.categoryBadgeBg, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText style={[styles.pillLabel, { color: themeColors.tint }]}>
            {pillLabel}
          </ThemedText>
          <IconSymbol name="arrow.right" size={14} color={themeColors.tint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.families.semiBold,
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(249, 68, 96, 0.3)',
    paddingVertical: 9,
    paddingHorizontal: Spacing.lg,
  },
  pillLabel: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
});

export default CalendarEmptyState;
