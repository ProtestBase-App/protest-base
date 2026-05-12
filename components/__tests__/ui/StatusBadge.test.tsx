import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { StatusBadge } from '@/components/ui/StatusBadge';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('StatusBadge', () => {
  it('renders "Active" when active=true', () => {
    const { getByText } = renderWithProviders(<StatusBadge active={true} />);

    expect(getByText('Active')).toBeTruthy();
  });

  it('renders "Inactive" when active=false', () => {
    const { getByText } = renderWithProviders(<StatusBadge active={false} />);

    expect(getByText('Inactive')).toBeTruthy();
  });

  it('uses custom activeText', () => {
    const { getByText } = renderWithProviders(<StatusBadge active={true} activeText="Enabled" />);

    expect(getByText('Enabled')).toBeTruthy();
  });

  it('uses custom inactiveText', () => {
    const { getByText } = renderWithProviders(
      <StatusBadge active={false} inactiveText="Disabled" />
    );

    expect(getByText('Disabled')).toBeTruthy();
  });

  it('has correct accessibility label when active', () => {
    const { getByLabelText } = renderWithProviders(<StatusBadge active={true} />);

    expect(getByLabelText('Status: Active')).toBeTruthy();
  });

  it('has correct accessibility label when inactive', () => {
    const { getByLabelText } = renderWithProviders(<StatusBadge active={false} />);

    expect(getByLabelText('Status: Inactive')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginHorizontal: 10 };
    const { getByText } = renderWithProviders(<StatusBadge active={true} style={customStyle} />);

    expect(getByText('Active')).toBeTruthy();
  });
});
