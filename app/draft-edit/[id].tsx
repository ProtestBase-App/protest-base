import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Platform,
  Alert,
  View,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  getDraftEventPreview,
  patchEvent,
  publishDraft,
  deleteEvent,
  EventIncompleteError,
} from '@/services/event.service';
import CustomButton from '@/components/CustomButton';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import EventForm from '@/components/EventForm';
import type { FormState } from '@/types/eventForm.types';
import type { UpdateEventRequest } from '@/types/event.types';
import { Routes, DynamicRoutes } from '@/constants/Routes';
import { getThemeColors } from '@/utils/themeColors';
import { getPublishIssues, publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { logger } from '@/utils/logger';
import { t } from '@/utils/i18n';

// Matches common URL patterns, with or without protocol/www.
const URL_REGEX =
  /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

export default function DraftEdit() {
  const { user, isLogged, userLanguage, refetchEvents, refreshUserEventCounts } =
    useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [form, setForm] = useState<FormState>({
    organization_id: '',
    title: '',
    description: '',
    images: [],
    street_address: '',
    city: '',
    region: '',
    country: '',
    start_time: '',
    end_time: '',
    organizer_name: user?.name || '',
    website_url: '',
    categories: '',
    disclaimer: '',
    postal_code: null,
    co_organizers: [],
    help_needed: false,
    help_description: '',
    geocod_lat: null,
    geocod_lng: null,
  });

  const [emptyFields] = useState({
    title: false,
    start_time: false,
    description: false,
    help_description: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);

  // Load the draft via the preview endpoint (the public GET 404s on drafts) and
  // map the raw Event directly into form state. We deliberately avoid
  // formatEventForDisplay, which assumes a non-empty start_time and would crash
  // on an incomplete draft.
  useEffect(() => {
    const loadDraft = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const event = await getDraftEventPreview(eventId);
        setForm((prev) => ({
          ...prev,
          organization_id: event.organization_id || '',
          title: event.title || '',
          description: event.description || '',
          // Raw Event (not formatEventForDisplay) — heal pre-multi-image
          // responses by surfacing the legacy single image as slot 0.
          images: event.images?.length ? event.images : event.image ? [event.image] : [],
          street_address: event.street_address || '',
          city: event.city || '',
          region: event.region || '',
          country: event.country || '',
          start_time: event.start_time || '',
          end_time: event.end_time || '',
          website_url: event.website_url || '',
          categories: event.categories?.[0] ?? '',
          disclaimer: event.disclaimer || '',
          postal_code: typeof event.postal_code === 'number' ? event.postal_code : null,
          co_organizers: event.co_organizers || [],
          help_needed: event.help_needed || false,
          help_description: event.help_description || '',
        }));
      } catch (error) {
        logger.warn('Failed to load draft for editing', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
        Alert.alert(t('common.error'), (error as Error).message);
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [eventId]);

  // Build the partial update payload from the current form (empty optionals omitted).
  const buildDraftPatch = useCallback((): UpdateEventRequest => {
    const finalCoOrganizers = form.co_organizers?.length ? form.co_organizers : undefined;
    return {
      title: form.title || undefined,
      description: form.description || undefined,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      street_address: form.street_address || undefined,
      city: form.city || undefined,
      region: form.region || undefined,
      country: form.country || undefined,
      postal_code: form.postal_code || undefined,
      // Re-picking the street this session adopts the confirmed pin (e.g. setting
      // it on an automation draft that had none); omitted when not re-picked.
      geocod_lat: form.geocod_lat ?? undefined,
      geocod_lng: form.geocod_lng ?? undefined,
      // Authoritative full ordered list (kept URLs + new files); an emptied
      // list is an explicit removal of every image.
      images: form.images.length ? form.images : null,
      website_url: form.website_url || undefined,
      categories: form.categories,
      disclaimer: form.disclaimer || undefined,
      co_organizers: finalCoOrganizers,
      help_needed: form.help_needed,
      help_description: form.help_needed ? form.help_description || undefined : undefined,
    };
  }, [form]);

  const validateLight = (): boolean => {
    if (form.start_time && form.end_time && form.end_time < form.start_time) {
      Alert.alert(t('common.error'), t('eventEdit.invalidTimeRangeError'));
      return false;
    }
    if (form.website_url && form.website_url.trim() && !URL_REGEX.test(form.website_url.trim())) {
      Alert.alert(t('common.error'), t('createEvent.invalidUrlFormat'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateLight()) return;
    setActionBusy(true);
    try {
      await patchEvent(eventId, buildDraftPatch());
      Alert.alert(t('common.success'), t('drafts.savedConfirmation'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!validateLight()) return;

    // Client-side readiness — reports every problem at once and blocks the
    // past-date publish that the backend would otherwise allow.
    const issues = getPublishIssues({
      description: form.description,
      categories: form.categories,
      city: form.city,
      street_address: form.street_address,
      start_time: form.start_time,
    });
    if (issues.length > 0) {
      Alert.alert(t('drafts.publishIssuesTitle'), issues.map((i) => t(i.messageKey)).join('\n'));
      return;
    }

    setActionBusy(true);
    try {
      // Persist the latest edits first so the server publishes what the user sees.
      await patchEvent(eventId, buildDraftPatch());
      await publishDraft(eventId);
    } catch (error) {
      // patch or publish failed — the draft is NOT published; keep the editor.
      if (error instanceof EventIncompleteError) {
        const messages = error.fields.length
          ? error.fields.map((field) => t(publishFieldToMessageKey(field)))
          : [t('drafts.issueIncomplete')];
        Alert.alert(t('drafts.publishIssuesTitle'), messages.join('\n'));
      } else {
        Alert.alert(t('common.error'), (error as Error).message);
      }
      setActionBusy(false);
      return;
    }

    // Published successfully. The cache/count refresh is best-effort — a failure
    // here must NOT strand the user on an already-published draft, so it runs
    // fire-and-forget rather than inside the publish try/catch (mirrors event/[id]).
    const orgIds = userOrganizations.map((org) => org.$id);
    refetchEvents().catch((refreshErr) =>
      logger.warn('Global events refresh failed after publish', {
        error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
      })
    );
    refreshUserEventCounts(orgIds).catch((refreshErr) =>
      logger.warn('Event counts refresh failed after publish', {
        error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
      })
    );

    // The event is now public — route to its detail page (works for both
    // 'active' and 'past' results).
    router.replace(DynamicRoutes.event(eventId, { isCreated: true }));
    Alert.alert(t('common.success'), t('drafts.published'));
  };

  const handleDelete = () => {
    Alert.alert(t('drafts.deleteConfirmTitle'), t('drafts.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('drafts.delete'),
        style: 'destructive',
        onPress: async () => {
          setActionBusy(true);
          try {
            await deleteEvent(eventId);
            // Keep the draft badge count in sync after removing a draft.
            const orgIds = userOrganizations.map((org) => org.$id);
            refreshUserEventCounts(orgIds).catch((refreshErr) =>
              logger.warn('Event counts refresh failed after draft delete', {
                error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
              })
            );
            router.replace(Routes.DRAFT_EVENTS);
            Alert.alert(t('common.success'), t('drafts.deleted'));
          } catch (error) {
            Alert.alert(t('common.error'), (error as Error).message);
          } finally {
            setActionBusy(false);
          }
        },
      },
    ]);
  };

  if (!user && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  if (loading || actionBusy) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={false}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.headerRow}>
              <ThemedText type="title" style={styles.titleText}>
                {t('drafts.editTitle')}
              </ThemedText>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={t('drafts.delete')}
                  accessibilityRole="button"
                  testID="btn-draft-delete"
                >
                  <IconSymbol name="trash" size={24} color={themeColors.destructive} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={t('common.close')}
                  accessibilityRole="button"
                >
                  <IconSymbol name="xmark" size={24} color={themeColors.icon} />
                </TouchableOpacity>
              </View>
            </ThemedView>

            <EventForm
              form={form}
              setForm={setForm}
              emptyFields={emptyFields}
              userLanguage={userLanguage}
              scrollViewRef={scrollViewRef}
            />
          </ThemedView>
        </ScrollView>

        <ThemedView style={styles.footerWrapper}>
          <SafeAreaView style={styles.footerSafeArea} edges={['bottom']}>
            <ThemedView style={styles.footer}>
              <CustomButton
                testID="btn-draft-save"
                title={t('drafts.save')}
                handlePress={handleSave}
                containerStyles={styles.buttonSecondary}
                isLoading={actionBusy}
              />

              <CustomButton
                testID="btn-draft-publish"
                title={t('drafts.publish')}
                handlePress={handlePublish}
                containerStyles={styles.buttonPrimary}
                isLoading={actionBusy}
              />
            </ThemedView>
          </SafeAreaView>
        </ThemedView>
      </KeyboardAvoidingView>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },
  container: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
  },
  titleText: {
    flex: 1,
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondary: {
    marginVertical: 16,
    width: '45%',
    minHeight: 10,
    height: '80%',
    marginLeft: 4,
    backgroundColor: '#687076',
  },
  buttonPrimary: {
    marginVertical: 16,
    width: '45%',
    minHeight: 10,
    height: '80%',
    marginRight: 4,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerSafeArea: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
