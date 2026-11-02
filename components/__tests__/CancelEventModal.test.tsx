jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import CancelEventModal from '@/components/CancelEventModal';

const renderModal = (overrides: Partial<React.ComponentProps<typeof CancelEventModal>> = {}) => {
  const props = {
    visible: true,
    onDismiss: jest.fn(),
    onConfirm: jest.fn(),
    ...overrides,
  };
  return { ...render(<CancelEventModal {...props} />), props };
};

describe('CancelEventModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('a single event', () => {
    it('asks for confirmation with no choice of scope', () => {
      const { getByText, queryByText, queryByTestId } = renderModal();

      expect(getByText('events.cancelConfirmTitle')).toBeTruthy();
      expect(getByText('events.cancelConfirmMessage')).toBeTruthy();
      expect(queryByText('series.scope.only')).toBeNull();
      expect(queryByText('series.scope.following')).toBeNull();
      expect(queryByTestId('cancel-event-dialog-following')).toBeNull();
    });

    it('confirms for this event only', () => {
      const { getByTestId, props } = renderModal();

      fireEvent.press(getByTestId('cancel-event-dialog-confirm'));

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('is a single event when inSeries is explicitly false', () => {
      const { queryByTestId } = renderModal({ inSeries: false });

      expect(queryByTestId('cancel-event-dialog-following')).toBeNull();
    });
  });

  describe('a date of a series', () => {
    it('offers this event only or this and all following events, under the same question', () => {
      const { getByText, getByTestId } = renderModal({ inSeries: true });

      expect(getByText('events.cancelConfirmTitle')).toBeTruthy();
      expect(getByText('events.cancelConfirmMessage')).toBeTruthy();
      expect(getByText('series.scope.only')).toBeTruthy();
      expect(getByText('series.scope.following')).toBeTruthy();
      expect(getByText('series.dialogs.cancelFollowingHint')).toBeTruthy();
      expect(getByTestId('cancel-event-dialog-only').props.accessibilityState.selected).toBe(true);
    });

    it('confirms for this event only by default', () => {
      const { getByTestId, props } = renderModal({ inSeries: true });

      fireEvent.press(getByTestId('cancel-event-dialog-confirm'));

      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('confirms for this and all following events once they are chosen', () => {
      const { getByTestId, props } = renderModal({ inSeries: true });

      fireEvent.press(getByTestId('cancel-event-dialog-following'));
      fireEvent.press(getByTestId('cancel-event-dialog-confirm'));

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith('following');
    });

    it('keeps the event active when dismissed, and confirms nothing', () => {
      const { getByTestId, props } = renderModal({ inSeries: true });

      fireEvent.press(getByTestId('cancel-event-dialog-dismiss'));

      expect(props.onDismiss).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).not.toHaveBeenCalled();
    });

    it('starts on only this event again when it is reopened', () => {
      const { getByTestId, rerender, props } = renderModal({ inSeries: true });

      fireEvent.press(getByTestId('cancel-event-dialog-following'));
      rerender(<CancelEventModal {...props} inSeries visible={false} />);
      rerender(<CancelEventModal {...props} inSeries visible />);
      fireEvent.press(getByTestId('cancel-event-dialog-confirm'));

      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });
  });
});
