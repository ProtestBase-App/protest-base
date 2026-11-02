jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key
  ),
}));

import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import DuplicateEventModal, { DuplicateEventModalProps } from '@/components/DuplicateEventModal';
import type { DuplicateSummary } from '@/types/event.types';

const NOV_3 = '2026-11-03T18:00:00.000Z';
const NOV_10 = '2026-11-10T18:00:00.000Z';

const duplicate = (overrides: Partial<DuplicateSummary> = {}): DuplicateSummary => ({
  id: 'dup-1',
  title: 'Weekly vigil',
  start_time: '2026-11-17T18:00:00.000Z',
  city: 'Brussels',
  status: 'active',
  organization_id: 'org-1',
  relationship: 'own',
  reason: 'content',
  strength: 'strong',
  ...overrides,
});

const renderModal = (
  duplicates: DuplicateSummary[],
  overrides: Partial<DuplicateEventModalProps> = {}
) => {
  const props: DuplicateEventModalProps = {
    visible: true,
    mode: 'create',
    duplicates,
    canOverride: true,
    locale: 'en',
    onDismiss: jest.fn(),
    onConfirm: jest.fn(),
    onOpenDuplicate: jest.fn(),
    ...overrides,
  };
  return { ...render(<DuplicateEventModal {...props} />), props };
};

describe('DuplicateEventModal', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const keyWarnings = () =>
    consoleError.mock.calls.filter((call) => /same key|unique "key"/i.test(String(call[0])));

  describe('"Your date" on a series', () => {
    it('names the submitted date a row clashed on', () => {
      const { getByText } = renderModal([duplicate({ occurrence_start_time: NOV_3 })]);

      expect(getByText('duplicates.yourDate:{"date":"Tue 3 Nov"}')).toBeTruthy();
    });

    it('names nothing for a row without one, which is a single event', () => {
      const { queryByText, getByText } = renderModal([duplicate()]);

      expect(getByText('Weekly vigil')).toBeTruthy();
      expect(queryByText(/duplicates\.yourDate/)).toBeNull();
    });

    it('treats a null date and an unreadable one as no date', () => {
      const { queryByText } = renderModal([
        duplicate({ id: 'a', occurrence_start_time: null }),
        duplicate({ id: 'b', occurrence_start_time: 'not-a-date' }),
      ]);

      expect(queryByText(/duplicates\.yourDate/)).toBeNull();
    });

    it('names the date on the rows that have one, and only those', () => {
      const { getAllByText } = renderModal([
        duplicate({ id: 'a', occurrence_start_time: NOV_3 }),
        duplicate({ id: 'b' }),
      ]);

      expect(getAllByText(/duplicates\.yourDate/)).toHaveLength(1);
    });

    it('writes the date in the language of the user', () => {
      const { getByText } = renderModal([duplicate({ occurrence_start_time: NOV_3 })], {
        locale: 'nl',
      });

      expect(getByText('duplicates.yourDate:{"date":"di 3 nov"}')).toBeTruthy();
    });
  });

  describe('one existing event that clashes with several dates', () => {
    const twoDates = () => [
      duplicate({ occurrence_start_time: NOV_3 }),
      duplicate({ occurrence_start_time: NOV_10 }),
    ];

    it('renders a row for each date, each with its own date', () => {
      const { getAllByText, getByText } = renderModal(twoDates());

      expect(getAllByText('Weekly vigil')).toHaveLength(2);
      expect(getByText('duplicates.yourDate:{"date":"Tue 3 Nov"}')).toBeTruthy();
      expect(getByText('duplicates.yourDate:{"date":"Tue 10 Nov"}')).toBeTruthy();
    });

    it('does not warn about a duplicate key', () => {
      renderModal(twoDates());

      expect(keyWarnings()).toEqual([]);
    });

    // The control: React really does report this through console.error, so an empty
    // list above means the keys are unique rather than the warning going unnoticed.
    it('would have been reported, were two rows to share a key', () => {
      render(
        <View>
          <Text key="dup-1">one</Text>
          <Text key="dup-1">two</Text>
        </View>
      );

      expect(keyWarnings().length).toBeGreaterThan(0);
    });

    it('says how many events they are, not how many rows', () => {
      const { getByText, queryByText } = renderModal(twoDates());

      expect(getByText('duplicates.createIntro:{"count":1}')).toBeTruthy();
      expect(queryByText('duplicates.createIntro:{"count":2}')).toBeNull();
    });

    it('counts two different events as two', () => {
      const { getByText } = renderModal([
        duplicate({ id: 'a', occurrence_start_time: NOV_3 }),
        duplicate({ id: 'b', occurrence_start_time: NOV_3 }),
        duplicate({ id: 'a', occurrence_start_time: NOV_10 }),
      ]);

      expect(getByText('duplicates.createIntro:{"count":2}')).toBeTruthy();
      expect(keyWarnings()).toEqual([]);
    });

    it('opens the row that was tapped, with the date it clashed on', () => {
      const { getAllByLabelText, props } = renderModal(twoDates());

      const openButtons = getAllByLabelText(
        'duplicates.accessibilityOpen:{"title":"Weekly vigil"}'
      );
      expect(openButtons).toHaveLength(2);
      fireEvent.press(openButtons[1]);

      expect(props.onOpenDuplicate).toHaveBeenCalledTimes(1);
      expect(props.onOpenDuplicate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dup-1', occurrence_start_time: NOV_10 })
      );
    });
  });

  describe('the dialog around the rows', () => {
    it('offers "create anyway" only when the backend allows it', () => {
      const allowed = renderModal([duplicate()]);
      expect(allowed.getByTestId('duplicate-dialog-confirm')).toBeTruthy();
      allowed.unmount();

      const refused = renderModal([duplicate()], { canOverride: false });
      expect(refused.queryByTestId('duplicate-dialog-confirm')).toBeNull();
      expect(refused.getByText('duplicates.notOverridable')).toBeTruthy();
    });

    it('confirms and dismisses through its own buttons', () => {
      const { getByTestId, props } = renderModal([duplicate()]);

      fireEvent.press(getByTestId('duplicate-dialog-confirm'));
      fireEvent.press(getByTestId('duplicate-dialog-dismiss'));

      expect(props.onConfirm).toHaveBeenCalledTimes(1);
      expect(props.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('speaks of publishing in publish mode', () => {
      const { getByText } = renderModal([duplicate()], { mode: 'publish' });

      expect(getByText('duplicates.publishTitle')).toBeTruthy();
      expect(getByText('duplicates.publishAnyway')).toBeTruthy();
    });
  });
});
