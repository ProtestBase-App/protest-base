import React, { useEffect } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EmptyEventMyEvents from '@/components/EmptyEventMyEvents';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

interface UpcomingEventsListProps {
  events: FormattedEventListItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
  headerTitle?: string;
  headerSubtitle?: string;
  loading?: boolean;
  userLanguage: string;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const UpcomingEventsList: React.FC<UpcomingEventsListProps> = ({
  events,
  refreshing,
  onRefresh,
  headerTitle,
  headerSubtitle,
  loading,
  userLanguage,
  ListEmptyComponent,
}) => {
  const { getSubMunicipalityName, loadPostalCodesForCountry, cacheVersion } = usePostalCodes();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  // Load postal codes for all unique countries in the events list
  useEffect(() => {
    const uniqueCountries = [...new Set(events.map((event) => event.country).filter(Boolean))];
    uniqueCountries.forEach((country) => {
      if (country) {
        loadPostalCodesForCountry(country);
      }
    });
  }, [events, loadPostalCodesForCountry]);

  const renderItem = ({ item }: { item: FormattedEventListItem }) => {
    // Get city name from postal code using context
    const cityLabel =
      item.postal_code && item.country
        ? getSubMunicipalityName(String(item.postal_code), item.country)
        : '';

    return (
      <TouchableOpacity
        onPress={() => {
          const newPath = `/event/${item.id}`;
          router.push(`${newPath}` as any);
        }}
        activeOpacity={0.7}
      >
        <ThemedView style={[styles.cardContainer, { borderColor: themeColors.cardBorder }]}>
          {/* Left: Image Container with proper overflow handling */}
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

          {/* Right: Content */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <ThemedText style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </ThemedText>

            {/* Date - Accent Color */}
            <ThemedText style={[styles.eventDate, { color: themeColors.tint }]}>
              {item.start_time}
            </ThemedText>

            {/* Location */}
            {cityLabel && (
              <View style={styles.locationRow}>
                <IconSymbol name="location.fill" size={12} color={themeColors.subtleText} />
                <ThemedText
                  style={[styles.locationText, { color: themeColors.subtleText }]}
                  numberOfLines={1}
                >
                  {cityLabel}
                </ThemedText>
              </View>
            )}

            {/* Badges Row - Organizer Dashboard Info */}
            <View style={styles.badgesRow}>
              {/* View Count Badge */}
              <View style={[styles.badge, { backgroundColor: themeColors.badgeBg }]}>
                <IconSymbol name="eye" size={12} color={themeColors.subtleText} />
                <ThemedText style={[styles.badgeText, { color: themeColors.subtleText }]}>
                  {item.view_count}
                </ThemedText>
              </View>

              {/* Help Needed Badge - CRITICAL for organizers */}
              {item.help_needed && (
                <View style={[styles.helpBadge, { backgroundColor: themeColors.warningBg }]}>
                  <IconSymbol name="hand.raised.fill" size={12} color={themeColors.warning} />
                  <ThemedText style={[styles.helpBadgeText, { color: themeColors.warning }]}>
                    Help Wanted
                  </ThemedText>
                </View>
              )}

              {/* Primary Category Badge */}
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
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <SectionHeader title={headerTitle || ''} subtitle={headerSubtitle} />
  );

  return (
    <FlatList
      data={events}
      keyExtractor={(item, index) => item.$id || `${index}-${item.start_time}`}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={!loading ? ListEmptyComponent ?? EmptyEventMyEvents : null}
      ListHeaderComponent={headerTitle ? renderListHeader : null}
      extraData={cacheVersion}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 16,
  },
  cardContainer: {
    flexDirection: 'row',
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageWrapper: {
    width: 100,
    height: 120,
    overflow: 'hidden',
  },
  eventImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.base,
    lineHeight: 21,
    marginBottom: 4,
  },
  eventDate: {
    fontFamily: Typography.families.semiBold,
    fontSize: 13,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: {
    fontFamily: Typography.families.medium,
    fontSize: 11,
  },
  helpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  helpBadgeText: {
    fontFamily: Typography.families.semiBold,
    fontSize: 11,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default UpcomingEventsList;
