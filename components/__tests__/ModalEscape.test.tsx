import React from 'react';
import { screen } from '@testing-library/react-native';

import CreatorActionSheet from '@/components/CreatorActionSheet';
import MonthYearPicker from '@/components/MonthYearPicker';
import { renderWithProviders } from '@/test-utils/render';

/**
 * These two modals have no close control: the scrim is the way out. It is hidden from
 * screen readers so that its children stay reachable on iOS, which leaves the escape
 * gesture as the only way out with VoiceOver.
 */
describe('modals whose scrim is the only way out', () => {
  const scrimFor = (onClose: () => void) =>
    screen.UNSAFE_getAllByProps({ onAccessibilityEscape: onClose })[0];

  it('closes the creator action sheet on the escape gesture', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <CreatorActionSheet
        visible
        onClose={onClose}
        onEditDetails={jest.fn()}
        onCancelEvent={jest.fn()}
      />
    );

    const scrim = scrimFor(onClose);
    expect(scrim.props.accessible).toBe(false);

    scrim.props.onAccessibilityEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the month picker on the escape gesture', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <MonthYearPicker
        visible
        year={2026}
        month={9}
        userLanguage="en"
        minYear={2026}
        minMonth={0}
        onSelect={jest.fn()}
        onClose={onClose}
      />
    );

    const scrim = scrimFor(onClose);
    expect(scrim.props.accessible).toBe(false);

    scrim.props.onAccessibilityEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
