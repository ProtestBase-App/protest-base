import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DROPDOWN_HEADROOM } from '@/components/FormScreenScaffold';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignTokens';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  searchAddress,
  AddressSearchError,
  type AddressSuggestion,
  type AddressCountryCode,
  type AddressLang,
} from '@/services/address.service';

/** Minimum characters before the endpoint is called (matches the backend's ≥3 rule). */
const MIN_QUERY_LENGTH = 3;
/** Max suggestions the backend returns; we render them as plain rows (no virtualization). */
const MAX_VISIBLE_RESULTS = 8;
/**
 * Blur is reported to the keyboard host on this delay so a tap on a suggestion
 * row lands before the reserved band collapses (mirrors SheetSearchMultiSelect).
 */
const BLUR_SIGNAL_DELAY_MS = 120;

type SearchStatus = 'idle' | 'searching' | 'no_results' | 'error' | 'unavailable';

export interface AddressAutocompleteFieldProps {
  /** The accepted street address (i.e. `form.street_address`). Source of truth. */
  value: string;
  /** Mapped country code; `null` when no country is selected (field inert). */
  countryCode: AddressCountryCode | null;
  /** Language hint passed to the endpoint. */
  lang?: AddressLang;
  /**
   * Selected postcode, forwarded to the endpoint as a search hint that scopes/biases
   * results and kills cross-town street-name collisions. Omit when none is selected.
   */
  postalCode?: string;
  /** Fired when the user taps a suggestion — the parent commits it to form state. */
  onSelect: (suggestion: AddressSuggestion) => void;
  /** Fired when the user clears the field — the parent should reset `street_address`. */
  onClear: () => void;
  /**
   * Fired when the user edits the field text, i.e. the displayed query diverges
   * from the accepted suggestion. Lets the parent release any lock tied to that
   * suggestion (e.g. re-enable manual postal-code picking). Not fired by the
   * upstream re-sync (loads/country changes) or by selecting a suggestion.
   */
  onEdit?: () => void;
  /**
   * Focus/blur signal for a keyboard-aware host (FormScreenScaffold's
   * setDropdownFocused) to reserve room below the input so the suggestion list
   * renders above the keyboard. Blur fires on a short delay — and on unmount
   * while focused — so the reserved band is always released, never collapsed
   * out from under a row the user is mid-tap on.
   */
  onFocusChange?: (focused: boolean) => void;
  title: string;
  placeholder: string;
  /** Localized copy for the transient states. */
  searchingText: string;
  noResultsText: string;
  errorText: string;
  unavailableText: string;
  clearAccessibilityLabel: string;
  testID?: string;
  otherStyles?: StyleProp<ViewStyle>;
}

/**
 * Suggestion-only street-address input.
 *
 * Anti-corruption model (the whole point of the feature): typing never commits
 * a value — `value`/`form.street_address` only ever holds a string derived from a
 * chosen suggestion. The TextInput is backed by a local `query` + `dirty` flag;
 * `onSelect` is the only path that writes the address upstream.
 *
 * The reset effect (keyed on `value`) re-syncs the display whenever the accepted
 * value changes underneath us — legacy/draft loads that populate the field after
 * an async fetch, and country-change clears — so pending typed text can never
 * survive into a save and a legacy address is never wiped.
 */
export default function AddressAutocompleteField({
  value,
  countryCode,
  lang,
  postalCode,
  onSelect,
  onClear,
  onEdit,
  onFocusChange,
  title,
  placeholder,
  searchingText,
  noResultsText,
  errorText,
  unavailableText,
  clearAccessibilityLabel,
  testID,
  otherStyles,
}: AddressAutocompleteFieldProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const [query, setQuery] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [isFocused, setIsFocused] = useState(false);

  // Monotonic request id — only the latest in-flight search may write state.
  const seqRef = useRef(0);
  // Pending delayed-blur signal to the keyboard host.
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-refs so the unmount cleanup releases the host's reserved headroom
  // (e.g. country deselected while typing) without re-running on prop churn.
  const onFocusChangeRef = useRef(onFocusChange);
  const isFocusedRef = useRef(false);
  useEffect(() => {
    onFocusChangeRef.current = onFocusChange;
  });
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (isFocusedRef.current) onFocusChangeRef.current?.(false);
    };
  }, []);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
    isFocusedRef.current = true;
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsFocused(false);
      isFocusedRef.current = false;
      onFocusChange?.(false);
    }, BLUR_SIGNAL_DELAY_MS);
  };

  const debouncedQuery = useDebouncedValue(query, 300);

  // Re-sync the display to the accepted value whenever it changes upstream.
  // Idempotent on our own select-write; clears pending text on country-change.
  useEffect(() => {
    setQuery(value);
    setDirty(false);
    setResults([]);
    setStatus('idle');
    seqRef.current++; // invalidate any in-flight search
  }, [value]);

  // Debounced search — only when the user is actively editing (`dirty`), a
  // country is selected, and the query meets the length floor.
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!dirty || !countryCode || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus('idle');
      return;
    }

    const seq = ++seqRef.current;
    const controller = new AbortController();
    setStatus('searching');
    setResults([]);

    (async () => {
      try {
        const data = await searchAddress(trimmed, countryCode, lang, postalCode, controller.signal);
        if (seq !== seqRef.current) return; // a newer search superseded this one
        setResults(data);
        setStatus(data.length === 0 ? 'no_results' : 'idle');
      } catch (err) {
        // The sequence guard is the single source of truth for staleness: any
        // abort happens via this effect's cleanup, which re-runs the effect and
        // bumps `seqRef`, so a superseded request fails this check.
        if (seq !== seqRef.current) return;
        // Ignore an intentional cancellation that somehow reached us as current.
        const e = err as { code?: string; name?: string };
        if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError') {
          return;
        }
        const kind = err instanceof AddressSearchError ? err.kind : 'generic';
        setResults([]);
        setStatus(kind === 'generic' ? 'error' : 'unavailable');
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery, dirty, countryCode, lang, postalCode]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setDirty(true);
    // The text now diverges from any accepted suggestion — let the parent unlock
    // fields derived from it. Idempotent: the parent just clears a flag.
    onEdit?.();
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    Keyboard.dismiss();
    seqRef.current++; // drop any in-flight results
    setQuery(suggestion.street_address);
    setDirty(false);
    setResults([]);
    setStatus('idle');
    onSelect(suggestion);
  };

  const handleClear = () => {
    seqRef.current++;
    setQuery('');
    setDirty(false);
    setResults([]);
    setStatus('idle');
    onClear();
  };

  const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);
  const showResults = visibleResults.length > 0;

  return (
    <ThemedView style={[styles.wrapper, otherStyles]}>
      <ThemedText style={styles.label}>{title}</ThemedText>

      <ThemedView
        style={[
          styles.inputBox,
          { backgroundColor: themeColors.cardBackground, borderColor: themeColors.inputBorder },
          isFocused && { borderColor: themeColors.inputBorderFocused },
        ]}
      >
        <IconSymbol name="magnifyingglass" size={18} color={themeColors.placeholder} />
        <TextInput
          testID={testID}
          style={[
            styles.textInput,
            {
              color: themeColors.text,
              fontFamily: query ? Typography.families.semiBold : Typography.families.regular,
            },
          ]}
          value={query}
          placeholder={placeholder}
          placeholderTextColor={themeColors.placeholder}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!!countryCode}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="search"
        />

        {status === 'searching' && (
          <ActivityIndicator size="small" color={themeColors.tint} style={styles.trailingIcon} />
        )}
        {status !== 'searching' && query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.trailingIcon}
            accessibilityLabel={clearAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="xmark" size={18} color={themeColors.secondaryText} />
          </TouchableOpacity>
        )}
      </ThemedView>

      {showResults && (
        <ThemedView
          style={[
            styles.resultsList,
            { backgroundColor: themeColors.cardBackground, borderColor: themeColors.inputBorder },
          ]}
        >
          {/* Capped to the host's reserved keyboard headroom and internally
              scrollable so every row stays reachable above the keyboard.
              Nested scroll views don't inherit the parent's tap handling, and
              Android needs nestedScrollEnabled to scroll inside the form. */}
          <ScrollView
            style={styles.resultsScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {visibleResults.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.label}-${index}`}
                testID={`address-suggestion-${index}`}
                style={[
                  styles.resultRow,
                  index < visibleResults.length - 1 && {
                    borderBottomColor: themeColors.separator,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
                onPress={() => handleSelect(suggestion)}
                accessibilityRole="button"
                accessibilityLabel={suggestion.label}
              >
                <IconSymbol name="location.fill" size={16} color={themeColors.tint} />
                <ThemedText style={styles.resultText} numberOfLines={2}>
                  {suggestion.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      )}

      {status === 'searching' && (
        <ThemedText style={[styles.statusText, { color: themeColors.secondaryText }]}>
          {searchingText}
        </ThemedText>
      )}
      {status === 'no_results' && (
        <ThemedText style={[styles.statusText, { color: themeColors.secondaryText }]}>
          {noResultsText}
        </ThemedText>
      )}
      {status === 'unavailable' && (
        <ThemedText style={[styles.statusText, { color: themeColors.secondaryText }]}>
          {unavailableText}
        </ThemedText>
      )}
      {status === 'error' && (
        <ThemedText style={[styles.statusText, { color: themeColors.error }]}>
          {errorText}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    marginBottom: Spacing.sm,
  },
  inputBox: {
    width: '100%',
    height: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
  },
  trailingIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultsScroll: {
    // The list must fit inside the band the scaffold clears above the keyboard.
    maxHeight: DROPDOWN_HEADROOM,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  resultText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
});
