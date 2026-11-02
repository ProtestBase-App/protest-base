import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { fireEvent, renderWithProviders, waitFor } from '@/test-utils/render';
import { getEventDraft } from '@/services/localStorageService';
import CreateEventOptionsScreen from '../(tabs)/(more)/create-event-options';

jest.mock('@/services/localStorageService', () => ({
  getEventDraft: jest.fn(),
  clearEventDraft: jest.fn().mockResolvedValue(undefined),
}));

const template = {
  $id: 'tpl-1',
  name: 'Monthly vigil',
  description: 'First Sunday',
  $updatedAt: '2026-01-01T10:00:00.000Z',
  event_data: {},
};

const pastEvent = {
  $id: 'evt-1',
  title: 'Last march',
  start_time: '2026-01-01T10:00:00.000Z',
  city: 'Ghent',
  categories: ['protest'],
};

const draft = {
  formData: { title: 'Housing rally', images: [] },
  savedAt: Date.now() - 2 * 60 * 60 * 1000,
};

function renderScreen() {
  return renderWithProviders(<CreateEventOptionsScreen />, {
    providerOverrides: {
      templatesContext: { templates: [template], isStale: jest.fn(() => false) },
      pastEventsContext: { pastEvents: [pastEvent], isStale: jest.fn(() => false) },
    },
  });
}

describe('CreateEventOptionsScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (getEventDraft as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => alertSpy.mockRestore());

  it('shows no resume row without a local draft', async () => {
    const { findByTestId, queryByTestId } = renderScreen();

    await findByTestId('btn-create-from-scratch');

    expect(queryByTestId('btn-resume-draft')).toBeNull();
  });

  it('offers the local draft, and resumes it without asking', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue(draft);
    const { findByTestId, getByText } = renderScreen();

    fireEvent.press(await findByTestId('btn-resume-draft'));

    expect(getByText('Housing rally')).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/create-event',
      params: { resume: '1', source: 'resume' },
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('names an untitled draft', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue({ ...draft, formData: { title: ' ' } });
    const { findByText } = renderScreen();

    expect(await findByText('Untitled event')).toBeTruthy();
  });

  it('starts blank straight away with nothing to lose', async () => {
    const { findByTestId } = renderScreen();

    fireEvent.press(await findByTestId('btn-create-from-scratch'));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/create-event',
        params: { source: 'scratch' },
      })
    );
  });

  it('asks before a new event replaces the draft', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue(draft);
    const { findByTestId } = renderScreen();

    fireEvent.press(await findByTestId('btn-create-from-scratch'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
  });

  it('launches a template from its tile', async () => {
    const { findByTestId } = renderScreen();

    fireEvent.press(await findByTestId('template-tile-tpl-1'));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/create-event',
        params: { templateId: 'tpl-1', source: 'template' },
      })
    );
  });

  it('has no management menu on its tiles', async () => {
    const { findByTestId, queryByTestId } = renderScreen();

    await findByTestId('template-tile-tpl-1');

    expect(queryByTestId('template-menu-tpl-1')).toBeNull();
  });

  it('reuses a past event', async () => {
    const { findByTestId } = renderScreen();

    fireEvent.press(await findByTestId('past-event-use-evt-1'));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/create-event',
        params: { fromEventId: 'evt-1', source: 'past' },
      })
    );
  });

  it('still leads to every template', async () => {
    const { findByTestId } = renderScreen();

    fireEvent.press(await findByTestId('btn-use-template'));

    expect(router.push).toHaveBeenCalledWith('/event-templates');
  });
});
