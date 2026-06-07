import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useExploreTabContext } from '@/context/ExploreTabProvider';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useOrganizations } from '@/context/OrganizationsProvider';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import CustomButton from '@/components/CustomButton';
import DateRadioButton from '@/components/DateRadioButton';
import FiltersInputBoxArray from '@/components/ExploreFiltersInputBoxArray';

import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

export default function FiltersModal() {
  const insets = useSafeAreaInsets();
  const {
    valueCategoryOpeningModal,
    setValueCategoryOpeningModal,
    valueDateOpeningModal,
    setValueDateOpeningModal,
    locationFilter,
    setLocationFilter,
    setValueLocationOpeningModal,
    organizationFilter,
    setOrganizationFilter,
    setValueOrganizationOpeningModal,
    globalLocationFilterValue,
    setGlobalLocationFilterValue,
    globalOrganizationFilterValue,
    setGlobalOrganizationFilterValue,
    setShouldScrollToTop,
  } = useExploreTabContext();
  const { resolveLocationLabel } = usePostalCodes();
  const { dropdownItems: orgDropdownItems } = useOrganizations();

  const [selectedValueDate, setSelectedValueDate] = useState<string | null>('allDates');
  const [selectedValueCategory, setSelectedValueCategory] = useState<string | null>(
    'allCategories'
  );
  const [isSubmitting, setSubmitting] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  useEffect(() => {
    setSelectedValueDate(valueDateOpeningModal);
    setSelectedValueCategory(valueCategoryOpeningModal);
  }, [valueDateOpeningModal, valueCategoryOpeningModal]);

  const handleCancelFilters = () => {
    router.back();
    setLocationFilter(globalLocationFilterValue);
    setValueLocationOpeningModal(globalLocationFilterValue);
    setOrganizationFilter(globalOrganizationFilterValue);
    setValueOrganizationOpeningModal(globalOrganizationFilterValue);
    setSelectedValueDate(valueDateOpeningModal);
    setSelectedValueCategory(valueCategoryOpeningModal);
  };

  const handleResetFilters = () => {
    setLocationFilter([]);
    setValueLocationOpeningModal([]);
    setOrganizationFilter([]);
    setValueOrganizationOpeningModal([]);
    setSelectedValueDate('allDates');
    setSelectedValueCategory('allCategories');
  };

  const handleRadioChangeDate = (value: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedValueDate(value);
    }
  };

  const handleRadioChangeCategory = (value: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedValueCategory(value);
    }
  };

  const handleConfirmFilters = () => {
    setSubmitting(true);

    // Update global filter values - the useExplorePagination hook will automatically
    // re-fetch with these new filters when the context values change
    setGlobalLocationFilterValue(locationFilter);
    setValueDateOpeningModal(selectedValueDate);
    setGlobalOrganizationFilterValue(organizationFilter);
    setValueCategoryOpeningModal(selectedValueCategory);
    setShouldScrollToTop(true);
    router.back();
    setSubmitting(false);
  };

  if (isSubmitting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView
        style={[
          styles.headerContainer,
          { backgroundColor: themeColors.headerBackground, borderBottomColor: themeColors.chevron },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleCancelFilters()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText type="subtitle">{t('common.cancel')}</ThemedText>
        </TouchableOpacity>

        <ThemedText type="subtitleMedium">{t('filters.title')}</ThemedText>

        <TouchableOpacity
          onPress={() => handleResetFilters()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText type="subtitle">{t('common.reset')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ThemedView style={styles.contentContainer}>
          <ThemedView>
            <ThemedText type="subtitleMedium" style={styles.subtitleMedium}>
              {t('filters.location')}
            </ThemedText>

            <FiltersInputBoxArray
              value={locationFilter.map((value: string) => resolveLocationLabel(value))}
              onPress={() => router.navigate('/(tabs)/(explore)/location-filter')}
              placeholderText={t('filters.allLocations')}
            />
          </ThemedView>

          <ThemedView>
            <ThemedText type="subtitleMedium" style={styles.subtitleMedium}>
              {t('filters.date')}
            </ThemedText>

            <DateRadioButton
              label={t('filters.allDates')}
              value="allDates"
              isChecked={selectedValueDate === 'allDates'}
              onSelectionChange={handleRadioChangeDate}
            />
            <DateRadioButton
              label={t('filters.today')}
              value="today"
              isChecked={selectedValueDate === 'today'}
              onSelectionChange={handleRadioChangeDate}
            />
            <DateRadioButton
              label={t('filters.tomorrow')}
              value="tomorrow"
              isChecked={selectedValueDate === 'tomorrow'}
              onSelectionChange={handleRadioChangeDate}
            />
            <DateRadioButton
              label={t('filters.thisWeek')}
              value="thisWeek"
              isChecked={selectedValueDate === 'thisWeek'}
              onSelectionChange={handleRadioChangeDate}
            />
            <DateRadioButton
              label={t('filters.thisWeekend')}
              value="thisWeekend"
              isChecked={selectedValueDate === 'thisWeekend'}
              onSelectionChange={handleRadioChangeDate}
            />
          </ThemedView>

          <ThemedView>
            <ThemedText type="subtitleMedium" style={styles.subtitleMedium}>
              {t('filters.organization')}
            </ThemedText>
            <FiltersInputBoxArray
              value={organizationFilter.map((orgId: string) => {
                const org = orgDropdownItems.find((item) => item.value === orgId);
                return org ? org.label : orgId;
              })}
              onPress={() => router.navigate('/(tabs)/(explore)/org-filter')}
              placeholderText={t('filters.allOrganizations')}
            />
          </ThemedView>

          <ThemedView>
            <ThemedText type="subtitleMedium" style={styles.subtitleMedium}>
              {t('filters.category')}
            </ThemedText>

            <DateRadioButton
              label={t('filters.allCategories')}
              value="allCategories"
              isChecked={selectedValueCategory === 'allCategories'}
              onSelectionChange={handleRadioChangeCategory}
            />
            <DateRadioButton
              label={t('categories.protest')}
              value="Protest"
              isChecked={selectedValueCategory === 'Protest'}
              onSelectionChange={handleRadioChangeCategory}
            />
            <DateRadioButton
              label={t('categories.act')}
              value="Act"
              isChecked={selectedValueCategory === 'Act'}
              onSelectionChange={handleRadioChangeCategory}
            />
            <DateRadioButton
              label={t('categories.learn')}
              value="Learn"
              isChecked={selectedValueCategory === 'Learn'}
              onSelectionChange={handleRadioChangeCategory}
            />
            <DateRadioButton
              label={t('categories.support')}
              value="Support"
              isChecked={selectedValueCategory === 'Support'}
              onSelectionChange={handleRadioChangeCategory}
            />
            <DateRadioButton
              label={t('categories.strike')}
              value="Strike"
              isChecked={selectedValueCategory === 'Strike'}
              onSelectionChange={handleRadioChangeCategory}
            />
          </ThemedView>
        </ThemedView>
      </ScrollView>

      <ThemedView style={styles.footerContainer}>
        <CustomButton
          title={t('filters.confirmFilters')}
          handlePress={() => handleConfirmFilters()}
          containerStyles={styles.confirmButton}
          isLoading={false}
        />
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
    borderBottomWidth: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  subtitleMedium: {
    fontSize: Typography.sizes.lg,
    marginVertical: 8,
  },
  filtersInputBoxArrayContainer: {},
  footerContainer: {
    padding: 20,
  },
  confirmButton: {
    minHeight: 52,
    marginVertical: 8,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
