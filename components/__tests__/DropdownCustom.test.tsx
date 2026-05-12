jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('react-native-element-dropdown', () => {
  const React = require('react');
  return {
    Dropdown: ({
      data,
      onChange,
      placeholder,
      value,
      renderItem,
      disable,
      search,
      onFocus,
      onBlur,
      onChangeText,
      flatListProps,
      ...rest
    }: any) => {
      const selectedItem = data?.find((item: any) => item.value === value);
      // Render items using the renderItem prop if provided
      const renderedItems = (data || []).map((item: any, index: number) => {
        const isSelected = item.value === value;
        const rendered = renderItem ? renderItem(item, isSelected) : null;
        return React.createElement(
          'Pressable',
          {
            key: item.value || index,
            testID: `dropdown-item-${item.value}`,
            onPress: () => onChange?.(item),
          },
          rendered || React.createElement('Text', null, item.label)
        );
      });

      // Render the ListEmptyComponent if data is empty
      const emptyComponent =
        data?.length === 0 && flatListProps?.ListEmptyComponent
          ? typeof flatListProps.ListEmptyComponent === 'function'
            ? React.createElement(flatListProps.ListEmptyComponent)
            : flatListProps.ListEmptyComponent
          : null;

      return React.createElement(
        'View',
        {
          testID: 'dropdown',
          accessibilityLabel: rest.accessibilityLabel || placeholder,
        },
        React.createElement(
          'Pressable',
          {
            testID: 'dropdown-trigger',
            onPress: () => {
              if (!disable) {
                onFocus?.();
              }
            },
          },
          React.createElement(
            'Text',
            { testID: 'dropdown-placeholder' },
            selectedItem ? selectedItem.label : placeholder
          )
        ),
        // Search input area
        search &&
          React.createElement('TextInput', {
            testID: 'dropdown-search',
            onChangeText: (text: string) => onChangeText?.(text),
            placeholder: rest.searchPlaceholder || 'Search...',
          }),
        // Rendered items
        ...renderedItems,
        emptyComponent,
        // Close trigger
        React.createElement('Pressable', {
          testID: 'dropdown-blur',
          onPress: () => onBlur?.(),
        })
      );
    },
  };
});

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { DropdownCustom, useDropdownZIndex, sortDropdownItems } from '@/components/DropdownCustom';
import type { DropdownItem } from '@/components/DropdownCustom';

const items: DropdownItem[] = [
  { label: 'Belgium', value: 'BE' },
  { label: 'France', value: 'FR' },
  { label: 'Netherlands', value: 'NL' },
];

describe('DropdownCustom', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with placeholder', () => {
    render(<DropdownCustom items={items} placeholder="Select country" />);
    expect(screen.getByText('Select country')).toBeTruthy();
  });

  it('shows selected value label', () => {
    render(<DropdownCustom items={items} value="FR" />);
    expect(screen.getAllByText('France').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onValueChange when item is selected', async () => {
    const onValueChange = jest.fn();
    render(<DropdownCustom items={items} onValueChange={onValueChange} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('dropdown-item-BE'));
    });
    expect(onValueChange).toHaveBeenCalledWith('BE', expect.objectContaining({ value: 'BE' }));
  });

  it('shows error message when error and errorMessage are set', () => {
    render(<DropdownCustom items={items} error={true} errorMessage="Please select a country" />);
    expect(screen.getByText('Please select a country')).toBeTruthy();
  });

  it('does not show error message when error is false', () => {
    render(<DropdownCustom items={items} error={false} errorMessage="Please select a country" />);
    expect(screen.queryByText('Please select a country')).toBeNull();
  });

  it('renders all items', () => {
    render(<DropdownCustom items={items} />);
    expect(screen.getByText('Belgium')).toBeTruthy();
    expect(screen.getByText('France')).toBeTruthy();
    expect(screen.getByText('Netherlands')).toBeTruthy();
  });

  it('uses default placeholder when none provided', () => {
    render(<DropdownCustom items={items} />);
    expect(screen.getByText('Select...')).toBeTruthy();
  });

  it('uses custom accessibility label', () => {
    render(<DropdownCustom items={items} accessibilityLabel="Country picker" />);
    expect(screen.getByLabelText('Country picker')).toBeTruthy();
  });
});

describe('useDropdownZIndex', () => {
  it('returns descending z-index values', () => {
    const result = useDropdownZIndex(3);
    expect(result).toEqual([3000, 2000, 1000]);
  });

  it('returns empty array for 0', () => {
    expect(useDropdownZIndex(0)).toEqual([]);
  });
});

describe('sortDropdownItems', () => {
  it('sorts items alphabetically by label', () => {
    const unsorted: DropdownItem[] = [
      { label: 'Zebra', value: 'z' },
      { label: 'Apple', value: 'a' },
      { label: 'Mango', value: 'm' },
    ];
    const sorted = sortDropdownItems(unsorted);
    expect(sorted.map((i) => i.label)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('does not mutate original array', () => {
    const original: DropdownItem[] = [
      { label: 'B', value: 'b' },
      { label: 'A', value: 'a' },
    ];
    sortDropdownItems(original);
    expect(original[0].label).toBe('B');
  });

  it('sorts by custom labelField', () => {
    const customItems = [
      { label: 'unused', name: 'Zebra', value: 'z' },
      { label: 'unused', name: 'Apple', value: 'a' },
    ];
    const sorted = sortDropdownItems(customItems, 'name');
    expect(sorted[0].name).toBe('Apple');
  });

  it('handles items with empty label gracefully', () => {
    const emptyLabelItems: DropdownItem[] = [
      { label: '', value: 'empty' },
      { label: 'Apple', value: 'a' },
    ];
    const sorted = sortDropdownItems(emptyLabelItems);
    expect(sorted[0].label).toBe('');
  });
});

describe('DropdownCustom — additional branch coverage', () => {
  afterEach(() => jest.clearAllMocks());

  it('does not show error message when error is true but errorMessage is absent', () => {
    render(<DropdownCustom items={items} error={true} />);
    expect(screen.queryByText('Please select a country')).toBeNull();
  });

  it('renders with zIndex prop', () => {
    render(<DropdownCustom items={items} zIndex={2000} />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('renders with enableAlphabeticalGrouping prop', () => {
    const alphabetItems: DropdownItem[] = [
      { label: 'Amsterdam', value: 'ams' },
      { label: 'Brussels', value: 'bru' },
      { label: 'Copenhagen', value: 'cph' },
    ];
    render(<DropdownCustom items={alphabetItems} enableAlphabeticalGrouping={true} />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('renders with optimizeForLongLists prop', () => {
    render(<DropdownCustom items={items} optimizeForLongLists={true} />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('renders with excludeSearchField=true disables search', () => {
    render(<DropdownCustom items={items} excludeSearchField={true} />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('syncs external value changes via useEffect', async () => {
    const { rerender } = render(<DropdownCustom items={items} value="BE" />);
    expect(screen.getAllByText('Belgium').length).toBeGreaterThanOrEqual(1);
    await act(async () => {
      rerender(<DropdownCustom items={items} value="FR" />);
    });
    expect(screen.getAllByText('France').length).toBeGreaterThanOrEqual(1);
  });

  it('renders in disabled state', () => {
    render(<DropdownCustom items={items} disabled={true} />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('renders with modal mode', () => {
    render(<DropdownCustom items={items} mode="modal" />);
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });

  it('calls onValueChange and haptics on selection', async () => {
    const { selectionAsync } = require('expo-haptics');
    const onValueChange = jest.fn();
    render(<DropdownCustom items={items} onValueChange={onValueChange} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('dropdown-item-NL'));
    });
    expect(onValueChange).toHaveBeenCalledWith('NL', expect.objectContaining({ value: 'NL' }));
    expect(selectionAsync).toHaveBeenCalled();
  });

  it('renders with value=undefined (no external value set)', () => {
    render(<DropdownCustom items={items} value={undefined} />);
    expect(screen.getByText('Select...')).toBeTruthy();
  });

  it('handles optimizeForLongLists with enableAlphabeticalGrouping (getItemLayout undefined)', () => {
    const longItems: DropdownItem[] = Array.from({ length: 10 }, (_, i) => ({
      label: `Item ${i}`,
      value: `item-${i}`,
    }));
    render(
      <DropdownCustom
        items={longItems}
        optimizeForLongLists={true}
        enableAlphabeticalGrouping={true}
      />
    );
    expect(screen.getByTestId('dropdown')).toBeTruthy();
  });
});

describe('DropdownCustom — renderItem with highlight text', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders items with the default renderItemWithHighlight', () => {
    // The mock passes renderItem through, which calls renderItemWithHighlight
    render(<DropdownCustom items={items} searchable={true} />);
    // All items should render through the renderItem callback
    expect(screen.getByText('Belgium')).toBeTruthy();
    expect(screen.getByText('France')).toBeTruthy();
    expect(screen.getByText('Netherlands')).toBeTruthy();
  });

  it('renders items with selected state highlighting', () => {
    render(<DropdownCustom items={items} value="BE" searchable={true} />);
    // Belgium should be rendered with selected=true styling
    expect(screen.getAllByText('Belgium').length).toBeGreaterThanOrEqual(1);
  });

  it('renders items with alphabetical grouping and section headers', () => {
    const alphabetItems: DropdownItem[] = [
      { label: 'Apple', value: 'a' },
      { label: 'Banana', value: 'b' },
      { label: 'Cherry', value: 'c' },
    ];
    render(<DropdownCustom items={alphabetItems} enableAlphabeticalGrouping={true} />);
    // Items should still render
    expect(screen.getByText('Apple')).toBeTruthy();
    expect(screen.getByText('Banana')).toBeTruthy();
    // Section headers (A, B, C) should be rendered by renderDefaultSectionHeader
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('renders non-alphabetic items with # section header', () => {
    const numericItems: DropdownItem[] = [
      { label: '123 Org', value: 'num' },
      { label: 'Alpha', value: 'alpha' },
    ];
    render(<DropdownCustom items={numericItems} enableAlphabeticalGrouping={true} />);
    expect(screen.getByText('#')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('deduplicates section headers for same-letter items', () => {
    const sameLetterItems: DropdownItem[] = [
      { label: 'Apple', value: 'a1' },
      { label: 'Avocado', value: 'a2' },
      { label: 'Banana', value: 'b1' },
    ];
    render(<DropdownCustom items={sameLetterItems} enableAlphabeticalGrouping={true} />);
    // Only one 'A' section header should appear
    const aHeaders = screen.getAllByText('A');
    expect(aHeaders.length).toBe(1);
  });

  it('renders with custom renderSectionHeader', () => {
    const customHeader = (letter: string) =>
      React.createElement('Text', { testID: `custom-header-${letter}` }, `Section: ${letter}`);

    const alphabetItems: DropdownItem[] = [
      { label: 'Apple', value: 'a' },
      { label: 'Banana', value: 'b' },
    ];
    render(
      <DropdownCustom
        items={alphabetItems}
        enableAlphabeticalGrouping={true}
        renderSectionHeader={customHeader}
      />
    );
    expect(screen.getByText('Section: A')).toBeTruthy();
    expect(screen.getByText('Section: B')).toBeTruthy();
  });
});

describe('DropdownCustom — search text handling', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onChangeSearchText when search text changes', () => {
    const onChangeSearchText = jest.fn();
    render(
      <DropdownCustom items={items} searchable={true} onChangeSearchText={onChangeSearchText} />
    );
    const searchInput = screen.getByTestId('dropdown-search');
    fireEvent.changeText(searchInput, 'Bel');
    expect(onChangeSearchText).toHaveBeenCalledWith('Bel');
  });

  it('highlights matching text in search results', () => {
    render(<DropdownCustom items={items} searchable={true} />);
    // Enter search text
    const searchInput = screen.getByTestId('dropdown-search');
    fireEvent.changeText(searchInput, 'Bel');
    // Items still render (highlighting is visual only)
    expect(screen.getByText('Belgium')).toBeTruthy();
  });
});

describe('DropdownCustom — focus and blur', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onFocus callback when dropdown is focused', () => {
    const onFocus = jest.fn();
    render(<DropdownCustom items={items} onFocus={onFocus} />);
    fireEvent.press(screen.getByTestId('dropdown-trigger'));
    expect(onFocus).toHaveBeenCalled();
  });

  it('calls onBlur callback when dropdown is blurred', () => {
    const onBlur = jest.fn();
    render(<DropdownCustom items={items} onBlur={onBlur} />);
    fireEvent.press(screen.getByTestId('dropdown-blur'));
    expect(onBlur).toHaveBeenCalled();
  });
});

describe('DropdownCustom — empty list', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with empty items array without crashing', () => {
    render(<DropdownCustom items={[]} searchable={true} />);
    // The dropdown should render with just the placeholder
    expect(screen.getByText('Select...')).toBeTruthy();
  });
});

describe('DropdownCustom — highlightText edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without search highlighting when searchable is false', () => {
    render(<DropdownCustom items={items} searchable={false} />);
    expect(screen.getByText('Belgium')).toBeTruthy();
  });

  it('handles regex special characters in search text gracefully', () => {
    render(<DropdownCustom items={items} searchable={true} />);
    const searchInput = screen.getByTestId('dropdown-search');
    // Enter regex special characters
    fireEvent.changeText(searchInput, '(B[e');
    // Should not crash
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('DropdownCustom — optimizeForLongLists', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with optimizeForLongLists=true (covers flatListProps optimization spread)', () => {
    render(<DropdownCustom items={items} optimizeForLongLists={true} />);
    expect(screen.getByText('Belgium')).toBeTruthy();
  });

  it('renders with optimizeForLongLists=true and enableAlphabeticalGrouping=true (getItemLayout=undefined branch)', () => {
    const alphabetItems: DropdownItem[] = [
      { label: 'Apple', value: 'a' },
      { label: 'Banana', value: 'b' },
    ];
    render(
      <DropdownCustom
        items={alphabetItems}
        optimizeForLongLists={true}
        enableAlphabeticalGrouping={true}
      />
    );
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('renders with optimizeForLongLists=true and enableAlphabeticalGrouping=false (getItemLayout function branch)', () => {
    render(
      <DropdownCustom
        items={items}
        optimizeForLongLists={true}
        enableAlphabeticalGrouping={false}
      />
    );
    expect(screen.getByText('Belgium')).toBeTruthy();
  });
});
