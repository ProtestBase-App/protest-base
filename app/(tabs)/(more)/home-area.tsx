import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import {
  SheetSearchMultiSelect,
  SheetSearchMultiSelectOption,
} from '@/components/SheetSearchMultiSelect';
import { PillButton } from '@/components/ui/PillButton';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useHomeArea } from '@/context/HomeAreaProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';

/**
 * "Home area" settings screen: pick a single administrative area (city,
 * province, or region) that the Maps tab uses to sort nearby protests first and
 * recenter the map. No GPS — the choice is a public admin token stored only on
 * this device. The picker hosts ~940 searchable options, so the screen sets
 * keyboardShouldPersistTaps="handled" for row taps while the keyboard is up.
 */
export default function HomeAreaScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { locationFilterOptions, resolveLocationLabel, loading } = usePostalCodes();
  const { homeAreaToken, setHomeArea } = useHomeArea();

  const options = useMemo<SheetSearchMultiSelectOption[]>(
    () =>
      loading
        ? []
        : locationFilterOptions.map((option) => ({
            value: option.value,
            label: option.label,
            searchText: option.searchText,
            sublabel:
              option.provinceLabel || t('filters.postalCodesCount', { count: option.count }),
          })),
    [loading, locationFilterOptions]
  );

  const selected = useMemo(() => (homeAreaToken ? [homeAreaToken] : []), [homeAreaToken]);

  const handleChange = useCallback(
    (next: string[]) => {
      void setHomeArea(next[0] ?? null);
    },
    [setHomeArea]
  );

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedText style={[styles.intro, { color: themeColors.secondaryText }]}>
              {t('homeArea.empty')}
            </ThemedText>

            <SheetSearchMultiSelect
              options={options}
              selected={selected}
              onChange={handleChange}
              placeholder={t('homeArea.pickerPlaceholder')}
              resolveSelectedLabel={resolveLocationLabel}
              leadingIconName="mappin.and.ellipse"
              singleSelect
            />

            {homeAreaToken ? (
              <PillButton
                variant="outline"
                height={46}
                label={t('homeArea.clear')}
                leftIcon="xmark"
                onPress={() => void setHomeArea(null)}
                style={styles.clearButton}
              />
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: Spacing.lg,
  },
  intro: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  clearButton: {
    marginTop: Spacing.lg,
  },
});
