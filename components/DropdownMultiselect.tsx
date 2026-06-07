import React, { useState, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle, Keyboard } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MultiSelect } from 'react-native-element-dropdown';
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

export interface DropdownMultiselectProps {
  /** Array of items to display in the dropdown */
  items: DropdownItem[];

  /** Placeholder text when no items are selected */
  placeholder?: string;

  /** Currently selected values (controlled component) - array of values */
  value?: string[];

  /** Callback when selection changes - receives array of selected values */
  onValueChange?: (values: string[]) => void;

  /** Label field key in item object (default: 'label') */
  labelField?: string;

  /** Value field key in item object (default: 'value') */
  valueField?: string;

  /** Enable search/filter functionality */
  searchable?: boolean;

  /** Custom search placeholder */
  searchPlaceholder?: string;

  /** Custom search query function for filtering */
  searchQuery?: (keyword: string, labelText: string) => boolean;

  /**
   * Item field matched against the search keyword (default: labelField). Set to
   * a combined search field (e.g. name + member codes) so a query can match
   * content not shown in the visible label.
   */
  searchField?: string;

  /** Item field rendered as a muted secondary line under the label. */
  sublabelField?: string;

  /**
   * Returns a section-header key for grouping (overrides alphabetical grouping).
   * Items must be pre-sorted by the caller so equal keys are contiguous.
   */
  sectionKeyExtractor?: (item: DropdownItem) => string;

  /** Callback when search text changes */
  onChangeSearchText?: (search: string) => void;

  /** Disable the dropdown */
  disabled?: boolean;

  /** Display mode: 'default' (inline), 'modal' (full screen overlay), or 'auto' */
  mode?: 'default' | 'modal' | 'auto';

  /** Maximum height of dropdown list */
  maxHeight?: number;

  /** Minimum height of dropdown list */
  minHeight?: number;

  /** Maximum number of items that can be selected */
  maxSelect?: number;

  /** Dropdown position: 'auto', 'top', or 'bottom' */
  dropdownPosition?: 'auto' | 'top' | 'bottom';

  /** Show vertical scroll indicator */
  showsVerticalScrollIndicator?: boolean;

  /** Auto scroll to selected items */
  autoScroll?: boolean;

  /** FlatList props for customization */
  flatListProps?: any;

  /** Keep modal open after selecting items (useful for multiple selections) */
  closeModalWhenSelectedItem?: boolean;

  /** Callback when dropdown opens */
  onFocus?: () => void;

  /** Callback when dropdown closes */
  onBlur?: () => void;

  /** Custom render function for each item */
  renderItem?: (item: DropdownItem, selected?: boolean) => React.ReactElement;

  /** Custom render for left icon */
  renderLeftIcon?: () => React.ReactElement;

  /** Custom render for right icon */
  renderRightIcon?: () => React.ReactElement;

  /** Custom render for search input */
  renderInputSearch?: (onSearch: (text: string) => void) => React.ReactElement;

  /** Custom container style */
  containerStyle?: StyleProp<ViewStyle>;

  /** Custom dropdown trigger style */
  dropdownStyle?: StyleProp<ViewStyle>;

  /** Custom selected text style */
  selectedTextStyle?: StyleProp<TextStyle>;

  /** Custom placeholder style */
  placeholderStyle?: StyleProp<TextStyle>;

  /** Custom item container style */
  itemContainerStyle?: StyleProp<ViewStyle>;

  /** Custom item text style */
  itemTextStyle?: StyleProp<TextStyle>;

  /** Custom search input style */
  inputSearchStyle?: StyleProp<TextStyle>;

  /** Icon color */
  iconColor?: string;

  /** Active/selected item background color */
  activeColor?: string;

  /** Font family for all text */
  fontFamily?: string;

  /** Accessibility label */
  accessibilityLabel?: string;

  /** Field name for item accessibility labels */
  itemAccessibilityLabelField?: string;

  /** Error state for form validation */
  error?: boolean;

  /** Error message to display */
  errorMessage?: string;

  /** z-index for the dropdown (useful when multiple dropdowns on same screen) */
  zIndex?: number;

  /** Show selected count badge (replaces default selected items display) */
  showBadge?: boolean;

  /** Custom badge text (e.g., "3 selected") - if not provided, shows count */
  badgeText?: string;

  /** Badge style customization */
  badgeStyle?: StyleProp<ViewStyle>;

  /** Badge text style */
  badgeTextStyle?: StyleProp<TextStyle>;

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
 * Themed DropdownMultiselect Component for ProtestBase
 *
 * Features:
 * - Multiple item selection with checkboxes
 * - Integrates with app's dark/light color scheme
 * - Built-in search functionality with "No results" empty state
 * - Full TypeScript support
 * - WCAG 2.1 compliant with 44x44px minimum touch targets
 * - Haptic feedback on selection (iOS & Android)
 * - Keyboard dismissal on scroll, selection, or blur
 * - Virtualized rendering for efficient long lists (FlatList-based)
 * - Optional alphabetical grouping with A-Z section headers
 * - Performance optimizations for 500+ items
 * - Handles z-index management
 * - Error state handling
 * - Selected items badge with count
 * - Maximum selection limit with warning
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
 * const [countries, setCountries] = useState<string[]>([]);
 *
 * // Basic usage
 * <DropdownMultiselect
 *   items={CATEGORIES}
 *   placeholder="Select categories"
 *   value={countries}
 *   onValueChange={setCountries}
 *   searchable
 *   maxSelect={3}
 * />
 *
 * // Long list usage (e.g., countries)
 * <DropdownMultiselect
 *   items={ALL_COUNTRIES}
 *   placeholder="Select countries"
 *   value={countries}
 *   onValueChange={setCountries}
 *   searchable
 *   enableAlphabeticalGrouping
 *   optimizeForLongLists
 * />
 * ```
 */
export function DropdownMultiselect({
  items,
  placeholder = 'Select items...',
  value: externalValue,
  onValueChange,
  labelField = 'label',
  valueField = 'value',
  searchable = true,
  searchPlaceholder = 'Search...',
  searchQuery,
  searchField,
  sublabelField,
  sectionKeyExtractor,
  onChangeSearchText,
  disabled = false,
  mode = 'default',
  maxHeight = 300,
  minHeight,
  maxSelect,
  dropdownPosition = 'auto',
  showsVerticalScrollIndicator = true,
  flatListProps,
  onFocus,
  onBlur,
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
  error = false,
  errorMessage,
  zIndex = 1000,
  showBadge = false,
  badgeStyle,
  badgeTextStyle,
  enableAlphabeticalGrouping = false,
  renderSectionHeader,
  optimizeForLongLists = false,
  testID,
}: DropdownMultiselectProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const [isFocus, setIsFocus] = useState(false);

  const [internalValue, setInternalValue] = useState<string[]>(externalValue || []);

  const [searchText, setSearchText] = useState<string>('');

  // Ref (rather than state) so updates during render don't trigger re-renders.
  const lastRenderedHeaderRef = React.useRef<string | null>(null);

  // Custom section grouping assumes caller-sorted items; alphabetical grouping
  // sorts by label here.
  const groupingEnabled = enableAlphabeticalGrouping || !!sectionKeyExtractor;

  const processedItems = React.useMemo(() => {
    if (sectionKeyExtractor || !enableAlphabeticalGrouping) {
      return items;
    }

    return [...items].sort((a, b) => {
      const labelA = String(a[labelField] || '').toLowerCase();
      const labelB = String(b[labelField] || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [items, enableAlphabeticalGrouping, labelField, sectionKeyExtractor]);

  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  const handleChange = async (selectedItems: string[]) => {
    if (maxSelect && selectedItems.length > maxSelect) {
      return;
    }

    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics not available on all devices; silently fall through.
    }

    setInternalValue(selectedItems);
    onValueChange?.(selectedItems);

    Keyboard.dismiss();
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    onChangeSearchText?.(text);
  };

  const handleFocus = () => {
    setIsFocus(true);
    lastRenderedHeaderRef.current = null;
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocus(false);
    lastRenderedHeaderRef.current = null;
    Keyboard.dismiss();
    onBlur?.();
  };

  const getBorderColor = () => {
    if (error) return themeColors.error;
    if (isFocus) return themeColors.icon;
    return themeColors.inputBorder;
  };

  const getItemLetter = (item: DropdownItem): string => {
    const label = String(item[labelField] || '');
    const firstChar = label.charAt(0).toUpperCase();
    // Non-alphabetic labels fall into a '#' bucket.
    return /[A-Z]/.test(firstChar) ? firstChar : '#';
  };

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
      return (
        <ThemedText style={[styles.itemText, selectedStyle, { color: themeColors.text }]}>
          {text}
        </ThemedText>
      );
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
                  { color: themeColors.text },
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
      return (
        <ThemedText style={[styles.itemText, selectedStyle, { color: themeColors.text }]}>
          {text}
        </ThemedText>
      );
    }
  };

  const renderDefaultSectionHeader = (letter: string): React.ReactElement => (
    <ThemedView style={[styles.sectionHeader, { backgroundColor: themeColors.background }]}>
      <ThemedText style={[styles.sectionHeaderText, { color: themeColors.tint }]}>
        {letter}
      </ThemedText>
    </ThemedView>
  );

  const renderItemDefault = (item: DropdownItem, selected?: boolean): React.ReactElement => {
    let sectionHeader: React.ReactElement | null = null;

    if (groupingEnabled) {
      const currentKey = sectionKeyExtractor ? sectionKeyExtractor(item) : getItemLetter(item);

      if (currentKey !== lastRenderedHeaderRef.current) {
        lastRenderedHeaderRef.current = currentKey;
        sectionHeader = renderSectionHeader
          ? renderSectionHeader(currentKey)
          : renderDefaultSectionHeader(currentKey);
      }
    }

    const label = item[labelField];
    const sublabel = sublabelField ? item[sublabelField] : undefined;

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
          {sublabel ? (
            <ThemedText style={[styles.sublabelText, { color: themeColors.secondaryText }]}>
              {sublabel}
            </ThemedText>
          ) : null}
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
      <MultiSelect
        testID={testID}
        data={processedItems}
        labelField={labelField}
        valueField={valueField}
        searchField={searchField as never}
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        visibleSelectedItem={false}
        search={searchable}
        searchPlaceholder={searchPlaceholder}
        searchQuery={searchQuery}
        onChangeText={handleSearchTextChange}
        disable={disabled}
        mode={mode}
        maxHeight={maxHeight}
        minHeight={minHeight}
        maxSelect={maxSelect}
        dropdownPosition={dropdownPosition}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
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

            getItemLayout:
              groupingEnabled || sublabelField
                ? undefined // Heights vary with section headers / sublabels
                : (_data: any, index: number) => ({
                    length: 44, // minHeight from styles.dropdownItem
                    offset: 44 * index,
                    index,
                  }),
          }),
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        renderItem={renderItem || renderItemDefault}
        renderLeftIcon={renderLeftIcon}
        renderRightIcon={renderRightIcon}
        renderInputSearch={renderInputSearch}
        style={[
          styles.dropdown,
          dropdownStyle,
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
        ]}
        placeholderStyle={[
          styles.placeholderText,
          placeholderStyle,
          { color: themeColors.placeholder },
        ]}
        selectedTextStyle={[
          styles.selectedText,
          selectedTextStyle,
          {
            color: 'transparent',
            width: 0,
            height: 0,
          },
        ]}
        inputSearchStyle={[
          styles.searchInput,
          inputSearchStyle,
          {
            backgroundColor: themeColors.inputBackground,
            borderColor: themeColors.border,
            color: themeColors.text,
          },
        ]}
        containerStyle={{
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
        }}
        itemContainerStyle={[
          itemContainerStyle,
          {
            borderBottomColor: themeColors.border,
            borderBottomWidth: 0.5,
          },
        ]}
        itemTextStyle={[
          {
            color: themeColors.text,
            fontSize: Typography.sizes.sm,
          },
          itemTextStyle,
        ]}
        iconColor={iconColor || themeColors.icon}
        activeColor={activeColor || themeColors.buttonSecondaryBackground}
        fontFamily={fontFamily}
        accessibilityLabel={accessibilityLabel || placeholder}
        itemAccessibilityLabelField={itemAccessibilityLabelField}
      />

      {showBadge && internalValue.length > 0 && (
        <ThemedView style={[styles.badge, badgeStyle, { backgroundColor: themeColors.tint }]}>
          <ThemedText style={[styles.badgeText, badgeTextStyle, { color: '#FFFFFF' }]}>
            {internalValue.length}
            {maxSelect && ` / ${maxSelect}`}
          </ThemedText>
        </ThemedView>
      )}

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

      {maxSelect && internalValue.length >= maxSelect && (
        <ThemedView style={styles.warningContainer}>
          <ThemedText style={[styles.warningText, { color: themeColors.tint }]}>
            Maximum {maxSelect} items can be selected
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative',
  },
  // 56px height exceeds WCAG 44px minimum touch target
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
  // 56px height exceeds WCAG 44px minimum touch target
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
  // 44px minHeight meets WCAG minimum touch target
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
  sublabelText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.semiBold,
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
  warningContainer: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  warningText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    fontStyle: 'italic',
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
 * Helper function to get display text for selected items
 * Useful for displaying selected items in a summary view
 */
export function getSelectedItemsText(
  selectedValues: string[],
  allItems: DropdownItem[],
  labelField: string = 'label',
  valueField: string = 'value',
  separator: string = ', ',
  maxDisplay: number = 3
): string {
  if (selectedValues.length === 0) return '';

  const selectedItems = allItems.filter((item) => selectedValues.includes(item[valueField]));

  const labels = selectedItems.map((item) => item[labelField]);

  if (labels.length <= maxDisplay) {
    return labels.join(separator);
  }

  const displayLabels = labels.slice(0, maxDisplay);
  const remaining = labels.length - maxDisplay;
  return `${displayLabels.join(separator)} +${remaining} more`;
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
 * <DropdownMultiselect items={sortedCountries} ... />
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
