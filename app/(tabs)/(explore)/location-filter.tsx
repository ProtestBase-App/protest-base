import { useMemo, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, LayoutAnimation, Alert } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useExploreTabContext } from '@/context/ExploreTabProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { DropdownMultiselect, type DropdownItem } from '@/components/DropdownMultiselect';
import { RemovableChip } from '@/components/RemovableChip';
import { IconSymbol } from '@/components/ui/IconSymbol';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { LocationTier } from '@/utils/locationFilterOptions';
import { t } from '@/utils/i18n';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

export default function LocationFilter() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const {
    locationFilter,
    setLocationFilter,
    valueLocationOpeningModal,
    setValueLocationOpeningModal,
  } = useExploreTabContext();

  // Administrative-hierarchy options (region/province/municipality) for BE + NL.
  const { locationFilterOptions, loading, resolveLocationLabel, isLocationSelectionTooBroad } =
    usePostalCodes();

  // Track search input
  const [searchText, setSearchText] = useState('');

  const tierHeader = useCallback((tier: LocationTier): string => {
    if (tier === 'region') return t('filters.tierRegion');
    if (tier === 'province') return t('filters.tierProvince');
    return t('filters.tierMunicipality');
  }, []);

  // Attach a localized secondary line: municipality -> province name;
  // province/region -> member postal-code count.
  const displayOptions = useMemo(
    () =>
      locationFilterOptions.map((option) => ({
        ...option,
        sublabel:
          option.tier === 'municipality'
            ? option.provinceLabel
            : t('filters.postalCodesCount', { count: option.count }),
      })),
    [locationFilterOptions]
  );

  const handleRemoveLocation = useCallback(
    (valueToRemove: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setValueLocationOpeningModal(
        valueLocationOpeningModal.filter((v: string) => v !== valueToRemove)
      );
    },
    [valueLocationOpeningModal, setValueLocationOpeningModal]
  );

  const handleClearAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValueLocationOpeningModal([]);
  }, [setValueLocationOpeningModal]);

  // Show options only once the user has typed (the list spans ~950 areas);
  // otherwise surface just the current selection.
  const filteredOptions = useMemo(() => {
    if (searchText.length >= 2) {
      return displayOptions;
    }

    if (valueLocationOpeningModal && valueLocationOpeningModal.length > 0) {
      const selected = new Set(valueLocationOpeningModal);
      return displayOptions.filter((option) => selected.has(option.value));
    }

    return [];
  }, [searchText, displayOptions, valueLocationOpeningModal]);

  // Block selections that would exceed the backend's postal-code limit (only
  // ever triggered by stacking multiple regions/provinces).
  const tooBroad = useMemo(
    () => isLocationSelectionTooBroad(valueLocationOpeningModal),
    [isLocationSelectionTooBroad, valueLocationOpeningModal]
  );

  const handleCancel = () => {
    setValueLocationOpeningModal(locationFilter);
    router.back();
  };

  const handleOK = () => {
    if (tooBroad) {
      Alert.alert(t('common.error'), t('filters.selectionTooBroad'));
      return;
    }
    setLocationFilter(valueLocationOpeningModal);
    router.back();
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView
        style={[
          styles.headerContainer,
          { backgroundColor: themeColors.headerBackground, borderBottomColor: themeColors.chevron },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleCancel()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText type="subtitle">{t('common.cancel')}</ThemedText>
        </TouchableOpacity>

        <ThemedText type="subtitleMedium">{t('filters.location')}</ThemedText>

        <TouchableOpacity
          onPress={() => handleOK()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText type="subtitle">{t('common.ok')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.contentContainer}>
        {loading ? (
          <ThemedView style={styles.loadingContainer}>
            <BrandLoader />
            <ThemedText style={styles.loadingText}>{t('filters.loadingLocations')}</ThemedText>
          </ThemedView>
        ) : (
          <>
            <DropdownMultiselect
              items={filteredOptions}
              placeholder={t('filters.locationPlaceholder')}
              onValueChange={(value) => setValueLocationOpeningModal(value)}
              value={valueLocationOpeningModal}
              searchable={true}
              searchPlaceholder={t('filters.searchPlaceholder')}
              searchField="searchText"
              sublabelField="sublabel"
              sectionKeyExtractor={(item: DropdownItem) => tierHeader(item.tier as LocationTier)}
              onChangeSearchText={(text) => setSearchText(text)}
              error={false}
              errorMessage={t('filters.locationError')}
              containerStyle={{ maxHeight: '80%', paddingHorizontal: 4 }}
              optimizeForLongLists
            />

            {/* Too-broad warning */}
            {tooBroad && (
              <ThemedView
                style={[
                  styles.warningBanner,
                  { backgroundColor: themeColors.warningBg, borderColor: themeColors.warning },
                ]}
              >
                <IconSymbol name="exclamationmark.triangle" size={18} color={themeColors.warning} />
                <ThemedText style={[styles.warningText, { color: themeColors.warning }]}>
                  {t('filters.selectionTooBroad')}
                </ThemedText>
              </ThemedView>
            )}

            {/* Clear all button */}
            {valueLocationOpeningModal && valueLocationOpeningModal.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAll}
                style={styles.clearAllButton}
                accessibilityLabel={t('filters.clearAllLocations')}
                accessibilityRole="button"
              >
                <IconSymbol name="xmark.circle.fill" size={20} color={themeColors.secondaryText} />
                <ThemedText style={styles.clearAllText}>{t('common.clearAll')}</ThemedText>
              </TouchableOpacity>
            )}

            {/* Display selected items as chips */}
            {valueLocationOpeningModal && valueLocationOpeningModal.length > 0 && (
              <ThemedView style={styles.selectedChipsContainer}>
                <ThemedText style={styles.selectedChipsLabel}>
                  {t('createEvent.selected')} ({valueLocationOpeningModal.length}):
                </ThemedText>
                <ThemedView style={styles.chipsWrapper}>
                  {valueLocationOpeningModal.map((value: string) => (
                    <RemovableChip
                      key={value}
                      label={resolveLocationLabel(value)}
                      value={value}
                      onRemove={handleRemoveLocation}
                      accessibilityContext="selected locations"
                    />
                  ))}
                </ThemedView>
              </ThemedView>
            )}
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1.5,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    opacity: 0.7,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginHorizontal: 12,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    marginHorizontal: 12,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  clearAllText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
    opacity: 0.7,
  },
  selectedChipsContainer: {
    marginTop: Spacing.md,
    marginHorizontal: 12,
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
});
