import { useState, useEffect } from 'react';

/**
 * A hook that returns a debounced version of the provided value.
 * The debounced value will only update after the specified delay has passed
 * without the input value changing.
 *
 * Useful for delaying expensive operations like API calls until the user
 * has stopped typing.
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```typescript
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearch = useDebouncedValue(searchQuery, 300);
 *
 * // debouncedSearch will only update 300ms after searchQuery stops changing
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
