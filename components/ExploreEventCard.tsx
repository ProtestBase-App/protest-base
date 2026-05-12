import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { formatEventDateTime } from '@/utils/eventFormatters';
import { getEffectiveEndTime } from '@/utils/eventStatus';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';

export interface ExploreEventCardProps {
  event: Event;
  isSaved: boolean;
  /**
   * Toggle the saved state. `endsAt` is the event's effective end time in ms,
   * passed through so SavedEventsProvider can store an accurate retention
   * deadline even when the event isn't already in the global cache.
   */
  onSave: (eventId: string, endsAt: number) => void;
  onShare: (eventId: string) => void;
  userLanguage: string;
  cityLabel: string;
}

function ExploreEventCard({
  event,
  isSaved,
  onSave,
  onShare,
  userLanguage,
  cityLabel,
}: ExploreEventCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const themeColors = getThemeColors(colorScheme);

  const handleCardPress = () => {
    router.push(`/event/${event.$id}` as any);
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.title}, ${formatEventDateTime(
        event.start_time,
        userLanguage
      )}`}
    >
      <ThemedView style={[styles.card, { borderColor: themeColors.cardBorder }]}>
        <Image
          source={event.image || require('../assets/images/event-image-default.png')}
          placeholder={require('../assets/images/event-image-default.png')}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          style={styles.image}
        />

        <ThemedView style={styles.content}>
          {event.categories && event.categories.length > 0 && (
            <ThemedView style={styles.categoryContainer}>
              {event.categories.map((category, index) => (
                <ThemedView
                  key={index}
                  style={[styles.categoryBadge, { backgroundColor: colors.tint }]}
                >
                  <ThemedText
                    type="categoryBadge"
                    style={styles.categoryText}
                    accessibilityRole="text"
                    accessibilityLabel={`Category: ${t(`categories.${category.toLowerCase()}`)}`}
                  >
                    {t(`categories.${category.toLowerCase()}`)}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          <ThemedText
            type="cardTitle"
            style={{ color: colors.text }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {event.title}
          </ThemedText>

          <ThemedView style={styles.metadataRow}>
            <IconSymbol name="calendar" size={16} color={colors.icon} />
            <ThemedText type="cardMetadata" style={{ color: colors.text }}>
              {formatEventDateTime(event.start_time, userLanguage)}
            </ThemedText>
          </ThemedView>

          {cityLabel && (
            <ThemedView style={styles.metadataRow}>
              <IconSymbol name="map" size={16} color={colors.icon} />
              <ThemedText type="cardMetadata" style={{ color: colors.text }}>
                {cityLabel}, {event.postal_code}
              </ThemedText>
            </ThemedView>
          )}

          {event.help_needed && (
            <ThemedView style={styles.metadataRow}>
              <IconSymbol name="person.2" size={16} color={colors.icon} />
              <ThemedText type="cardMetadata" style={{ color: colors.text }}>
                {t('createEvent.helpNeeded')}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.toolbar}>
          <ThemedView style={styles.toolbarGroup}>
            <Pressable
              style={[
                styles.saveButton,
                isSaved
                  ? { backgroundColor: colors.tint }
                  : { borderColor: themeColors.cardBorder, borderWidth: 1 },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onSave(event.$id, getEffectiveEndTime(event).getTime());
              }}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? t('events.unsave') : t('events.save')}
              accessibilityState={{ selected: isSaved }}
            >
              <IconSymbol
                name={isSaved ? 'bookmark.fill' : 'bookmark'}
                size={20}
                color={isSaved ? '#FFFFFF' : colors.icon}
              />
              <ThemedText
                type="toolbarButton"
                style={{ color: isSaved ? '#FFFFFF' : colors.text, marginLeft: 8 }}
              >
                {isSaved ? t('events.saved') : t('events.save')}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <Pressable
            style={[styles.shareButton, { borderColor: themeColors.cardBorder, borderWidth: 1 }]}
            onPress={(e) => {
              e.stopPropagation();
              onShare(event.$id);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('events.share')}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.icon} />
            <ThemedText type="toolbarButton" style={{ color: colors.text, marginLeft: 8 }}>
              {t('events.share')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 4,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
    overflow: 'hidden',
    ...Shadows.card.ios,
    elevation: Shadows.card.android.elevation,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  content: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 10,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    color: '#FFF',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    minHeight: 44,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 24,
    minHeight: 44,
  },
});

export default memo(ExploreEventCard, (prevProps, nextProps) => {
  return (
    prevProps.event.$id === nextProps.event.$id &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.userLanguage === nextProps.userLanguage &&
    prevProps.cityLabel === nextProps.cityLabel
  );
});
