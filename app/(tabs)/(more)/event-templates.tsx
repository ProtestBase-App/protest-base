import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import EmptyTemplateState from '@/components/EmptyTemplateState';
import TemplateList from '@/components/TemplateList';
import PastEventsCarousel from '@/components/PastEventsCarousel';
import CustomButton from '@/components/CustomButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTemplates } from '@/context/TemplatesProvider';
import { usePastEvents } from '@/context/PastEventsProvider';
import { ParsedEventTemplate, PastEventForTemplate } from '@/types/template.types';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { extractTemplateData, formatPastEventDate } from '@/utils/templateUtils';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { t } from '@/utils/i18n';

type ScreenState = 'loading' | 'error' | 'empty' | 'success';

interface SelectionModeEmptyStateProps {
  onGoBack: () => void;
  onCreateTemplate: () => void;
}

function SelectionModeEmptyState({ onGoBack, onCreateTemplate }: SelectionModeEmptyStateProps) {
  const iconContainerBg = useThemeColor({ light: '#F3F4F6', dark: '#27272A' }, 'background');
  const iconColor = useThemeColor({ light: '#9CA3AF', dark: '#71717A' }, 'icon');
  const subtitleColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#D1D5DB', dark: '#3F3F46' }, 'background');

  return (
    <ThemedView style={[selectionEmptyStyles.container, { borderColor }]}>
      <View style={[selectionEmptyStyles.iconContainer, { backgroundColor: iconContainerBg }]}>
        <IconSymbol name="rectangle.stack" size={IconSizes['2xl']} color={iconColor} />
      </View>

      <ThemedText type="subtitleBold" style={selectionEmptyStyles.title}>
        {t('templates.noTemplatesAvailable')}
      </ThemedText>

      <ThemedText type="default" style={[selectionEmptyStyles.subtitle, { color: subtitleColor }]}>
        {t('templates.selectionEmptyDescription')}
      </ThemedText>

      <CustomButton
        testID="btn-create-template"
        title={t('templates.createNewTemplate')}
        handlePress={onCreateTemplate}
        containerStyles={selectionEmptyStyles.primaryButton}
        isLoading={false}
      />

      <CustomButton
        title={t('common.goBack')}
        handlePress={onGoBack}
        containerStyles={[
          selectionEmptyStyles.secondaryButton,
          { backgroundColor: 'transparent', borderWidth: 1, borderColor: borderColor },
        ]}
        textStyles={{ color: subtitleColor }}
        isLoading={false}
      />
    </ThemedView>
  );
}

const selectionEmptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    marginVertical: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    opacity: 0.9,
  },
  primaryButton: {
    minWidth: 260,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    minWidth: 260,
  },
});

export default function EventTemplatesScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isSelectionMode = params.mode === 'selection';

  // Use cached providers instead of direct API calls
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    refreshTemplates,
    isStale: isTemplatesStale,
  } = useTemplates();

  const {
    pastEvents,
    loading: pastEventsLoading,
    refreshPastEvents,
    isStale: isPastEventsStale,
  } = usePastEvents();

  const [refreshing, setRefreshing] = useState(false);

  // Derive screen state from provider states
  const screenState: ScreenState = useMemo(() => {
    if (templatesLoading && templates.length === 0) return 'loading';
    if (templatesError && templates.length === 0) return 'error';
    if (templates.length === 0) return 'empty';
    return 'success';
  }, [templatesLoading, templatesError, templates.length]);

  // Format past events for the carousel (derived from cached data)
  const formattedPastEvents: PastEventForTemplate[] = useMemo(() => {
    return pastEvents.slice(0, 10).map((event) => ({
      $id: event.$id,
      title: event.title,
      formattedDate: formatPastEventDate(event.start_time),
      city: event.city,
      firstCategory: event.categories?.[0],
      templateData: extractTemplateData(event),
    }));
  }, [pastEvents]);

  // Only refresh if cache is stale when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if cache is stale (older than 5 minutes)
      if (isTemplatesStale()) {
        refreshTemplates();
      }
      if (!isSelectionMode && isPastEventsStale()) {
        refreshPastEvents();
      }
    }, [isTemplatesStale, isPastEventsStale, refreshTemplates, refreshPastEvents, isSelectionMode])
  );

  const handleRetry = () => {
    refreshTemplates();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshTemplates(),
        !isSelectionMode ? refreshPastEvents() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTemplate = () => {
    router.push(Routes.CREATE_TEMPLATE);
  };

  const handleSelectPastEvent = useCallback((event: PastEventForTemplate) => {
    router.push({
      pathname: Routes.CREATE_TEMPLATE,
      params: {
        sourceEventData: JSON.stringify(event.templateData),
        sourceEventId: event.$id,
        suggestedName: `Template: ${event.title}`,
      },
    });
  }, []);

  // Footer component for past events carousel
  const renderFooter = useCallback(() => {
    if (isSelectionMode) return null;
    if (formattedPastEvents.length === 0 && !pastEventsLoading) return null;

    return (
      <PastEventsCarousel
        events={formattedPastEvents}
        onSelectEvent={handleSelectPastEvent}
        loading={pastEventsLoading}
      />
    );
  }, [isSelectionMode, formattedPastEvents, pastEventsLoading, handleSelectPastEvent]);

  const handleTemplatePress = (template: ParsedEventTemplate) => {
    if (isSelectionMode) {
      // In selection mode, navigate to create event with template ID
      router.push({
        pathname: Routes.CREATE_EVENT,
        params: {
          templateId: template.$id,
          source: 'template',
        },
      });
    } else {
      // In management mode, navigate to edit template screen
      router.push(DynamicRoutes.editTemplate(template.$id));
    }
  };

  const renderContent = () => {
    switch (screenState) {
      case 'loading':
        return <LoadingState accessibilityLabel={t('templates.loadingTemplates')} />;

      case 'error':
        return (
          <ThemedView style={styles.errorContainer}>
            <ErrorState message={templatesError || t('templates.loadError')} />
            <CustomButton
              title={t('common.tryAgain')}
              handlePress={handleRetry}
              isLoading={false}
              containerStyles={styles.retryButton}
            />
          </ThemedView>
        );

      case 'empty':
        if (isSelectionMode) {
          // Show simpler empty state in selection mode with back navigation
          return (
            <SelectionModeEmptyState
              onGoBack={() => router.back()}
              onCreateTemplate={() => {
                router.push(Routes.CREATE_TEMPLATE);
              }}
            />
          );
        }
        return (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <EmptyTemplateState
              onCreateTemplate={handleCreateTemplate}
              showFromPastEvent={formattedPastEvents.length > 0}
            />
            {renderFooter()}
          </ScrollView>
        );

      case 'success':
        return (
          <TemplateList
            templates={templates}
            onTemplatePress={handleTemplatePress}
            onCreateTemplate={handleCreateTemplate}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListFooterComponent={renderFooter()}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.wrapper} lightColor="#FFFFFF">
      {/* Dynamic header title based on mode */}
      <Stack.Screen
        options={{
          headerTitle: isSelectionMode ? t('templates.chooseTemplate') : t('templates.title'),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedView style={styles.container} lightColor="#FFFFFF">
          {renderContent()}
        </ThemedView>
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
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  retryButton: {
    marginTop: Spacing.xl,
    minWidth: 150,
    marginBottom: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Spacing['3xl'],
  },
});
