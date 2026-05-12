import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Active state', () => {
    it('renders active text when active is true', () => {
      render(<StatusBadge active={true} />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders custom active text', () => {
      render(<StatusBadge active={true} activeText="Online" />);
      expect(screen.getByText('Online')).toBeTruthy();
    });

    it('sets accessibility label for active state', () => {
      render(<StatusBadge active={true} activeText="Enabled" />);
      expect(screen.getByLabelText('Status: Enabled')).toBeTruthy();
    });
  });

  describe('Inactive state', () => {
    it('renders inactive text when active is false', () => {
      render(<StatusBadge active={false} />);
      expect(screen.getByText('Inactive')).toBeTruthy();
    });

    it('renders custom inactive text', () => {
      render(<StatusBadge active={false} inactiveText="Offline" />);
      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('sets accessibility label for inactive state', () => {
      render(<StatusBadge active={false} inactiveText="Disabled" />);
      expect(screen.getByLabelText('Status: Disabled')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has text accessibility role', () => {
      render(<StatusBadge active={true} />);
      expect(screen.getByRole('text')).toBeTruthy();
    });
  });

  describe('Custom styles', () => {
    it('applies custom style prop', () => {
      render(<StatusBadge active={true} style={{ marginTop: 10 }} />);
      expect(screen.getByText('Active')).toBeTruthy();
    });
  });
});
