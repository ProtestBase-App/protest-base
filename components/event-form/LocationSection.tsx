import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import AddressAutocompleteField from '@/components/AddressAutocompleteField';
import { useFormKeyboard } from '@/components/FormScreenScaffold';
import { SheetSearchMultiSelect } from '@/components/SheetSearchMultiSelect';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { sectionStyles } from '@/components/event-form/sectionStyles';
import { Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventLocation } from '@/hooks/useEventLocation';
import type { FormState } from '@/types/eventForm.types';
import { getSelectableCountries } from '@/utils/countryOptions';
import { HelperText } from '@/utils/formHelpers';
import { matchFranceLocalities } from '@/utils/franceLocalities';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface LocationSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  location: EventLocation;
  userLanguage: string;
  isDark: boolean;
  /** Listed first. Only a tap writes it to the form: a country change wipes the address. */
  suggestedCountry?: string | null;
}

/** Country, street and postal code. */
export function LocationSection({
  form,
  setForm,
  location,
  userLanguage,
  isDark,
  suggestedCountry,
}: LocationSectionProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { setDropdownFocused } = useFormKeyboard();
  const {
    franceEnabled,
    isLuxembourg,
    isFrance,
    postalCodesLoading,
    postalCodeOptions,
    localityPickerValue,
    resolveLuxembourgLabel,
    resolveFranceLabel,
    resolvePostalLabel,
    postalLocked,
    postalConfirmed,
    postalConfirmedLabel,
    addressCountryCode,
    addressLang,
    addressPostalHint,
    handleAddressSelect,
    handleAddressClear,
    handleAddressEdit,
    handlePostalChangePress,
    handlePostalManualChange,
  } = location;

  const countries = [...getSelectableCountries({ franceEnabled })].sort(
    (a, b) => Number(b.value === suggestedCountry) - Number(a.value === suggestedCountry)
  );

  return (
    <>
      <ThemedText style={[sectionStyles.fieldLabel, sectionStyles.fieldSpacing]}>
        {t('createEvent.country')} ({t('common.optional')})
      </ThemedText>
      <ThemedView style={sectionStyles.chipRow}>
        {countries.map((c) => {
          const active = form.country === c.value;
          return (
            <FilterChip
              key={c.value}
              testID={`country-chip-${c.value}`}
              label={c.label[userLanguage as keyof typeof c.label] || c.label.en}
              active={active}
              onPress={() => setForm({ ...form, country: active ? '' : c.value })}
            />
          );
        })}
      </ThemedView>

      {form.country && (
        <ThemedView style={styles.nestedFieldGroup}>
          <AddressAutocompleteField
            testID="input-event-street-address"
            title={`${t('createEvent.streetAddress')} (${t('common.optional')})`}
            value={form.street_address}
            countryCode={addressCountryCode}
            lang={addressLang}
            postalCode={addressPostalHint}
            onSelect={handleAddressSelect}
            onClear={handleAddressClear}
            onEdit={handleAddressEdit}
            onFocusChange={setDropdownFocused}
            placeholder={t('createEvent.addressSearchPlaceholder')}
            searchingText={t('createEvent.addressSearching')}
            noResultsText={t('createEvent.addressNoResults')}
            errorText={t('createEvent.addressError')}
            unavailableText={t('createEvent.addressUnavailable')}
            clearAccessibilityLabel={t('createEvent.clearStreetAddressAccessibilityLabel')}
            otherStyles={styles.fieldSpacingNested}
          />

          <ThemedView style={[sectionStyles.labelWithLoadingWrapper, styles.fieldSpacingNested]}>
            <ThemedText style={sectionStyles.fieldLabel}>
              {isLuxembourg
                ? t('createEvent.localityLabel')
                : isFrance
                  ? t('createEvent.communeLabel')
                  : t('createEvent.postalCode')}{' '}
              ({t('common.optional')})
            </ThemedText>
            {postalCodesLoading && (
              <ActivityIndicator
                size="small"
                color={themeColors.tint}
                style={sectionStyles.fieldLoadingIndicator}
              />
            )}
          </ThemedView>

          <ThemedView style={sectionStyles.controlSpacing}>
            {postalConfirmed ? (
              <View
                testID="postal-code-filled"
                style={[
                  styles.postalFilledRow,
                  {
                    backgroundColor: themeColors.surfaceAltBackground,
                    borderColor: themeColors.cardBorder,
                  },
                ]}
              >
                <IconSymbol name="checkmark.circle.fill" size={18} color={themeColors.success} />
                <View style={styles.postalFilledTextGroup}>
                  <ThemedText style={styles.postalFilledValue} numberOfLines={1}>
                    {postalConfirmedLabel}
                  </ThemedText>
                  {postalLocked && (
                    <ThemedText
                      style={[styles.postalFilledCaption, { color: themeColors.secondaryText }]}
                    >
                      {t('createEvent.postalFilledFromAddress')}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity
                  testID="button-change-postal-code"
                  onPress={handlePostalChangePress}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('createEvent.changePostalAccessibilityLabel')}
                  accessibilityHint={t('a11y.hints.changePostal')}
                >
                  <ThemedText style={[styles.postalChangeText, { color: themeColors.tint }]}>
                    {t('createEvent.postalChange')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <SheetSearchMultiSelect
                testID="dropdown-event-postal-code"
                options={postalCodeOptions}
                selected={
                  isLuxembourg || isFrance
                    ? localityPickerValue
                      ? [localityPickerValue]
                      : []
                    : form.postal_code
                      ? [String(form.postal_code)]
                      : []
                }
                onChange={handlePostalManualChange}
                placeholder={
                  postalCodesLoading
                    ? t('common.loading')
                    : isLuxembourg
                      ? t('createEvent.searchLocality')
                      : isFrance
                        ? t('createEvent.searchCommune')
                        : t('createEvent.searchPostalCode')
                }
                resolveSelectedLabel={
                  isLuxembourg
                    ? resolveLuxembourgLabel
                    : isFrance
                      ? resolveFranceLabel
                      : resolvePostalLabel
                }
                filterOptions={isFrance ? matchFranceLocalities : undefined}
                leadingIconName="mappin.and.ellipse"
                minSearchLength={2}
                minLengthHintText={t('createEvent.searchMinLength', { count: 2 })}
                noResultsText={t('createEvent.searchNoResults')}
                singleSelect
                onFocusChange={setDropdownFocused}
              />
            )}
          </ThemedView>

          {!postalConfirmed && (
            <HelperText
              text={
                isLuxembourg
                  ? t('createEvent.locationHelperLu')
                  : isFrance
                    ? t('createEvent.locationHelperFr')
                    : t('createEvent.locationHelper')
              }
              isDark={isDark}
            />
          )}
        </ThemedView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldSpacingNested: {
    marginTop: 20,
  },
  nestedFieldGroup: {
    marginTop: 8,
  },
  // Same geometry as SheetSearchMultiSelect's input row.
  postalFilledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  postalFilledTextGroup: {
    flex: 1,
  },
  postalFilledValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    lineHeight: 20,
  },
  postalFilledCaption: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
  postalChangeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
  },
});
