import React, { useCallback, useRef } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useGlobalContext } from '@/context/GlobalProvider';
import { getOrganizationUpcomingEvents } from '@/services/event.service';
import { formatEventForList, FormattedEventListItem } from '@/utils/eventFormatters';
import { IconSymbol } from '@/components/ui/IconSymbol';
import UpcomingEventsListItem from '@/components/UpcomingEventsListItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, IconSizes, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';

export default function UpcomingEventsScreen() {
  const { isLogged, loading: authLoading, userLanguage } = useGlobalContext();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasMountedRef = useRef(false);

  const {
    events: upcomingEvents,
    loading,
    refreshing,
    loadingMore,
    error,
    handleRefresh,
    handleEndReached,
  } = usePaginatedEvents<Event, FormattedEventListItem>({
    fetchFn: async (pageSize, offset, organizationIds) => {
      const today = new Date().toISOString();
      if (organizationIds.length === 0) {
        return { events: [], total: 0, limit: pageSize, offset };
      }
      const response = await getOrganizationUpcomingEvents(organizationIds[0], {
        startDate: today,
        limit: pageSize,
        offset,
      });
      return { events: response.events, total: response.total, limit: pageSize, offset };
    },
    formatFn: (events) => {
      const formatted = events.map((event) => formatEventForList(event));
      // Sort by start time ASC (soonest first)
      return formatted.sort(
        (a, b) => new Date(a.startDateNoFormat).getTime() - new Date(b.startDateNoFormat).getTime()
      );
    },
    pageSize: 10,
  });

  // Refetch when screen gains focus (e.g., after deleting an event)
  useFocusEffect(
    useCallback(() => {
      if (hasMountedRef.current) {
        handleRefresh();
      } else {
        hasMountedRef.current = true;
      }
    }, [handleRefresh])
  );

  // Render item for FlatList
  const renderItem = useCallback(
    ({ item }: { item: FormattedEventListItem }) => (
      <UpcomingEventsListItem event={item} userLanguage={userLanguage} />
    ),
    [userLanguage]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: FormattedEventListItem) => item.id || item.$id, []);

  // Footer component showing loading indicator when loading more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={themeColors.tint} />
      </View>
    );
  }, [loadingMore, themeColors.tint]);

  // Empty component
  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <IconSymbol name="calendar" size={IconSizes['3xl']} color={themeColors.subtleText} />
        <ThemedText style={[styles.emptyText, { color: themeColors.subtleText }]}>
          {t('myEvents.emptyUpcoming')}
        </ThemedText>
      </View>
    ),
    [themeColors.subtleText]
  );

  // Redirect if not logged in
  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  // Initial loading state
  if (authLoading || loading) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <LoadingState />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Error state
  if (error) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <ErrorState message={error} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={upcomingEvents}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.tint}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing['3xl'] + Spacing.bottomTabOffset,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
