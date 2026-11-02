import React from 'react';
import { AccessibilityInfo, View, type ViewInstance } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { OVERLAY_FOCUS_DELAY_MS, useOverlayFocus, useReturnFocus } from '@/hooks/useOverlayFocus';

function Overlay({ delayMs }: { delayMs?: number }) {
  const headingRef = useOverlayFocus(delayMs);
  return <View ref={headingRef} />;
}

function Page({ overlay }: { overlay: string | null }) {
  const rowRef = React.useRef<ViewInstance>(null);
  useReturnFocus(overlay, () => rowRef);
  return <View ref={rowRef} />;
}

describe('overlay focus', () => {
  let focus: jest.SpyInstance;

  const settle = (ms = OVERLAY_FOCUS_DELAY_MS) =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  beforeEach(() => {
    jest.useFakeTimers();
    focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    focus.mockRestore();
    jest.useRealTimers();
  });

  it('moves to the heading once the overlay has settled', () => {
    render(<Overlay />);

    settle(OVERLAY_FOCUS_DELAY_MS - 1);
    expect(focus).not.toHaveBeenCalled();

    settle(1);
    expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus');
  });

  it('waits as long as it is told to', () => {
    render(<Overlay delayMs={OVERLAY_FOCUS_DELAY_MS * 2} />);

    settle();
    expect(focus).not.toHaveBeenCalled();

    settle();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does nothing if the overlay closes first', () => {
    const { unmount } = render(<Overlay />);

    unmount();
    settle();

    expect(focus).not.toHaveBeenCalled();
  });

  it('returns only when an overlay closes, not on mount or when one opens', () => {
    const { rerender } = render(<Page overlay={null} />);
    settle();
    expect(focus).not.toHaveBeenCalled();

    rerender(<Page overlay="where" />);
    settle();
    expect(focus).not.toHaveBeenCalled();

    rerender(<Page overlay={null} />);
    settle();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('stays put when one overlay gives way to another', () => {
    const { rerender } = render(<Page overlay="repeat" />);

    rerender(<Page overlay="when" />);
    settle();

    expect(focus).not.toHaveBeenCalled();
  });
});
