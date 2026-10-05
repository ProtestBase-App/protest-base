jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: jest.fn().mockReturnValue('light') }));
jest.mock('@/utils/i18n', () => ({ t: jest.fn((key) => key) }));

const mockPicker = jest.fn((_props: { options: { value: string }[] }) => null);
jest.mock('@/components/SheetSearchMultiSelect', () => ({
  SheetSearchMultiSelect: (props: { options: { value: string }[] }) => mockPicker(props),
}));

import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import HomeAreaScreen from '../(tabs)/(more)/home-area';
import type { LocationFilterOption } from '@/utils/locationFilterOptions';

const option = (value: string, tier: LocationFilterOption['tier']): LocationFilterOption => ({
  value,
  label: value,
  tier,
  count: 1,
  provinceLabel: '',
  searchText: value,
});

describe('HomeAreaScreen', () => {
  beforeEach(() => mockPicker.mockClear());

  it('offers areas but never a whole country, which has nothing to rank or center on', () => {
    renderWithProviders(<HomeAreaScreen />, {
      providerOverrides: {
        postalCodeContext: {
          loading: false,
          locationFilterOptions: [
            option('c:lu', 'country'),
            option('p:lu:wiltz', 'province'),
            option('m:lu:kiischpelt', 'municipality'),
          ],
        },
      },
    });

    const { options } = mockPicker.mock.calls[mockPicker.mock.calls.length - 1][0];
    expect(options.map((o) => o.value)).toEqual(['p:lu:wiltz', 'm:lu:kiischpelt']);
  });
});
