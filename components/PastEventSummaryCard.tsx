import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

export interface PastEventSummaryItem {
  id: string;
  title: string;
  startDateNoFormat: string; // ISO date format: "2025-10-26"
  view_count: number;
}

interface PastEventSummaryCardProps {
  event: PastEventSummaryItem;
}

export default function PastEventSummaryCard({ event }: PastEventSummaryCardProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Format date as YYYY-MM-DD
  const formattedDate = event.startDateNoFormat;

  return (
    <TouchableOpacity onPress={() => router.push(`/event/${event.id}` as any)} activeOpacity={0.7}>
      <ThemedView style={[styles.cardContainer, { borderColor: themeColors.cardBorder }]}>
        {/* Green checkmark icon */}
        <View style={styles.checkmarkContainer}>
          <IconSymbol name="checkmark.circle" size={IconSizes.xl} color={themeColors.success} />
        </View>

        {/* Event info */}
        <View style={styles.contentContainer}>
          <ThemedText style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
            {event.title}
          </ThemedText>
          <ThemedText style={[styles.eventDate, { color: themeColors.subtleText }]}>
            {formattedDate}
          </ThemedText>
        </View>

        {/* View count badge */}
        <View style={[styles.viewBadge, { backgroundColor: themeColors.viewBadgeBg }]}>
          <IconSymbol name="eye" size={IconSizes.sm} color={themeColors.subtleText} />
          <ThemedText style={[styles.viewCount, { color: themeColors.subtleText }]}>
            {event.view_count}
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: Shadows.card.ios.shadowColor,
        shadowOffset: Shadows.card.ios.shadowOffset,
        shadowOpacity: Shadows.card.ios.shadowOpacity * 0.5,
        shadowRadius: Shadows.card.ios.shadowRadius * 0.5,
      },
      android: {
        elevation: Shadows.card.android.elevation * 0.5,
      },
    }),
  },
  checkmarkContainer: {
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  eventTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  viewCount: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
  },
});
