jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { MaintenanceScreen } from '@/components/version/MaintenanceScreen';
import { t } from '@/utils/i18n';

describe('MaintenanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders maintenance title parts', () => {
    const { getAllByText } = renderWithProviders(<MaintenanceScreen message={null} />);

    expect(
      getAllByText(t('version.maintenance.titlePrefix'), { exact: false }).length
    ).toBeGreaterThan(0);
    expect(
      getAllByText(t('version.maintenance.titleHighlight'), { exact: false }).length
    ).toBeGreaterThan(0);
  });

  it('shows custom message when provided', () => {
    const customMessage = 'Custom maintenance message';

    const { getByText, queryByText } = renderWithProviders(
      <MaintenanceScreen message={customMessage} />
    );

    expect(getByText(customMessage)).toBeTruthy();
    expect(queryByText(t('version.maintenance.message'))).toBeNull();
  });

  it('shows default message when message is null', () => {
    const { getByText } = renderWithProviders(<MaintenanceScreen message={null} />);

    expect(getByText(t('version.maintenance.message'))).toBeTruthy();
  });

  it('renders badge text', () => {
    const { getByText } = renderWithProviders(<MaintenanceScreen message={null} />);

    expect(getByText(t('version.maintenance.badge'))).toBeTruthy();
  });

  it('renders social media links', () => {
    const { getByLabelText } = renderWithProviders(<MaintenanceScreen message={null} />);

    expect(getByLabelText('Instagram')).toBeTruthy();
    expect(getByLabelText('TikTok')).toBeTruthy();
  });

  it('renders logo image', () => {
    const { getByLabelText } = renderWithProviders(<MaintenanceScreen message={null} />);

    expect(getByLabelText('ProtestBase')).toBeTruthy();
  });
});
