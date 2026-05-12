import React, { useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useExploreTabContext } from '@/context/ExploreTabProvider';
import { DropdownMultiselect } from '@/components/DropdownMultiselect';
import { RemovableChip } from '@/components/RemovableChip';
import { IconSymbol } from '@/components/ui/IconSymbol';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import { useOrganizations } from '@/context/OrganizationsProvider';
import { t } from '@/utils/i18n';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';

export default function OrganizationFilter() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const {
    organizationFilter,
    setOrganizationFilter,
    valueOrganizationOpeningModal,
    setValueOrganizationOpeningModal,
  } = useExploreTabContext();
  const { dropdownItems: organizations } = useOrganizations();

  // Create a lookup map for organization names by value
  const orgLookup = useMemo(
    () => new Map(organizations.map((o) => [o.value, o.label])),
    [organizations]
  );

  const handleRemoveOrganization = useCallback(
    (valueToRemove: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setValueOrganizationOpeningModal(
        valueOrganizationOpeningModal.filter((v: string) => v !== valueToRemove)
      );
    },
    [valueOrganizationOpeningModal, setValueOrganizationOpeningModal]
  );

  const handleClearAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValueOrganizationOpeningModal([]);
  }, [setValueOrganizationOpeningModal]);

  const handleCancel = () => {
    setValueOrganizationOpeningModal(organizationFilter);
    router.back();
  };

  const handleOK = () => {
    setOrganizationFilter(valueOrganizationOpeningModal);
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

        <ThemedText type="subtitleMedium">{t('filters.organization')}</ThemedText>

        <TouchableOpacity
          onPress={() => handleOK()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText type="subtitle">{t('common.ok')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.contentContainer}>
        <DropdownMultiselect
          items={organizations}
          placeholder={t('filters.organizationPlaceholder')}
          onValueChange={(value) => setValueOrganizationOpeningModal(value)}
          value={valueOrganizationOpeningModal}
          searchable={true}
          searchPlaceholder={t('filters.searchOrganizations')}
          error={false}
          errorMessage={t('filters.organizationError')}
          containerStyle={{ maxHeight: '80%', paddingHorizontal: 4 }}
        />

        {/* Clear all button */}
        {valueOrganizationOpeningModal && valueOrganizationOpeningModal.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.clearAllButton}
            accessibilityLabel={t('filters.clearAllOrganizations')}
            accessibilityRole="button"
          >
            <IconSymbol name="xmark.circle.fill" size={20} color={themeColors.secondaryText} />
            <ThemedText style={styles.clearAllText}>{t('common.clearAll')}</ThemedText>
          </TouchableOpacity>
        )}

        {/* Display selected items as chips */}
        {valueOrganizationOpeningModal && valueOrganizationOpeningModal.length > 0 && (
          <ThemedView style={styles.selectedChipsContainer}>
            <ThemedText style={styles.selectedChipsLabel}>
              {t('createEvent.selected')} ({valueOrganizationOpeningModal.length}):
            </ThemedText>
            <ThemedView style={styles.chipsWrapper}>
              {valueOrganizationOpeningModal.map((value: string) => (
                <RemovableChip
                  key={value}
                  label={orgLookup.get(value) || value}
                  value={value}
                  onRemove={handleRemoveOrganization}
                  accessibilityContext="selected organizations"
                />
              ))}
            </ThemedView>
          </ThemedView>
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
