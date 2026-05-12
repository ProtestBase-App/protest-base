import React, { useState, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle, Keyboard } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Dropdown } from 'react-native-element-dropdown';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { Typography } from '@/constants/DesignTokens';

export interface DropdownItem {
  label: string;
  value: string;
  disabled?: boolean;
  [key: string]: any;
}

export interface DropdownCustomProps {
  /** Array of items to display in the dropdown */
  items: DropdownItem[];

  /** Placeholder text when no item is selected */
  placeholder?: string;

  /** Currently selected value (controlled component) */
  value?: string;

  /** Callback when selection changes - receives the full item object */
  onValueChange?: (value: string, item?: DropdownItem) => void;

  /** Label field key in item object (default: 'label') */
  labelField?: string;

  /** Value field key in item object (default: 'value') */
  valueField?: string;

  /** Enable search/filter functionality */
  searchable?: boolean;

  /** Custom search placeholder */
  searchPlaceholder?: string;

  /** Custom search query function for filtering */
  searchQuery?: (keyword: string, labelValue: string) => boolean;

  /** Callback when search text changes */
  onChangeSearchText?: (search: string) => void;

  /** Disable the dropdown */
  disabled?: boolean;

  /** Auto-scroll to selected item when opened */
  autoScroll?: boolean;

  /** Show/hide the dropdown programmatically */
  open?: boolean;

  /** Display mode: 'default' (inline), 'modal' (full screen overlay), or 'auto' */
  mode?: 'default' | 'modal' | 'auto';

  /** Maximum height for dropdown list */
  maxHeight?: number;

  /** Minimum height for dropdown list */
  minHeight?: number;

  /** Render dropdown from bottom to top */
  dropdownPosition?: 'auto' | 'top' | 'bottom';

  /** Show or hide selected item in dropdown list */
  showsVerticalScrollIndicator?: boolean;

  /** FlatList props to pass through */
  flatListProps?: any;

  /** Invert FlatList (useful for bottom dropdowns) */
  inverted?: boolean;

  /** Callback when dropdown opens */
  onFocus?: () => void;

  /** Callback when dropdown closes */
  onBlur?: () => void;

  /** Callback when item is confirmed (for modal mode) */
  onConfirmSelectItem?: (item: DropdownItem) => void;

  /** Custom render for each item */
  renderItem?: (item: DropdownItem, selected?: boolean) => React.ReactElement;

  /** Custom render for left icon in trigger */
  renderLeftIcon?: (visible?: boolean) => React.ReactElement;

  /** Custom render for right icon in trigger */
  renderRightIcon?: (visible?: boolean) => React.ReactElement;

  /** Custom render for search input left icon */
  renderInputSearch?: (onSearch: (text: string) => void) => React.ReactElement;

  /** Custom container style */
  containerStyle?: StyleProp<ViewStyle>;

  /** Custom dropdown container style */
  dropdownStyle?: StyleProp<ViewStyle>;

  /** Custom selected text style */
  selectedTextStyle?: StyleProp<any>;

  /** Custom placeholder style */
  placeholderStyle?: StyleProp<any>;

  /** Custom item container style */
  itemContainerStyle?: StyleProp<ViewStyle>;

  /** Custom item text style */
  itemTextStyle?: StyleProp<any>;

  /** Custom search input style */
  inputSearchStyle?: StyleProp<any>;

  /** Icon color */
  iconColor?: string;

  /** Selected item background color */
  activeColor?: string;

  /** Font family for all text */
  fontFamily?: string;

  /** Accessibility label */
  accessibilityLabel?: string;

  /** Item accessibility label field key */
  itemAccessibilityLabelField?: string;

  /** Confirm button text for modal mode */
  confirmSelectItem?: boolean;

  /** Submit button text for modal mode */
  submitButtonText?: string;

  /** Custom confirm button style */
  confirmButtonStyle?: StyleProp<ViewStyle>;

  /** Custom confirm text style */
  confirmTextStyle?: StyleProp<any>;

  /** Error state for form validation */
  error?: boolean;

  errorMessage?: string;

  zIndex?: number;

  excludeSearchField?: boolean;

  /** Enable alphabetical grouping with section headers (A-Z) */
  enableAlphabeticalGrouping?: boolean;

  /** Custom section header render function */
  renderSectionHeader?: (letter: string) => React.ReactElement;

  /** Enable advanced FlatList performance optimizations for very long lists (500+ items) */
  optimizeForLongLists?: boolean;

  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

/**
 * Themed DropdownCustom Component for ProtestBase
 *
 * Features:
 * - Single item selection with radio-style behavior
 * - Integrates with app's dark/light color scheme
 * - Built-in search with highlighted matching text
 * - "No results found" empty state
 * - Full TypeScript support
 * - WCAG 2.1 compliant with 44x44px minimum touch targets
 * - Haptic feedback on selection (iOS & Android)
 * - Keyboard dismissal on scroll, selection, or blur
 * - Virtualized rendering for efficient long lists (FlatList-based)
 * - Optional alphabetical grouping with A-Z section headers
 * - Performance optimizations for 500+ items
 * - Handles z-index management
 * - Error state handling
 *
 * Accessibility:
 * - Dropdown button: 56px height (exceeds 44px minimum)
 * - List items: 44px minimum height (meets WCAG requirement)
 * - Search input: 56px height (exceeds 44px minimum)
 * - Full-width touch targets for easy interaction
 * - Haptic feedback provides tactile confirmation of selections
 *
 * Performance:
 * - Uses FlatList for virtualized rendering (only renders visible items)
 * - Set `optimizeForLongLists={true}` for lists with 500+ items
 * - Enable `enableAlphabeticalGrouping={true}` for easier navigation in long lists
 *
 * Usage:
 * ```tsx
 * const [country, setCountry] = useState<string>('');
 *
 * // Basic usage
 * <DropdownCustom
 *   items={CATEGORIES}
 *   placeholder="Select category"
 *   value={country}
 *   onValueChange={setCountry}
 *   searchable
 * />
 *
 * // Long list usage (e.g., countries)
 * <DropdownCustom
 *   items={ALL_COUNTRIES}
 *   placeholder="Select country"
 *   value={country}
 *   onValueChange={setCountry}
 *   searchable
 *   enableAlphabeticalGrouping  // A-Z headers
 *   optimizeForLongLists        // Performance boost
 * />
 * ```
 */
export function DropdownCustom({
  items,
  placeholder = 'Select...',
  value: externalValue,
  onValueChange,
  labelField = 'label',
  valueField = 'value',
  searchable = true,
  searchPlaceholder = 'Search...',
  searchQuery,
  onChangeSearchText,
  disabled = false,
  autoScroll = true,
  open,
  mode = 'default',
  maxHeight = 300,
  minHeight,
  dropdownPosition = 'auto',
  showsVerticalScrollIndicator = true,
  flatListProps,
  inverted = false,
  onFocus,
  onBlur,
  onConfirmSelectItem,
  renderItem,
  renderLeftIcon,
  renderRightIcon,
  renderInputSearch,
  containerStyle,
  dropdownStyle,
  selectedTextStyle,
  placeholderStyle,
  itemContainerStyle,
  itemTextStyle,
  inputSearchStyle,
  iconColor,
  activeColor,
  fontFamily,
  accessibilityLabel,
  itemAccessibilityLabelField,
  confirmSelectItem,
  submitButtonText,
  confirmButtonStyle,
  confirmTextStyle,
  error = false,
  errorMessage,
  zIndex = 1000,
  excludeSearchField,
  enableAlphabeticalGrouping = false,
  renderSectionHeader,
  optimizeForLongLists = false,
  testID,
}: DropdownCustomProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const [isFocus, setIsFocus] = useState(false);

  const [internalValue, setInternalValue] = useState<string | null>(externalValue || null);

  const [searchText, setSearchText] = useState<string>('');

  // Ref (rather than state) so updates during render don't trigger re-renders.
  const lastRenderedHeaderRef = React.useRef<string | null>(null);

  const processedItems = React.useMemo(() => {
    if (!enableAlphabeticalGrouping) {
      return items;
    }

    return [...items].sort((a, b) => {
      const labelA = String(a[labelField] || '').toLowerCase();
      const labelB = String(b[labelField] || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [items, enableAlphabeticalGrouping, labelField]);

  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue || null);
    }
  }, [externalValue]);

  // Reset section header tracking when search text changes so headers render
  // correctly after filtering.
  useEffect(() => {
    if (enableAlphabeticalGrouping && searchText !== undefined) {
      lastRenderedHeaderRef.current = null;
    }
  }, [searchText, enableAlphabeticalGrouping]);

  const handleChange = async (item: DropdownItem) => {
    try {
      await Haptics.selectionAsync();
    } catch {}

    setInternalValue(item.value);
    setSearchText('');
    Keyboard.dismiss();
    onValueChange?.(item.value, item);
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    onChangeSearchText?.(text);
  };

  const getBorderColor = () => {
    if (error) return themeColors.error;
    if (isFocus) return themeColors.icon;
    return themeColors.inputBorder;
  };

  const getItemLetter = (item: DropdownItem): string => {
    const label = String(item[labelField] || '');
    const firstChar = label.charAt(0).toUpperCase();
    return /[A-Z]/.test(firstChar) ? firstChar : '#';
  };

  const renderDefaultSectionHeader = (letter: string): React.ReactElement => (
    <ThemedView style={[styles.sectionHeader, { backgroundColor: themeColors.background }]}>
      <ThemedText style={[styles.sectionHeaderText, { color: themeColors.tint }]}>
        {letter}
      </ThemedText>
    </ThemedView>
  );

  const highlightText = (
    text: string,
    query: string,
    isSelected: boolean = false
  ): React.ReactElement => {
    const selectedStyle = isSelected
      ? {
          fontFamily: Typography.families.semiBold,
        }
      : {};

    if (!query || !searchable || query.trim() === '') {
      return <ThemedText style={[styles.itemText, selectedStyle]}>{text}</ThemedText>;
    }

    try {
      const parts = text.split(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      );

      return (
        <ThemedText style={styles.itemText}>
          {parts.map((part, index) => {
            const isMatch = part.toLowerCase() === query.toLowerCase();
            return (
              <ThemedText
                key={`${index}-${part}`}
                style={[
                  styles.itemText,
                  selectedStyle,
                  isMatch && {
                    color: themeColors.tint,
                    fontFamily: Typography.families.semiBold,
                  },
                ]}
              >
                {part}
              </ThemedText>
            );
          })}
        </ThemedText>
      );
    } catch {
      return <ThemedText style={[styles.itemText, selectedStyle]}>{text}</ThemedText>;
    }
  };

  const renderItemWithHighlight = (item: DropdownItem, selected?: boolean): React.ReactElement => {
    const label = item[labelField];
    let sectionHeader: React.ReactElement | null = null;

    if (enableAlphabeticalGrouping) {
      const currentLetter = getItemLetter(item);

      if (currentLetter !== lastRenderedHeaderRef.current) {
        lastRenderedHeaderRef.current = currentLetter;
        sectionHeader = renderSectionHeader
          ? renderSectionHeader(currentLetter)
          : renderDefaultSectionHeader(currentLetter);
      }
    }

    return (
      <>
        {sectionHeader}
        <ThemedView
          style={[
            styles.dropdownItem,
            selected && { backgroundColor: themeColors.buttonSecondaryBackground },
          ]}
        >
          {highlightText(label, searchText, selected)}
        </ThemedView>
      </>
    );
  };

  const renderEmptyList = (): React.ReactElement => (
    <ThemedView style={styles.emptyContainer}>
      <IconSymbol size={24} name="magnifyingglass" color={themeColors.secondaryText} />
      <ThemedText style={[styles.emptyTitle, { color: themeColors.text }]}>
        {t('common.noResultsFound')}
      </ThemedText>
      <ThemedText style={[styles.emptyMessage, { color: themeColors.secondaryText }]}>
        {t('common.tryAdjustingSearch')}
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, containerStyle, { zIndex }]}>
      <Dropdown
        testID={testID}
        data={processedItems}
        labelField={labelField}
        valueField={valueField}
        value={internalValue}
        placeholder={placeholder}
        disable={disabled}
        maxHeight={maxHeight}
        minHeight={minHeight}
        mode={mode}
        dropdownPosition={dropdownPosition}
        autoScroll={autoScroll}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        inverted={inverted}
        search={excludeSearchField !== undefined ? !excludeSearchField : searchable}
        searchPlaceholder={searchPlaceholder}
        searchQuery={searchQuery}
        renderItem={renderItem || renderItemWithHighlight}
        renderLeftIcon={renderLeftIcon}
        renderRightIcon={renderRightIcon}
        renderInputSearch={renderInputSearch}
        onChange={handleChange}
        onChangeText={handleSearchTextChange}
        onFocus={() => {
          setIsFocus(true);
          lastRenderedHeaderRef.current = null;
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocus(false);
          lastRenderedHeaderRef.current = null;
          onBlur?.();
        }}
        onConfirmSelectItem={onConfirmSelectItem}
        confirmSelectItem={confirmSelectItem}
        flatListProps={{
          ...flatListProps,
          keyboardShouldPersistTaps: 'handled',
          onScrollBeginDrag: () => Keyboard.dismiss(),

          ListEmptyComponent: renderEmptyList,

          ...(optimizeForLongLists && {
            removeClippedSubviews: true,

            maxToRenderPerBatch: 10,

            updateCellsBatchingPeriod: 50,

            windowSize: 5,

            initialNumToRender: 10,

            getItemLayout: enableAlphabeticalGrouping
              ? undefined // Can't use with section headers as heights vary
              : (_data: any, index: number) => ({
                  length: 44, // minHeight from styles.dropdownItem
                  offset: 44 * index,
                  index,
                }),
          }),
        }}
        style={[
          styles.dropdown,
          {
            backgroundColor: themeColors.inputBackground,
            borderColor: getBorderColor(),
            opacity: disabled ? 0.5 : 1,
            borderBottomLeftRadius: isFocus ? 0 : 12,
            borderBottomRightRadius: isFocus ? 0 : 12,
            shadowColor: isFocus ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isFocus ? (colorScheme === 'dark' ? 0.3 : 0.08) : 0,
            shadowRadius: 4,
            elevation: isFocus ? 3 : 0,
            zIndex: isFocus ? 1000 : 1,
          },
          dropdownStyle,
        ]}
        placeholderStyle={[
          styles.placeholderText,
          { color: themeColors.placeholder },
          placeholderStyle,
        ]}
        selectedTextStyle={[styles.selectedText, { color: themeColors.text }, selectedTextStyle]}
        inputSearchStyle={[
          styles.searchInput,
          {
            backgroundColor: themeColors.inputBackground,
            borderColor: themeColors.border,
            color: themeColors.text,
          },
          inputSearchStyle,
        ]}
        containerStyle={[
          {
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            borderWidth: 2,
            borderTopWidth: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            marginTop: -2,
            paddingTop: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colorScheme === 'dark' ? 0.6 : 0.15,
            shadowRadius: 12,
            elevation: 8,
            overflow: 'hidden',
          },
          containerStyle,
        ]}
        itemContainerStyle={[
          {
            borderBottomColor: themeColors.border,
            borderBottomWidth: 0.5,
          },
          itemContainerStyle,
        ]}
        itemTextStyle={[
          {
            color: themeColors.text,
            fontSize: Typography.sizes.sm,
            paddingVertical: 4,
          },
          itemTextStyle,
        ]}
        iconColor={iconColor || themeColors.icon}
        activeColor={activeColor || themeColors.buttonSecondaryBackground}
        fontFamily={fontFamily}
        accessibilityLabel={accessibilityLabel || placeholder}
        itemAccessibilityLabelField={itemAccessibilityLabelField}
      />

      {error && errorMessage && (
        <ThemedView style={styles.errorContainer}>
          <ThemedView style={styles.errorTextWrapper}>
            <ThemedView style={[styles.errorDot, { backgroundColor: themeColors.error }]} />
            <ThemedText style={[styles.errorText, { color: themeColors.error }]}>
              {errorMessage}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  dropdown: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  placeholderText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  selectedText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  searchInput: {
    height: 56,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 16,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginVertical: 0,
  },
  errorContainer: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 6,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  dropdownItem: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  itemText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  emptyContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionHeaderText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    letterSpacing: 0.5,
  },
});

/**
 * Helper hook for managing multiple dropdowns on the same screen
 * Returns z-index values to prevent overlap issues
 * Works with both DropdownCustom and DropdownMultiselect
 *
 * Usage:
 * ```tsx
 * const zIndexes = useDropdownZIndex(3); // For 3 dropdowns
 *
 * <DropdownCustom zIndex={zIndexes[0]} ... />       // z-index: 3000
 * <DropdownMultiselect zIndex={zIndexes[1]} ... />  // z-index: 2000
 * <DropdownCustom zIndex={zIndexes[2]} ... />       // z-index: 1000
 * ```
 *
 * @param count - Number of dropdowns on the screen
 * @returns Array of z-index values in descending order
 */
export function useDropdownZIndex(count: number): number[] {
  return Array.from({ length: count }, (_, i) => 3000 - i * 1000);
}

/**
 * Helper function to sort items alphabetically
 * Use this to pre-sort your items before passing to the dropdown
 * Particularly useful when not using enableAlphabeticalGrouping
 * to maintain original order but ensure consistent display
 *
 * @param items - Array of dropdown items to sort
 * @param labelField - Field to sort by (default: 'label')
 * @returns Sorted array of items
 *
 * @example
 * ```tsx
 * const sortedCountries = sortDropdownItems(ALL_COUNTRIES);
 * <DropdownCustom items={sortedCountries} ... />
 * ```
 */
export function sortDropdownItems(
  items: DropdownItem[],
  labelField: string = 'label'
): DropdownItem[] {
  return [...items].sort((a, b) => {
    const labelA = String(a[labelField] || '').toLowerCase();
    const labelB = String(b[labelField] || '').toLowerCase();
    return labelA.localeCompare(labelB);
  });
}
