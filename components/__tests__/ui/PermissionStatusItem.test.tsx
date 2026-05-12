import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { PermissionStatusItem } from '@/components/ui/PermissionStatusItem';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('PermissionStatusItem', () => {
  const statusLabels = {
    granted: 'Allowed',
    denied: 'Blocked',
    undetermined: 'Not Set',
    notUsed: 'Not Used',
  };

  it('renders name and description', () => {
    const { getByText } = renderWithProviders(
      <PermissionStatusItem
        name="Camera"
        description="Access to camera for photos"
        status="granted"
        statusLabels={statusLabels}
      />
    );

    expect(getByText('Camera')).toBeTruthy();
    expect(getByText('Access to camera for photos')).toBeTruthy();
  });

  it('shows granted status label', () => {
    const { getByText } = renderWithProviders(
      <PermissionStatusItem
        name="Location"
        description="Access to location"
        status="granted"
        statusLabels={statusLabels}
      />
    );

    expect(getByText('Allowed')).toBeTruthy();
  });

  it('shows denied status label', () => {
    const { getByText } = renderWithProviders(
      <PermissionStatusItem
        name="Notifications"
        description="Send notifications"
        status="denied"
        statusLabels={statusLabels}
      />
    );

    expect(getByText('Blocked')).toBeTruthy();
  });

  it('shows undetermined status label', () => {
    const { getByText } = renderWithProviders(
      <PermissionStatusItem
        name="Microphone"
        description="Access to microphone"
        status="undetermined"
        statusLabels={statusLabels}
      />
    );

    expect(getByText('Not Set')).toBeTruthy();
  });

  it('shows settings button when denied with callback and label', () => {
    const mockOpenSettings = jest.fn();
    const { getByText } = renderWithProviders(
      <PermissionStatusItem
        name="Camera"
        description="Camera access"
        status="denied"
        statusLabels={statusLabels}
        onOpenSettings={mockOpenSettings}
        openSettingsLabel="Open Settings"
      />
    );

    const button = getByText('Open Settings');
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('does not show settings button when granted', () => {
    const mockOpenSettings = jest.fn();
    const { queryByText } = renderWithProviders(
      <PermissionStatusItem
        name="Location"
        description="Location access"
        status="granted"
        statusLabels={statusLabels}
        onOpenSettings={mockOpenSettings}
        openSettingsLabel="Open Settings"
      />
    );

    expect(queryByText('Open Settings')).toBeNull();
  });
});
