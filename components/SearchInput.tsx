import { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from './ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';
import { Typography } from '@/constants/DesignTokens';

/** Debounce delay in milliseconds for search input */
export const SEARCH_DEBOUNCE_MS = 300;

interface SearchInputProps {
  initialQuery?: string | string[];
  onSearch?: (query: string) => void;
  styleProps?: object;
  /** Test ID for E2E testing (Maestro, etc.) */
  testID?: string;
}

const SearchInput = ({ initialQuery, onSearch, styleProps, testID }: SearchInputProps) => {
  const [query, setQuery] = useState(
    typeof initialQuery === 'string' ? initialQuery : initialQuery?.join(' ') || ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fires onSearch SEARCH_DEBOUNCE_MS after the user stops typing.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(query.trim());
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, onSearch]);

  // Immediate submit (Enter key / button press). Clears the pending debounce
  // timer to avoid double-firing.
  const handleSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmedQuery = query.trim();

    if (onSearch) {
      onSearch(trimmedQuery);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        { borderColor: themeColors.inputBorder },
        isFocused && styles.focused,
        styleProps,
      ]}
    >
      <TextInput
        testID={testID}
        style={[
          styles.textInput,
          colorScheme === 'dark' ? styles.textInputDark : styles.textInputLight,
        ]}
        value={query}
        placeholder={t('explore.searchPlaceholder')}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={themeColors.placeholder}
        onChangeText={(e) => setQuery(e)}
        maxLength={50}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />

      <TouchableOpacity onPress={handleSearch}>
        <IconSymbol name="magnifyingglass" color={themeColors.secondaryText} />
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    fontFamily: Typography.families.regular,
  },
  focused: {
    borderColor: '#F5A4B1',
  },
  textInput: {
    flex: 1,
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
  },
  textInputLight: {
    color: Colors.light.text,
  },
  textInputDark: {
    color: Colors.dark.text,
  },
});

export default SearchInput;
