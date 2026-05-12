import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, Typography, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';

export interface UpcomingEventsListItemProps {
  event: FormattedEventListItem;
  userLanguage?: string;
}

export default function UpcomingEventsListItem({ event }: UpcomingEventsListItemProps) {
  const { getSubMunicipalityName } = usePostalCodes();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const cityLabel =
    event.postal_code && event.country
      ? getSubMunicipalityName(String(event.postal_code), event.country)
      : '';

  return (
    <TouchableOpacity onPress={() => router.push(`/event/${event.id}` as any)} activeOpacity={0.7}>
      <ThemedView style={[styles.cardContainer, { borderColor: themeColors.cardBorder }]}>
        {/* Top Row: Image + Info */}
        <View style={styles.topRow}>
          <View style={styles.imageWrapper}>
            <Image
              source={event.image || require('@/assets/images/event-image-default.png')}
              placeholder={require('@/assets/images/event-image-default.png')}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              style={styles.eventImage}
            />
          </View>

          <View style={styles.infoContainer}>
            <ThemedText style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
              {event.title}
            </ThemedText>

            <ThemedText style={[styles.eventDate, { color: themeColors.tint }]}>
              {event.start_time}
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

        {/* Bottom Row: Badges */}
        <View style={[styles.bottomRow, { borderTopColor: themeColors.cardBorder }]}>
          <View style={[styles.badge, { backgroundColor: themeColors.badgeBg }]}>
            <IconSymbol name="eye" size={IconSizes.xs} color={themeColors.subtleText} />
            <ThemedText style={[styles.badgeText, { color: themeColors.subtleText }]}>
              {event.view_count} {t('events.views')}
            </ThemedText>
          </View>

          {event.help_needed && (
            <View style={[styles.helpBadge, { backgroundColor: themeColors.warningBg }]}>
              <IconSymbol name="hand.raised.fill" size={IconSizes.xs} color={themeColors.warning} />
              <ThemedText style={[styles.helpBadgeText, { color: themeColors.warning }]}>
                {t('events.helpWanted')}
              </ThemedText>
            </View>
          )}

          {event.categories && event.categories.length > 0 && (
            <View style={[styles.categoryBadge, { backgroundColor: themeColors.categoryBadgeBg }]}>
              <ThemedText style={[styles.categoryBadgeText, { color: themeColors.tint }]}>
                {t(`categories.${event.categories[0].toLowerCase()}`)}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  badgeText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xs,
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
});
