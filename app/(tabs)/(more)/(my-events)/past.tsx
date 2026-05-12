import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useGlobalContext } from '@/context/GlobalProvider';
import { usePastEvents } from '@/context/PastEventsProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { getOrganizationPastEvents } from '@/services/event.service';
import PastEventSummaryCard, { PastEventSummaryItem } from '@/components/PastEventSummaryCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, IconSizes, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';

export default function PastEventsScreen() {
  const { isLogged, loading: authLoading } = useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  const {
    pastEvents: cachedPastEvents,
    pastEventsTotal,
    loading: providerLoading,
    error: providerError,
    refreshPastEvents,
  } = usePastEvents();

  // Local state for paginating beyond the cache.
  const [additionalEvents, setAdditionalEvents] = useState<PastEventSummaryItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const formattedCachedEvents: PastEventSummaryItem[] = useMemo(() => {
    return cachedPastEvents.map((event) => ({
      id: event.$id,
      title: event.title,
      startDateNoFormat: event.start_time.split('T')[0],
      view_count: event.view_count ?? 0,
    }));
  }, [cachedPastEvents]);

  const allEvents = useMemo(() => {
    const seenIds = new Set(formattedCachedEvents.map((e) => e.id));
    const uniqueAdditional = additionalEvents.filter((e) => !seenIds.has(e.id));
    return [...formattedCachedEvents, ...uniqueAdditional];
  }, [formattedCachedEvents, additionalEvents]);

  const handleEndReached = useCallback(async () => {
    if (loadingMore || !hasMore || organizationIds.length === 0) return;

    if (allEvents.length >= pastEventsTotal) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      const offset = allEvents.length;

      const response = await getOrganizationPastEvents(organizationIds[0], {
        limit: 20,
        offset,
      });
      const uniqueEvents = response.events;

      if (uniqueEvents.length === 0) {
        setHasMore(false);
      } else {
        const formatted: PastEventSummaryItem[] = uniqueEvents.map((event) => ({
          id: event.$id,
          title: event.title,
          startDateNoFormat: event.start_time.split('T')[0],
          view_count: event.view_count ?? 0,
        }));
        setAdditionalEvents((prev) => [...prev, ...formatted]);

        if (allEvents.length + uniqueEvents.length >= pastEventsTotal) {
          setHasMore(false);
        }
      }
    } catch (err) {
      logger.error('Error loading more past events:', { error: err });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, organizationIds, allEvents.length, pastEventsTotal]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPastEvents();
      setAdditionalEvents([]);
      setHasMore(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPastEvents]);

  const renderItem = useCallback(
    ({ item }: { item: PastEventSummaryItem }) => <PastEventSummaryCard event={item} />,
    []
  );

  const keyExtractor = useCallback((item: PastEventSummaryItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={themeColors.tint} />
      </View>
    );
  }, [loadingMore, themeColors.tint]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <IconSymbol name="calendar" size={IconSizes['3xl']} color={themeColors.subtleText} />
        <ThemedText style={[styles.emptyText, { color: themeColors.subtleText }]}>
          {t('myEvents.emptyPast')}
        </ThemedText>
      </View>
    ),
    [themeColors.subtleText]
  );

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  // Show the full loader only when the cache is empty.
  if (authLoading || (providerLoading && cachedPastEvents.length === 0)) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <LoadingState />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (providerError && cachedPastEvents.length === 0) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <ErrorState message={providerError} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={allEvents}
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
