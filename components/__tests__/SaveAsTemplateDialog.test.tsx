import React from 'react';
import { Alert } from 'react-native';

import { SaveAsTemplateDialog } from '@/components/SaveAsTemplateDialog';
import { spyOnBackHandler } from '@/test-utils/backHandler';
import { act, createMockEvent, fireEvent, renderWithProviders } from '@/test-utils/render';

describe('SaveAsTemplateDialog', () => {
  const addTemplate = jest.fn();
  const onClose = jest.fn();
  const event = createMockEvent({ title: 'Rally', organization_id: 'org-1' });
  let alertSpy: jest.SpyInstance;

  const renderDialog = () =>
    renderWithProviders(<SaveAsTemplateDialog event={event} onClose={onClose} />, {
      providerOverrides: { templatesContext: { addTemplate } },
    });

  const save = async (getByTestId: (id: string) => any) => {
    await act(async () => {
      fireEvent.press(getByTestId('btn-save-template-confirm'));
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    addTemplate.mockResolvedValue({ $id: 'tpl-1' });
  });

  afterEach(() => alertSpy.mockRestore());

  it('closes from a scrim TalkBack cannot land on', () => {
    const { UNSAFE_getAllByProps } = renderDialog();

    fireEvent.press(UNSAFE_getAllByProps({ 'aria-hidden': true })[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the hardware back button', () => {
    const back = spyOnBackHandler();
    renderDialog();

    expect(back.pressBack()).toBe(true);
    expect(onClose).toHaveBeenCalled();
    back.restore();
  });

  it('starts from the event title, with every part kept', async () => {
    const { getByDisplayValue, getByTestId } = renderDialog();

    expect(getByDisplayValue('Rally')).toBeTruthy();
    expect(getByTestId('template-part-link').props.accessibilityState.checked).toBe(true);
  });

  it('saves the parts left ticked', async () => {
    const { getByTestId } = renderDialog();

    fireEvent.press(getByTestId('template-part-photos'));
    await save(getByTestId);

    expect(addTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rally', organization_id: 'org-1', image_urls: [] })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('wants a name', async () => {
    const { getByTestId, getByDisplayValue, getByText } = renderDialog();

    fireEvent.changeText(getByDisplayValue('Rally'), '  ');
    await save(getByTestId);

    expect(getByText('Please enter a template name.')).toBeTruthy();
    expect(addTemplate).not.toHaveBeenCalled();
  });

  it('stays open when saving fails', async () => {
    addTemplate.mockRejectedValue(new Error('Network Error'));
    const { getByTestId } = renderDialog();

    await save(getByTestId);

    expect(alertSpy).toHaveBeenCalledWith(expect.anything(), 'Network Error');
    expect(onClose).not.toHaveBeenCalled();
  });
});
