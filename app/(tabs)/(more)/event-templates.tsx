import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import TemplateActionsMenu from '@/components/TemplateActionsMenu';
import TemplatePastEventRow from '@/components/TemplatePastEventRow';
import {
  TemplateLaunchTile,
  TemplateMenuAnchor,
  TemplateNewTile,
  TemplatePlaceholderTile,
} from '@/components/TemplateTiles';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { GroupLabelRow } from '@/components/ui/GroupLabelRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { usePastEvents } from '@/context/PastEventsProvider';
import { useTemplates } from '@/context/TemplatesProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ParsedEventTemplate, PastEventForTemplate } from '@/types/template.types';
import { getEditedAgoParts, sortDraftsByLastEdited } from '@/utils/draftStatusUtils';
import { t } from '@/utils/i18n';
import { extractTemplateData, formatPastEventDate } from '@/utils/templateUtils';
import { getThemeColors } from '@/utils/themeColors';

/** How many past events the reuse section offers (matches the old carousel). */
const PAST_EVENTS_SHOWN = 10;

/** Backend caps template names at 100 chars; reserve room for the copy suffix. */
const TEMPLATE_NAME_MAX = 100;
const DUPLICATE_SUFFIX_RESERVE = 12;

type GridItem =
  | { kind: 'new'; key: string }
  | { kind: 'placeholder'; key: string }
  | { kind: 'spacer'; key: string }
  | { kind: 'template'; key: string; template: ParsedEventTemplate };

export default function EventTemplatesScreen() {
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    refreshTemplates,
    addTemplate,
    removeTemplate,
    isStale: isTemplatesStale,
  } = useTemplates();
  const {
    pastEvents,
    loading: pastEventsLoading,
    refreshPastEvents,
    isStale: isPastEventsStale,
  } = usePastEvents();
  const { userOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const [refreshing, setRefreshing] = useState(false);
  const [menuFor, setMenuFor] = useState<{
    template: ParsedEventTemplate;
    anchor: TemplateMenuAnchor;
  } | null>(null);
  // One template/use mutation at a time; ref twin guards Alert callbacks.
  const [usingEventId, setUsingEventId] = useState<string | null>(null);
  const mutationBusyRef = useRef(false);
  // Recency labels re-anchor whenever the screen refreshes.
  const [now, setNow] = useState(() => new Date());

  // Only refresh stale caches when the screen gains focus (5-minute TTL).
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      if (isTemplatesStale()) {
        refreshTemplates();
      }
      if (isPastEventsStale()) {
        refreshPastEvents();
      }
    }, [isTemplatesStale, isPastEventsStale, refreshTemplates, refreshPastEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setNow(new Date());
    try {
      await Promise.all([refreshTemplates(), refreshPastEvents()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshTemplates, refreshPastEvents]);

  // Design rule: templates sorted by last used. The backend has no usage
  // tracking yet, so last edited is the closest available recency signal.
  const gridItems = useMemo((): GridItem[] => {
    const sorted = sortDraftsByLastEdited(templates);
    const items: GridItem[] = [{ kind: 'new', key: 'new-template' }];
    if (sorted.length === 0) {
      items.push({ kind: 'placeholder', key: 'placeholder' });
    } else {
      items.push(
        ...sorted.map((template) => ({
          kind: 'template' as const,
          key: template.$id,
          template,
        }))
      );
    }
    // Keep the last tile half-width when the count is odd.
    if (items.length % 2 === 1) {
      items.push({ kind: 'spacer', key: 'spacer' });
    }
    return items;
  }, [templates]);

  const formattedPastEvents: PastEventForTemplate[] = useMemo(() => {
    return pastEvents.slice(0, PAST_EVENTS_SHOWN).map((event) => ({
      $id: event.$id,
      title: event.title,
      formattedDate: formatPastEventDate(event.start_time),
      city: event.city,
      firstCategory: event.categories?.[0],
      organizationId: event.organization_id,
      templateData: extractTemplateData(event),
      images: event.images?.length ? event.images : undefined,
    }));
  }, [pastEvents]);

  const fallbackOrganizationId = userOrganizations[0]?.$id;

  const handleLaunchTemplate = useCallback((template: ParsedEventTemplate) => {
    router.push({
      pathname: Routes.CREATE_EVENT,
      params: { templateId: template.$id, source: 'template' },
    });
  }, []);

  const handleCreateTemplate = useCallback(() => {
    router.push(Routes.CREATE_TEMPLATE);
  }, []);

  const handleOpenMenu = useCallback(
    (template: ParsedEventTemplate, anchor: TemplateMenuAnchor) => {
      setMenuFor({ template, anchor });
    },
    []
  );

  const handleMenuEdit = useCallback(() => {
    if (!menuFor) return;
    setMenuFor(null);
    router.push(DynamicRoutes.editTemplate(menuFor.template.$id));
  }, [menuFor]);

  const handleMenuDuplicate = useCallback(async () => {
    if (!menuFor || mutationBusyRef.current) return;
    const { template } = menuFor;
    setMenuFor(null);

    const organizationId = template.event_data.organization_id ?? fallbackOrganizationId;
    if (!organizationId) {
      Alert.alert(t('common.error'), t('templates.loadError'));
      return;
    }

    // Trim the base name so "{name} (copy)" stays under the backend's 100-char
    // cap (which would otherwise reject the duplicate outright).
    const baseName =
      template.name.length > TEMPLATE_NAME_MAX - DUPLICATE_SUFFIX_RESERVE
        ? template.name.slice(0, TEMPLATE_NAME_MAX - DUPLICATE_SUFFIX_RESERVE).trimEnd()
        : template.name;

    mutationBusyRef.current = true;
    try {
      await addTemplate({
        organization_id: organizationId,
        name: t('templates.copySuffix', { name: baseName }),
        description: template.description,
        event_data: template.event_data,
        image_urls: template.image_urls ?? [],
      });
    } catch (err) {
      Alert.alert(t('common.error'), (err as Error).message);
    } finally {
      mutationBusyRef.current = false;
    }
  }, [menuFor, fallbackOrganizationId, addTemplate]);

  const handleMenuDelete = useCallback(() => {
    if (!menuFor) return;
    const { template } = menuFor;
    setMenuFor(null);
    Alert.alert(t('templates.deleteTemplate'), t('templates.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (mutationBusyRef.current) return;
          mutationBusyRef.current = true;
          try {
            await removeTemplate(template.$id);
          } catch (err) {
            Alert.alert(t('common.error'), (err as Error).message);
          } finally {
            mutationBusyRef.current = false;
          }
        },
      },
    ]);
  }, [menuFor, removeTemplate]);

  // Design rule: using a past event creates a template from it automatically,
  // then opens Create Event pre-filled from that template.
  const handleUsePastEvent = useCallback(
    async (event: PastEventForTemplate) => {
      if (mutationBusyRef.current) return;
      // Attribute the auto-created template to the source event's own org.
      const organizationId =
        event.organizationId ?? event.templateData.organization_id ?? fallbackOrganizationId;
      if (!organizationId) {
        Alert.alert(t('common.error'), t('templates.loadError'));
        return;
      }

      mutationBusyRef.current = true;
      setUsingEventId(event.$id);
      try {
        const created = await addTemplate({
          organization_id: organizationId,
          name: event.title,
          event_data: event.templateData,
          image_urls: event.images ?? [],
        });
        router.push({
          pathname: Routes.CREATE_EVENT,
          params: { templateId: created.$id, source: 'template' },
        });
      } catch (err) {
        Alert.alert(t('common.error'), (err as Error).message);
      } finally {
        mutationBusyRef.current = false;
        setUsingEventId(null);
      }
    },
    [fallbackOrganizationId, addTemplate]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      switch (item.kind) {
        case 'new':
          return <TemplateNewTile onPress={handleCreateTemplate} />;
        case 'placeholder':
          return <TemplatePlaceholderTile />;
        case 'spacer':
          return <View style={styles.spacer} />;
        case 'template': {
          const editedParts = getEditedAgoParts(item.template, now);
          return (
            <TemplateLaunchTile
              template={item.template}
              editedLabel={editedParts ? t(editedParts.key, { count: editedParts.count }) : ''}
              onLaunch={() => handleLaunchTemplate(item.template)}
              onOpenMenu={(anchor) => handleOpenMenu(item.template, anchor)}
              disabled={usingEventId !== null}
            />
          );
        }
      }
    },
    [handleCreateTemplate, handleLaunchTemplate, handleOpenMenu, now, usingEventId]
  );

  const renderFooter = useCallback(() => {
    const hasTemplates = templates.length > 0;
    const showPast = formattedPastEvents.length > 0;
    return (
      <View>
        {showPast && (
          <GroupLabelRow
            label={hasTemplates ? t('templates.reusePastEvent') : t('templates.orReusePastEvent')}
          />
        )}
        {showPast &&
          formattedPastEvents.map((event) => (
            <TemplatePastEventRow
              key={event.$id}
              event={event}
              onUse={() => handleUsePastEvent(event)}
              using={usingEventId === event.$id}
              disabled={usingEventId !== null}
            />
          ))}
        {/* "Tap a template…" once templates exist; the past-event hint when
            there are only past events; nothing when there's neither. */}
        {(hasTemplates || showPast) && (
          <ThemedText style={[styles.hint, { color: themeColors.subtleText }]}>
            {hasTemplates ? t('templates.hintDefault') : t('templates.hintEmpty')}
          </ThemedText>
        )}
      </View>
    );
  }, [templates.length, formattedPastEvents, usingEventId, handleUsePastEvent, themeColors]);

  const showLoading = templatesLoading && templates.length === 0;
  const showError = !showLoading && !!templatesError && templates.length === 0;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.container}>
          <BrandHeader title={t('more.templates')} subtitle={t('templates.subtitle')} />

          {showLoading ? (
            <LoadingState accessibilityLabel={t('templates.loadingTemplates')} />
          ) : showError ? (
            <View style={styles.errorContainer}>
              <ErrorState message={templatesError || t('templates.loadError')} />
              <PillButton
                label={t('common.tryAgain')}
                onPress={refreshTemplates}
                style={styles.retryButton}
              />
            </View>
          ) : (
            <FlatList
              data={gridItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={themeColors.tint}
                />
              }
              ListFooterComponent={renderFooter}
              extraData={pastEventsLoading}
            />
          )}

          <TemplateActionsMenu
            visible={menuFor !== null}
            anchor={menuFor?.anchor ?? null}
            onClose={() => setMenuFor(null)}
            onEdit={handleMenuEdit}
            onDuplicate={handleMenuDuplicate}
            onDelete={handleMenuDelete}
          />
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
  gridRow: {
    gap: 10,
    paddingHorizontal: Spacing.lg,
  },
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing['3xl'] + Spacing.bottomTabOffset,
    rowGap: 10,
  },
  spacer: {
    flex: 1,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: 44,
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
  },
});
