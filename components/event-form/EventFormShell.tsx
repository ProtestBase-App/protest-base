import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  COVER_HEIGHT,
  EventFormPage,
  type EventFormPageProps,
} from '@/components/event-form/EventFormPage';
import { PhotosSurface } from '@/components/event-form/PhotosSurface';
import { PublishCheckSurface } from '@/components/event-form/PublishCheckSurface';
import { RepeatSurface } from '@/components/event-form/RepeatSurface';
import { WhenSurface } from '@/components/event-form/WhenSurface';
import { WhereSurface } from '@/components/event-form/WhereSurface';
import { FormScreenScaffold } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEventImages } from '@/hooks/useEventImages';
import { useEventLocation } from '@/hooks/useEventLocation';
import { useReturnFocus } from '@/hooks/useOverlayFocus';
import type { SavedPin } from '@/types/eventForm.types';
import { stillNeededFields } from '@/utils/eventFormValidation';
import { formPin, repeatSummary, whenSummary, whereSummary } from '@/utils/eventWhen';
import { isRepeating } from '@/utils/recurrence';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export type EventFormSurface = 'when' | 'where' | 'photos' | 'repeat';

type PassedToPage = Pick<
  EventFormPageProps,
  | 'kind'
  | 'form'
  | 'setForm'
  | 'validation'
  | 'heading'
  | 'byline'
  | 'intro'
  | 'closeLabel'
  | 'closeTestID'
  | 'coverActions'
  | 'whenPrompt'
  | 'highlightWhen'
  | 'scrollViewRef'
>;

export interface EventFormShellProps extends PassedToPage {
  userLanguage: string;
  /** Back and the close button, unless a surface is open. True keeps the screen. */
  onBack: () => boolean;
  /** The action buttons of the footer. */
  footer: ReactNode;
  inSheet?: boolean;
  /** Ignores touches while the form is being sent. */
  busy?: boolean;
  isAllDay?: boolean;
  /** Offer Repeat. Only a new event can have a rule. */
  showRepeat?: boolean;
  savedPin?: SavedPin | null;
  publishCheck?: { open: boolean; onConfirm: () => void; onClose: () => void };
}

/**
 * The event and template forms. Owns the only back listener, because Android runs the
 * newest one first and the screens would otherwise win over an open surface.
 */
export function EventFormShell({
  kind,
  form,
  setForm,
  validation,
  heading,
  byline,
  intro,
  closeLabel,
  closeTestID,
  coverActions,
  whenPrompt,
  highlightWhen,
  scrollViewRef,
  userLanguage,
  onBack,
  footer,
  inSheet = false,
  busy = false,
  isAllDay = false,
  showRepeat = false,
  savedPin = null,
  publishCheck,
}: EventFormShellProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const location = useEventLocation({ form, setForm, userLanguage });
  const images = useEventImages({ form, setForm });
  const [surface, setSurface] = useState<EventFormSurface | null>(null);
  const { top } = useSafeAreaInsets();
  // An iOS sheet starts below the status bar.
  const statusBarHeight = inSheet && Platform.OS === 'ios' ? 0 : top;
  const [pastCover, setPastCover] = useState(false);

  const backRef = useRef({ surface, onBack, busy, publishCheck });
  useEffect(() => {
    backRef.current = { surface, onBack, busy, publishCheck };
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const latest = backRef.current;
      if (latest.busy) return true;
      if (latest.publishCheck?.open) {
        latest.publishCheck.onClose();
        return true;
      }
      if (latest.surface) {
        setSurface(null);
        return true;
      }
      return latest.onBack();
    });
    return () => subscription.remove();
  }, []);

  const publishCheckOpen = !!publishCheck?.open;
  useEffect(() => {
    if (surface || publishCheckOpen) Keyboard.dismiss();
  }, [surface, publishCheckOpen]);

  const whenRowRef = useRef<ViewInstance>(null);
  const whereRowRef = useRef<ViewInstance>(null);
  const photosRef = useRef<ViewInstance>(null);
  useReturnFocus(publishCheckOpen ? 'publish' : surface, (closed) =>
    closed === 'where' ? whereRowRef : closed === 'photos' ? photosRef : whenRowRef
  );

  const closeSurface = () => setSurface(null);
  const repeat = showRepeat && isRepeating(form.repeat) ? form.repeat : null;
  const rule = repeat ? repeatSummary(repeat) : null;
  const when = rule ?? whenSummary(form, userLanguage, isAllDay);
  const missing = stillNeededFields(form, kind, repeat).map((name) =>
    t(`createEvent.neededFields.${name}`)
  );

  return (
    <ThemedView style={styles.wrapper}>
      <View
        style={styles.wrapper}
        aria-hidden={surface !== null || publishCheckOpen}
        pointerEvents={busy ? 'none' : 'auto'}
      >
        <FormScreenScaffold
          scrollViewRef={scrollViewRef}
          inSheet={inSheet}
          edges={['left', 'right']}
          onScroll={(event) =>
            setPastCover(event.nativeEvent.contentOffset.y > COVER_HEIGHT - statusBarHeight)
          }
          footer={
            <ThemedView style={[styles.footer, { borderTopColor: themeColors.border }]}>
              {missing.length > 0 && (
                <ThemedText style={[styles.stillNeeded, { color: themeColors.secondaryText }]}>
                  {t('createEvent.stillNeeded', { fields: missing.join(', ') })}
                </ThemedText>
              )}
              <View style={styles.actions}>{footer}</View>
            </ThemedView>
          }
        >
          <EventFormPage
            kind={kind}
            form={form}
            setForm={setForm}
            validation={validation}
            images={images}
            isDark={isDark}
            inSheet={inSheet}
            heading={heading}
            byline={byline}
            intro={intro}
            closeLabel={closeLabel}
            closeTestID={closeTestID}
            coverActions={coverActions}
            when={when}
            whenPrompt={whenPrompt}
            highlightWhen={highlightWhen}
            onClose={onBack}
            onOpenWhen={() => setSurface(repeat ? 'repeat' : 'when')}
            onOpenWhere={() => setSurface('where')}
            onOpenPhotos={() => setSurface('photos')}
            whenRowRef={whenRowRef}
            whereRowRef={whereRowRef}
            photosRef={photosRef}
            scrollViewRef={scrollViewRef}
          />
        </FormScreenScaffold>
        {pastCover && statusBarHeight > 0 && (
          <ThemedView
            pointerEvents="none"
            style={[styles.statusBar, { height: statusBarHeight }]}
            testID="form-status-bar"
          />
        )}
      </View>

      {surface === 'when' && (
        <WhenSurface
          form={form}
          setForm={setForm}
          errors={validation.errors}
          userLanguage={userLanguage}
          isDark={isDark}
          isAllDay={isAllDay}
          inSheet={inSheet}
          canClearEnd={kind === 'create'}
          onOpenRepeat={showRepeat ? () => setSurface('repeat') : undefined}
          onClose={closeSurface}
        />
      )}
      {surface === 'repeat' && (
        <RepeatSurface
          form={form}
          setForm={setForm}
          errors={validation.errors}
          userLanguage={userLanguage}
          inSheet={inSheet}
          onClose={() => setSurface(repeat ? null : 'when')}
        />
      )}
      {surface === 'where' && (
        <WhereSurface
          form={form}
          setForm={setForm}
          location={location}
          userLanguage={userLanguage}
          isDark={isDark}
          inSheet={inSheet}
          savedPin={savedPin}
          onClose={closeSurface}
        />
      )}
      {surface === 'photos' && (
        <PhotosSurface
          form={form}
          images={images}
          isTemplateMode={kind === 'template'}
          isDark={isDark}
          inSheet={inSheet}
          onClose={closeSurface}
        />
      )}
      {publishCheck?.open && (
        <PublishCheckSurface
          when={rule ?? whenSummary(form, userLanguage, isAllDay, true)}
          where={whereSummary(form)}
          pin={formPin(form, savedPin)}
          statusBarHeight={statusBarHeight}
          inSheet={inSheet}
          onConfirm={publishCheck.onConfirm}
          onClose={publishCheck.onClose}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footer: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  stillNeeded: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
