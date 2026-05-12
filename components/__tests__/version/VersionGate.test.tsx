jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test-utils/render';
import { VersionGate } from '@/components/version/VersionGate';

describe('VersionGate', () => {
  const TestChildren = () => <Text testID="test-children">App Content</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner when isLoading is true', () => {
      const { queryByTestId } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: true,
              showMaintenanceScreen: false,
              showBlockingUpdateScreen: false,
              showDismissibleUpdatePrompt: false,
            },
          },
        }
      );

      expect(queryByTestId('test-children')).toBeNull();
    });
  });

  describe('Blocking Screens', () => {
    it('renders MaintenanceScreen when showMaintenanceScreen is true', () => {
      const { getByText, queryByTestId } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: false,
              showMaintenanceScreen: true,
              showBlockingUpdateScreen: false,
              showDismissibleUpdatePrompt: false,
              maintenanceMessage: 'Server maintenance in progress',
            },
          },
        }
      );

      expect(getByText('Server maintenance in progress')).toBeTruthy();
      expect(queryByTestId('test-children')).toBeNull();
    });

    it('renders UpdateRequiredScreen when showBlockingUpdateScreen is true', () => {
      const { getByText, queryByTestId } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: false,
              showMaintenanceScreen: false,
              showBlockingUpdateScreen: true,
              showDismissibleUpdatePrompt: false,
              updateMessage: 'Critical update required',
            },
          },
        }
      );

      expect(getByText('Critical update required')).toBeTruthy();
      expect(queryByTestId('test-children')).toBeNull();
    });

    it('shows maintenance screen when both maintenance and update flags are true', () => {
      const { getByText, queryByText, queryByTestId } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: false,
              showMaintenanceScreen: true,
              showBlockingUpdateScreen: true,
              showDismissibleUpdatePrompt: false,
              maintenanceMessage: 'Maintenance mode',
              updateMessage: 'Update required',
            },
          },
        }
      );

      // Maintenance takes priority
      expect(getByText('Maintenance mode')).toBeTruthy();
      expect(queryByText('Update required')).toBeNull();
      expect(queryByTestId('test-children')).toBeNull();
    });
  });

  describe('Normal Flow', () => {
    it('renders children when all checks pass', () => {
      const { getByTestId } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: false,
              showMaintenanceScreen: false,
              showBlockingUpdateScreen: false,
              showDismissibleUpdatePrompt: false,
            },
          },
        }
      );

      expect(getByTestId('test-children')).toBeTruthy();
    });

    it('renders children with UpdatePrompt when showDismissibleUpdatePrompt is true', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <VersionGate>
          <TestChildren />
        </VersionGate>,
        {
          providerOverrides: {
            versionCheckContext: {
              isLoading: false,
              showMaintenanceScreen: false,
              showBlockingUpdateScreen: false,
              showDismissibleUpdatePrompt: true,
              updateMessage: 'Optional update available',
            },
          },
        }
      );

      expect(getByTestId('test-children')).toBeTruthy();
      expect(getByText('Optional update available')).toBeTruthy();
    });
  });
});
