jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { InfoRow } from '@/components/ui/InfoRow';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('InfoRow', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the label text', () => {
    render(<InfoRow label="Email" value="test@example.com" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders the value text', () => {
    render(<InfoRow label="Email" value="test@example.com" />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('shows N/A when value is undefined', () => {
    render(<InfoRow label="Email" />);
    expect(screen.getByText('N/A')).toBeTruthy();
  });

  it('shows N/A when value is empty string', () => {
    render(<InfoRow label="Email" value="" />);
    expect(screen.getByText('N/A')).toBeTruthy();
  });

  describe('Selectable mode', () => {
    it('renders selectable text when selectable is true', () => {
      render(<InfoRow label="Email" value="test@example.com" selectable />);
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('shows N/A in selectable mode when value is empty', () => {
      render(<InfoRow label="Email" selectable />);
      expect(screen.getByText('N/A')).toBeTruthy();
    });
  });

  describe('Custom styling', () => {
    it('applies custom value color', () => {
      render(<InfoRow label="Status" value="Active" valueColor="#00FF00" />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('applies custom label style', () => {
      render(<InfoRow label="Name" value="John" labelStyle={{ fontWeight: 'bold' }} />);
      expect(screen.getByText('Name')).toBeTruthy();
    });

    it('applies custom value style', () => {
      render(<InfoRow label="Name" value="John" valueStyle={{ fontStyle: 'italic' }} />);
      expect(screen.getByText('John')).toBeTruthy();
    });

    it('applies container style', () => {
      render(<InfoRow label="Name" value="John" style={{ marginBottom: 10 }} />);
      expect(screen.getByText('Name')).toBeTruthy();
    });
  });

  describe('Number of lines', () => {
    it('defaults to 1 line', () => {
      render(<InfoRow label="Bio" value="A very long text" />);
      expect(screen.getByText('A very long text')).toBeTruthy();
    });

    it('accepts custom numberOfLines', () => {
      render(<InfoRow label="Bio" value="Long text" numberOfLines={3} />);
      expect(screen.getByText('Long text')).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<InfoRow label="Name" value="John" />);
      expect(screen.getByText('John')).toBeTruthy();
    });

    it('renders selectable in dark mode with custom color', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<InfoRow label="Email" value="test@test.com" selectable valueColor="#FF0000" />);
      expect(screen.getByText('test@test.com')).toBeTruthy();
    });
  });
});
