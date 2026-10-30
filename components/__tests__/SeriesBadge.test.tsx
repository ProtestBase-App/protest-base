jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeriesBadge } from '@/components/SeriesBadge';
import { DynamicRoutes } from '@/constants/Routes';
import { renderWithProviders } from '@/test-utils/render';

const MEMBER = {
  versionCheckContext: { features: { recurringEvents: true } },
  userOrganizationsContext: { userOrganizations: [{ $id: 'org-1' }] as any },
};
const FLAG_OFF = { ...MEMBER, versionCheckContext: { features: { recurringEvents: false } } };
const GUEST = { ...MEMBER, userOrganizationsContext: { userOrganizations: [] } };
const OTHER_ORG = {
  ...MEMBER,
  userOrganizationsContext: { userOrganizations: [{ $id: 'org-2' }] as any },
};

const seriesEvent = { series_id: 'series-1', organization_id: 'org-1' };

describe('SeriesBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // renderWithProviders spies on the hooks and never lets go of them.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('who sees it', () => {
    it('shows to a signed-in member of the organization that owns the event', () => {
      const { getByTestId } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />,
        { providerOverrides: MEMBER }
      );

      expect(getByTestId('badge')).toBeTruthy();
    });

    it.each([
      ['a guest', GUEST],
      ['a member of another organization', OTHER_ORG],
      ['anyone while the feature is off', FLAG_OFF],
    ])('stays hidden from %s', (_label, providerOverrides) => {
      const { queryByTestId } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />,
        { providerOverrides }
      );

      expect(queryByTestId('badge')).toBeNull();
    });

    it('stays hidden by default', () => {
      const { queryByTestId } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />
      );

      expect(queryByTestId('badge')).toBeNull();
    });

    it.each([[null], [undefined], ['']])(
      'has nothing to show for a series_id of %j',
      (series_id) => {
        const { queryByTestId } = renderWithProviders(
          <SeriesBadge event={{ ...seriesEvent, series_id }} testID="badge" />,
          { providerOverrides: MEMBER }
        );

        expect(queryByTestId('badge')).toBeNull();
      }
    );

    it('has nothing to show for an event with no organization', () => {
      const { queryByTestId } = renderWithProviders(
        <SeriesBadge event={{ series_id: 'series-1' }} testID="badge" />,
        { providerOverrides: MEMBER }
      );

      expect(queryByTestId('badge')).toBeNull();
    });

    it('fails closed instead of throwing with no providers around it', () => {
      const { queryByTestId } = render(<SeriesBadge event={seriesEvent} testID="badge" />);

      expect(queryByTestId('badge')).toBeNull();
    });
  });

  describe('what it says', () => {
    it('says "Recurring event" by default, as a button that leads to the dates', () => {
      const { getByRole, getByText } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />,
        { providerOverrides: MEMBER }
      );

      expect(getByText('series.badge.generic')).toBeTruthy();
      expect(getByRole('button').props.accessibilityHint).toBe('series.badge.seeAll');
    });

    it('says what the caller says instead, as text and as the accessibility label', () => {
      const { getByLabelText, getByText } = renderWithProviders(
        <SeriesBadge event={seriesEvent} label="Repeats weekly · 3 events" testID="badge" />,
        { providerOverrides: MEMBER }
      );

      expect(getByText('Repeats weekly · 3 events')).toBeTruthy();
      expect(getByLabelText('Repeats weekly · 3 events')).toBeTruthy();
    });
  });

  describe('pressing it', () => {
    it('opens the series screen of its series', () => {
      const { getByTestId } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />,
        { providerOverrides: MEMBER }
      );

      fireEvent.press(getByTestId('badge'), { stopPropagation: jest.fn() });

      expect(router.push).toHaveBeenCalledWith(DynamicRoutes.series('series-1'));
    });

    it('stops the press from bubbling up to the card around it', () => {
      const stopPropagation = jest.fn();
      const { getByTestId } = renderWithProviders(
        <SeriesBadge event={seriesEvent} testID="badge" />,
        { providerOverrides: MEMBER }
      );

      fireEvent.press(getByTestId('badge'), { stopPropagation });

      expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
  });
});
