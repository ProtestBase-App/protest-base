jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

import React from 'react';
import { renderWithProviders, fireEvent } from '@/test-utils/render';
import { UpdateRequiredScreen } from '@/components/version/UpdateRequiredScreen';
import { t } from '@/utils/i18n';

describe('UpdateRequiredScreen', () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders update required title', () => {
    const { getByText } = renderWithProviders(
      <UpdateRequiredScreen message={null} onUpdate={mockOnUpdate} />
    );

    expect(getByText(t('version.updateRequired.title'))).toBeTruthy();
  });

  describe('Messages', () => {
    it('shows custom message when provided', () => {
      const customMessage = 'Critical update required now';

      const { getByText, queryByText } = renderWithProviders(
        <UpdateRequiredScreen message={customMessage} onUpdate={mockOnUpdate} />
      );

      expect(getByText(customMessage)).toBeTruthy();
      expect(queryByText(t('version.updateRequired.message'))).toBeNull();
    });

    it('shows default message when message is null', () => {
      const { getByText } = renderWithProviders(
        <UpdateRequiredScreen message={null} onUpdate={mockOnUpdate} />
      );

      expect(getByText(t('version.updateRequired.message'))).toBeTruthy();
    });
  });

  describe('Button Action', () => {
    it('calls onUpdate when button is pressed', () => {
      const { getByText } = renderWithProviders(
        <UpdateRequiredScreen message={null} onUpdate={mockOnUpdate} />
      );

      const updateButton = getByText(t('version.updateRequired.button'));
      fireEvent.press(updateButton);

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
