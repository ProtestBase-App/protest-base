import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { FormScreenScaffold, useFormKeyboard } from '@/components/FormScreenScaffold';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import {
  SheetSearchMultiSelect,
  SheetSearchMultiSelectOption,
  SheetSearchMultiSelectProps,
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
 * keyboardShouldPersistTaps="handled" for row taps while the keyboard is up, and
 * keeps room for the picker's dropdown between the input and the keyboard.
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
        : locationFilterOptions
            // A whole country is no "area": nothing to rank by or center on.
            .filter((option) => option.tier !== 'country')
            .map((option) => ({
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
    // The Stack header sits above, so only the side and bottom edges are padded.
    <FormScreenScaffold
      edges={['left', 'right', 'bottom']}
      contentContainerStyle={styles.scrollContent}
    >
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.intro, { color: themeColors.secondaryText }]}>
          {t('homeArea.empty')}
        </ThemedText>

        <HomeAreaPicker
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
    </FormScreenScaffold>
  );
}

/** The picker, reporting focus to the scaffold so it keeps room for the dropdown. */
function HomeAreaPicker(props: SheetSearchMultiSelectProps) {
  const { setDropdownFocused } = useFormKeyboard();
  return <SheetSearchMultiSelect {...props} onFocusChange={setDropdownFocused} />;
}

const styles = StyleSheet.create({
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
