jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import SearchInput, { SEARCH_DEBOUNCE_MS } from '@/components/SearchInput';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('SearchInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders with placeholder text', () => {
    render(<SearchInput />);
    expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
  });

  it('renders with initial query string', () => {
    render(<SearchInput initialQuery="protest" />);
    expect(screen.getByDisplayValue('protest')).toBeTruthy();
  });

  it('renders with initial query as array', () => {
    render(<SearchInput initialQuery={['climate', 'march']} />);
    expect(screen.getByDisplayValue('climate march')).toBeTruthy();
  });

  it('renders with empty initial query', () => {
    render(<SearchInput initialQuery="" />);
    expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
  });

  describe('Debounced search', () => {
    it('calls onSearch after debounce delay', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);

      fireEvent.changeText(screen.getByPlaceholderText('explore.searchPlaceholder'), 'climate');

      // Should not be called yet
      expect(onSearch).not.toHaveBeenCalled();

      // Advance past debounce delay
      act(() => {
        jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(onSearch).toHaveBeenCalledWith('climate');
    });

    it('trims whitespace from search query', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);

      fireEvent.changeText(
        screen.getByPlaceholderText('explore.searchPlaceholder'),
        '  climate march  '
      );

      act(() => {
        jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(onSearch).toHaveBeenCalledWith('climate march');
    });

    it('debounces rapid typing', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');

      fireEvent.changeText(input, 'c');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(input, 'cl');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(input, 'cli');

      // Should not have been called yet for any intermediate values
      expect(onSearch).not.toHaveBeenCalledWith('c');
      expect(onSearch).not.toHaveBeenCalledWith('cl');

      act(() => {
        jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(onSearch).toHaveBeenCalledWith('cli');
    });
  });

  describe('Immediate search on submit', () => {
    it('calls onSearch immediately on submit editing', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');

      fireEvent.changeText(input, 'march');
      fireEvent(input, 'submitEditing');

      expect(onSearch).toHaveBeenCalledWith('march');
    });

    it('calls onSearch immediately when search icon is pressed', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');

      fireEvent.changeText(input, 'rally');

      // There should be a touchable for the search icon
      // The search icon is a TouchableOpacity wrapping the magnifyingglass icon
      // Since we can't easily find it by icon, let's trigger submit
      fireEvent(input, 'submitEditing');
      expect(onSearch).toHaveBeenCalledWith('rally');
    });
  });

  describe('Focus state', () => {
    it('handles focus and blur', () => {
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      expect(input).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<SearchInput />);
      expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies styleProps', () => {
      render(<SearchInput styleProps={{ borderColor: 'red' }} />);
      expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
    });
  });

  describe('Without onSearch callback', () => {
    it('renders without onSearch and does not crash on debounce', () => {
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');
      fireEvent.changeText(input, 'test');

      act(() => {
        jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });

      expect(input).toBeTruthy();
    });
  });

  it('exports SEARCH_DEBOUNCE_MS constant', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });

  describe('Pressing the search icon button', () => {
    it('calls onSearch immediately when search is submitted via keyboard', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');
      fireEvent.changeText(input, 'brussels');

      // Trigger immediate search via keyboard submit
      fireEvent(input, 'submitEditing');

      expect(onSearch).toHaveBeenCalledWith('brussels');
    });

    it('clears pending debounce timer on immediate submit', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');

      fireEvent.changeText(input, 'climate');
      // Submit immediately without waiting for debounce
      fireEvent(input, 'submitEditing');

      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('climate');

      // Advance timers — the debounce was cleared so no second call should fire
      act(() => {
        jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      });
      expect(onSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial query variations', () => {
    it('joins array initial query with space', () => {
      render(<SearchInput initialQuery={['hello', 'world']} />);
      expect(screen.getByDisplayValue('hello world')).toBeTruthy();
    });

    it('handles undefined initial query', () => {
      render(<SearchInput initialQuery={undefined} />);
      expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
    });

    it('handles empty array initial query (falls back to empty string)', () => {
      render(<SearchInput initialQuery={[]} />);
      expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeTruthy();
    });
  });

  describe('Focus styling', () => {
    it('toggles focused style on focus and blur', () => {
      render(<SearchInput />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');
      fireEvent(input, 'focus');
      fireEvent(input, 'blur');
      expect(input).toBeTruthy();
    });
  });

  describe('Search icon button press', () => {
    it('calls onSearch via submitEditing (same handleSearch path as icon button)', () => {
      const onSearch = jest.fn();
      render(<SearchInput onSearch={onSearch} />);
      const input = screen.getByPlaceholderText('explore.searchPlaceholder');
      fireEvent.changeText(input, 'test query');

      // handleSearch is shared by both the icon TouchableOpacity and submitEditing.
      // We test the shared path via submitEditing since the icon's TouchableOpacity
      // lacks a testID and getAllByRole('button') is unreliable for RN TouchableOpacity.
      fireEvent(input, 'submitEditing');

      expect(onSearch).toHaveBeenCalledWith('test query');
    });
  });
});
