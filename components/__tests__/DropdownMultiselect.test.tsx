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
    MultiSelect: ({
      data,
      onChange,
      placeholder,
      value,
      disable,
      maxSelect,
      renderItem,
      onFocus,
      onBlur,
      onChangeText,
      flatListProps,
      ...rest
    }: any) => {
      // Render items using the renderItem prop if provided
      const renderedItems = (data || []).map((item: any, index: number) => {
        const isSelected = (value || []).includes(item.value);
        const rendered = renderItem ? renderItem(item, isSelected) : null;
        return React.createElement(
          'Pressable',
          {
            key: item.value || index,
            testID: `multiselect-item-${item.value}`,
            onPress: () => {
              const currentValues = value || [];
              const isCurrentlySelected = currentValues.includes(item.value);
              const newValues = isCurrentlySelected
                ? currentValues.filter((v: string) => v !== item.value)
                : [...currentValues, item.value];
              onChange?.(newValues);
            },
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
          testID: 'multiselect',
          accessibilityLabel: rest.accessibilityLabel || placeholder,
        },
        React.createElement('Text', { testID: 'multiselect-placeholder' }, placeholder),
        // Focus trigger
        React.createElement('Pressable', {
          testID: 'multiselect-trigger',
          onPress: () => {
            if (!disable) {
              onFocus?.();
            }
          },
        }),
        // Search input
        rest.search &&
          React.createElement('TextInput', {
            testID: 'multiselect-search',
            onChangeText: (text: string) => onChangeText?.(text),
            placeholder: rest.searchPlaceholder || 'Search...',
          }),
        // Rendered items
        ...renderedItems,
        emptyComponent,
        // Blur trigger
        React.createElement('Pressable', {
          testID: 'multiselect-blur',
          onPress: () => onBlur?.(),
        })
      );
    },
  };
});

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import {
  DropdownMultiselect,
  getSelectedItemsText,
  sortDropdownItems,
  useDropdownZIndex,
} from '@/components/DropdownMultiselect';
import type { DropdownItem } from '@/components/DropdownMultiselect';

const items: DropdownItem[] = [
  { label: 'Climate', value: 'climate' },
  { label: 'Education', value: 'education' },
  { label: 'Health', value: 'health' },
];

describe('DropdownMultiselect', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with placeholder', () => {
    render(<DropdownMultiselect items={items} placeholder="Select categories" />);
    expect(screen.getByText('Select categories')).toBeTruthy();
  });

  it('renders all items', () => {
    render(<DropdownMultiselect items={items} />);
    expect(screen.getByText('Climate')).toBeTruthy();
    expect(screen.getByText('Education')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('calls onValueChange when item is selected', async () => {
    const onValueChange = jest.fn();
    render(<DropdownMultiselect items={items} value={[]} onValueChange={onValueChange} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('multiselect-item-climate'));
    });
    expect(onValueChange).toHaveBeenCalledWith(['climate']);
  });

  it('shows error message when error and errorMessage are set', () => {
    render(<DropdownMultiselect items={items} error={true} errorMessage="Select at least one" />);
    expect(screen.getByText('Select at least one')).toBeTruthy();
  });

  it('does not show error when error is false', () => {
    render(<DropdownMultiselect items={items} error={false} errorMessage="Select at least one" />);
    expect(screen.queryByText('Select at least one')).toBeNull();
  });

  it('shows badge when showBadge is true and items are selected', () => {
    render(<DropdownMultiselect items={items} value={['climate', 'health']} showBadge={true} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows max select warning when limit is reached', () => {
    render(<DropdownMultiselect items={items} value={['climate', 'health']} maxSelect={2} />);
    expect(screen.getByText('Maximum 2 items can be selected')).toBeTruthy();
  });

  it('uses custom accessibility label', () => {
    render(<DropdownMultiselect items={items} accessibilityLabel="Category picker" />);
    expect(screen.getByLabelText('Category picker')).toBeTruthy();
  });
});

describe('getSelectedItemsText', () => {
  it('returns empty string for empty selection', () => {
    expect(getSelectedItemsText([], items)).toBe('');
  });

  it('returns joined labels for selected items', () => {
    expect(getSelectedItemsText(['climate', 'health'], items)).toBe('Climate, Health');
  });

  it('truncates with +N more when exceeding maxDisplay', () => {
    expect(
      getSelectedItemsText(['climate', 'education', 'health'], items, 'label', 'value', ', ', 2)
    ).toBe('Climate, Education +1 more');
  });

  it('uses custom separator', () => {
    expect(getSelectedItemsText(['climate', 'health'], items, 'label', 'value', ' | ')).toBe(
      'Climate | Health'
    );
  });
});

describe('sortDropdownItems (multiselect)', () => {
  it('sorts items alphabetically', () => {
    const unsorted: DropdownItem[] = [
      { label: 'Zebra', value: 'z' },
      { label: 'Apple', value: 'a' },
    ];
    const sorted = sortDropdownItems(unsorted);
    expect(sorted[0].label).toBe('Apple');
  });
});

describe('useDropdownZIndex (multiselect)', () => {
  it('returns descending z-index values', () => {
    expect(useDropdownZIndex(2)).toEqual([3000, 2000]);
  });
});

describe('DropdownMultiselect — additional branch coverage', () => {
  afterEach(() => jest.clearAllMocks());

  it('does not show error message when error is true but errorMessage is absent', () => {
    render(<DropdownMultiselect items={items} error={true} />);
    expect(screen.queryByText('Select at least one')).toBeNull();
  });

  it('does not show badge when showBadge is false', () => {
    render(<DropdownMultiselect items={items} value={['climate']} showBadge={false} />);
    expect(screen.queryByText('1')).toBeNull();
  });

  it('does not show badge when no items selected even if showBadge is true', () => {
    render(<DropdownMultiselect items={items} value={[]} showBadge={true} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows badge with max select ratio when maxSelect is set', () => {
    render(
      <DropdownMultiselect items={items} value={['climate']} showBadge={true} maxSelect={3} />
    );
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('does not show max select warning when below limit', () => {
    render(<DropdownMultiselect items={items} value={['climate']} maxSelect={3} />);
    expect(screen.queryByText('Maximum 3 items can be selected')).toBeNull();
  });

  it('enforces maxSelect — does not call onValueChange beyond limit', async () => {
    const onValueChange = jest.fn();
    render(
      <DropdownMultiselect
        items={items}
        value={['climate', 'health']}
        onValueChange={onValueChange}
        maxSelect={2}
      />
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('multiselect-item-education'));
    });
    // Should not be called because we already have 2 items selected and maxSelect is 2
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('syncs external value changes via useEffect', async () => {
    const { rerender } = render(
      <DropdownMultiselect items={items} value={['climate']} showBadge={true} />
    );
    expect(screen.getByText('1')).toBeTruthy();
    await act(async () => {
      rerender(
        <DropdownMultiselect items={items} value={['climate', 'health']} showBadge={true} />
      );
    });
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders in disabled state', () => {
    render(<DropdownMultiselect items={items} disabled={true} />);
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });

  it('renders with enableAlphabeticalGrouping', () => {
    render(<DropdownMultiselect items={items} enableAlphabeticalGrouping={true} />);
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });

  it('renders with optimizeForLongLists', () => {
    render(<DropdownMultiselect items={items} optimizeForLongLists={true} />);
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });

  it('renders with optimizeForLongLists and enableAlphabeticalGrouping', () => {
    render(
      <DropdownMultiselect
        items={items}
        optimizeForLongLists={true}
        enableAlphabeticalGrouping={true}
      />
    );
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });

  it('calls onValueChange when item is deselected', async () => {
    const onValueChange = jest.fn();
    render(
      <DropdownMultiselect
        items={items}
        value={['climate', 'health']}
        onValueChange={onValueChange}
      />
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('multiselect-item-climate'));
    });
    expect(onValueChange).toHaveBeenCalledWith(['health']);
  });

  it('renders with zIndex prop', () => {
    render(<DropdownMultiselect items={items} zIndex={3000} />);
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });
});

describe('DropdownMultiselect — renderItem with highlight and section headers', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders items with the default renderItemDefault', () => {
    render(<DropdownMultiselect items={items} searchable={true} />);
    expect(screen.getByText('Climate')).toBeTruthy();
    expect(screen.getByText('Education')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('renders items with selected state highlighting', () => {
    render(<DropdownMultiselect items={items} value={['climate']} searchable={true} />);
    // Climate should be rendered with selected=true styling
    expect(screen.getByText('Climate')).toBeTruthy();
  });

  it('renders items with alphabetical section headers', () => {
    const alphabetItems: DropdownItem[] = [
      { label: 'Apple', value: 'a' },
      { label: 'Banana', value: 'b' },
      { label: 'Cherry', value: 'c' },
    ];
    render(<DropdownMultiselect items={alphabetItems} enableAlphabeticalGrouping={true} />);
    expect(screen.getByText('Apple')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('renders non-alphabetic items with # header', () => {
    const numericItems: DropdownItem[] = [
      { label: '123 Org', value: 'num' },
      { label: 'Alpha', value: 'alpha' },
    ];
    render(<DropdownMultiselect items={numericItems} enableAlphabeticalGrouping={true} />);
    expect(screen.getByText('#')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('deduplicates section headers for same-letter items', () => {
    const sameLetterItems: DropdownItem[] = [
      { label: 'Apple', value: 'a1' },
      { label: 'Avocado', value: 'a2' },
      { label: 'Banana', value: 'b1' },
    ];
    render(<DropdownMultiselect items={sameLetterItems} enableAlphabeticalGrouping={true} />);
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
      <DropdownMultiselect
        items={alphabetItems}
        enableAlphabeticalGrouping={true}
        renderSectionHeader={customHeader}
      />
    );
    expect(screen.getByText('Section: A')).toBeTruthy();
    expect(screen.getByText('Section: B')).toBeTruthy();
  });
});

describe('DropdownMultiselect — search text handling', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onChangeSearchText when search text changes', () => {
    const onChangeSearchText = jest.fn();
    render(
      <DropdownMultiselect
        items={items}
        searchable={true}
        onChangeSearchText={onChangeSearchText}
      />
    );
    const searchInput = screen.getByTestId('multiselect-search');
    fireEvent.changeText(searchInput, 'Cli');
    expect(onChangeSearchText).toHaveBeenCalledWith('Cli');
  });

  it('highlights matching text in search results', () => {
    render(<DropdownMultiselect items={items} searchable={true} />);
    const searchInput = screen.getByTestId('multiselect-search');
    fireEvent.changeText(searchInput, 'Cli');
    expect(screen.getByText('Climate')).toBeTruthy();
  });

  it('handles regex special characters in search text gracefully', () => {
    render(<DropdownMultiselect items={items} searchable={true} />);
    const searchInput = screen.getByTestId('multiselect-search');
    fireEvent.changeText(searchInput, '(C[l');
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('DropdownMultiselect — focus and blur', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onFocus callback when focused', () => {
    const onFocus = jest.fn();
    render(<DropdownMultiselect items={items} onFocus={onFocus} />);
    fireEvent.press(screen.getByTestId('multiselect-trigger'));
    expect(onFocus).toHaveBeenCalled();
  });

  it('calls onBlur callback when blurred', () => {
    const onBlur = jest.fn();
    render(<DropdownMultiselect items={items} onBlur={onBlur} />);
    fireEvent.press(screen.getByTestId('multiselect-blur'));
    expect(onBlur).toHaveBeenCalled();
  });
});

describe('DropdownMultiselect — highlight text edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without search highlighting when searchable is false', () => {
    render(<DropdownMultiselect items={items} searchable={false} />);
    expect(screen.getByText('Climate')).toBeTruthy();
  });

  it('renders with empty items array without crashing', () => {
    render(<DropdownMultiselect items={[]} searchable={true} />);
    expect(screen.getByTestId('multiselect')).toBeTruthy();
  });
});
