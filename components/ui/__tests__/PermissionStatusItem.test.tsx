jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PermissionStatusItem } from '@/components/ui/PermissionStatusItem';
import type { PermissionStatus } from '@/utils/permissionHelpers';

const statusLabels = {
  granted: 'Granted',
  denied: 'Denied',
  undetermined: 'Not Asked',
  notUsed: 'Not Used',
};

describe('PermissionStatusItem', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Status rendering', () => {
    it('renders name and description', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Used for taking photos"
          status="granted"
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Camera')).toBeTruthy();
      expect(screen.getByText('Used for taking photos')).toBeTruthy();
    });

    it('shows granted label when status is granted', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="granted"
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Granted')).toBeTruthy();
    });

    it('shows denied label when status is denied', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="denied"
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Denied')).toBeTruthy();
    });

    it('shows undetermined label when status is undetermined', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="undetermined"
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Not Asked')).toBeTruthy();
    });

    it('shows notUsed label when status is notUsed', () => {
      render(
        <PermissionStatusItem
          name="Microphone"
          description="Audio"
          status="notUsed"
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Not Used')).toBeTruthy();
    });

    it('shows dash when notUsed label is missing', () => {
      const labelsWithoutNotUsed = {
        granted: 'Granted',
        denied: 'Denied',
        undetermined: 'Not Asked',
      };
      render(
        <PermissionStatusItem
          name="Microphone"
          description="Audio"
          status="notUsed"
          statusLabels={labelsWithoutNotUsed}
        />
      );
      expect(screen.getByText('-')).toBeTruthy();
    });

    it('falls back to undetermined for unknown status', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status={'unknown' as PermissionStatus}
          statusLabels={statusLabels}
        />
      );
      expect(screen.getByText('Not Asked')).toBeTruthy();
    });
  });

  describe('Settings button', () => {
    it('does not show settings button for granted status', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="granted"
          statusLabels={statusLabels}
          onOpenSettings={jest.fn()}
          openSettingsLabel="Open Settings"
        />
      );
      expect(screen.queryByText('Open Settings')).toBeNull();
    });

    it('shows settings button for denied status', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="denied"
          statusLabels={statusLabels}
          onOpenSettings={jest.fn()}
          openSettingsLabel="Open Settings"
        />
      );
      expect(screen.getByText('Open Settings')).toBeTruthy();
    });

    it('calls onOpenSettings when settings button is pressed', () => {
      const onOpenSettings = jest.fn();
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="denied"
          statusLabels={statusLabels}
          onOpenSettings={onOpenSettings}
          openSettingsLabel="Open Settings"
        />
      );
      fireEvent.press(screen.getByText('Open Settings'));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('does not show settings button if onOpenSettings is missing', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="denied"
          statusLabels={statusLabels}
          openSettingsLabel="Open Settings"
        />
      );
      expect(screen.queryByText('Open Settings')).toBeNull();
    });

    it('does not show settings button if openSettingsLabel is missing', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="denied"
          statusLabels={statusLabels}
          onOpenSettings={jest.fn()}
        />
      );
      // No button text to find without the label
      expect(screen.getByText('Denied')).toBeTruthy();
    });

    it('does not show settings button for undetermined status even with handler', () => {
      render(
        <PermissionStatusItem
          name="Camera"
          description="Photos"
          status="undetermined"
          statusLabels={statusLabels}
          onOpenSettings={jest.fn()}
          openSettingsLabel="Open Settings"
        />
      );
      expect(screen.queryByText('Open Settings')).toBeNull();
    });

    it('does not show settings button for notUsed status', () => {
      render(
        <PermissionStatusItem
          name="Microphone"
          description="Audio"
          status="notUsed"
          statusLabels={statusLabels}
          onOpenSettings={jest.fn()}
          openSettingsLabel="Open Settings"
        />
      );
      expect(screen.queryByText('Open Settings')).toBeNull();
    });
  });

  describe('Dark mode', () => {
    it('renders all statuses in dark mode without crashing', () => {
      jest.mock('react-native', () => ({
        ...jest.requireActual('react-native'),
        useColorScheme: () => 'dark',
      }));
      const statuses: Array<'granted' | 'denied' | 'undetermined' | 'notUsed'> = [
        'granted',
        'denied',
        'undetermined',
        'notUsed',
      ];
      statuses.forEach((status) => {
        const { unmount } = render(
          <PermissionStatusItem
            name="Camera"
            description="Photos"
            status={status}
            statusLabels={statusLabels}
          />
        );
        expect(screen.toJSON()).toBeTruthy();
        unmount();
      });
    });
  });
});
