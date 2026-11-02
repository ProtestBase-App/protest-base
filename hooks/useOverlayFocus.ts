import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, type HostInstance, type ViewInstance } from 'react-native';

// Past the overlay's animation, and past TalkBack recovering from its focused view going away.
export const OVERLAY_FOCUS_DELAY_MS = 500;

function focusWhenSettled(view: RefObject<HostInstance | null>, delayMs: number) {
  const timer = setTimeout(() => {
    if (view.current) AccessibilityInfo.sendAccessibilityEvent(view.current, 'focus');
  }, delayMs);
  return () => clearTimeout(timer);
}

/** A ref for an overlay's heading: a screen reader lands there once the overlay has settled. */
export function useOverlayFocus(delayMs = OVERLAY_FOCUS_DELAY_MS) {
  const headingRef = useRef<ViewInstance>(null);

  useEffect(() => focusWhenSettled(headingRef, delayMs), [delayMs]);

  return headingRef;
}

/** Puts a screen reader back on `target(closed)` when `overlay` goes from a value to null. */
export function useReturnFocus<T>(
  overlay: T | null,
  target: (closed: T) => RefObject<ViewInstance | null>
) {
  const previousRef = useRef(overlay);

  useEffect(() => {
    const closed = previousRef.current;
    previousRef.current = overlay;
    if (overlay !== null || closed === null) return;
    return focusWhenSettled(target(closed), OVERLAY_FOCUS_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);
}

/** Puts a screen reader on `view` each time `value` becomes something new. */
export function useFocusOnChange<T>(value: T | null, view: RefObject<HostInstance | null>) {
  useEffect(() => {
    if (value === null) return;
    return focusWhenSettled(view, OVERLAY_FOCUS_DELAY_MS);
  }, [value, view]);
}
