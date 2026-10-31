// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/services/template.service', () => ({
  getTemplate: jest.fn(),
}));

jest.mock('@/services/storage.service', () => ({
  resolveImageUrls: jest.fn(),
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockUser } from '@/test-utils/render';
import { spyOnBackHandler } from '@/test-utils/backHandler';
import EditTemplateScreen from '../(tabs)/(more)/edit-template/[id]';

const { router, useLocalSearchParams } = require('expo-router');
const { getTemplate } = require('@/services/template.service');
const { resolveImageUrls } = require('@/services/storage.service');

const template = {
  $id: 'tpl-1',
  $createdAt: '2026-01-01',
  $updatedAt: '2026-01-01',
  name: 'Monthly vigil',
  description: 'Every first Saturday',
  organizer_id: 'user-1',
  event_data: {
    organization_id: 'org-1',
    title: 'Vigil for housing rights',
    description: 'Bring a candle',
    categories: ['Protest'],
    website_url: 'https://example.com',
  },
  image_urls: ['https://cdn.example.com/a.jpg'],
};

describe('EditTemplateScreen', () => {
  const editTemplate = jest.fn();
  const removeTemplate = jest.fn();
  let alertSpy: jest.SpyInstance;

  const renderScreen = (overrides: Record<string, unknown> = {}) =>
    renderWithProviders(<EditTemplateScreen />, {
      providerOverrides: {
        globalContext: {
          user: createMockUser(),
          isLogged: true,
          loading: false,
          userLanguage: 'en',
          eventsCache: {},
          refetchEvents: jest.fn(),
          refreshUserEventCounts: jest.fn(),
        },
        templatesContext: { editTemplate, removeTemplate },
        organizationsContext: { dropdownItems: [] },
        ...overrides,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'tpl-1' });
    getTemplate.mockResolvedValue(template);
    resolveImageUrls.mockImplementation(async (images: string[]) => images);
    editTemplate.mockResolvedValue(undefined);
    removeTemplate.mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('loading', () => {
    it('fills the form from the template', async () => {
      const { findByDisplayValue } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      await findByDisplayValue('Every first Saturday');
      await findByDisplayValue('Vigil for housing rights');
      await findByDisplayValue('Bring a candle');
      expect(getTemplate).toHaveBeenCalledWith('tpl-1');
    });

    it('goes back with the error when the template cannot be loaded', async () => {
      getTemplate.mockRejectedValue(new Error('Template not found'));

      renderScreen();

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('common.error', 'Template not found')
      );
      expect(router.back).toHaveBeenCalled();
    });

    it('redirects to the templates list without an id', async () => {
      useLocalSearchParams.mockReturnValue({});

      const { findByText } = renderScreen();

      expect(await findByText(/Redirect to.*event-templates/)).toBeTruthy();
    });
  });

  describe('saving', () => {
    it('sends the edited template and goes back', async () => {
      const { findByDisplayValue, getByTestId } = renderScreen();

      fireEvent.changeText(await findByDisplayValue('Monthly vigil'), 'Weekly vigil');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(editTemplate).toHaveBeenCalledWith(
        'tpl-1',
        expect.objectContaining({
          name: 'Weekly vigil',
          description: 'Every first Saturday',
          event_data: expect.objectContaining({
            organization_id: 'org-1',
            title: 'Vigil for housing rights',
            website_url: 'https://example.com',
          }),
          image_urls: ['https://cdn.example.com/a.jpg'],
        })
      );
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'template.updatedSuccess');
      expect(router.back).toHaveBeenCalled();
    });

    it('refuses an empty template name', async () => {
      const { findByDisplayValue, getByTestId, getByText } = renderScreen();

      fireEvent.changeText(await findByDisplayValue('Monthly vigil'), '   ');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(getByText('template.nameMissing')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(editTemplate).not.toHaveBeenCalled();
    });

    it('keeps the form on screen while it saves', async () => {
      editTemplate.mockImplementation(() => new Promise(() => {}));
      const { findByDisplayValue, getByTestId, getByDisplayValue, getByText } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(getByDisplayValue('Monthly vigil')).toBeTruthy();
      expect(getByText('common.saving')).toBeTruthy();
    });

    it('refuses volunteers with no text', async () => {
      getTemplate.mockResolvedValue({
        ...template,
        event_data: { ...template.event_data, help_needed: true },
      });
      const { findByDisplayValue, getByTestId, getByText } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(getByText('template.volunteerDescMissing')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(editTemplate).not.toHaveBeenCalled();
    });

    it('refuses a disclaimer an event could not use', async () => {
      getTemplate.mockResolvedValue({
        ...template,
        event_data: { ...template.event_data, disclaimer: 'x'.repeat(501) },
      });
      const { findByDisplayValue, getByTestId, getByText } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(getByText('createEvent.disclaimerTooLong')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(editTemplate).not.toHaveBeenCalled();
    });

    it('refuses event details past the server size limit', async () => {
      const { findByDisplayValue, getByTestId } = renderScreen();

      fireEvent.changeText(await findByDisplayValue('Bring a candle'), '\n'.repeat(8000));
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'template.dataTooLong');
      expect(editTemplate).not.toHaveBeenCalled();
    });

    it('does not save while offline', async () => {
      const { findByDisplayValue, getByTestId } = renderScreen({
        connectivityContext: { isOffline: true },
      });

      await findByDisplayValue('Monthly vigil');
      await act(async () => {
        fireEvent.press(getByTestId('btn-edit-template-save'));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'connectivity.actionUnavailableOffline'
      );
      expect(editTemplate).not.toHaveBeenCalled();
    });
  });

  describe('leaving', () => {
    it('asks before hardware back discards an edit', async () => {
      const back = spyOnBackHandler();
      const { findByDisplayValue } = renderScreen();

      fireEvent.changeText(await findByDisplayValue('Monthly vigil'), 'Weekly vigil');

      let handled = false;
      act(() => {
        handled = back.pressBack();
      });

      expect(handled).toBe(true);
      expect(alertSpy).toHaveBeenCalledWith(
        'draft.closeTitle',
        'draft.closeMessage',
        expect.any(Array)
      );
      expect(router.back).not.toHaveBeenCalled();
      back.restore();
    });

    it('leaves without asking when nothing was edited', async () => {
      const back = spyOnBackHandler();
      const { findByDisplayValue } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      act(() => {
        back.pressBack();
      });

      expect(alertSpy).not.toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();
      back.restore();
    });
  });

  describe('deleting', () => {
    it('deletes only after confirmation', async () => {
      const { findByDisplayValue, getByTestId } = renderScreen();

      await findByDisplayValue('Monthly vigil');
      fireEvent.press(getByTestId('btn-edit-template-delete'));

      expect(removeTemplate).not.toHaveBeenCalled();
      const [, , buttons] = alertSpy.mock.calls.find(
        ([title]) => title === 'template.deleteConfirmTitle'
      );
      await act(async () => {
        await buttons.find((b: { style?: string }) => b.style === 'destructive').onPress();
      });

      expect(removeTemplate).toHaveBeenCalledWith('tpl-1');
      expect(router.back).toHaveBeenCalled();
    });
  });
});
