import React, { type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddMoreSection } from '@/components/event-form/AddMoreSection';
import { FormRow } from '@/components/event-form/FormRow';
import FormField from '@/components/FormField';
import { FormIssueSummary } from '@/components/FormIssueSummary';
import FormLongText from '@/components/FormLongText';
import { FormFieldAnchor } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FilterChip } from '@/components/ui/FilterChip';
import { FormErrorText } from '@/components/ui/FormErrorText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCategoryColors } from '@/constants/CategoryColors';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { eventCategories } from '@/constants/EventCategories';
import { EVENT_TEXT_LIMITS, MAX_EVENT_IMAGES } from '@/constants/EventConfig';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventFormValidation } from '@/hooks/useEventFormValidation';
import type { EventImages } from '@/hooks/useEventImages';
import type { EventFormKind, EventFormProps, FormState } from '@/types/eventForm.types';
import { whereSummary, type FormRowSummary } from '@/utils/eventWhen';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export const COVER_HEIGHT = 196;
const DATE_FIELDS = [
  'start_time',
  'end_time',
  'start_local',
  'end_local',
  'starts_on',
  'until',
  'count',
] as const;

export interface EventFormPageProps {
  kind: EventFormKind;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  validation: EventFormValidation;
  images: EventImages;
  isDark: boolean;
  inSheet: boolean;
  /** Says what is being edited. A new event needs none: the page is the event. */
  heading?: string;
  /** What shows under the title: "by" and the organization, or its picker. */
  byline?: ReactNode;
  /** Above the title: a template's name, a note about the series. */
  intro?: ReactNode;
  closeLabel: string;
  closeTestID?: string;
  /** Beside the close button, such as a delete. */
  coverActions?: ReactNode;
  when: FormRowSummary | null;
  /** Point the date row out, when it is all that is left. */
  whenPrompt?: FormRowSummary;
  highlightWhen?: boolean;
  onClose: () => void;
  onOpenWhen: () => void;
  onOpenWhere: () => void;
  onOpenPhotos: () => void;
  /** What opens each surface, for a screen reader to return to. */
  whenRowRef?: React.Ref<ViewInstance>;
  whereRowRef?: React.Ref<ViewInstance>;
  photosRef?: React.Ref<ViewInstance>;
  scrollViewRef?: EventFormProps['scrollViewRef'];
}

/** The form laid out like the event it becomes. */
export function EventFormPage({
  kind,
  form,
  setForm,
  validation,
  images,
  isDark,
  inSheet,
  heading,
  byline,
  intro,
  closeLabel,
  closeTestID,
  coverActions,
  when,
  whenPrompt,
  highlightWhen = false,
  onClose,
  onOpenWhen,
  onOpenWhere,
  onOpenPhotos,
  whenRowRef,
  whereRowRef,
  photosRef,
  scrollViewRef,
}: EventFormPageProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { errors } = validation;
  const isTemplate = kind === 'template';
  const coverTop = inSheet && Platform.OS === 'ios' ? Spacing.md : insets.top + Spacing.sm;
  const cover = form.images[0];
  const coverUri = typeof cover === 'string' ? cover : cover?.uri;
  const where = whereSummary(form);
  const whenError = DATE_FIELDS.map((field) => errors[field]).find(Boolean);
  const cardStyle = [
    styles.card,
    { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
  ];

  const whenRow = isTemplate ? (
    <FormRow
      icon="calendar"
      title={t('template.dateAsked')}
      subtitle={t('template.dateAskedHint')}
      testID="template-date-asked"
    />
  ) : (
    <FormFieldAnchor field={DATE_FIELDS}>
      <FormRow
        icon="calendar"
        tone="red"
        title={when?.title ?? whenPrompt?.title ?? t('createEvent.addDateTime')}
        subtitle={when?.subtitle ?? whenPrompt?.subtitle}
        onPress={onOpenWhen}
        rowRef={whenRowRef}
        accessibilityHint={t('a11y.hints.openWhen')}
        testID="row-event-when"
      />
      {whenError ? <FormErrorText message={whenError} style={styles.rowError} /> : null}
    </FormFieldAnchor>
  );

  const whereRow = (
    <FormRow
      icon="mappin.and.ellipse"
      tone="blue"
      title={where?.title ?? t('createEvent.addPlace')}
      subtitle={where?.subtitle}
      onPress={onOpenWhere}
      rowRef={whereRowRef}
      accessibilityHint={t('a11y.hints.openWhere')}
      testID="row-event-where"
    />
  );

  return (
    <View>
      <View style={[styles.cover, { backgroundColor: themeColors.surfaceAltBackground }]}>
        {coverUri ? (
          <>
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: coverUri }}
              style={styles.coverImage}
            />
            <Pressable
              ref={photosRef}
              onPress={onOpenPhotos}
              style={[
                styles.photosButton,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('createEvent.uploadImage')}
              accessibilityHint={t('a11y.hints.openPhotos')}
              testID="btn-event-photos"
            >
              <ThemedText style={styles.photosText}>
                {t('createEvent.uploadImage')} {form.images.length}/{MAX_EVENT_IMAGES}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={images.pickImage}
            style={[
              styles.addCover,
              { borderColor: themeColors.inputBorder, paddingTop: coverTop },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('createEvent.addCoverPhoto')}
            accessibilityHint={t('createEvent.imageAccessibilityHint')}
            testID="btn-add-cover"
          >
            <IconSymbol name="photo.badge.plus" size={IconSizes['2xl']} color={themeColors.text} />
            <ThemedText style={styles.addCoverText}>{t('createEvent.addCoverPhoto')}</ThemedText>
          </Pressable>
        )}

        <View style={[styles.coverBar, { top: coverTop }]}>
          <Pressable
            onPress={onClose}
            style={[
              styles.coverButton,
              { backgroundColor: themeColors.cardBackground, borderColor: themeColors.cardBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            accessibilityHint={t('a11y.hints.closeScreen')}
            testID={closeTestID}
          >
            <IconSymbol name="xmark" size={IconSizes.md} color={themeColors.icon} />
          </Pressable>
          {coverActions}
        </View>
      </View>

      <View style={styles.body}>
        <FormIssueSummary validation={validation} />
        {!!heading && (
          <ThemedText accessibilityRole="header" style={styles.heading}>
            {heading}
          </ThemedText>
        )}
        {intro}

        <View>
          <FormFieldAnchor field="title">
            <FormField
              variant="title"
              testID="input-event-title"
              title={t('createEvent.title')}
              value={form.title}
              placeholder={t('createEvent.namePlaceholder')}
              // It wraps like a multiline field, but a title stays one line when pasted.
              handleChangeText={(value) =>
                setForm((prev) => ({ ...prev, title: value.replace(/\s*\n\s*/g, ' ') }))
              }
              maxLength={EVENT_TEXT_LIMITS.title}
              errorText={errors.title}
            />
          </FormFieldAnchor>
          {byline}
        </View>

        <FormFieldAnchor field="categories">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chips}
          >
            {eventCategories.map(({ value }) => {
              const categoryColors = getCategoryColors(value);
              const active = form.categories === value;
              return (
                <FilterChip
                  key={value}
                  testID={`category-chip-${value}`}
                  label={t(`categories.${value.toLowerCase()}`)}
                  active={active}
                  activeColor={categoryColors.color}
                  activeBackground={categoryColors.bg}
                  containerStyle={styles.chip}
                  leading={
                    (active || !form.categories) && (
                      <View
                        style={[styles.categoryDot, { backgroundColor: categoryColors.color }]}
                      />
                    )
                  }
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      categories: active && isTemplate ? '' : value,
                    }))
                  }
                />
              );
            })}
          </ScrollView>
          {errors.categories ? <FormErrorText message={errors.categories} /> : null}
        </FormFieldAnchor>

        {highlightWhen ? (
          <>
            <ThemedView style={[cardStyle, { borderColor: themeColors.tint }]}>
              {whenRow}
            </ThemedView>
            <ThemedView style={cardStyle}>{whereRow}</ThemedView>
          </>
        ) : (
          <ThemedView style={cardStyle}>
            {whenRow}
            <View style={[styles.separator, { backgroundColor: themeColors.separator }]} />
            {whereRow}
          </ThemedView>
        )}

        <FormFieldAnchor field="description">
          <ThemedView style={[cardStyle, styles.descriptionCard]}>
            <FormLongText
              variant="bare"
              testID="input-event-description"
              title={t('createEvent.description')}
              value={form.description}
              placeholder={t('createEvent.descriptionPlaceholder')}
              handleChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              isLongText
              maxLength={EVENT_TEXT_LIMITS.description}
              errorText={errors.description}
            />
          </ThemedView>
        </FormFieldAnchor>

        <AddMoreSection
          form={form}
          setForm={setForm}
          errors={errors}
          isDark={isDark}
          scrollViewRef={scrollViewRef}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
  },
  addCoverText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  coverBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photosButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.md,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  photosText: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
  heading: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.families.bold,
    lineHeight: 30,
  },
  body: {
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    paddingBottom: Spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  descriptionCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  rowError: {
    marginTop: 0,
    paddingHorizontal: 14,
    paddingBottom: Spacing.md,
  },
});
