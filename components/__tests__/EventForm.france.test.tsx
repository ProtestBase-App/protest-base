jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/utils/imageOptimization', () => ({
  optimizeImageForUpload: jest.fn(async (image: any) => image),
}));

jest.mock('@/context/OrganizationsProvider', () => ({
  useOrganizations: jest.fn(() => ({
    dropdownItems: [],
    loading: false,
    ensureOrganizations: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/utils/formHelpers', () => {
  const React = require('react');
  return {
    SectionHeader: ({ title }: any) =>
      React.createElement('Text', { testID: 'section-header' }, title),
    HelperText: ({ text }: any) => React.createElement('Text', { testID: 'helper-text' }, text),
  };
});

jest.mock('@/services/address.service', () => ({
  searchAddress: jest.fn(),
  AddressSearchError: class AddressSearchError extends Error {
    kind: string;
    constructor(kind: string, message: string) {
      super(message);
      this.kind = kind;
    }
  },
}));

// The France gate, as PostalCodeProvider reports it.
let mockFranceEnabled = false;
jest.mock('@/context/PostalCodeProvider', () => ({
  usePostalCodes: () => ({ franceEnabled: mockFranceEnabled }),
}));

import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react-native';
import EventForm from '@/components/EventForm';
import type { FormState, EmptyFieldsState } from '@/types/eventForm.types';
import { searchAddress } from '@/services/address.service';

const mockSearchAddress = searchAddress as jest.Mock;

const baseForm: FormState = {
  organization_id: 'org-a',
  title: 'Marche pour le climat',
  description: 'Une marche',
  images: [],
  street_address: '',
  city: '',
  region: '',
  country: '',
  start_time: '',
  end_time: '',
  organizer_name: '',
  website_url: '',
  categories: '',
  disclaimer: '',
  postal_code: null,
  co_organizers: [],
  help_needed: false,
  help_description: null,
  geocod_lat: null,
  geocod_lng: null,
};

const franceForm: FormState = { ...baseForm, country: 'france' };

const emptyFields: EmptyFieldsState = {
  title: false,
  start_time: false,
  description: false,
  help_description: false,
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// Apply the latest functional setForm updater to read the resulting state.
const latestNext = (setForm: jest.Mock, base: FormState) => {
  const updater = setForm.mock.calls
    .map((call) => call[0])
    .reverse()
    .find((arg) => typeof arg === 'function');
  return updater ? updater(base) : undefined;
};

const renderForm = async (form: FormState, setForm = jest.fn()) => {
  const view = render(
    <EventForm form={form} setForm={setForm} emptyFields={emptyFields} userLanguage="en" />
  );
  await act(async () => {
    await flushPromises();
  });
  return { setForm, ...view };
};

const searchPicker = (query: string) => {
  const picker = screen.getByTestId('dropdown-event-postal-code');
  const input = within(picker).getByDisplayValue('');
  fireEvent(input, 'focus');
  fireEvent.changeText(input, query);
  return picker;
};

describe('EventForm — France', () => {
  beforeEach(() => {
    mockFranceEnabled = false;
  });

  afterEach(() => jest.clearAllMocks());

  describe('while the backend does not serve France', () => {
    it('offers no France chip', async () => {
      await renderForm(baseForm);
      expect(screen.getByTestId('country-chip-luxembourg')).toBeTruthy();
      expect(screen.queryByTestId('country-chip-france')).toBeNull();
    });

    it('treats a stored French event as a country it does not know', async () => {
      await renderForm({ ...franceForm, postal_code: '75011', city: 'Paris' });

      expect(screen.queryByTestId('country-chip-france')).toBeNull();
      // No French address search (it would answer 400): the street stays locked.
      expect(screen.getByTestId('input-event-street-address').props.editable).toBe(false);
      expect(screen.queryByText(/Town or village/)).toBeNull();
    });
  });

  describe('once the backend serves France', () => {
    beforeEach(() => {
      mockFranceEnabled = true;
    });

    it('offers France', async () => {
      await renderForm(baseForm);
      expect(screen.getByTestId('country-chip-france')).toBeTruthy();
    });

    it('writes the picked commune: a 5-digit string postcode, the commune and its région', async () => {
      const { setForm } = await renderForm(franceForm);

      const picker = searchPicker('bourg-en');
      fireEvent.press(within(picker).getByLabelText('Bourg-en-Bresse (01000)'));

      const next = latestNext(setForm, franceForm);
      expect(next).toEqual(
        expect.objectContaining({
          postal_code: '01000',
          city: 'Bourg-en-Bresse',
          region: 'Auvergne-Rhône-Alpes',
        })
      );
      expect(typeof next.postal_code).toBe('string');
    });

    it('finds communes by postcode and tells apart those sharing one', async () => {
      const { setForm } = await renderForm(franceForm);

      const picker = searchPicker('01000');
      expect(within(picker).getByLabelText('Bourg-en-Bresse (01000)')).toBeTruthy();
      fireEvent.press(within(picker).getByLabelText('Saint-Denis-lès-Bourg (01000)'));

      expect(latestNext(setForm, franceForm)).toEqual(
        expect.objectContaining({ postal_code: '01000', city: 'Saint-Denis-lès-Bourg' })
      );
    });

    it('finds a commune however its name is typed', async () => {
      await renderForm(franceForm);

      const picker = searchPicker('saint etienne');
      expect(within(picker).getByLabelText('Saint-Étienne (42000)')).toBeTruthy();
    });

    it('stores Corsican communes under Corse with their 20xxx code', async () => {
      const { setForm } = await renderForm(franceForm);

      fireEvent.press(within(searchPicker('ajaccio')).getByLabelText('Ajaccio (20000)'));

      expect(latestNext(setForm, franceForm)).toEqual(
        expect.objectContaining({ postal_code: '20000', city: 'Ajaccio', region: 'Corse' })
      );
    });

    it('labels the field for communes', async () => {
      await renderForm(franceForm);
      expect(screen.getByText(/Town or village/)).toBeTruthy();
    });

    it('shows a stored French location by commune and postcode', async () => {
      await renderForm({ ...franceForm, postal_code: '75011', city: 'Paris' });

      const card = screen.getByTestId('postal-code-filled');
      expect(within(card).getByText('Paris (75011)')).toBeTruthy();
    });

    it('searches French addresses with country fr and the 5-digit postcode as hint', async () => {
      mockSearchAddress.mockResolvedValue([]);
      await renderForm({ ...franceForm, postal_code: '01000', city: 'Bourg-en-Bresse' });

      fireEvent.changeText(screen.getByTestId('input-event-street-address'), 'rue victor hugo');
      await waitFor(() => expect(mockSearchAddress).toHaveBeenCalled());

      expect(mockSearchAddress).toHaveBeenCalledWith(
        'rue victor hugo',
        'fr',
        'en',
        '01000',
        expect.anything()
      );
    });

    it('keeps a loaded French location when the gate opens after the form', async () => {
      mockFranceEnabled = false;
      const loaded = {
        ...franceForm,
        street_address: '1 Rue de la Roquette',
        postal_code: '75011',
        city: 'Paris',
        region: 'Île-de-France',
      };
      const { setForm, rerender } = await renderForm(loaded);

      mockFranceEnabled = true;
      rerender(
        <EventForm form={loaded} setForm={setForm} emptyFields={emptyFields} userLanguage="en" />
      );
      await act(async () => {
        await flushPromises();
      });

      expect(setForm).not.toHaveBeenCalled();
      expect(screen.getByTestId('country-chip-france')).toBeTruthy();
    });
  });
});
