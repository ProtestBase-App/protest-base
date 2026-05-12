import React from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import PastEventTemplateCard from '@/components/PastEventTemplateCard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { PastEventForTemplate } from '@/types/template.types';

interface PastEventsCarouselProps {
  events: PastEventForTemplate[];
  onSelectEvent: (event: PastEventForTemplate) => void;
  loading?: boolean;
}

export default function PastEventsCarousel({
  events,
  onSelectEvent,
  loading = false,
}: PastEventsCarouselProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  // Don't render if no events and not loading
  if (events.length === 0 && !loading) {
    return null;
  }

  const renderItem = ({ item }: { item: PastEventForTemplate }) => (
    <PastEventTemplateCard event={item} onCreateTemplate={onSelectEvent} />
  );

  const keyExtractor = (item: PastEventForTemplate) => item.$id;

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: themeColors.cardBorder }]} />

      {/* Section header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Create from Past Events</ThemedText>
        <ThemedText style={[styles.subtitle, { color: themeColors.subtleText }]}>
          Reuse details from events you&apos;ve organized
        </ThemedText>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={tintColor} />
        </View>
      )}

      {/* Horizontal carousel */}
      {!loading && events.length > 0 && (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          accessibilityLabel="Past events carousel"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xl,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.lineHeights.normal,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
});
