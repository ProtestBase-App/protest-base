import React from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

interface EventListCardProps {
  item: FormattedEventListItem;
  onShare?: (eventId: string) => void;
}

const EventListCardComponent: React.FC<EventListCardProps> = ({ item, onShare }) => {
  const { getSubMunicipalityName } = usePostalCodes();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const cityLabel =
    item.postal_code && item.country
      ? getSubMunicipalityName(String(item.postal_code), item.country)
      : '';

  return (
    <Pressable
      onPress={() => {
        const newPath = `/event/${item.id}`;
        logger.debug(`[EventListCard] Navigating to event details`, { eventId: item.id });
        router.push(`${newPath}` as any);
      }}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <ThemedView style={[styles.cardContainer, { borderColor: themeColors.cardBorder }]}>
        <View style={styles.topRow}>
          <View style={styles.imageWrapper}>
            <Image
              source={item.image || require('../assets/images/event-image-default.png')}
              placeholder={require('../assets/images/event-image-default.png')}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              style={styles.eventImage}
            />
          </View>

          <View style={styles.infoContainer}>
            <ThemedText style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </ThemedText>

            <ThemedText style={[styles.eventDate, { color: themeColors.tint }]}>
              {item.start_time}
            </ThemedText>

            {cityLabel && (
              <View style={styles.locationRow}>
                <IconSymbol
                  name="location.fill"
                  size={IconSizes.xs}
                  color={themeColors.subtleText}
                />
                <ThemedText
                  style={[styles.locationText, { color: themeColors.subtleText }]}
                  numberOfLines={1}
                >
                  {cityLabel}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.bottomRow, { borderTopColor: themeColors.cardBorder }]}>
          <View style={styles.badgesContainer}>
            {item.help_needed && (
              <View style={[styles.helpBadge, { backgroundColor: themeColors.warningBg }]}>
                <IconSymbol
                  name="hand.raised.fill"
                  size={IconSizes.xs}
                  color={themeColors.warning}
                />
                <ThemedText style={[styles.helpBadgeText, { color: themeColors.warning }]}>
                  {t('events.helpWanted')}
                </ThemedText>
              </View>
            )}

            {item.categories && item.categories.length > 0 && (
              <View
                style={[styles.categoryBadge, { backgroundColor: themeColors.categoryBadgeBg }]}
              >
                <ThemedText style={[styles.categoryBadgeText, { color: themeColors.tint }]}>
                  {t(`categories.${item.categories[0].toLowerCase()}`)}
                </ThemedText>
              </View>
            )}
          </View>

          {onShare && (
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: themeColors.shareButtonBg },
                pressed && { opacity: 0.6 },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onShare(item.id);
              }}
              accessibilityRole="button"
              accessibilityLabel="Share event"
            >
              <IconSymbol name="square.and.arrow.up" size={IconSizes.sm} color={themeColors.icon} />
            </Pressable>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
};

export const EventListCard = React.memo(EventListCardComponent);

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'column',
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
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
  topRow: {
    flexDirection: 'row',
  },
  imageWrapper: {
    width: 100,
    height: 100,
    overflow: 'hidden',
  },
  eventImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  eventTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.relaxed,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  helpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  helpBadgeText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  categoryBadgeText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  shareButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});

export default EventListCard;
