import { useMemo, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useExploreTabContext } from '@/context/ExploreTabProvider';
import { DropdownMultiselect } from '@/components/DropdownMultiselect';
import { RemovableChip } from '@/components/RemovableChip';
import { IconSymbol } from '@/components/ui/IconSymbol';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { usePostalCodeOptions, getLabelFromPostalCode } from '@/utils/postalCodeOptions';
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

  // Load postal code options for both Belgium and Netherlands
  const { options: postalCodeOptions, loading } = usePostalCodeOptions(['belgium', 'netherlands']);

  // Track search input
  const [searchText, setSearchText] = useState('');

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

  // Filter postal codes: only show when user has typed at least 2 characters
  const filteredPostalCodes = useMemo(() => {
    // If search text has at least 2 characters, show all options (dropdown will filter)
    if (searchText.length >= 2) {
      return postalCodeOptions;
    }

    // If no search but there are selected items, show only those
    if (valueLocationOpeningModal && valueLocationOpeningModal.length > 0) {
      return postalCodeOptions.filter((option) => valueLocationOpeningModal.includes(option.value));
    }

    // Otherwise, show empty list
    return [];
  }, [searchText, postalCodeOptions, valueLocationOpeningModal]);

  const handleCancel = () => {
    setValueLocationOpeningModal(locationFilter);
    router.back();
  };

  const handleOK = () => {
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
              items={filteredPostalCodes}
              placeholder={t('filters.locationPlaceholder')}
              onValueChange={(value) => setValueLocationOpeningModal(value)}
              value={valueLocationOpeningModal}
              searchable={true}
              searchPlaceholder={t('filters.searchPlaceholder')}
              onChangeSearchText={(text) => setSearchText(text)}
              error={false}
              errorMessage={t('filters.locationError')}
              containerStyle={{ maxHeight: '80%', paddingHorizontal: 4 }}
              enableAlphabeticalGrouping
            />

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
                      label={getLabelFromPostalCode(value, postalCodeOptions)}
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
