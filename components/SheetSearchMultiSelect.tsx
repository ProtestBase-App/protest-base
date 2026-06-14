import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FilterChip } from '@/components/ui/FilterChip';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';

export interface SheetSearchMultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  /** Lowercased search haystack; falls back to the lowercased label. */
  searchText?: string;
}

export interface SheetSearchMultiSelectProps {
  options: SheetSearchMultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  resolveSelectedLabel: (value: string) => string;
  leadingIconName: 'mappin.and.ellipse' | 'person';
  /** Minimum query length before suggestions appear (0 = show on focus). */
  minSearchLength?: number;
  maxVisibleOptions?: number;
  /**
   * Restrict the selection to a single value: picking an option replaces the
   * current selection and collapses the dropdown. The selected value still
   * renders as one removable chip above the input. Defaults to multi-select.
   */
  singleSelect?: boolean;
  /**
   * Cap the number of selected values (multi-select only). Once reached, no more
   * options are offered until a chip is removed. Ignored when singleSelect.
   */
  maxSelected?: number;
  /** Hint shown once the maxSelected cap is reached (e.g. "Max 10 co-organizers"). */
  maxSelectedHint?: string;
  /**
   * Lock the control: the search input is non-editable, the dropdown never
   * opens, and the selected chip(s) cannot be removed. Used when the value is
   * derived from another field (e.g. the postal code is set by an accepted
   * street suggestion). The selected value still renders, greyed out.
   */
  disabled?: boolean;
  testID?: string;
}

/**
 * Searchable multi-select used inside the calendar filter sheet: selected
 * values render as removable chips above a search input, and matching options
 * drop down inline below the input (pushing content down — the sheet scrolls).
 *
 * NOTE: the dropdown rows are plain Pressables rendered inside the parent
 * sheet's ScrollView, which must set keyboardShouldPersistTaps="handled" so
 * row taps land while the keyboard is up.
 */
export function SheetSearchMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  resolveSelectedLabel,
  leadingIconName,
  minSearchLength = 0,
  maxVisibleOptions = 5,
  singleSelect = false,
  maxSelected,
  maxSelectedHint,
  disabled = false,
  testID,
}: SheetSearchMultiSelectProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // Delay blur so taps on dropdown rows land before the list unmounts.
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setFocused(false), 120);
  };

  const normalizedQuery = query.trim().toLowerCase();

  // Multi-select cap: once reached, stop offering options until a chip is removed.
  // singleSelect always replaces its one value, so the cap never applies there.
  const atMax = !singleSelect && maxSelected != null && selected.length >= maxSelected;

  const visibleOptions = useMemo(() => {
    if (disabled || !focused || atMax) return [];
    if (normalizedQuery.length < minSearchLength) return [];
    const unselected = options.filter((option) => !selected.includes(option.value));
    const matched =
      normalizedQuery.length === 0
        ? unselected
        : unselected.filter((option) =>
            (option.searchText ?? option.label.toLowerCase()).includes(normalizedQuery)
          );
    return matched.slice(0, maxVisibleOptions);
  }, [
    disabled,
    focused,
    atMax,
    normalizedQuery,
    options,
    selected,
    minSearchLength,
    maxVisibleOptions,
  ]);

  const dropdownOpen = visibleOptions.length > 0;

  const handleRemove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const handleSelect = (value: string) => {
    if (atMax) return;
    onChange(singleSelect ? [value] : [...selected, value]);
    setQuery('');
    if (singleSelect) {
      // Single value chosen — collapse the dropdown rather than inviting another pick.
      inputRef.current?.blur();
    } else {
      // Keep the input focused so the user can chain selections.
      inputRef.current?.focus();
    }
  };

  const handleClearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <View testID={testID}>
      {selected.length > 0 && (
        <View style={styles.selectedRow}>
          {selected.map((value) => {
            const label = resolveSelectedLabel(value);
            return (
              <FilterChip
                key={value}
                label={label}
                small
                active
                removable={!disabled}
                disabled={disabled}
                leading={<IconSymbol name={leadingIconName} size={11} color={themeColors.tint} />}
                onPress={() => handleRemove(value)}
                accessibilityLabel={`Remove ${label}`}
              />
            );
          })}
        </View>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: themeColors.surfaceAltBackground,
            borderColor: focused ? themeColors.inputBorderFocused : themeColors.cardBorder,
          },
          dropdownOpen && styles.inputRowOpen,
          disabled && styles.inputRowDisabled,
        ]}
      >
        <IconSymbol name="magnifyingglass" size={15} color={themeColors.placeholder} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: themeColors.text }]}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          autoCorrect={false}
          editable={!disabled}
          underlineColorAndroid="transparent"
          accessibilityLabel={placeholder}
          accessibilityState={{ disabled }}
        />
        {!disabled && query.length > 0 && (
          <Pressable
            onPress={handleClearQuery}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <IconSymbol name="xmark" size={12} color={themeColors.placeholder} />
          </Pressable>
        )}
      </View>

      {dropdownOpen && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: themeColors.surfaceAltBackground,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          {visibleOptions.map((option, index) => (
            <Pressable
              key={option.value}
              style={[
                styles.optionRow,
                index > 0 && { borderTopWidth: 0.5, borderTopColor: themeColors.separator },
              ]}
              onPress={() => handleSelect(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <IconSymbol name={leadingIconName} size={12} color={themeColors.secondaryText} />
              <View style={styles.optionText}>
                <ThemedText style={styles.optionLabel} numberOfLines={1}>
                  {option.label}
                </ThemedText>
                {option.sublabel ? (
                  <ThemedText style={[styles.optionSublabel, { color: themeColors.secondaryText }]}>
                    {option.sublabel}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText style={[styles.optionAdd, { color: themeColors.placeholder }]}>
                +
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {atMax && maxSelectedHint ? (
        <ThemedText style={[styles.maxHint, { color: themeColors.secondaryText }]}>
          {maxSelectedHint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  inputRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputRowDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    paddingVertical: 0,
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
    lineHeight: 18,
  },
  optionSublabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    lineHeight: 16,
  },
  optionAdd: {
    fontSize: Typography.sizes.base,
  },
  maxHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: 6,
  },
});

export default SheetSearchMultiSelect;
