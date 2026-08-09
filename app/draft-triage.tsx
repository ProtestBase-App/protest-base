import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import TriageCard from '@/components/TriageCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PUBLISH_PILL_TEXT } from '@/components/ui/ActionPill';
import { LoadingState } from '@/components/ui/LoadingState';
import { Toast } from '@/components/ui/Toast';
import { API_LIMITS } from '@/constants/ApiConfig';
import { BorderRadius, Spacing, Typography } from '@/constants/DesignTokens';
import { DynamicRoutes, Routes } from '@/constants/Routes';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  deleteEvent,
  EventIncompleteError,
  EventNotDraftError,
  getDraftEventsForOrganizations,
  patchEvent,
  publishDraft,
} from '@/services/event.service';
import { Event } from '@/types/event.types';
import { hexAlpha } from '@/utils/colorAlpha';
import { getDraftStatus, getRescheduleOptions, sortDrafts } from '@/utils/draftStatusUtils';
import { publishFieldToMessageKey } from '@/utils/eventPublishReadiness';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { getThemeColors } from '@/utils/themeColors';
import {
  createTriageState,
  currentDraft,
  decidedCount,
  isQueueCleared,
  summarizeDecisions,
  triageReducer,
} from '@/utils/triageQueue';

/** How long the user has to undo a delete before it is sent. */
const UNDO_WINDOW_MS = 5000;
/** Card exit animation. */
const EXIT_MS = 220;

export default function DraftTriageScreen() {
  const {
    isLogged,
    loading: authLoading,
    userLanguage,
    refetchEvents,
    refreshUserEventCounts,
  } = useGlobalContext();
  const { userOrganizations } = useUserOrganizations();
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [state, dispatch] = useReducer(triageReducer, createTriageState([]));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const draft = currentDraft(state);
  const cleared = !loading && isQueueCleared(state);
  const decided = decidedCount(state);
  const summary = useMemo(() => summarizeDecisions(state), [state]);

  // Render-stable clock: the status of every card is derived from one instant so
  // a card can't change kind mid-session.
  const nowRef = useRef(new Date());
  const status = draft ? getDraftStatus(draft, nowRef.current) : null;

  const rescheduleOptions = useMemo(
    () =>
      draft && status?.kind === 'pastDate'
        ? getRescheduleOptions(draft.start_time, userLanguage, nowRef.current)
        : [],
    [draft, status?.kind, userLanguage]
  );

  // --- Queue snapshot ------------------------------------------------------
  const organizationIds = useMemo(
    () => userOrganizations.map((org) => org.$id),
    [userOrganizations]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (organizationIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const response = await getDraftEventsForOrganizations(organizationIds, {
          limit: API_LIMITS.EVENTS_MAX,
        });
        if (cancelled) return;
        // The queue is the backlog: drafts that need a decision. Ready drafts are
        // handled in one tap from the list and would only pad the deck.
        const queue = sortDrafts(response.events, 'lastEdited').filter(
          (event) => getDraftStatus(event, nowRef.current).kind !== 'ready'
        );
        dispatch({ type: 'init', queue });
      } catch (err) {
        if (cancelled) return;
        logger.warn('[Triage] Could not load the queue', {
          error: err instanceof Error ? err.message : String(err),
        });
        Alert.alert(t('common.error'), (err as Error).message);
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [organizationIds]);

  // --- Deferred delete ----------------------------------------------------
  // The DELETE call is held for the undo window. It must never die with the
  // screen, so the timer is mirrored into a ref that exit paths can flush.
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteIdRef = useRef<string | null>(null);

  const sendDelete = useCallback(async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (err) {
      logger.warn('[Triage] Deferred delete failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const flushPendingDelete = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    const id = pendingDeleteIdRef.current;
    pendingDeleteIdRef.current = null;
    if (id) {
      // Fire and forget: the user has left this decision behind.
      sendDelete(id);
      dispatch({ type: 'clearPendingDelete' });
    }
  }, [sendDelete]);

  // Flush on unmount — leaving the screen commits a delete whose window ran out.
  useEffect(() => flushPendingDelete, [flushPendingDelete]);

  // --- Exit / refresh -----------------------------------------------------
  const exitTriage = useCallback(() => {
    flushPendingDelete();
    // One refresh for the whole session, not one per decision.
    if (decided > 0) {
      refetchEvents().catch(() => {});
      refreshUserEventCounts(organizationIds).catch(() => {});
    }
    router.back();
  }, [flushPendingDelete, decided, refetchEvents, refreshUserEventCounts, organizationIds]);

  // --- Card animation -----------------------------------------------------
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextScale = useSharedValue(0.96);

  const resetCard = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    nextScale.value = 0.96;
  }, [translateX, translateY, nextScale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-screenWidth, screenWidth], [-8, 8])}deg` },
    ],
  }));

  const publishStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0.4 * 0.3 * screenWidth, 0.3 * screenWidth],
      [0, 1],
      'clamp'
    ),
  }));

  const deleteStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-0.3 * screenWidth, -0.4 * 0.3 * screenWidth],
      [1, 0],
      'clamp'
    ),
  }));

  const nextCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

  // Pending commit for the card currently sliding out. Tracked so unmount can
  // cancel it instead of dispatching into a dead component.
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    },
    []
  );

  /**
   * Slide the card off, then run the decision.
   *
   * The decision is committed by a plain timeout, NOT by the animation's
   * completion callback. A publish has already hit the network by this point, so
   * an interrupted or dropped animation callback would lose the decision while
   * the server had already acted — the card would sit there as if nothing
   * happened. The animation is presentation; the timeout is the contract.
   */
  const animateOut = useCallback(
    (direction: 'left' | 'right' | 'up', after: () => void) => {
      const target =
        direction === 'up'
          ? { x: 0, y: -1.4 * screenHeight }
          : { x: direction === 'right' ? 1.4 * screenWidth : -1.4 * screenWidth, y: 0 };

      const timing = { duration: EXIT_MS, easing: Easing.out(Easing.cubic) };
      nextScale.value = withTiming(1, timing);
      translateY.value = withTiming(target.y, timing);
      translateX.value = withTiming(target.x, timing);

      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        after();
      }, EXIT_MS);
    },
    [screenWidth, screenHeight, translateX, translateY, nextScale]
  );

  // --- Decisions ----------------------------------------------------------
  const handleSkip = useCallback(() => {
    if (!draft) return;
    animateOut('up', () => {
      dispatch({ type: 'decide', id: draft.$id, decision: 'skipped' });
      setCardError(null);
      resetCard();
    });
  }, [draft, animateOut, resetCard]);

  const handleDelete = useCallback(() => {
    if (!draft) return;
    // A second delete flushes the first — one pending delete at a time.
    flushPendingDelete();
    animateOut('left', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const id = draft.$id;
      dispatch({ type: 'deleteDeferred' });
      pendingDeleteIdRef.current = id;
      deleteTimerRef.current = setTimeout(() => {
        deleteTimerRef.current = null;
        flushPendingDelete();
      }, UNDO_WINDOW_MS);
      setCardError(null);
      resetCard();
    });
  }, [draft, animateOut, flushPendingDelete, resetCard]);

  const handleUndoDelete = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    pendingDeleteIdRef.current = null;
    dispatch({ type: 'undoDelete' });
  }, []);

  const handlePublish = useCallback(async () => {
    if (!draft) return;
    if (!assertOnlineOrAlert(isOffline)) return;
    if (busy) return;

    const pendingDate = state.pendingDate[draft.$id];
    setBusy(true);
    setCardError(null);

    try {
      // A rescheduled draft needs its new date persisted BEFORE publishing, or
      // the backend would publish the stale (past) date straight into `past`.
      if (pendingDate) {
        await patchEvent(draft.$id, { start_time: pendingDate });
      }
      await publishDraft(draft.$id);
    } catch (err) {
      // 409 means it is already public — the intent is satisfied, so advance
      // silently rather than making the user dismiss an alert mid-deck.
      if (!(err instanceof EventNotDraftError)) {
        if (err instanceof EventIncompleteError) {
          const messages = err.fields.length
            ? err.fields.map((field) => t(publishFieldToMessageKey(field)))
            : [t('drafts.issueIncomplete')];
          setCardError(messages.join('\n'));
        } else if ((err as { isRateLimited?: boolean })?.isRateLimited) {
          setCardError(t('errors.rateLimit.message'));
        } else {
          setCardError((err as Error).message);
        }
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    animateOut('right', () => {
      dispatch({
        type: 'decide',
        id: draft.$id,
        decision: pendingDate ? 'rescheduled' : 'published',
      });
      resetCard();
    });
  }, [draft, isOffline, busy, state.pendingDate, animateOut, resetCard]);

  // --- Gestures -----------------------------------------------------------
  const pan = useMemo(() => {
    const horizontalThreshold = 0.3 * screenWidth;
    const verticalThreshold = 0.25 * screenHeight;

    return Gesture.Pan()
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = Math.min(event.translationY, 0);
      })
      .onEnd((event) => {
        const passedRight = event.translationX > horizontalThreshold || event.velocityX > 800;
        const passedLeft = event.translationX < -horizontalThreshold || event.velocityX < -800;
        const passedUp = event.translationY < -verticalThreshold;

        if (passedRight) {
          runOnJS(handlePublish)();
        } else if (passedLeft) {
          runOnJS(handleDelete)();
        } else if (passedUp) {
          runOnJS(handleSkip)();
        } else {
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
        }
      });
  }, [screenWidth, screenHeight, translateX, translateY, handlePublish, handleDelete, handleSkip]);

  if (!authLoading && !isLogged) {
    return <Redirect href="/(tabs)/(more)/more" />;
  }

  const progress = state.total === 0 ? 0 : Math.min(decided / state.total, 1);
  const progressColor = cleared ? themeColors.live : themeColors.tint;

  return (
    <>
      <ThemedView style={[styles.wrapper, { backgroundColor: themeColors.modalBackdrop }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.topBar}>
            <Pressable
              onPress={exitTriage}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="triage-close"
            >
              <IconSymbol name="xmark" size={24} color={themeColors.secondaryText} />
            </Pressable>

            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)' },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: progressColor },
                ]}
              />
            </View>

            <ThemedText
              style={[
                styles.counter,
                { color: cleared ? themeColors.live : themeColors.secondaryText },
              ]}
            >
              {`${decided} / ${state.total}`}
            </ThemedText>
          </View>

          {loading ? (
            <LoadingState />
          ) : cleared ? (
            <View style={styles.receiptWrapper}>
              <View
                style={[
                  styles.receipt,
                  { borderColor: isDark ? 'rgba(255,255,255,0.14)' : themeColors.cardBorder },
                ]}
                testID="triage-receipt"
              >
                <View style={[styles.receiptTile, { backgroundColor: themeColors.liveBg }]}>
                  <IconSymbol name="checkmark" size={36} color={themeColors.live} />
                </View>

                <ThemedText style={styles.receiptTitle}>{t('drafts.queueClearedTitle')}</ThemedText>
                <ThemedText style={[styles.receiptHelper, { color: themeColors.secondaryText }]}>
                  {t('drafts.queueClearedHelper')}
                </ThemedText>

                <View
                  style={[
                    styles.summaryList,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : themeColors.surfaceBackground,
                    },
                  ]}
                >
                  <SummaryRow
                    icon="checkmark"
                    label={t('drafts.summaryPublished')}
                    count={summary.published}
                    color={themeColors.liveText}
                    borderColor={themeColors.cardBorder}
                  />
                  <SummaryRow
                    icon="calendar.badge.checkmark"
                    label={t('drafts.summaryRescheduled')}
                    count={summary.rescheduled}
                    color={themeColors.warning}
                    borderColor={themeColors.cardBorder}
                  />
                  <SummaryRow
                    icon="trash"
                    label={t('drafts.summaryDeleted')}
                    count={summary.deleted}
                    color={themeColors.destructive}
                    borderColor={themeColors.cardBorder}
                  />
                  <SummaryRow
                    icon="clock"
                    label={t('drafts.summarySkipped')}
                    count={summary.skipped}
                    color={themeColors.subtleText}
                    borderColor={themeColors.cardBorder}
                    isLast
                  />
                </View>

                <Pressable
                  onPress={exitTriage}
                  accessibilityRole="button"
                  accessibilityLabel={t('drafts.backToDrafts')}
                  testID="triage-back-to-drafts"
                  style={({ pressed }) => [
                    styles.receiptCta,
                    { backgroundColor: themeColors.tint, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <ThemedText style={styles.receiptCtaLabel}>{t('drafts.backToDrafts')}</ThemedText>
                </Pressable>

                {summary.skipped > 0 && (
                  <ThemedText style={[styles.receiptNote, { color: themeColors.placeholder }]}>
                    {t('drafts.reviewSkipped', { count: summary.skipped })}
                  </ThemedText>
                )}
              </View>
            </View>
          ) : draft && status ? (
            <View style={styles.deck}>
              {/* Ghost cards behind the active one, so the deck reads as a stack. */}
              <View
                style={[
                  styles.ghost,
                  styles.ghostFar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                ]}
              />
              <Animated.View
                style={[
                  styles.ghost,
                  styles.ghostNear,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                  nextCardStyle,
                ]}
              />

              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.activeCard, cardStyle]}>
                  <TriageCard
                    event={draft}
                    status={status}
                    userLanguage={userLanguage}
                    now={nowRef.current}
                    rescheduleOptions={rescheduleOptions}
                    pendingDate={state.pendingDate[draft.$id]}
                    onPickDate={(isoDate) => dispatch({ type: 'setDate', id: draft.$id, isoDate })}
                    onOpenDatePicker={() => setDatePickerOpen(true)}
                    onOpenEditor={() => router.push(DynamicRoutes.draftEdit(draft.$id))}
                    errorMessage={cardError}
                  />

                  {/* Stamps live INSIDE the card being acted on, never against
                      the screen, so it is unambiguous what they apply to. */}
                  <Animated.View
                    style={[
                      styles.stamp,
                      styles.stampPublish,
                      {
                        borderColor: themeColors.live,
                        backgroundColor: hexAlpha(themeColors.live, 0.18),
                      },
                      publishStampStyle,
                    ]}
                    pointerEvents="none"
                  >
                    <ThemedText style={[styles.stampLabel, { color: themeColors.live }]}>
                      {t('drafts.publish')}
                    </ThemedText>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.stamp,
                      styles.stampDelete,
                      {
                        borderColor: themeColors.destructive,
                        backgroundColor: hexAlpha(themeColors.destructive, 0.18),
                      },
                      deleteStampStyle,
                    ]}
                    pointerEvents="none"
                  >
                    <ThemedText style={[styles.stampLabel, { color: themeColors.destructive }]}>
                      {t('drafts.delete')}
                    </ThemedText>
                  </Animated.View>
                </Animated.View>
              </GestureDetector>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleDelete}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('drafts.delete')}
                  testID="triage-delete"
                  style={({ pressed }) => [
                    styles.circleButton,
                    {
                      backgroundColor: hexAlpha(themeColors.destructive, 0.14),
                      borderColor: hexAlpha(themeColors.destructive, 0.4),
                      opacity: pressed || busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="trash" size={26} color={themeColors.destructive} />
                </Pressable>

                <Pressable
                  onPress={handleSkip}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('drafts.triageSkipHint')}
                  testID="triage-skip"
                  style={styles.skipColumn}
                >
                  <IconSymbol name="chevron.up" size={22} color={themeColors.placeholder} />
                  <ThemedText style={[styles.skipHint, { color: themeColors.placeholder }]}>
                    {t('drafts.triageSkipHint')}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handlePublish}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('drafts.publish')}
                  testID="triage-publish"
                  style={({ pressed }) => [
                    styles.circleButton,
                    styles.publishCircle,
                    {
                      backgroundColor: themeColors.live,
                      shadowColor: themeColors.live,
                      opacity: pressed || busy ? 0.6 : 1,
                    },
                  ]}
                >
                  <IconSymbol name="checkmark" size={28} color={PUBLISH_PILL_TEXT} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <Toast
            visible={state.pendingDelete !== null}
            title={t('drafts.deletedToast', { title: state.pendingDelete?.event.title ?? '' })}
            helper={t('drafts.deletedToastHelper')}
            icon="trash"
            iconColor={themeColors.destructive}
            action={{ label: t('drafts.undo'), onPress: handleUndoDelete }}
            durationMs={UNDO_WINDOW_MS}
            onTimeout={flushPendingDelete}
            testID="triage-undo-toast"
          />
        </SafeAreaView>
      </ThemedView>

      {datePickerOpen && draft && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(_event, date) => {
            setDatePickerOpen(false);
            if (date) {
              dispatch({ type: 'setDate', id: draft.$id, isoDate: date.toISOString() });
            }
          }}
        />
      )}

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

function SummaryRow({
  icon,
  label,
  count,
  color,
  borderColor,
  isLast = false,
}: {
  icon: 'checkmark' | 'calendar.badge.checkmark' | 'trash' | 'clock';
  label: string;
  count: number;
  color: string;
  borderColor: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
    >
      <IconSymbol name={icon} size={18} color={color} />
      <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
      <ThemedText style={[styles.summaryCount, { color }]}>{count}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl - 4,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 3,
  },
  counter: {
    fontSize: 12.5,
    fontFamily: Typography.families.semiBold,
  },
  deck: {
    flex: 1,
    justifyContent: 'center',
  },
  ghost: {
    position: 'absolute',
    height: 260,
    borderRadius: 26,
    alignSelf: 'center',
  },
  ghostNear: {
    left: 36,
    right: 36,
    top: '18%',
  },
  ghostFar: {
    left: 44,
    right: 44,
    top: '20%',
  },
  activeCard: {
    marginHorizontal: Spacing.xl - 4,
  },
  stamp: {
    position: 'absolute',
    top: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  stampPublish: {
    left: Spacing.lg,
  },
  stampDelete: {
    right: Spacing.lg,
  },
  stampLabel: {
    fontSize: 15,
    fontFamily: Typography.families.extraBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: Spacing['2xl'],
  },
  circleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishCircle: {
    borderWidth: 0,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  skipColumn: {
    alignItems: 'center',
    gap: 2,
  },
  skipHint: {
    fontSize: 10.5,
    fontFamily: Typography.families.medium,
  },
  receiptWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl - 4,
  },
  receipt: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingTop: 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  receiptTile: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: 20,
    fontFamily: Typography.families.bold,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  receiptHelper: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  summaryList: {
    alignSelf: 'stretch',
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.families.medium,
  },
  summaryCount: {
    fontSize: 15,
    fontFamily: Typography.families.bold,
  },
  receiptCta: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  receiptCtaLabel: {
    color: 'white',
    fontSize: 14.5,
    fontFamily: Typography.families.semiBold,
  },
  receiptNote: {
    fontSize: 13.5,
    fontFamily: Typography.families.semiBold,
    marginTop: Spacing.md,
    textDecorationLine: 'underline',
  },
});
