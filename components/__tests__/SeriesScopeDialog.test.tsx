jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import SeriesScopeDialog, { SeriesScopeDialogProps } from '@/components/SeriesScopeDialog';

const baseProps = (overrides: Partial<SeriesScopeDialogProps> = {}): SeriesScopeDialogProps => ({
  visible: true,
  title: 'Apply to',
  dismissLabel: 'Back',
  confirmLabel: 'Save',
  onDismiss: jest.fn(),
  onConfirm: jest.fn(),
  testID: 'scope',
  ...overrides,
});

const renderDialog = (overrides: Partial<SeriesScopeDialogProps> = {}) => {
  const props = baseProps(overrides);
  const utils = render(<SeriesScopeDialog {...props} />);
  return {
    ...utils,
    props,
    rerenderWith: (next: Partial<SeriesScopeDialogProps>) =>
      utils.rerender(<SeriesScopeDialog {...props} {...next} />),
  };
};

const stateOf = (node: { props: { accessibilityState?: Record<string, unknown> } }) =>
  node.props.accessibilityState;

// A press on a disabled control finds no handler of its own and lands on the card
// behind it, which swallows it with stopPropagation.
const pressDisabled = (node: Parameters<typeof fireEvent.press>[0]) =>
  fireEvent.press(node, { stopPropagation: jest.fn() });

describe('SeriesScopeDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('what it shows', () => {
    it('offers both scopes under the title, and nothing while closed', () => {
      const { getByText, queryByText, rerenderWith } = renderDialog({ message: 'Be careful' });

      expect(getByText('Apply to')).toBeTruthy();
      expect(getByText('Be careful')).toBeTruthy();
      expect(getByText('series.scope.only')).toBeTruthy();
      expect(getByText('series.scope.following')).toBeTruthy();

      rerenderWith({ visible: false });
      expect(queryByText('series.scope.only')).toBeNull();
    });

    it('says what each scope does under its option', () => {
      const { getByText } = renderDialog({ onlyHint: 'Just this one', followingHint: 'And later' });

      expect(getByText('Just this one')).toBeTruthy();
      expect(getByText('And later')).toBeTruthy();
    });

    it('derives its E2E ids from the testID, and has none without one', () => {
      const withId = renderDialog();
      expect(withId.getByTestId('scope-only')).toBeTruthy();
      expect(withId.getByTestId('scope-following')).toBeTruthy();
      expect(withId.getByTestId('scope-confirm')).toBeTruthy();
      expect(withId.getByTestId('scope-dismiss')).toBeTruthy();
      withId.unmount();

      const withoutId = renderDialog({ testID: undefined });
      expect(withoutId.queryByTestId('scope-only')).toBeNull();
      expect(withoutId.queryByTestId('scope-confirm')).toBeNull();
    });
  });

  describe('choosing a scope', () => {
    it('starts on only this event', () => {
      const { getByTestId } = renderDialog();

      expect(stateOf(getByTestId('scope-only'))).toMatchObject({ selected: true });
      expect(stateOf(getByTestId('scope-following'))).toMatchObject({ selected: false });
    });

    it('confirms only when nothing was chosen', () => {
      const { getByTestId, props } = renderDialog();

      fireEvent.press(getByTestId('scope-confirm'));

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('confirms following once it is chosen, and shows it selected', () => {
      const { getByTestId, props } = renderDialog();

      fireEvent.press(getByTestId('scope-following'));

      expect(stateOf(getByTestId('scope-following'))).toMatchObject({ selected: true });
      expect(stateOf(getByTestId('scope-only'))).toMatchObject({ selected: false });

      fireEvent.press(getByTestId('scope-confirm'));
      expect(props.onConfirm).toHaveBeenCalledWith('following');
    });

    it('goes back to only when it is chosen again', () => {
      const { getByTestId, props } = renderDialog();

      fireEvent.press(getByTestId('scope-following'));
      fireEvent.press(getByTestId('scope-only'));
      fireEvent.press(getByTestId('scope-confirm'));

      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('is a radio group of two radios', () => {
      const { getAllByRole } = renderDialog();

      expect(getAllByRole('radio')).toHaveLength(2);
    });
  });

  describe('when following is not possible', () => {
    const reason = 'The date was moved, which a series cannot do';

    it('says why under the greyed-out option, in place of its usual hint', () => {
      const { getByText, queryByText } = renderDialog({
        followingHint: 'Every later date is overwritten',
        followingDisabledReason: reason,
      });

      expect(getByText(reason)).toBeTruthy();
      expect(queryByText('Every later date is overwritten')).toBeNull();
    });

    it('marks the option disabled, and only this event as the choice', () => {
      const { getByTestId } = renderDialog({ followingDisabledReason: reason });

      expect(stateOf(getByTestId('scope-following'))).toMatchObject({
        selected: false,
        disabled: true,
      });
      expect(stateOf(getByTestId('scope-only'))).toMatchObject({ selected: true });
    });

    it('cannot be selected, and confirming still yields only', () => {
      const { getByTestId, props } = renderDialog({ followingDisabledReason: reason });

      pressDisabled(getByTestId('scope-following'));

      expect(stateOf(getByTestId('scope-following'))).toMatchObject({ selected: false });
      expect(stateOf(getByTestId('scope-only'))).toMatchObject({ selected: true });

      fireEvent.press(getByTestId('scope-confirm'));
      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('yields only even when following was chosen before the reason appeared', () => {
      const { getByTestId, props, rerenderWith } = renderDialog();

      fireEvent.press(getByTestId('scope-following'));
      rerenderWith({ followingDisabledReason: reason });
      fireEvent.press(getByTestId('scope-confirm'));

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('gives following back when the reason goes away', () => {
      const { getByTestId, props, rerenderWith } = renderDialog({
        followingDisabledReason: reason,
      });

      rerenderWith({ followingDisabledReason: undefined });
      fireEvent.press(getByTestId('scope-following'));
      fireEvent.press(getByTestId('scope-confirm'));

      expect(props.onConfirm).toHaveBeenCalledWith('following');
    });
  });

  describe('opening again', () => {
    it('starts on only this event every time, the wide choice being the expensive mistake', () => {
      const { getByTestId, props, rerenderWith } = renderDialog();

      fireEvent.press(getByTestId('scope-following'));
      rerenderWith({ visible: false });
      rerenderWith({ visible: true });

      expect(stateOf(getByTestId('scope-only'))).toMatchObject({ selected: true });
      expect(stateOf(getByTestId('scope-following'))).toMatchObject({ selected: false });

      fireEvent.press(getByTestId('scope-confirm'));
      expect(props.onConfirm).toHaveBeenCalledWith('only');
    });

    it('keeps the choice while it stays open', () => {
      const { getByTestId, props, rerenderWith } = renderDialog();

      fireEvent.press(getByTestId('scope-following'));
      rerenderWith({ title: 'Another title' });
      fireEvent.press(getByTestId('scope-confirm'));

      expect(props.onConfirm).toHaveBeenCalledWith('following');
    });
  });

  describe('leaving and working', () => {
    it('hands back to the parent on dismiss, with nothing confirmed', () => {
      const { getByTestId, props } = renderDialog();

      fireEvent.press(getByTestId('scope-dismiss'));

      expect(props.onDismiss).toHaveBeenCalledTimes(1);
      expect(props.onConfirm).not.toHaveBeenCalled();
    });

    it('cannot be confirmed or dismissed again while submitting', () => {
      const { getByTestId, props } = renderDialog({ submitting: true });

      pressDisabled(getByTestId('scope-confirm'));
      pressDisabled(getByTestId('scope-dismiss'));

      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onDismiss).not.toHaveBeenCalled();
    });
  });
});
