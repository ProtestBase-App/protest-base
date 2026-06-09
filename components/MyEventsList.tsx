import React, { useEffect } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EmptyEventMyEvents from '@/components/EmptyEventMyEvents';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

interface EventListProps {
  events: FormattedEventListItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
  headerTitle?: string;
  ListEmptyComponent?: React.ReactNode;
  loading?: boolean;
  userLanguage: string;
}

const MyEventsList: React.FC<EventListProps> = ({
  events,
  refreshing,
  onRefresh,
  headerTitle,
  loading,
  userLanguage,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { getSubMunicipalityName, loadPostalCodesForCountry, cacheVersion } = usePostalCodes();

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
    // cacheVersion triggers re-renders when postal codes load
    const cityLabel =
      item.postal_code && item.country
        ? getSubMunicipalityName(String(item.postal_code), item.country, item.city)
        : '';

    return (
      <TouchableOpacity
        onPress={() => {
          const newPath = `/event/${item.id}`;
          router.push(`${newPath}` as any);
        }}
      >
        <ThemedView style={styles.eventItem}>
          <ThemedView style={styles.eventInfo}>
            <ThemedText style={[styles.eventTime, { color: themeColors.tint }]}>
              {item.start_time}
            </ThemedText>
            <ThemedText style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </ThemedText>
            <ThemedText style={styles.eventDescription} numberOfLines={1} ellipsizeMode="tail">
              {item.description || ' '}
            </ThemedText>
            <ThemedText style={styles.eventCity}>{cityLabel}</ThemedText>
          </ThemedView>

          <Image
            source={item.image || require('../assets/images/event-image-default.png')}
            placeholder={require('../assets/images/event-image-default.png')}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            style={styles.eventImage}
          />
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <ThemedView style={styles.headerContainer}>
      <ThemedText type="subtitleBold" style={styles.headerTitle}>
        {headerTitle}
      </ThemedText>
    </ThemedView>
  );

  return (
    <FlatList
      data={events}
      keyExtractor={(item, index) => item.$id || `${index}-${item.start_time}`}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={!loading ? EmptyEventMyEvents : null}
      ListHeaderComponent={headerTitle ? renderListHeader : null}
      extraData={cacheVersion} // Force re-render when postal codes load
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {},
  headerContainer: {
    paddingLeft: 4,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    marginBottom: 10,
  },
  eventItem: {
    flexDirection: 'row',
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  eventInfo: {
    padding: 4,
    justifyContent: 'center',
    width: '65%',
  },
  eventTime: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.sm,
    marginBottom: 2,
  },
  eventTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.lg,
  },
  eventDescription: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xxs,
  },
  eventCity: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  eventImage: {
    width: '32%',
    height: '100%',
    marginLeft: 4,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyEventsList;
