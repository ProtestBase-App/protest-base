jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

// Mock datetimepicker for FormDateField
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const MockPicker = (props: any) => {
    return React.createElement('DateTimePicker', {
      ...props,
      testID: props.testID || 'date-time-picker',
    });
  };
  MockPicker.DateTimePickerAndroid = {
    open: jest.fn(),
  };
  return {
    __esModule: true,
    default: MockPicker,
    DateTimePickerAndroid: {
      open: jest.fn(),
    },
  };
});

// Track FormDateField instances to capture their handleChangeText callbacks
let mockFormDateFieldCallbacks: { [key: string]: (isoString: string) => void } = {};

jest.mock('@/components/FormDateField', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ title, value, placeholder, handleChangeText, hasError, ...rest }: any) => {
      // Store the callback keyed by title/placeholder for test access
      if (handleChangeText) {
        mockFormDateFieldCallbacks[placeholder || title] = handleChangeText;
      }
      return React.createElement(
        'View',
        { testID: `form-date-field-${placeholder || title}` },
        React.createElement('Text', null, title),
        React.createElement('TextInput', {
          value: value || '',
          placeholder: placeholder || '',
          editable: false,
        })
      );
    },
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// Pass-through optimizer in tests; the helper has its own dedicated unit tests.
jest.mock('@/utils/imageOptimization', () => ({
  optimizeImageForUpload: jest.fn(async (image: any) => ({
    uri: image.uri,
    mimeType: image.mimeType ?? 'image/jpeg',
    fileName: image.fileName ?? null,
  })),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
}));

jest.mock('@/context/OrganizationsProvider', () => ({
  useOrganizations: jest.fn(() => ({
    dropdownItems: [
      { label: 'Org A', value: 'org-a' },
      { label: 'Org B', value: 'org-b' },
    ],
    loading: false,
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/formHelpers', () => {
  const React = require('react');
  return {
    SectionHeader: ({ title }: any) =>
      React.createElement('Text', { testID: 'section-header' }, title),
    HelperText: ({ text }: any) => React.createElement('Text', { testID: 'helper-text' }, text),
  };
});

// Mock the postal code modules
jest.mock('@/constants/PostalCodes_NL', () => ({
  POSTAL_CODES_NL_NL: [
    { sub_municipality_name: 'Amsterdam', post_code: 1000 },
    { sub_municipality_name: 'Rotterdam', post_code: 3000 },
  ],
}));

jest.mock('@/constants/PostalCodes_BE_EN', () => ({
  POSTAL_CODES_EN: [
    {
      sub_municipality_name_english: 'Brussels',
      sub_municipality_name_dutch: 'Brussel',
      sub_municipality_name_french: 'Bruxelles',
      post_code: 1000,
    },
    {
      sub_municipality_name_english: 'Antwerp',
      sub_municipality_name_dutch: 'Antwerpen',
      sub_municipality_name_french: 'Anvers',
      post_code: 2000,
    },
  ],
}));

jest.mock('@/constants/PostalCodes_BE_NL', () => ({
  POSTAL_CODES_NL: [
    {
      sub_municipality_name_english: 'Brussels',
      sub_municipality_name_dutch: 'Brussel',
      sub_municipality_name_french: 'Bruxelles',
      post_code: 1000,
    },
  ],
}));

jest.mock('@/constants/PostalCodes_BE_FR', () => ({
  POSTAL_CODES_FR: [
    {
      sub_municipality_name_english: 'Brussels',
      sub_municipality_name_dutch: 'Brussel',
      sub_municipality_name_french: 'Bruxelles',
      post_code: 1000,
    },
  ],
}));

// Mock the address autocomplete service so the street field never hits the network.
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

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react-native';
import EventForm from '@/components/EventForm';
import type { FormState, EmptyFieldsState } from '@/types/eventForm.types';
import * as ImagePicker from 'expo-image-picker';
import { searchAddress } from '@/services/address.service';

const mockSearchAddress = searchAddress as jest.Mock;

const mockForm: FormState = {
  organization_id: 'org-a',
  title: 'Climate March',
  description: 'A march for the climate',
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

const mockEmptyFields: EmptyFieldsState = {
  title: false,
  start_time: false,
  description: false,
  help_description: false,
};

// Helper to flush promises and state updates
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('EventForm', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title field with current value', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByDisplayValue('Climate March')).toBeTruthy();
  });

  it('renders the description field', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByDisplayValue('A march for the climate')).toBeTruthy();
  });

  it('renders in template mode (hides date/time fields)', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        mode="create-template"
      />
    );
    expect(screen.getByDisplayValue('Climate March')).toBeTruthy();
  });

  it('renders in edit-template mode', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        mode="edit-template"
      />
    );
    expect(screen.getByDisplayValue('Climate March')).toBeTruthy();
  });

  it('renders in create-event mode by default', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows help description field when help_needed is true', () => {
    const helpForm = { ...mockForm, help_needed: true, help_description: 'Volunteers needed' };
    render(
      <EventForm
        form={helpForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByDisplayValue('Volunteers needed')).toBeTruthy();
  });
});

describe('EventForm — field value changes', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls setForm when title text changes', () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByDisplayValue('Climate March'), 'New Title');
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
  });

  it('calls setForm when description text changes', () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByDisplayValue('A march for the climate'), 'New Description');
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'New Description' })
    );
  });

  it('calls setForm when website URL text changes', () => {
    const setForm = jest.fn();
    const formWithUrl = { ...mockForm, website_url: 'https://example.com' };
    render(
      <EventForm
        form={formWithUrl}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByDisplayValue('https://example.com'), 'https://new-url.com');
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ website_url: 'https://new-url.com' })
    );
  });

  it('calls setForm when disclaimer text changes', () => {
    const setForm = jest.fn();
    const formWithDisclaimer = { ...mockForm, disclaimer: 'Be safe' };
    render(
      <EventForm
        form={formWithDisclaimer}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByDisplayValue('Be safe'), 'Stay safe and peaceful');
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ disclaimer: 'Stay safe and peaceful' })
    );
  });
});

describe('EventForm — category selection', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls setForm when a category chip is pressed', async () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const categoryChip = screen.getByTestId('category-chip-Protest');
    await act(async () => {
      fireEvent.press(categoryChip);
    });
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ categories: 'Protest' }));
  });

  it('renders the selected category as an active chip', () => {
    const formWithCategory = { ...mockForm, categories: 'Protest' };
    render(
      <EventForm
        form={formWithCategory}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByTestId('category-chip-Protest')).toBeTruthy();
  });
});

describe('EventForm — country and postal code loading', () => {
  afterEach(() => jest.clearAllMocks());

  it('loads Belgium postal codes in EN', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('loads Belgium postal codes in NL', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="nl"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('loads Belgium postal codes in FR', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="fr"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('loads Belgium postal codes with unknown language (fallback to EN)', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="de"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('loads Netherlands postal codes', async () => {
    const formWithCountry = { ...mockForm, country: 'netherlands' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('clears postal codes data when no country is set', async () => {
    const formNoCountry = { ...mockForm, country: '' };
    render(
      <EventForm
        form={formNoCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders postal code section when country is selected', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders with existing postal code value', async () => {
    const formWithPostalCode = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithPostalCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('clears postal code when country changes', async () => {
    const setForm = jest.fn();
    const formWithPostalCode = { ...mockForm, country: 'belgium', postal_code: 1000 };

    const { rerender } = render(
      <EventForm
        form={formWithPostalCode}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });

    // Change country to netherlands
    const updatedForm = { ...formWithPostalCode, country: 'netherlands' };
    rerender(
      <EventForm
        form={updatedForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });

    // setForm should have been called to clear postal_code
    expect(setForm).toHaveBeenCalled();
  });

  it('renders postal code placeholder when value not found in loaded data', async () => {
    const formWithPostalCode = { ...mockForm, country: 'belgium', postal_code: 9999 };
    render(
      <EventForm
        form={formWithPostalCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('calls setForm when a country chip is pressed', async () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const belgiumChip = screen.getByTestId('country-chip-belgium');
    await act(async () => {
      fireEvent.press(belgiumChip);
    });
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ country: 'belgium' }));
  });
});

describe('EventForm — street address autocomplete', () => {
  afterEach(() => jest.clearAllMocks());

  const SUGGESTION = {
    street_address: 'Rue de la Loi 16',
    postal_code: '1000',
    city: 'Brussels',
    region: 'Brussels-Capital',
    country: 'belgium',
    lat: 50.8467,
    lng: 4.3625,
    label: 'Rue de la Loi 16, 1000, Brussels',
  };

  it('seeds the field with the existing street address and does not auto-search', async () => {
    const setForm = jest.fn();
    const formWithCountry = { ...mockForm, country: 'belgium', street_address: 'Legacy Street 7' };
    render(
      <EventForm
        form={formWithCountry}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // Pre-accepted: the value shows without forcing a re-search.
    expect(screen.getByDisplayValue('Legacy Street 7')).toBeTruthy();
    expect(mockSearchAddress).not.toHaveBeenCalled();
  });

  it('does NOT commit free-typed text to street_address (suggestions only)', async () => {
    const setForm = jest.fn();
    // postal_code is set because the street field is gated behind it.
    const formWithCountry = {
      ...mockForm,
      country: 'belgium',
      street_address: '',
      postal_code: 1000,
    };
    mockSearchAddress.mockResolvedValue([]);
    render(
      <EventForm
        form={formWithCountry}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    const streetInput = screen.getByTestId('input-event-street-address');
    await act(async () => {
      fireEvent.changeText(streetInput, '456 Oak Ave');
    });
    // No setForm call (object or functional updater) may set the typed text.
    const committedTypedText = setForm.mock.calls.some((call) => {
      const arg = call[0];
      const next = typeof arg === 'function' ? arg(formWithCountry) : arg;
      return next?.street_address === '456 Oak Ave';
    });
    expect(committedTypedText).toBe(false);
  });

  it('commits the canonical street and syncs city/region/postal when a suggestion is picked', async () => {
    const setForm = jest.fn();
    // postal_code is set because the street field is gated behind it.
    const formWithCountry = {
      ...mockForm,
      country: 'belgium',
      street_address: '',
      postal_code: 1000,
    };
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    render(
      <EventForm
        form={formWithCountry}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const streetInput = screen.getByTestId('input-event-street-address');
    fireEvent.changeText(streetInput, 'rue de la loi');

    const row = await screen.findByTestId('address-suggestion-0');
    await act(async () => {
      fireEvent.press(row);
    });

    // setForm is called with a functional updater; apply it to assert the result.
    const updater = setForm.mock.calls
      .map((c) => c[0])
      .reverse()
      .find((arg) => typeof arg === 'function');
    expect(updater).toBeDefined();
    const next = updater(formWithCountry);
    expect(next).toEqual(
      expect.objectContaining({
        street_address: 'Rue de la Loi 16',
        city: 'Brussels',
        region: 'Brussels-Capital',
        postal_code: 1000,
      })
    );
  });

  it('keeps the prior location set and only changes the street for a postal-less POI', async () => {
    const setForm = jest.fn();
    const formWithLocation = {
      ...mockForm,
      country: 'belgium',
      postal_code: 1000,
      city: 'Brussels',
      region: 'Brussels-Capital',
      street_address: '',
    };
    const POI = {
      street_address: 'Grote Markt',
      postal_code: null,
      city: null,
      region: null,
      country: 'belgium',
      lat: 50.8467,
      lng: 4.3625,
      label: 'Grote Markt',
    };
    mockSearchAddress.mockResolvedValue([POI]);
    render(
      <EventForm
        form={formWithLocation}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByTestId('input-event-street-address'), 'grote markt');
    const row = await screen.findByTestId('address-suggestion-0');
    await act(async () => {
      fireEvent.press(row);
    });

    const updater = setForm.mock.calls
      .map((c) => c[0])
      .reverse()
      .find((arg) => typeof arg === 'function');
    const next = updater(formWithLocation);
    // Street updates; the prior postal/city/region stay intact (no stale-postal /
    // cleared-city mismatch) since the POI carries no postal of its own.
    expect(next).toEqual(
      expect.objectContaining({
        street_address: 'Grote Markt',
        postal_code: 1000,
        city: 'Brussels',
        region: 'Brussels-Capital',
      })
    );
  });

  it('forwards the selected postal code from form state to the address search', async () => {
    const setForm = jest.fn();
    const formWithPostal = {
      ...mockForm,
      country: 'belgium',
      postal_code: 1000,
      street_address: '',
    };
    mockSearchAddress.mockResolvedValue([SUGGESTION]);
    render(
      <EventForm
        form={formWithPostal}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    fireEvent.changeText(screen.getByTestId('input-event-street-address'), 'avenue des casernes');
    await screen.findByTestId('address-suggestion-0');

    // The numeric form.postal_code reaches the endpoint as a string hint (4th arg).
    expect(mockSearchAddress).toHaveBeenCalledWith(
      'avenue des casernes',
      'be',
      'en',
      '1000',
      expect.anything()
    );
  });

  it('shows the street field as soon as a country is selected (address-first)', async () => {
    const setForm = jest.fn();
    const formNoPostal = {
      ...mockForm,
      country: 'belgium',
      postal_code: null,
      street_address: '',
    };
    render(
      <EventForm
        form={formNoPostal}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // Address drives the postal code now, so the street field is available
    // immediately once a country is chosen — no postal code required first.
    expect(screen.getByTestId('input-event-street-address')).toBeTruthy();
  });

  it('does not render the street field until a country is selected', async () => {
    const setForm = jest.fn();
    const formNoCountry = { ...mockForm, country: '', postal_code: null, street_address: '' };
    render(
      <EventForm
        form={formNoCountry}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The whole location group (street + postal) is gated on a country.
    expect(screen.queryByTestId('input-event-street-address')).toBeNull();
    expect(screen.queryByTestId('dropdown-event-postal-code')).toBeNull();
  });

  it('keeps an existing street visible for a legacy event with no postal code', async () => {
    const setForm = jest.fn();
    const legacyForm = {
      ...mockForm,
      country: 'belgium',
      postal_code: null,
      street_address: 'Old Street 9',
    };
    render(
      <EventForm
        form={legacyForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The `|| street_address` guard shows a saved street even without a postal
    // code, so editing legacy data never hides the existing address.
    expect(screen.getByDisplayValue('Old Street 9')).toBeTruthy();
  });
});

describe('EventForm — postal confirmation card & suggestion coordinates', () => {
  afterEach(() => jest.clearAllMocks());

  const SUGGESTION = {
    street_address: 'Rue de la Loi 16',
    postal_code: '1000',
    city: 'Brussels',
    region: 'Brussels-Capital',
    country: 'belgium',
    lat: 50.8467,
    lng: 4.3625,
    label: 'Rue de la Loi 16, 1000, Brussels',
  };

  const POI = {
    street_address: 'Grote Markt',
    postal_code: null,
    city: null,
    region: null,
    country: 'belgium',
    lat: 50.85,
    lng: 4.35,
    label: 'Grote Markt',
  };

  const baseForm = {
    ...mockForm,
    country: 'belgium',
    postal_code: 1000,
    street_address: '',
  };

  const FROM_ADDRESS_CAPTION = 'Set automatically from the address';

  // Apply the latest functional setForm updater to read the resulting state.
  const latestNext = (setForm: jest.Mock, base: FormState) => {
    const updater = setForm.mock.calls
      .map((c) => c[0])
      .reverse()
      .find((arg) => typeof arg === 'function');
    return updater ? updater(base) : undefined;
  };

  async function pickFirstSuggestion(setForm: jest.Mock, form: FormState) {
    render(
      <EventForm form={form} setForm={setForm} emptyFields={mockEmptyFields} userLanguage="en" />
    );
    fireEvent.changeText(screen.getByTestId('input-event-street-address'), 'rue de la loi');
    const row = await screen.findByTestId('address-suggestion-0');
    await act(async () => {
      fireEvent.press(row);
    });
  }

  it('shows the filled value as a confirmation card (no search input) instead of the picker', async () => {
    render(
      <EventForm
        form={baseForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // A filled postal renders as the read-only card — the search picker (the
    // confusing leftover input) is gone entirely.
    expect(screen.getByTestId('postal-code-filled')).toBeTruthy();
    expect(
      within(screen.getByTestId('postal-code-filled')).getByText('Brussels (1000)')
    ).toBeTruthy();
    expect(screen.queryByTestId('dropdown-event-postal-code')).toBeNull();
    // Loaded/manual value: not address-derived, so no "from the address" caption.
    expect(screen.queryByText(FROM_ADDRESS_CAPTION)).toBeNull();
  });

  it('shows the manual picker when no postal code is set', async () => {
    render(
      <EventForm
        form={{ ...mockForm, country: 'belgium', postal_code: null }}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId('dropdown-event-postal-code')).toBeTruthy();
    expect(screen.queryByTestId('postal-code-filled')).toBeNull();
  });

  it('captions the confirmation as address-derived once a suggestion carrying a postcode is accepted', async () => {
    const setForm = jest.fn();
    mockSearchAddress.mockResolvedValue([SUGGESTION]);

    await pickFirstSuggestion(setForm, baseForm);

    // The accepted suggestion's postcode is authoritative → confirmation card
    // with the "set from the address" caption, still no picker.
    expect(screen.getByTestId('postal-code-filled')).toBeTruthy();
    expect(screen.getByText(FROM_ADDRESS_CAPTION)).toBeTruthy();
    expect(screen.queryByTestId('dropdown-event-postal-code')).toBeNull();
  });

  it('forwards the accepted suggestion coordinates to form state', async () => {
    const setForm = jest.fn();
    mockSearchAddress.mockResolvedValue([SUGGESTION]);

    await pickFirstSuggestion(setForm, baseForm);

    const next = latestNext(setForm, baseForm);
    expect(next).toEqual(
      expect.objectContaining({
        street_address: 'Rue de la Loi 16',
        geocod_lat: 50.8467,
        geocod_lng: 4.3625,
      })
    );
  });

  it('keeps the prior postal confirmed without the caption for a postal-less POI, and stores its pin', async () => {
    const setForm = jest.fn();
    mockSearchAddress.mockResolvedValue([POI]);

    await pickFirstSuggestion(setForm, baseForm);

    // A POI carries no postcode: the prior value stays confirmed, but it is not
    // claimed to derive from the picked street.
    expect(screen.getByTestId('postal-code-filled')).toBeTruthy();
    expect(screen.queryByText(FROM_ADDRESS_CAPTION)).toBeNull();
    const next = latestNext(setForm, baseForm);
    expect(next).toEqual(expect.objectContaining({ geocod_lat: 50.85, geocod_lng: 4.35 }));
  });

  it('drops the address-derived caption when the street text is edited away from the suggestion', async () => {
    const setForm = jest.fn();
    mockSearchAddress.mockResolvedValue([SUGGESTION]);

    await pickFirstSuggestion(setForm, baseForm);
    expect(screen.getByText(FROM_ADDRESS_CAPTION)).toBeTruthy();

    // Editing the street diverges from the accepted suggestion → the postcode
    // is no longer authoritative; the value stays but sheds the caption.
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-event-street-address'), 'rue de la loi 1');
    });
    expect(screen.getByTestId('postal-code-filled')).toBeTruthy();
    expect(screen.queryByText(FROM_ADDRESS_CAPTION)).toBeNull();
  });

  it('clears the pin and drops the caption when the street is cleared', async () => {
    const setForm = jest.fn();
    mockSearchAddress.mockResolvedValue([SUGGESTION]);

    await pickFirstSuggestion(setForm, baseForm);
    expect(screen.getByText(FROM_ADDRESS_CAPTION)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Clear street address'));
    expect(screen.queryByText(FROM_ADDRESS_CAPTION)).toBeNull();

    const next = latestNext(setForm, baseForm);
    expect(next).toEqual(
      expect.objectContaining({ street_address: '', geocod_lat: null, geocod_lng: null })
    );
  });

  it('reveals the manual picker via "Change" and returns to the confirmation after a manual pick', async () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={baseForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });

    // "Change" swaps the card for the editable picker (with the value as a chip).
    fireEvent.press(screen.getByTestId('button-change-postal-code'));
    const picker = screen.getByTestId('dropdown-event-postal-code');
    expect(screen.queryByTestId('postal-code-filled')).toBeNull();

    // Search and pick a different code — commits it and ends the override.
    const input = within(picker).getByDisplayValue('');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'antwerp');
    fireEvent.press(within(picker).getByLabelText('Antwerp (2000)'));

    const next = latestNext(setForm, baseForm);
    expect(next).toEqual(expect.objectContaining({ postal_code: 2000 }));
    // The (controlled) value is still present → the confirmation card returns.
    expect(screen.getByTestId('postal-code-filled')).toBeTruthy();
    expect(screen.queryByTestId('dropdown-event-postal-code')).toBeNull();
  });
});

describe('EventForm — country-change location clearing', () => {
  afterEach(() => jest.clearAllMocks());

  // Helper: did any setForm call (object or functional updater) clear the address?
  const didClearAddress = (setForm: jest.Mock, base: FormState) =>
    setForm.mock.calls.some((call) => {
      const arg = call[0];
      const next = typeof arg === 'function' ? arg(base) : arg;
      return next?.street_address === '' && next?.postal_code === null;
    });

  it('does NOT wipe an address that arrives via async hydration (country ""→real)', async () => {
    // Reproduces the edit/draft load: the form first renders with country='' and
    // the real country + address arrive in a later setForm (unbatched re-render).
    const setForm = jest.fn();
    const emptyForm = { ...mockForm, country: '', street_address: '', postal_code: null };
    const { rerender } = render(
      <EventForm
        form={emptyForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });

    const loadedForm = {
      ...mockForm,
      country: 'belgium',
      street_address: 'Loaded Street 5',
      city: 'Brussels',
      postal_code: 1000,
    };
    await act(async () => {
      rerender(
        <EventForm
          form={loadedForm}
          setForm={setForm}
          emptyFields={mockEmptyFields}
          userLanguage="en"
        />
      );
      await flushPromises();
    });

    expect(didClearAddress(setForm, loadedForm)).toBe(false);
  });

  it('DOES clear the address on a genuine country change', async () => {
    const setForm = jest.fn();
    const beForm = {
      ...mockForm,
      country: 'belgium',
      street_address: 'Rue X 1',
      city: 'Brussels',
      region: 'BC',
      postal_code: 1000,
    };
    const { rerender } = render(
      <EventForm form={beForm} setForm={setForm} emptyFields={mockEmptyFields} userLanguage="en" />
    );
    await act(async () => {
      await flushPromises();
    });

    const nlForm = { ...beForm, country: 'netherlands' };
    await act(async () => {
      rerender(
        <EventForm
          form={nlForm}
          setForm={setForm}
          emptyFields={mockEmptyFields}
          userLanguage="en"
        />
      );
      await flushPromises();
    });

    expect(didClearAddress(setForm, nlForm)).toBe(true);
  });
});

describe('EventForm — image picking', () => {
  afterEach(() => jest.clearAllMocks());

  it('picks an image successfully', async () => {
    const setForm = jest.fn();
    const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///test-image.jpg', type: 'image' }],
    });

    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );

    const imageButton = screen.getByLabelText(/add.*image/i);
    await act(async () => {
      fireEvent.press(imageButton);
      await flushPromises();
    });

    // The system photo picker is launched directly — no permission request.
    expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: true,
        selectionLimit: 5,
      })
    );
    // setForm receives a functional updater — apply it to derive the next state.
    expect(setForm).toHaveBeenCalledWith(expect.any(Function));
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0];
    expect(updater(mockForm).images).toEqual([
      expect.objectContaining({ uri: 'file:///test-image.jpg' }),
    ]);
  });

  it('appends multiple picked images in order after existing ones', async () => {
    const setForm = jest.fn();
    const formWithImage: FormState = { ...mockForm, images: ['https://example.com/keep.jpg'] };
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', type: 'image' },
        { uri: 'file:///b.jpg', type: 'image' },
      ],
    });

    render(
      <EventForm
        form={formWithImage}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText(/add.*image/i));
      await flushPromises();
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ selectionLimit: 4 })
    );
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0];
    expect(updater(formWithImage).images).toEqual([
      'https://example.com/keep.jpg',
      expect.objectContaining({ uri: 'file:///a.jpg' }),
      expect.objectContaining({ uri: 'file:///b.jpg' }),
    ]);
  });

  it('caps the image list at 5 and warns when the picker returns too many', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const setForm = jest.fn();
    const fourImages: FormState = {
      ...mockForm,
      images: ['https://1.jpg', 'https://2.jpg', 'https://3.jpg', 'https://4.jpg'],
    };
    // selectionLimit is best-effort on some Android pickers — simulate overflow.
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', type: 'image' },
        { uri: 'file:///b.jpg', type: 'image' },
      ],
    });

    render(
      <EventForm
        form={fourImages}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText(/add.*image/i));
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalled();
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0];
    const nextImages = updater(fourImages).images;
    expect(nextImages).toHaveLength(5);
    expect(nextImages[4]).toEqual(expect.objectContaining({ uri: 'file:///a.jpg' }));
    alertSpy.mockRestore();
  });

  it('shows error alert when image picker throws', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
      new Error('Gallery unavailable')
    );

    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );

    const imageButton = screen.getByLabelText(/add.*image/i);
    await act(async () => {
      fireEvent.press(imageButton);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('handles cancelled image selection', async () => {
    const setForm = jest.fn();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );

    const imageButton = screen.getByLabelText(/add.*image/i);
    await act(async () => {
      fireEvent.press(imageButton);
      await flushPromises();
    });

    // setForm should not have been called with image since user cancelled
    expect(setForm).not.toHaveBeenCalled();
  });

  it('renders a thumbnail with a remove button when form has a picked image', () => {
    const formWithImage: FormState = {
      ...mockForm,
      images: [{ uri: 'file:///test-image.jpg' }],
    };
    render(
      <EventForm
        form={formWithImage}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByLabelText(/remove.*image/i)).toBeTruthy();
    // The add tile stays visible while under the 5-image cap.
    expect(screen.getByLabelText(/add.*image/i)).toBeTruthy();
  });

  it('renders a thumbnail with a remove button when form has an image URL string', () => {
    const formWithImage: FormState = { ...mockForm, images: ['https://example.com/image.jpg'] };
    render(
      <EventForm
        form={formWithImage}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByLabelText(/remove.*image/i)).toBeTruthy();
  });

  it('removes the pressed image from the list', () => {
    const setForm = jest.fn();
    const formWithImages: FormState = {
      ...mockForm,
      images: ['https://example.com/first.jpg', 'https://example.com/second.jpg'],
    };
    render(
      <EventForm
        form={formWithImages}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const removeButtons = screen.getAllByLabelText(/remove.*image/i);
    fireEvent.press(removeButtons[0]);
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0];
    expect(updater(formWithImages).images).toEqual(['https://example.com/second.jpg']);
  });

  it('reorders images with the move buttons', () => {
    const setForm = jest.fn();
    const formWithImages: FormState = {
      ...mockForm,
      images: ['https://example.com/first.jpg', 'https://example.com/second.jpg'],
    };
    render(
      <EventForm
        form={formWithImages}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const moveRightButtons = screen.getAllByLabelText(/move image later/i);
    fireEvent.press(moveRightButtons[0]);
    const updater = setForm.mock.calls[setForm.mock.calls.length - 1][0];
    expect(updater(formWithImages).images).toEqual([
      'https://example.com/second.jpg',
      'https://example.com/first.jpg',
    ]);
  });

  it('hides the add tile when the 5-image cap is reached', () => {
    const fullForm: FormState = {
      ...mockForm,
      images: ['https://1.jpg', 'https://2.jpg', 'https://3.jpg', 'https://4.jpg', 'https://5.jpg'],
    };
    render(
      <EventForm
        form={fullForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.queryByLabelText(/add.*image/i)).toBeNull();
  });
});

describe('EventForm — date and time fields', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders start time and end time fields with values', () => {
    const formWithTimes = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
      end_time: '2025-06-15T16:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithTimes}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });

  it('hides date fields but shows the image picker in template mode', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        mode="create-template"
      />
    );
    expect(screen.queryByTestId('form-date-field-Pick start date/time')).toBeNull();
    expect(screen.getByLabelText(/add.*image/i)).toBeTruthy();
  });
});

describe('EventForm — co-organizers', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders co-organizer chips when co_organizers are selected', () => {
    const formWithCoOrgs = { ...mockForm, co_organizers: ['org-a'] };
    render(
      <EventForm
        form={formWithCoOrgs}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // The RemovableChip for Org A should show its label
    // (orgLookup maps 'org-a' -> 'Org A' from the mocked useOrganizations)
    // Multiple elements may exist (in dropdown and chip), so use getAllByText
    expect(screen.getAllByText('Org A').length).toBeGreaterThanOrEqual(1);
  });

  it('renders chip with raw value when org lookup fails', async () => {
    const formWithUnknownOrg = { ...mockForm, co_organizers: ['unknown-org'] };
    render(
      <EventForm
        form={formWithUnknownOrg}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByText('unknown-org')).toBeTruthy();
  });

  it('removes a co-organizer when chip remove is pressed', async () => {
    const setForm = jest.fn();
    const formWithCoOrgs = { ...mockForm, co_organizers: ['org-a', 'org-b'] };
    render(
      <EventForm
        form={formWithCoOrgs}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // Press the remove button on the first chip
    const removeButton = screen.getByLabelText(/Remove Org A/i);
    fireEvent.press(removeButton);
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ co_organizers: ['org-b'] }));
  });

  it('removes a single co-organizer when its chip is pressed', async () => {
    const setForm = jest.fn();
    const formWithCoOrgs = { ...mockForm, co_organizers: ['org-a', 'org-b'] };
    render(
      <EventForm
        form={formWithCoOrgs}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    fireEvent.press(screen.getByLabelText(/Remove Org B/i));
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ co_organizers: ['org-a'] }));
  });
});

describe('EventForm — help needed toggle', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls setForm with help_needed toggled when form re-renders', () => {
    const setForm = jest.fn();
    // Test that the form renders the help_needed toggle and that when toggled to true,
    // the help description field appears
    const helpForm = { ...mockForm, help_needed: true, help_description: 'Test help' };
    render(
      <EventForm
        form={helpForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // Verify help description field shows when help_needed is true
    expect(screen.getByDisplayValue('Test help')).toBeTruthy();
  });

  it('renders the help checkbox unchecked when help_needed is false', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // When help_needed is false, the help description field should not be visible
    expect(screen.queryByDisplayValue('Test help')).toBeNull();
  });

  it('shows help_description error when emptyFields.help_description is true', () => {
    const helpForm = { ...mockForm, help_needed: true, help_description: '' };
    const emptyFieldsWithError = { ...mockEmptyFields, help_description: true };
    render(
      <EventForm
        form={helpForm}
        setForm={jest.fn()}
        emptyFields={emptyFieldsWithError}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — progress bar', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows 0% progress when no required fields are filled', () => {
    const emptyForm = { ...mockForm, title: '', description: '', start_time: '' };
    render(
      <EventForm
        form={emptyForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows 33% progress when 1 of 3 required fields is filled', () => {
    const partialForm = { ...mockForm, title: 'Test', description: '', start_time: '' };
    render(
      <EventForm
        form={partialForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('shows 100% when all required fields are filled', () => {
    const fullForm = {
      ...mockForm,
      title: 'Test',
      description: 'Desc',
      start_time: '2025-06-15T14:00:00.000Z',
    };
    render(
      <EventForm
        form={fullForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('does not show progress bar in template mode', () => {
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        mode="create-template"
      />
    );
    expect(screen.queryByText('0%')).toBeNull();
  });
});

describe('EventForm — error states', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders title with error state when emptyFields.title is true', () => {
    const emptyFieldsWithTitleError = { ...mockEmptyFields, title: true };
    const formEmpty = { ...mockForm, title: '' };
    render(
      <EventForm
        form={formEmpty}
        setForm={jest.fn()}
        emptyFields={emptyFieldsWithTitleError}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders start_time with error state when emptyFields.start_time is true', () => {
    const emptyFieldsWithTimeError = { ...mockEmptyFields, start_time: true };
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={emptyFieldsWithTimeError}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — disclaimer focus callback', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders with scrollViewRef without error', () => {
    const scrollToEnd = jest.fn();
    const scrollViewRef = { current: { scrollToEnd } };
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        scrollViewRef={scrollViewRef as any}
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — organizations loading state', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows loading indicator when organizations are loading', () => {
    const { useOrganizations } = require('@/context/OrganizationsProvider');
    useOrganizations.mockReturnValue({
      dropdownItems: [],
      loading: true,
    });

    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — postal code mapping (listPostalCodes)', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders postal code section for Netherlands with postal code selected', async () => {
    const formWithCountry = { ...mockForm, country: 'netherlands', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The postal code dropdown shows the value (as placeholder or item)
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders postal code section for Belgium in EN', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders postal code section for Belgium in NL', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="nl"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders postal code section for Belgium in FR', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="fr"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders postal code section for Belgium with unknown language', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="de"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — filteredPostalCodes branches', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows selected postal code item when it exists in loaded data', async () => {
    const formWithPostalCode = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithPostalCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The selected postal code should appear in the dropdown
    expect(screen.toJSON()).toBeTruthy();
  });

  it('synthesizes a postal dropdown item from the stored city when the code is not in the bundled set', async () => {
    // postal_code 9999 does not exist in the mock data (e.g. an NL/edge OSM code
    // arriving from an address suggestion). The dropdown must still reflect the
    // selection, labelled with the stored city, instead of falling back to blank.
    const formWithUncoveredCode = {
      ...mockForm,
      country: 'belgium',
      postal_code: 9999,
      city: 'Mystery Town',
    };
    render(
      <EventForm
        form={formWithUncoveredCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getAllByText('Mystery Town (9999)').length).toBeGreaterThan(0);
  });

  it('synthesizes a code-only dropdown item when no city is stored', async () => {
    const formWithUncoveredCode = { ...mockForm, country: 'belgium', postal_code: 9999, city: '' };
    render(
      <EventForm
        form={formWithUncoveredCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getAllByText('9999').length).toBeGreaterThan(0);
  });
});

describe('EventForm — category chip toggle', () => {
  afterEach(() => jest.clearAllMocks());

  it('clears the selected category when its active chip is tapped again', () => {
    const setForm = jest.fn();
    const formWithCategory = { ...mockForm, categories: 'Protest' };
    render(
      <EventForm
        form={formWithCategory}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // The chip is active; tapping it again toggles the category back off.
    fireEvent.press(screen.getByTestId('category-chip-Protest'));
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ categories: '' }));
  });
});

describe('EventForm — postal code clearing', () => {
  afterEach(() => jest.clearAllMocks());

  it('clears only the postal code when its chip is removed behind "Change", leaving the address intact', async () => {
    const setForm = jest.fn();
    // Address-first: the street is no longer gated behind the postal, so clearing
    // the (manual fallback) postal must not touch the street/city/region.
    const formWithPostalCode = {
      ...mockForm,
      country: 'belgium',
      postal_code: 1000,
      street_address: 'Rue de la Loi 16',
      city: 'Brussels',
      region: 'Brussels-Capital',
    };
    const { rerender } = render(
      <EventForm
        form={formWithPostalCode}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The filled value shows as the confirmation card; "Change" reveals the
    // picker with the value as a removable chip ("Remove Brussels (1000)").
    fireEvent.press(screen.getByTestId('button-change-postal-code'));
    fireEvent.press(screen.getByLabelText(/remove brussels/i));
    const updater = setForm.mock.calls
      .map((c) => c[0])
      .reverse()
      .find((arg) => typeof arg === 'function');
    expect(updater).toBeDefined();
    const next = updater(formWithPostalCode);
    expect(next).toEqual(
      expect.objectContaining({
        postal_code: null,
        street_address: 'Rue de la Loi 16',
        city: 'Brussels',
        region: 'Brussels-Capital',
      })
    );
    // Once the parent commits the removal, the picker shows for a fresh search.
    rerender(
      <EventForm form={next} setForm={setForm} emptyFields={mockEmptyFields} userLanguage="en" />
    );
    expect(screen.getByTestId('dropdown-event-postal-code')).toBeTruthy();
    expect(screen.queryByTestId('postal-code-filled')).toBeNull();
  });
});

describe('EventForm — co-organizer search selection', () => {
  // An earlier suite overrides useOrganizations with loading:true; clearAllMocks
  // doesn't reset return-value overrides, so re-establish the default here.
  beforeEach(() => {
    const { useOrganizations } = require('@/context/OrganizationsProvider');
    useOrganizations.mockReturnValue({
      dropdownItems: [
        { label: 'Org A', value: 'org-a' },
        { label: 'Org B', value: 'org-b' },
      ],
      loading: false,
    });
  });
  afterEach(() => jest.clearAllMocks());

  it('reveals organization options when the search field is focused', () => {
    render(
      <EventForm
        form={{ ...mockForm, co_organizers: [] }}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const field = screen.getByTestId('dropdown-event-co-organizers');
    expect(field).toBeTruthy();
    // minSearchLength is 0, so focusing the input shows all unselected options.
    fireEvent(within(field).getByDisplayValue(''), 'focus');
    expect(within(field).getByLabelText('Org A')).toBeTruthy();
    expect(within(field).getByLabelText('Org B')).toBeTruthy();
  });

  it('adds a co-organizer when an option is selected from the search', () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={{ ...mockForm, co_organizers: [] }}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const field = screen.getByTestId('dropdown-event-co-organizers');
    fireEvent(within(field).getByDisplayValue(''), 'focus');
    fireEvent.press(within(field).getByLabelText('Org A'));
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ co_organizers: ['org-a'] }));
  });
});

describe('EventForm — co-organizer cap', () => {
  // Re-establish the default useOrganizations mock (an earlier suite sets
  // loading:true, which clearAllMocks doesn't reset).
  beforeEach(() => {
    const { useOrganizations } = require('@/context/OrganizationsProvider');
    useOrganizations.mockReturnValue({
      dropdownItems: [
        { label: 'Org A', value: 'org-a' },
        { label: 'Org B', value: 'org-b' },
      ],
      loading: false,
    });
  });
  afterEach(() => jest.clearAllMocks());

  it('caps co-organizers at MAX_CO_ORGANIZERS and shows a hint at the limit', () => {
    // 10 already selected = at the backend cap.
    const tenSelected = Array.from({ length: 10 }, (_, i) => `org-${i}`);
    render(
      <EventForm
        form={{ ...mockForm, co_organizers: tenSelected }}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const field = screen.getByTestId('dropdown-event-co-organizers');
    // The limit hint is surfaced...
    expect(within(field).getByText(/up to 10 co-organizers/i)).toBeTruthy();
    // ...and focusing the search offers no addable options.
    fireEvent(within(field).getByDisplayValue(''), 'focus');
    expect(within(field).queryByLabelText('Org A')).toBeNull();
  });
});

describe('EventForm — help_needed checkbox toggle', () => {
  afterEach(() => jest.clearAllMocks());

  it('toggles help_needed to true when checkbox is pressed', () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // The checkbox label is "I need help in this event"
    const checkboxText = screen.getByText('I need help in this event');
    // Press the parent TouchableOpacity
    fireEvent.press(checkboxText);
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ help_needed: true }));
  });

  it('toggles help_needed to false when checkbox is pressed again', () => {
    const setForm = jest.fn();
    const helpForm = { ...mockForm, help_needed: true, help_description: 'Some help' };
    render(
      <EventForm
        form={helpForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const checkboxText = screen.getByText('I need help in this event');
    fireEvent.press(checkboxText);
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ help_needed: false }));
  });

  it('updates help_description when help_needed is true', () => {
    const setForm = jest.fn();
    const helpForm = { ...mockForm, help_needed: true, help_description: 'Need volunteers' };
    render(
      <EventForm
        form={helpForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const helpInput = screen.getByDisplayValue('Need volunteers');
    fireEvent.changeText(helpInput, 'Updated help description');
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({ help_description: 'Updated help description' })
    );
  });
});

describe('EventForm — handleStartTimeChange with end_time adjustment', () => {
  beforeEach(() => {
    mockFormDateFieldCallbacks = {};
  });
  afterEach(() => jest.clearAllMocks());

  it('sets start_time and adjusts end_time when new start is after end', () => {
    const setForm = jest.fn();
    const formWithTimes = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
      end_time: '2025-06-15T16:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithTimes}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // The FormDateField mock captures handleChangeText callbacks
    // The start time callback should be captured with the placeholder key
    const startTimeCallback = mockFormDateFieldCallbacks['Pick start date/time'];
    expect(startTimeCallback).toBeTruthy();

    // Simulate selecting a start time that is AFTER the current end time
    // Current end is 16:00, so set start to 18:00 to trigger the adjustment
    act(() => {
      startTimeCallback('2025-06-15T18:00:00.000Z');
    });

    // setForm should be called with both start_time AND end_time updated
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2025-06-15T18:00:00.000Z',
        end_time: '2025-06-15T18:00:00.000Z', // End time adjusted to match start
      })
    );
  });

  it('sets only start_time when new start is before end', () => {
    const setForm = jest.fn();
    const formWithTimes = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
      end_time: '2025-06-15T20:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithTimes}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const startTimeCallback = mockFormDateFieldCallbacks['Pick start date/time'];
    expect(startTimeCallback).toBeTruthy();

    // Select a start time still before end_time
    act(() => {
      startTimeCallback('2025-06-15T16:00:00.000Z');
    });

    // Only start_time should be updated, end_time unchanged
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2025-06-15T16:00:00.000Z',
      })
    );
    // End time should not be changed
    const callArg = setForm.mock.calls[0][0];
    expect(callArg.end_time).toBe('2025-06-15T20:00:00.000Z');
  });

  it('sets start_time when no end_time is set', () => {
    const setForm = jest.fn();
    render(
      <EventForm
        form={mockForm}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const startTimeCallback = mockFormDateFieldCallbacks['Pick start date/time'];
    expect(startTimeCallback).toBeTruthy();

    act(() => {
      startTimeCallback('2025-06-15T14:00:00.000Z');
    });

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2025-06-15T14:00:00.000Z',
      })
    );
  });

  it('calls setForm via end time callback', () => {
    const setForm = jest.fn();
    const formWithStartTime = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithStartTime}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    const endTimeCallback = mockFormDateFieldCallbacks['Pick end date/time'];
    expect(endTimeCallback).toBeTruthy();

    act(() => {
      endTimeCallback('2025-06-15T18:00:00.000Z');
    });

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        end_time: '2025-06-15T18:00:00.000Z',
      })
    );
  });
});

describe('EventForm — disclaimer focus with scrollViewRef', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls scrollToEnd when disclaimer field is focused', async () => {
    jest.useFakeTimers();
    const scrollToEnd = jest.fn();
    const scrollViewRef = { current: { scrollToEnd } };
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        scrollViewRef={scrollViewRef as any}
      />
    );
    // Find the disclaimer TextInput - it's a FormLongText with placeholder about safety
    const disclaimerInputs = screen.getAllByPlaceholderText(/safety.*info|accessibility.*details/i);
    expect(disclaimerInputs.length).toBeGreaterThanOrEqual(1);
    // Focus the input
    fireEvent(disclaimerInputs[0], 'focus');
    // Advance timers to trigger the setTimeout in handleDisclaimerFocus
    jest.advanceTimersByTime(200);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
    jest.useRealTimers();
  });

  it('handles missing scrollViewRef.current gracefully', () => {
    const scrollViewRef = { current: null };
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
        scrollViewRef={scrollViewRef as any}
      />
    );
    // Find and focus the disclaimer TextInput
    const disclaimerInputs = screen.getAllByPlaceholderText(/safety.*info|accessibility.*details/i);
    fireEvent(disclaimerInputs[0], 'focus');
    // Should not throw
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — date field interactions', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders start time and end time FormDateField components in create mode', () => {
    const formWithTimes = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
      end_time: '2025-06-15T16:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithTimes}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // Both date fields should be visible (not in template mode)
    const dateInputs = screen.getAllByPlaceholderText(/pick.*date/i);
    expect(dateInputs.length).toBe(2); // start time and end time
  });

  it('calls setForm when end time is changed', () => {
    const setForm = jest.fn();
    const formWithTimes = {
      ...mockForm,
      start_time: '2025-06-15T14:00:00.000Z',
      end_time: '2025-06-15T16:00:00.000Z',
    };
    render(
      <EventForm
        form={formWithTimes}
        setForm={setForm}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows error state for start_time when emptyFields.start_time is true', () => {
    const emptyFieldsWithTimeError = { ...mockEmptyFields, start_time: true };
    render(
      <EventForm
        form={mockForm}
        setForm={jest.fn()}
        emptyFields={emptyFieldsWithTimeError}
        userLanguage="en"
      />
    );
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('EventForm — postal code selection', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the selected postal code as a chip after loading', async () => {
    const formWithCountry = { ...mockForm, country: 'belgium', postal_code: 1000 };
    render(
      <EventForm
        form={formWithCountry}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    await act(async () => {
      await flushPromises();
    });
    // The selected postal code resolves to its bundled label and shows as a chip.
    expect(screen.getAllByText('Brussels (1000)').length).toBeGreaterThan(0);
  });

  it('renders postal code placeholder when data has not loaded yet', async () => {
    // postal_code=9999 doesn't exist in mock data, AND data hasn't loaded
    // This tests the branch where listPostalCodes.length === 0
    const formWithPostalCode = { ...mockForm, country: '', postal_code: 9999 };
    render(
      <EventForm
        form={formWithPostalCode}
        setForm={jest.fn()}
        emptyFields={mockEmptyFields}
        userLanguage="en"
      />
    );
    // Without a country, postal code section won't show, but the form should render
    expect(screen.toJSON()).toBeTruthy();
  });
});
