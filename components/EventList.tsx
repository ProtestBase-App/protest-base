import React, { useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EmptyEvent from '@/components/EmptyEvent';
import EventListCard from '@/components/EventListCard';
import { FormattedEventListItem } from '@/utils/eventFormatters';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { usePreloadPostalCodes } from '@/hooks/usePreloadPostalCodes';
import { Spacing } from '@/constants/DesignTokens';
import { logger } from '@/utils/logger';

interface EventListProps {
  events: FormattedEventListItem[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onShare?: (eventId: string) => void;
  headerTitle?: string;
  ListEmptyComponent?: React.ReactElement | null;
  loading?: boolean;
  userLanguage: string;
}

const EventList: React.FC<EventListProps> = ({
  events,
  refreshing,
  onRefresh,
  onShare,
  headerTitle,
  ListEmptyComponent,
  loading,
}) => {
  useEffect(() => {
    logger.debug('[EventList] Component Mounted', {
      eventCount: events.length,
      headerTitle,
      loading,
    });
  }, [events.length, headerTitle, loading]);

  const { cacheVersion } = usePostalCodes();
  usePreloadPostalCodes(events);

  const renderItem = ({ item }: { item: FormattedEventListItem }) => (
    <EventListCard item={item} onShare={onShare} />
  );

  const renderListHeader = () => (
    <ThemedView style={styles.headerContainer}>
      <ThemedText type="subtitleBold" accessibilityRole="header" style={styles.headerTitle}>
        {headerTitle}
      </ThemedText>
    </ThemedView>
  );

  return (
    <FlatList
      data={events}
      keyExtractor={(item, index) => item.$id || `${index}-${item.start_time}`}
      renderItem={renderItem}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      initialNumToRender={10}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={!loading ? ListEmptyComponent ?? EmptyEvent : null}
      ListHeaderComponent={headerTitle ? renderListHeader : null}
      extraData={cacheVersion}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {},
  headerContainer: {
    paddingLeft: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  headerTitle: {},
});

export default EventList;
