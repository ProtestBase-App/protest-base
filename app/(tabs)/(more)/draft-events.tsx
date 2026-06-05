import React, { useCallback, useRef } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useGlobalContext } from '@/context/GlobalProvider';
import { getDraftEvents } from '@/services/event.service';
import { usePaginatedEvents } from '@/hooks/usePaginatedEvents';
import DraftEventsListItem from '@/components/DraftEventsListItem';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Spacing, IconSizes, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';

export default function DraftEventsScreen() {
  const { isLogged, loading: authLoading, userLanguage } = useGlobalContext();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const hasMountedRef = useRef(false);

  const {
    events: drafts,
    loading,
    refreshing,
    loadingMore,
    error,
    handleRefresh,
    handleEndReached,
  } = usePaginatedEvents<Event, Event>({
    fetchFn: async (pageSize, offset, organizationIds) => {
      if (organizationIds.length === 0) {
        return { events: [], total: 0, limit: pageSize, offset };
      }
      const response = await getDraftEvents(organizationIds[0], { limit: pageSize, offset });
      return { events: response.events, total: response.total, limit: pageSize, offset };
    },
    // Newest drafts first; no date-based sort since drafts may have no start_time.
    formatFn: (events) =>
      [...events].sort(
        (a, b) => new Date(b.$createdAt ?? 0).getTime() - new Date(a.$createdAt ?? 0).getTime()
      ),
    pageSize: 10,
  });

  // Refetch on focus so a published/deleted draft drops off when returning here.
  useFocusEffect(
    useCallback(() => {
      if (hasMountedRef.current) {
        handleRefresh();
      } else {
        hasMountedRef.current = true;
      }
    }, [handleRefresh])
  );

  const renderItem = useCallback(
    ({ item }: { item: Event }) => <DraftEventsListItem event={item} userLanguage={userLanguage} />,
    [userLanguage]
  );

  const keyExtractor = useCallback((item: Event) => item.$id, []);

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
        <IconSymbol
          name="square.and.pencil"
          size={IconSizes['3xl']}
          color={themeColors.subtleText}
        />
        <ThemedText style={[styles.emptyText, { color: themeColors.subtleText }]}>
          {t('more.draftEventsEmpty')}
        </ThemedText>
      </View>
    ),
    [themeColors.subtleText]
  );

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (authLoading || loading) {
    return (
      <ThemedView style={styles.wrapper}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
          <LoadingState />
        </SafeAreaView>
      </ThemedView>
    );
  }

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
          data={drafts}
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
