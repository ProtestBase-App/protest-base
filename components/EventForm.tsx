import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FormField from '@/components/FormField';
import FormDateField from '@/components/FormDateField';
import FormLongText from '@/components/FormLongText';
import { DropdownCustom } from '@/components/DropdownCustom';
import { DropdownMultiselect } from '@/components/DropdownMultiselect';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { RemovableChip } from '@/components/RemovableChip';
import { eventCategories } from '@/constants/EventCategories';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { countries } from '@/constants/Countries';
import type { EventFormProps } from '@/types/eventForm.types';
import { SectionHeader, HelperText } from '@/utils/formHelpers';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { optimizeImageForUpload } from '@/utils/imageOptimization';

// LayoutAnimation is opt-in on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Safely parse a date string, returning a valid Date or the fallback. */
function safeParseDate(dateString: string | undefined, fallback: Date = new Date()): Date {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

const EventForm: React.FC<EventFormProps> = ({
  form,
  setForm,
  emptyFields,
  userLanguage,
  mode = 'create-event',
  scrollViewRef,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(colorScheme);
  const iconColor = isDark ? 'white' : 'black';
  const userLang = userLanguage;

  // Template mode hides date/time and image fields.
  const isTemplateMode = mode === 'create-template' || mode === 'edit-template';
  const { dropdownItems: organizations, loading: organizationsLoading } = useOrganizations();
  const [postalCodeSearch, setPostalCodeSearch] = React.useState('');
  const [postalCodesData, setPostalCodesData] = React.useState<any[]>([]);
  const [postalCodesLoading, setPostalCodesLoading] = React.useState(false);
  const [isPickingImage, setIsPickingImage] = React.useState(false);
  const previousCountry = React.useRef<string | null>(null);
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    const loadPostalCodes = async () => {
      // Only clear postal code when the user explicitly changes country —
      // not on initial mount or draft restore.
      if (
        !isInitialMount.current &&
        previousCountry.current !== null &&
        previousCountry.current !== form.country &&
        form.postal_code
      ) {
        setForm((prev) => ({ ...prev, postal_code: null }));
        setPostalCodeSearch('');
      }
      previousCountry.current = form.country;
      isInitialMount.current = false;

      if (!form.country) {
        setPostalCodesData([]);
        setPostalCodesLoading(false);
        return;
      }

      setPostalCodesLoading(true);

      try {
        let postalCodesModule;

        if (form.country === 'netherlands') {
          postalCodesModule = await import('@/constants/PostalCodes_NL');
          setPostalCodesData(postalCodesModule.POSTAL_CODES_NL_NL || []);
        } else if (form.country === 'belgium') {
          if (userLang === 'en') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_EN');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_EN || []);
          } else if (userLang === 'nl') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_NL');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_NL || []);
          } else if (userLang === 'fr') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_FR');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_FR || []);
          } else {
            postalCodesModule = await import('@/constants/PostalCodes_BE_EN');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_EN || []);
          }
        }
      } catch (error) {
        logger.warn('Failed to load postal codes for country', {
          country: form.country,
          error: error instanceof Error ? error.message : String(error),
        });
        setPostalCodesData([]);
        Alert.alert(t('common.error'), t('createEvent.postalCodeLoadError'), [
          { text: t('common.ok') },
        ]);
      } finally {
        setPostalCodesLoading(false);
      }
    };

    loadPostalCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country, userLang]);

  const listPostalCodes = useMemo(() => {
    if (postalCodesData.length === 0) return [];

    if (form.country === 'netherlands') {
      return postalCodesData.map((code) => ({
        label: `${code.sub_municipality_name} (${code.post_code})`,
        value: String(code.post_code),
      }));
    } else if (form.country === 'belgium') {
      const getSubMunicipalityName = (code: any) => {
        if (userLang === 'en') {
          return code.sub_municipality_name_english;
        } else if (userLang === 'nl') {
          return code.sub_municipality_name_dutch;
        } else if (userLang === 'fr') {
          return code.sub_municipality_name_french;
        } else {
          return code.sub_municipality_name_english;
        }
      };

      return postalCodesData.map((code) => ({
        label: `${getSubMunicipalityName(code)} (${code.post_code})`,
        value: String(code.post_code),
      }));
    }

    return [];
  }, [postalCodesData, userLang, form.country]);

  const filteredPostalCodes = useMemo(() => {
    if (postalCodeSearch.length >= 2) {
      return listPostalCodes;
    }

    if (form.postal_code) {
      const selectedItem = listPostalCodes.find((item) => item.value === String(form.postal_code));
      if (selectedItem) {
        return [selectedItem];
      }
      // Postal codes data hasn't loaded yet — return a placeholder so the
      // dropdown can display the saved value while loading.
      if (listPostalCodes.length === 0) {
        return [{ label: String(form.postal_code), value: String(form.postal_code) }];
      }
      return [];
    }

    return [];
  }, [postalCodeSearch, listPostalCodes, form.postal_code]);

  const getFormProgress = useMemo(() => {
    // Templates don't require start_time; only title is "recommended" for templates.
    const requiredFields = isTemplateMode
      ? [form.title]
      : [form.title, form.description, form.start_time];
    const completed = requiredFields.filter((field) => field !== '').length;
    const total = requiredFields.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [form.title, form.description, form.start_time, isTemplateMode]);

  // O(1) lookup when rendering chips.
  const orgLookup = useMemo(
    () => new Map(organizations.map((o) => [o.value, o.label])),
    [organizations]
  );

  const handleRemoveCoOrganizer = useCallback(
    (valueToRemove: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setForm((prev) => ({
        ...prev,
        co_organizers: prev.co_organizers.filter((v) => v !== valueToRemove),
      }));
    },
    [setForm]
  );

  // Scroll to end when the disclaimer focuses; delay lets the keyboard appear first.
  const handleDisclaimerFocus = useCallback(() => {
    if (scrollViewRef?.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }
  }, [scrollViewRef]);

  const pickImage = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);

    try {
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();

      // Show a pre-permission dialog the first time we'd ask. The alert is
      // non-blocking, so keep isPickingImage=true until the user responds.
      if (currentPermission.status === 'undetermined') {
        Alert.alert(
          t('permissions.photoLibraryPreTitle'),
          t('permissions.photoLibraryPreMessage'),
          [
            {
              text: t('permissions.notNow'),
              style: 'cancel',
              onPress: () => setIsPickingImage(false),
            },
            {
              text: t('permissions.allowAccess'),
              onPress: async () => {
                try {
                  await proceedWithImagePicker();
                } finally {
                  setIsPickingImage(false);
                }
              },
            },
          ],
          { cancelable: false }
        );
        // The alert callbacks reset isPickingImage; return without touching it here.
        return;
      }

      try {
        await proceedWithImagePicker();
      } finally {
        setIsPickingImage(false);
      }
    } catch (error) {
      logger.warn('Image picker failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t('common.error'), t('createEvent.imagePickerError'), [{ text: t('common.ok') }]);
      setIsPickingImage(false);
    }
  };

  const proceedWithImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(t('createEvent.permissionRequired'), t('createEvent.photoPermissionMessage'), [
          { text: t('common.ok') },
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.type === 'image' || selectedAsset.uri) {
          // Backend rejects multipart > 15 MB. Resize/compress before storing on the form
          // so users with high-res phone cameras (HEIC > 18 MB) can still upload.
          const optimized = await optimizeImageForUpload({
            uri: selectedAsset.uri,
            mimeType: selectedAsset.mimeType,
            fileName: selectedAsset.fileName,
            width: selectedAsset.width,
            height: selectedAsset.height,
            fileSize: selectedAsset.fileSize,
          });
          setForm({
            ...form,
            image: optimized,
          });
        }
      }
    } catch (error) {
      logger.warn('Image picker failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t('common.error'), t('createEvent.imagePickerError'), [{ text: t('common.ok') }]);
    }
  };

  const handleStartTimeChange = (isoString: string) => {
    const newStartTime = safeParseDate(isoString);
    const currentEndTime = form.end_time ? safeParseDate(form.end_time) : null;

    if (currentEndTime && currentEndTime < newStartTime) {
      setForm({
        ...form,
        start_time: isoString,
        end_time: isoString,
      });
    } else {
      setForm({ ...form, start_time: isoString });
    }
  };

  const renderImage = () => {
    if (!form.image) {
      return (
        <ThemedView style={styles.uploadImageBoxSection}>
          <ThemedView style={styles.uploadImageBox}>
            <IconSymbol name="photo.badge.plus" size={60} color={iconColor} />
          </ThemedView>
        </ThemedView>
      );
    }

    // Image-picker result object.
    if (typeof form.image === 'object' && form.image.uri) {
      return <Image source={{ uri: form.image.uri }} style={styles.imagePreview} />;
    }

    // URL string (from an existing event).
    if (typeof form.image === 'string' && form.image.length > 0) {
      return <Image source={{ uri: form.image }} style={styles.imagePreview} />;
    }

    return (
      <ThemedView style={styles.uploadImageBoxSection}>
        <ThemedView style={styles.uploadImageBox}>
          <IconSymbol name="photo.badge.plus" size={60} color={iconColor} />
        </ThemedView>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {!isTemplateMode && (
        <ThemedView
          style={styles.progressContainer}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel={t('createEvent.progressAccessibilityLabel', {
            percentage: getFormProgress.percentage,
          })}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: getFormProgress.percentage,
          }}
        >
          <ThemedView style={styles.progressHeader}>
            <ThemedText style={[styles.progressText, { color: themeColors.icon }]}>
              {t('createEvent.requiredFieldsProgress', {
                completed: getFormProgress.completed,
                total: getFormProgress.total,
              })}
            </ThemedText>
            <ThemedText style={[styles.progressPercentage, { color: themeColors.tint }]}>
              {getFormProgress.percentage}%
            </ThemedText>
          </ThemedView>
          <ThemedView
            style={[styles.progressBarBackground, { backgroundColor: themeColors.inputBorder }]}
          >
            <ThemedView
              style={[
                styles.progressBarFill,
                { width: `${getFormProgress.percentage}%`, backgroundColor: themeColors.tint },
              ]}
            />
          </ThemedView>
        </ThemedView>
      )}

      <SectionHeader title={t('createEvent.basicInformation')} isDark={isDark} />

      <FormField
        testID="input-event-title"
        title={isTemplateMode ? t('createEvent.title') : `${t('createEvent.title')} *`}
        value={form.title}
        placeholder={t('createEvent.titlePlaceholder')}
        handleChangeText={(value) => setForm({ ...form, title: value })}
        otherStyles={styles.fieldSpacing}
        maxLength={100}
        hasError={!isTemplateMode && emptyFields.title}
      />

      <FormLongText
        testID="input-event-description"
        title={isTemplateMode ? t('createEvent.description') : `${t('createEvent.description')} *`}
        value={form.description}
        placeholder={t('createEvent.descriptionPlaceholder')}
        handleChangeText={(value) => setForm({ ...form, description: value })}
        otherStyles={styles.fieldSpacing}
        isLongText={true}
        maxLength={8000}
        hasError={!isTemplateMode && emptyFields.description}
        defaultExpanded={true}
      />

      <ThemedText style={[styles.fieldLabel, styles.fieldSpacing]}>
        {t('createEvent.category')} ({t('common.optional')})
      </ThemedText>
      <ThemedView style={styles.dropdownWrapper}>
        <DropdownCustom
          testID="dropdown-event-category"
          items={eventCategories.map((cat) => ({
            label: t(`categories.${cat.value.toLowerCase()}`),
            value: cat.value,
          }))}
          placeholder={t('createEvent.selectCategory')}
          onValueChange={(value) => setForm({ ...form, categories: value })}
          value={form.categories}
          containerStyle={{ marginTop: 8, flex: 1 }}
          searchable={false}
          excludeSearchField={true}
          maxHeight={200}
          mode="auto"
        />
        {form.categories && (
          <TouchableOpacity
            onPress={() => setForm({ ...form, categories: '' })}
            style={styles.clearButton}
          >
            <IconSymbol name="xmark" size={20} color={themeColors.secondaryText} />
          </TouchableOpacity>
        )}
      </ThemedView>
      <HelperText text={t('createEvent.categoryHelper')} isDark={isDark} />

      {!isTemplateMode && (
        <>
          <SectionHeader title={t('createEvent.dateAndTime')} isDark={isDark} />

          <FormDateField
            testID="input-event-start-time"
            title={`${t('createEvent.startTime')} *`}
            value={form.start_time}
            placeholder={t('createEvent.pickStartDateTime')}
            handleChangeText={handleStartTimeChange}
            otherStyles={styles.fieldSpacing}
            hasError={emptyFields.start_time}
            minDate={new Date()}
          />

          <FormDateField
            testID="input-event-end-time"
            title={`${t('createEvent.endTime')} (${t('common.optional')})`}
            value={form.end_time}
            placeholder={t('createEvent.pickEndDateTime')}
            handleChangeText={(isoString: string) => setForm({ ...form, end_time: isoString })}
            otherStyles={styles.fieldSpacing}
            minDate={safeParseDate(form.start_time)}
          />
          <HelperText text={t('createEvent.endTimeHelper')} isDark={isDark} />
        </>
      )}

      <SectionHeader title={t('createEvent.locationSection')} isDark={isDark} />

      <ThemedText style={[styles.fieldLabel, styles.fieldSpacing]}>
        {t('createEvent.country')} ({t('common.optional')})
      </ThemedText>
      <DropdownCustom
        testID="dropdown-event-country"
        items={countries.map((c) => ({
          label: c.label[userLang as keyof typeof c.label] || c.label.en,
          value: c.value,
        }))}
        placeholder={t('createEvent.selectCountry')}
        onValueChange={(value) => setForm({ ...form, country: value })}
        value={form.country}
        containerStyle={{ marginTop: 8 }}
        searchable={false}
        excludeSearchField={true}
      />

      {form.country && (
        <ThemedView style={styles.nestedFieldGroup}>
          <ThemedView style={styles.labelWithLoadingWrapper}>
            <ThemedText style={[styles.fieldLabel, styles.fieldSpacingNested]}>
              {t('createEvent.postalCode')} ({t('common.optional')})
            </ThemedText>
            {postalCodesLoading && (
              <ActivityIndicator
                size="small"
                color={themeColors.tint}
                style={styles.fieldLoadingIndicator}
              />
            )}
          </ThemedView>

          <ThemedView style={styles.postalCodeWrapper}>
            <ThemedView style={styles.inputPostalCode}>
              <DropdownCustom
                testID="dropdown-event-postal-code"
                items={filteredPostalCodes}
                placeholder={
                  postalCodesLoading ? t('common.loading') : t('createEvent.postalCodePlaceholder')
                }
                onValueChange={(value) =>
                  setForm({ ...form, postal_code: value ? Number(value) : null })
                }
                value={form.postal_code ? String(form.postal_code) : undefined}
                searchable={true}
                searchPlaceholder={t('createEvent.searchPostalCode')}
                inputSearchStyle={{ fontSize: Typography.sizes.xs }}
                onChangeSearchText={(text) => setPostalCodeSearch(text)}
                mode="auto"
                dropdownPosition="auto"
                containerStyle={{ flex: 1 }}
                disabled={postalCodesLoading}
              />
            </ThemedView>
            {form.postal_code && !postalCodesLoading && (
              <TouchableOpacity
                onPress={() => {
                  setForm({ ...form, postal_code: null });
                  setPostalCodeSearch('');
                }}
                style={styles.clearButton}
                accessibilityLabel={t('createEvent.clearPostalCodeAccessibilityLabel')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={20} color={themeColors.secondaryText} />
              </TouchableOpacity>
            )}
          </ThemedView>

          <FormField
            testID="input-event-street-address"
            title={`${t('createEvent.streetAddress')} (${t('common.optional')})`}
            value={form.street_address}
            placeholder={t('createEvent.streetAddressPlaceholder')}
            handleChangeText={(value) => setForm({ ...form, street_address: value })}
            otherStyles={styles.fieldSpacingNested}
            maxLength={75}
          />
          <HelperText text={t('createEvent.locationHelper')} isDark={isDark} />
        </ThemedView>
      )}

      <SectionHeader
        title={
          isTemplateMode
            ? t('createEvent.additionalDetails')
            : t('createEvent.mediaAndAdditionalDetails')
        }
        isDark={isDark}
      />

      {!isTemplateMode && (
        <ThemedView style={styles.uploadImageContainer}>
          <ThemedView style={styles.imageTitleWrapper}>
            <ThemedText style={styles.imageTitle}>
              {t('createEvent.uploadImage')} ({t('common.optional')})
            </ThemedText>
            {form.image && (
              <TouchableOpacity
                onPress={() => setForm({ ...form, image: null })}
                style={styles.clearImageButton}
                accessibilityLabel={t('createEvent.removeImageAccessibilityLabel')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark" size={20} color={themeColors.secondaryText} />
              </TouchableOpacity>
            )}
          </ThemedView>
          <TouchableOpacity
            onPress={pickImage}
            accessibilityLabel={
              form.image
                ? t('createEvent.changeImageAccessibilityLabel')
                : t('createEvent.addImageAccessibilityLabel')
            }
            accessibilityHint={t('createEvent.imageAccessibilityHint')}
            accessibilityRole="button"
          >
            {renderImage()}
          </TouchableOpacity>
          <HelperText text={t('createEvent.imageHelper')} isDark={isDark} />
        </ThemedView>
      )}

      <FormField
        testID="input-event-website-url"
        title={`${t('createEvent.eventLink')} (${t('common.optional')})`}
        value={form.website_url}
        placeholder={t('createEvent.eventLinkPlaceholder')}
        handleChangeText={(value) => setForm({ ...form, website_url: value })}
        otherStyles={styles.fieldSpacing}
        keyboardType="url"
        autoCapitalize="none"
      />
      <HelperText text={t('createEvent.eventLinkHelper')} isDark={isDark} />

      <ThemedView style={styles.labelWithLoadingWrapper}>
        <ThemedText style={[styles.fieldLabel, styles.fieldSpacing]}>
          {t('createEvent.coOrganizers')} ({t('common.optional')})
        </ThemedText>
        {organizationsLoading && (
          <ActivityIndicator
            size="small"
            color={themeColors.tint}
            style={styles.fieldLoadingIndicator}
          />
        )}
      </ThemedView>
      <ThemedView style={styles.dropdownWrapper}>
        <DropdownMultiselect
          testID="dropdown-event-co-organizers"
          items={organizations}
          placeholder={
            organizationsLoading ? t('common.loading') : t('createEvent.selectCoOrganizers')
          }
          onValueChange={(value) => setForm({ ...form, co_organizers: value })}
          value={form.co_organizers}
          searchable={true}
          containerStyle={{ marginTop: 8, flex: 1 }}
          disabled={organizationsLoading}
        />
        {form.co_organizers && form.co_organizers.length > 0 && !organizationsLoading && (
          <TouchableOpacity
            onPress={() => setForm({ ...form, co_organizers: [] })}
            style={styles.clearButton}
            accessibilityLabel={t('createEvent.clearCoOrganizersAccessibilityLabel')}
            accessibilityRole="button"
          >
            <IconSymbol name="xmark" size={20} color={themeColors.secondaryText} />
          </TouchableOpacity>
        )}
      </ThemedView>

      {form.co_organizers && form.co_organizers.length > 0 && (
        <ThemedView style={styles.selectedChipsContainer}>
          <ThemedText style={styles.selectedChipsLabel}>
            {t('createEvent.selected')} ({form.co_organizers.length}):
          </ThemedText>
          <ThemedView style={styles.chipsWrapper}>
            {form.co_organizers.map((value) => (
              <RemovableChip
                key={value}
                label={orgLookup.get(value) || value}
                value={value}
                onRemove={handleRemoveCoOrganizer}
                disabled={organizationsLoading}
                accessibilityContext="co-organizers"
              />
            ))}
          </ThemedView>
        </ThemedView>
      )}

      <HelperText text={t('createEvent.coOrganizersHelper')} isDark={isDark} />

      <ThemedText style={[styles.fieldLabel, styles.fieldSpacing]}>
        {t('createEvent.volunteering')}
      </ThemedText>
      <TouchableOpacity
        testID="checkbox-event-help-needed"
        style={styles.checkboxContainer}
        onPress={() => setForm({ ...form, help_needed: !form.help_needed })}
        activeOpacity={0.8}
      >
        <IconSymbol
          name={form.help_needed ? 'checkmark.square.fill' : 'square'}
          size={24}
          color={form.help_needed ? themeColors.tint : themeColors.icon}
        />
        <ThemedText style={styles.checkboxLabel}>{t('createEvent.needHelpCheckbox')}</ThemedText>
      </TouchableOpacity>

      {form.help_needed && (
        <ThemedView style={styles.conditionalFieldGroup}>
          <FormLongText
            testID="input-event-help-description"
            title={`${t('createEvent.volunteerRoles')} *`}
            value={form.help_description || ''}
            placeholder={t('createEvent.volunteerRolesPlaceholder')}
            handleChangeText={(value) => setForm({ ...form, help_description: value })}
            otherStyles={styles.fieldSpacingConditional}
            isLongText={true}
            maxLength={1000}
            hasError={emptyFields.help_description}
          />
          <HelperText text={t('createEvent.volunteerHelper')} isDark={isDark} />
        </ThemedView>
      )}

      <FormLongText
        testID="input-event-disclaimer"
        title={`${t('createEvent.disclaimer')} (${t('common.optional')})`}
        value={form.disclaimer}
        placeholder={t('createEvent.disclaimerPlaceholder')}
        handleChangeText={(value) => setForm({ ...form, disclaimer: value })}
        otherStyles={styles.fieldSpacing}
        isLongText={true}
        maxLength={3000}
        onFocusCallback={handleDisclaimerFocus}
      />
      <HelperText text={t('createEvent.disclaimerHelper')} isDark={isDark} />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 40,
  },
  progressContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  progressPercentage: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fieldSpacing: {
    marginTop: 24,
  },
  fieldSpacingNested: {
    marginTop: 20,
  },
  fieldSpacingConditional: {
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
  },
  imageTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
  },
  clearImageButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 158,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  uploadImageBoxSection: {
    width: '100%',
    height: 160,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadImageBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#A0AEC0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadImageContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  nestedFieldGroup: {
    marginTop: 8,
    paddingLeft: 4,
  },
  conditionalFieldGroup: {
    marginTop: 0,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postalCodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  inputPostalCode: {
    flex: 1,
    maxWidth: '100%',
  },
  selectedChipsContainer: {
    marginTop: Spacing.md,
  },
  selectedChipsLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.sm,
    opacity: 0.7,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  checkboxLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
  labelWithLoadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLoadingIndicator: {
    marginLeft: 8,
  },
});

export default EventForm;
