import { renderHook, act } from '@testing-library/react-native';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('initial value', () => {
    it('returns the initial value immediately without waiting for the delay', () => {
      const { result } = renderHook(() => useDebouncedValue('hello', 300));

      expect(result.current).toBe('hello');
    });

    it('returns the initial value for non-string types', () => {
      const { result } = renderHook(() => useDebouncedValue(42, 300));

      expect(result.current).toBe(42);
    });

    it('returns the initial value when delay has not elapsed', () => {
      const { result } = renderHook(() => useDebouncedValue('initial', 500));

      act(() => {
        jest.advanceTimersByTime(499);
      });

      expect(result.current).toBe('initial');
    });
  });

  describe('debounce behavior', () => {
    it('updates debounced value after the delay elapses', () => {
      let value = 'first';
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 300));

      value = 'second';
      rerender({});

      expect(result.current).toBe('first');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('second');
    });

    it('resets the timer when value changes before delay elapses', () => {
      let value = 'first';
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 300));

      value = 'second';
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Change value again before delay finishes — timer should reset
      value = 'third';
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      // 200ms have passed since last change but delay is 300ms — still old value
      expect(result.current).toBe('first');

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now 300ms have passed since last change
      expect(result.current).toBe('third');
    });

    it('does not set intermediate values when value changes rapidly', () => {
      let value = 'a';
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 300));

      value = 'b';
      rerender({});
      act(() => {
        jest.advanceTimersByTime(100);
      });

      value = 'c';
      rerender({});
      act(() => {
        jest.advanceTimersByTime(100);
      });

      value = 'd';
      rerender({});
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Only the initial value should be debounced so far
      expect(result.current).toBe('a');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // After delay elapses from last update, final value should be set
      expect(result.current).toBe('d');
    });
  });

  describe('default delay', () => {
    it('uses 300ms default delay when no delay argument is provided', () => {
      let value = 'original';
      const { result, rerender } = renderHook(() => useDebouncedValue(value));

      value = 'updated';
      rerender({});

      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current).toBe('original');

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('delay changes', () => {
    it('respects a new delay value when delay prop changes', () => {
      let delay = 300;
      let value = 'first';
      const { result, rerender } = renderHook(() => useDebouncedValue(value, delay));

      // Change both value and delay
      value = 'second';
      delay = 100;
      rerender({});

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBe('second');
    });
  });

  describe('generic typing', () => {
    it('works with number values', () => {
      let value = 1;
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 200));

      value = 99;
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe(99);
    });

    it('works with null values', () => {
      let value: string | null = 'something';
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 200));

      value = null;
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBeNull();
    });

    it('works with object values', () => {
      const initial = { id: 1 };
      const updated = { id: 2 };
      let value = initial;
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 200));

      value = updated;
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe(updated);
    });

    it('works with array values', () => {
      let value: string[] = ['a'];
      const { result, rerender } = renderHook(() => useDebouncedValue(value, 200));

      value = ['b', 'c'];
      rerender({});

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toEqual(['b', 'c']);
    });
  });

  describe('cleanup', () => {
    it('cancels pending timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      let value = 'initial';
      const { rerender, unmount } = renderHook(() => useDebouncedValue(value, 300));

      value = 'updated';
      rerender({});

      unmount();

      // Verify clearTimeout was called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
