import React, { useState } from 'react';
import { AccessibilityInfo, Keyboard, ScrollView, Text } from 'react-native';

import { COVER_HEIGHT } from '@/components/event-form/EventFormPage';
import { EventFormShell } from '@/components/event-form/EventFormShell';
import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import { OVERLAY_FOCUS_DELAY_MS } from '@/hooks/useOverlayFocus';
import { spyOnBackHandler } from '@/test-utils/backHandler';
import { act, fireEvent, renderWithProviders, within } from '@/test-utils/render';
import type { EventFormKind, FormState } from '@/types/eventForm.types';
import { getTodayDateKeyInBelgium } from '@/utils/calendarUtils';
import { createBlankForm } from '@/utils/eventFormData';

function Harness({
  kind = 'create',
  initial = {},
  onBack = () => true,
  publishOpen = false,
  busy = false,
}: {
  kind?: EventFormKind;
  initial?: Partial<FormState>;
  onBack?: () => boolean;
  publishOpen?: boolean;
  busy?: boolean;
}) {
  const [form, setForm] = useState(() => createBlankForm(initial));
  const validation = useEventFormValidation(() => []);

  return (
    <EventFormShell
      kind={kind}
      form={form}
      setForm={setForm}
      validation={validation}
      userLanguage="en"
      closeLabel="Close"
      closeTestID="btn-close"
      onBack={onBack}
      busy={busy}
      publishCheck={{ open: publishOpen, onConfirm: () => {}, onClose: () => {} }}
      footer={<Text>Footer</Text>}
    />
  );
}

describe('EventFormShell', () => {
  it('says what is still needed above the footer', () => {
    const { getByText } = renderWithProviders(<Harness initial={{ title: 'Rally' }} />);

    expect(getByText('Still needed: category, date, description')).toBeTruthy();
  });

  it('covers the status bar once the page has scrolled past the cover', () => {
    const statusBar = 44; // test-utils' safe area
    const { UNSAFE_getByType, getByTestId, queryByTestId } = renderWithProviders(<Harness />);
    const scroll = (y: number) =>
      fireEvent.scroll(UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { y } } });

    scroll(COVER_HEIGHT - statusBar);
    expect(queryByTestId('form-status-bar')).toBeNull();

    scroll(COVER_HEIGHT - statusBar + 1);
    expect(getByTestId('form-status-bar')).toBeTruthy();
  });

  it('keeps a pasted title on one line', () => {
    const { getByTestId } = renderWithProviders(<Harness />);

    fireEvent.changeText(getByTestId('input-event-title'), 'Rally\n for housing');

    expect(getByTestId('input-event-title').props.value).toBe('Rally for housing');
  });

  it('hides the page from screen readers behind a surface', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('row-event-where'));

    expect(getByTestId('surface-where')).toBeTruthy();
    expect(queryByTestId('row-event-when', { includeHiddenElements: false })).toBeNull();
    expect(queryByTestId('row-event-when', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps the form under one native view whether busy, idle or behind a surface', () => {
    // Guards the prop only: the race it prevents, a save re-parenting the form while the
    // screen navigates away, happens in Fabric's native mounting, not in Jest.
    const utils = renderWithProviders(<Harness busy />);
    const pageWrappers = (pointerEvents: 'none' | 'auto') =>
      utils
        .UNSAFE_getAllByProps({ collapsable: false, pointerEvents })
        .filter((node) =>
          within(node).queryByTestId('input-event-title', { includeHiddenElements: true })
        );

    expect(pageWrappers('none').length).toBeGreaterThan(0);

    utils.rerender(<Harness />);
    expect(pageWrappers('auto').length).toBeGreaterThan(0);

    fireEvent.press(utils.getByTestId('row-event-where'));
    expect(utils.getByTestId('surface-where')).toBeTruthy();
    expect(pageWrappers('auto').length).toBeGreaterThan(0);
  });

  it('hides the page from screen readers behind the publish check', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<Harness publishOpen />);

    expect(getByTestId('surface-publish')).toBeTruthy();
    expect(queryByTestId('row-event-when', { includeHiddenElements: false })).toBeNull();
    expect(queryByTestId('row-event-when', { includeHiddenElements: true })).toBeTruthy();
  });

  it('takes a screen reader to the heading of a surface, and back to the row after it', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
    const focused = () => focus.mock.calls.map(([view]) => view);
    const { getByTestId } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('row-event-where'));
    act(() => {
      jest.advanceTimersByTime(OVERLAY_FOCUS_DELAY_MS);
    });
    expect(focus).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('surface-where-back'));
    act(() => {
      jest.advanceTimersByTime(OVERLAY_FOCUS_DELAY_MS);
    });
    expect(focus).toHaveBeenCalledTimes(2);
    expect(focused()[1]).not.toBe(focused()[0]);

    focus.mockRestore();
    jest.useRealTimers();
  });

  it('closes the keyboard when a surface opens over the form', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const { getByTestId } = renderWithProviders(<Harness />);
    dismiss.mockClear();

    fireEvent.press(getByTestId('row-event-where'));

    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it('asks a template for nothing, and shows the date as asked each time', () => {
    const { queryByText, getByTestId } = renderWithProviders(<Harness kind="template" />);

    expect(queryByText(/Still needed/)).toBeNull();
    expect(getByTestId('template-date-asked')).toBeTruthy();
  });

  it('keeps the optional fields behind chips until they hold something', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <Harness initial={{ website_url: 'example.com' }} />
    );

    expect(getByTestId('input-event-website-url')).toBeTruthy();
    expect(queryByTestId('input-event-disclaimer')).toBeNull();

    fireEvent.press(getByTestId('add-more-goodToKnow'));

    expect(getByTestId('input-event-disclaimer')).toBeTruthy();
    expect(queryByTestId('add-more-goodToKnow')).toBeNull();
  });

  it('turns volunteers on from its chip', () => {
    const { getByTestId } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('add-more-volunteers'));

    expect(getByTestId('input-event-help-description')).toBeTruthy();
  });

  describe('the back button', () => {
    it('closes an open surface first, however often the screen rendered since', () => {
      const back = spyOnBackHandler();
      const onBack = jest.fn(() => true);
      const { getByTestId, queryByTestId } = renderWithProviders(<Harness onBack={onBack} />);

      fireEvent.press(getByTestId('row-event-where'));
      fireEvent.press(getByTestId('country-chip-belgium'));
      expect(getByTestId('surface-where')).toBeTruthy();

      act(() => {
        back.pressBack();
      });

      expect(queryByTestId('surface-where')).toBeNull();
      expect(onBack).not.toHaveBeenCalled();

      act(() => {
        back.pressBack();
      });

      expect(onBack).toHaveBeenCalledTimes(1);
      back.restore();
    });
  });

  it('keeps what was picked in a surface after it closes', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <Harness initial={{ city: 'Ghent', country: 'belgium', postal_code: '9000' }} />
    );

    fireEvent.press(getByTestId('row-event-where'));
    fireEvent.press(getByTestId('btn-where-done'));

    expect(getByText('9000 Ghent')).toBeTruthy();
  });
});

describe('When surface', () => {
  const start = '2099-01-13T18:00:00.000Z';

  it('holds a picked day until a time goes with it', () => {
    const { getByTestId, getByText } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('row-event-when'));
    fireEvent.press(getByTestId(`calendar-day-${getTodayDateKeyInBelgium()}`));
    fireEvent.press(getByTestId('btn-when-done'));

    expect(getByTestId('surface-when')).toBeTruthy();
    expect(getByText('Start time is required')).toBeTruthy();
  });

  it.each(['link', 'coOrganizers', 'volunteers', 'goodToKnow'])(
    'moves a screen reader to the %s field an Add more chip opens',
    (field) => {
      jest.useFakeTimers();
      const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
      const { getByTestId } = renderWithProviders(<Harness />);
      focus.mockClear();

      fireEvent.press(getByTestId(`add-more-${field}`));
      act(() => {
        jest.advanceTimersByTime(OVERLAY_FOCUS_DELAY_MS);
      });

      expect(focus).toHaveBeenCalledTimes(1);
      focus.mockRestore();
      jest.useRealTimers();
    }
  );

  it('says a day sets the date, not what a day does on the Calendar tab', () => {
    const { getByTestId } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('row-event-when'));

    expect(getByTestId(`calendar-day-${getTodayDateKeyInBelgium()}`).props.accessibilityHint).toBe(
      'Uses this day for the event'
    );
  });

  it('sets the end from a duration chip', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <Harness initial={{ start_time: start }} />
    );

    fireEvent.press(getByTestId('row-event-when'));
    fireEvent.press(getByTestId('when-duration-2'));
    fireEvent.press(getByTestId('btn-when-done'));

    expect(getByText('19:00 to 21:00')).toBeTruthy();
  });

  it('offers no way to drop the end of an event that exists', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <Harness kind="draft" initial={{ start_time: start }} />
    );

    fireEvent.press(getByTestId('row-event-when'));

    expect(queryByTestId('when-no-end')).toBeNull();
  });

  it('asks for no end until there is a start', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(<Harness />);

    fireEvent.press(getByTestId('row-event-when'));

    expect(queryByTestId('input-event-end-time')).toBeNull();
  });
});
