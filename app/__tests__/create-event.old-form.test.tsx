// The way back: `createEvent: false` puts this route on the old form, until that form is removed.
jest.mock('@/constants/EventFormFlags', () => ({
  EVENT_FORM_SHELL: {
    editTemplate: true,
    createTemplate: true,
    draftEdit: true,
    createEvent: false,
    eventEdit: true,
  },
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/services/event.service', () => ({
  createEventBackend: jest.fn(),
  createDraftEvent: jest.fn(),
  getEventByIdBackend: jest.fn(),
  DuplicateEventError: class DuplicateEventError extends Error {},
}));

jest.mock('@/services/template.service', () => ({
  getTemplate: jest.fn(),
}));

jest.mock('@/services/localStorageService', () => ({
  saveEventDraft: jest.fn(),
  getEventDraft: jest.fn(),
  clearEventDraft: jest.fn(),
}));

jest.mock('@/utils/localImages', () => ({
  keepExistingImages: jest.fn((images) => images),
}));

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { createMockUser, renderWithProviders } from '@/test-utils/render';
import { createBlankForm } from '@/utils/eventFormData';
import CreateEventModal from '../(tabs)/(more)/create-event';

const { useLocalSearchParams } = require('expo-router');

describe('CreateEventModal on the old form', () => {
  const providerOverrides = {
    globalContext: {
      user: createMockUser(),
      isLogged: true,
      loading: false,
      userLanguage: 'en',
      eventsCache: {},
      refetchEvents: jest.fn(),
      refreshUserEventCounts: jest.fn(),
      upsertEventInCache: jest.fn(),
    },
    userOrganizationsContext: {
      hasOrganizations: true,
      selectedOrganizationId: 'org-1',
      userOrganizations: [{ $id: 'org-1', name: 'Test Org' }],
      loading: false,
    },
  };

  const savedForm = createBlankForm({
    organization_id: 'org-1',
    title: 'Rally',
    description: 'Bring a friend',
    categories: 'Protest',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
    const storage = require('@/services/localStorageService');
    storage.getEventDraft.mockResolvedValue(null);
    storage.clearEventDraft.mockResolvedValue(undefined);
    storage.saveEventDraft.mockResolvedValue({ success: true });
  });

  it('lays every field out on the page, without the surfaces', async () => {
    const { findByTestId, queryByTestId } = renderWithProviders(<CreateEventModal />, {
      providerOverrides,
    });

    expect(await findByTestId('input-event-start-time')).toBeTruthy();
    expect(queryByTestId('row-event-when')).toBeNull();
  });

  it('publishes without the publish check', async () => {
    const { createEventBackend } = require('@/services/event.service');
    const { getEventDraft } = require('@/services/localStorageService');
    createEventBackend.mockResolvedValue({ $id: 'event-1' });
    getEventDraft.mockResolvedValue({ formData: savedForm, savedAt: Date.now() });
    useLocalSearchParams.mockReturnValue({ resume: '1' });

    const { findByDisplayValue, getByTestId, queryByTestId } = renderWithProviders(
      <CreateEventModal />,
      { providerOverrides }
    );
    await findByDisplayValue('Rally');

    await act(async () => {
      fireEvent.press(getByTestId('btn-create-event-submit'));
    });

    await waitFor(() => expect(createEventBackend).toHaveBeenCalledTimes(1));
    expect(createEventBackend.mock.calls[0][0]).toMatchObject({ title: 'Rally' });
    expect(queryByTestId('surface-publish')).toBeNull();
  });
});
