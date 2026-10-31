import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import TemplatePastEventRow from '@/components/TemplatePastEventRow';
import { TemplateLaunchTile } from '@/components/TemplateTiles';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GroupLabelRow } from '@/components/ui/GroupLabelRow';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { Routes } from '@/constants/Routes';
import { useGlobalContext } from '@/context/GlobalProvider';
import { usePastEvents } from '@/context/PastEventsProvider';
import { useTemplates } from '@/context/TemplatesProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getEventDraft } from '@/services/localStorageService';
import type { FormState } from '@/types/eventForm.types';
import type { ParsedEventTemplate, PastEventForTemplate } from '@/types/template.types';
import { getEditedAgoParts, sortDraftsByLastEdited } from '@/utils/draftStatusUtils';
import { confirmReplaceDraft } from '@/utils/eventDraftGuard';
import { t } from '@/utils/i18n';
import { toPastEventForTemplate } from '@/utils/templateUtils';
import { getThemeColors } from '@/utils/themeColors';

const TEMPLATES_SHOWN = 4;
const PAST_EVENTS_SHOWN = 3;
const ACCENT_BORDER = 'rgba(249, 68, 96, 0.35)';

type LocalDraft = { formData: FormState; savedAt: number };

interface OptionRowProps {
  title: string;
  subtitle: string;
  icon: IconSymbolName;
  onPress: () => void;
  testID?: string;
}

function OptionRow({ title, subtitle, icon, onPress, testID }: OptionRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionRow,
        { borderBottomColor: themeColors.border },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      testID={testID}
    >
      <View style={[styles.iconCircle, { backgroundColor: themeColors.categoryBadgeBg }]}>
        <IconSymbol name={icon} size={IconSizes.lg} color={themeColors.tint} />
      </View>
      <View style={styles.textContent}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={[styles.optionSubtitle, { color: themeColors.secondaryText }]}>
          {subtitle}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.forward" size={IconSizes.sm} color={themeColors.chevron} />
    </Pressable>
  );
}

interface ResumeRowProps {
  draft: LocalDraft;
  onPress: () => void;
}

function ResumeRow({ draft, onPress }: ResumeRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const title = draft.formData.title?.trim() || t('createEventOptions.untitled');
  const edited = getEditedAgoParts(
    { $updatedAt: new Date(draft.savedAt).toISOString() },
    new Date()
  );
  const detail = edited
    ? `${t('createEventOptions.unfinished')} · ${t(edited.key, { count: edited.count })}`
    : t('createEventOptions.unfinished');
  const cover = draft.formData.images?.[0];
  const coverUri = typeof cover === 'string' ? cover : cover?.uri;

  return (
    <Pressable
      testID="btn-resume-draft"
      style={({ pressed }) => [
        styles.resumeRow,
        { backgroundColor: themeColors.cardBackground, borderColor: ACCENT_BORDER },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityHint={t('a11y.hints.resumeDraft')}
    >
      {coverUri ? (
        <Image accessibilityIgnoresInvertColors source={{ uri: coverUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: themeColors.categoryBadgeBg }]}>
          <IconSymbol name="pencil" size={IconSizes.md} color={themeColors.tint} />
        </View>
      )}
      <View style={styles.textContent}>
        <ThemedText style={styles.optionTitle} numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.optionSubtitle, { color: themeColors.secondaryText }]}>
          {detail}
        </ThemedText>
      </View>
      <ThemedText style={[styles.resumeAction, { color: themeColors.tint }]}>
        {t('createEventOptions.resume')}
      </ThemedText>
    </Pressable>
  );
}

export default function CreateEventOptionsScreen() {
  const colorScheme = useColorScheme();
  const { userLanguage } = useGlobalContext();
  const themeColors = getThemeColors(colorScheme);
  const { templates, isStale: isTemplatesStale, refreshTemplates } = useTemplates();
  const { pastEvents, isStale: isPastEventsStale, refreshPastEvents } = usePastEvents();
  const [draft, setDraft] = useState<LocalDraft | null>(null);

  useFocusEffect(
    useCallback(() => {
      getEventDraft().then(setDraft);
      if (isTemplatesStale()) refreshTemplates();
      if (isPastEventsStale()) refreshPastEvents();
    }, [isTemplatesStale, isPastEventsStale, refreshTemplates, refreshPastEvents])
  );

  const recentTemplates = useMemo(
    () => sortDraftsByLastEdited(templates).slice(0, TEMPLATES_SHOWN),
    [templates]
  );
  const recentPastEvents = useMemo(
    () =>
      pastEvents
        .slice(0, PAST_EVENTS_SHOWN)
        .map((event) => toPastEventForTemplate(event, userLanguage)),
    [pastEvents, userLanguage]
  );

  const openForm = (params: Record<string, string>) => {
    router.push({ pathname: Routes.CREATE_EVENT, params });
  };

  const handleResume = () => openForm({ resume: '1', source: 'resume' });

  const handleCreateFromScratch = () => {
    confirmReplaceDraft(() => openForm({ source: 'scratch' }));
  };

  const handleLaunchTemplate = (template: ParsedEventTemplate) => {
    confirmReplaceDraft(() => openForm({ templateId: template.$id, source: 'template' }));
  };

  const handleUsePastEvent = (event: PastEventForTemplate) => {
    confirmReplaceDraft(() => openForm({ fromEventId: event.$id, source: 'past' }));
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          {draft && <ResumeRow draft={draft} onPress={handleResume} />}

          <GroupLabelRow label={t('createEventOptions.startGroup')} />
          <View
            style={[
              styles.optionsCard,
              { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
            ]}
          >
            <OptionRow
              testID="btn-create-from-scratch"
              title={t('createEventOptions.blankTitle')}
              subtitle={t('createEventOptions.blankSubtitle')}
              icon="plus.circle"
              onPress={handleCreateFromScratch}
            />
            <OptionRow
              testID="btn-use-template"
              title={t('createEventOptions.templateTitle')}
              subtitle={t('createEventOptions.templateSubtitle')}
              icon="doc.on.doc"
              onPress={() => router.push(Routes.EVENT_TEMPLATES)}
            />
          </View>

          {recentTemplates.length > 0 && (
            <>
              <GroupLabelRow label={t('createEventOptions.templatesGroup')} />
              <View style={styles.tileGrid}>
                {recentTemplates.map((template) => (
                  <View key={template.$id} style={styles.tileCell}>
                    <TemplateLaunchTile
                      template={template}
                      editedLabel=""
                      onLaunch={() => handleLaunchTemplate(template)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {recentPastEvents.length > 0 && (
            <>
              <GroupLabelRow label={t('templates.reusePastEvent')} />
              {recentPastEvents.map((event) => (
                <TemplatePastEventRow
                  key={event.$id}
                  event={event}
                  onUse={() => handleUsePastEvent(event)}
                />
              ))}
            </>
          )}
        </ScrollView>
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
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  pressed: {
    opacity: 0.7,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeAction: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  optionsCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  optionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.lg,
  },
  tileCell: {
    width: '48.5%',
  },
});
