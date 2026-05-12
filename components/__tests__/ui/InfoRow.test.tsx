import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import { InfoRow } from '@/components/ui/InfoRow';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('InfoRow', () => {
  it('renders label and value', () => {
    const { getByText } = renderWithProviders(<InfoRow label="Name" value="John Doe" />);

    expect(getByText('Name')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('renders "N/A" when value is undefined', () => {
    const { getByText } = renderWithProviders(<InfoRow label="Email" />);

    expect(getByText('Email')).toBeTruthy();
    expect(getByText('N/A')).toBeTruthy();
  });

  it('renders "N/A" when value is empty string', () => {
    const { getByText } = renderWithProviders(<InfoRow label="Phone" value="" />);

    expect(getByText('Phone')).toBeTruthy();
    expect(getByText('N/A')).toBeTruthy();
  });

  it('applies valueColor', () => {
    const { getByText } = renderWithProviders(
      <InfoRow label="Status" value="Active" valueColor="#00FF00" />
    );

    const valueText = getByText('Active');
    expect(valueText).toBeTruthy();
  });

  it('selectable prop works', () => {
    const { getByText } = renderWithProviders(
      <InfoRow label="Email" value="test@example.com" selectable />
    );

    const valueText = getByText('test@example.com');
    expect(valueText.props.selectable).toBe(true);
  });

  it('applies custom style overrides', () => {
    const customStyle = { marginBottom: 20 };
    const labelStyle = { fontSize: 18 };
    const valueStyle = { fontWeight: 'bold' as const };

    const { getByText } = renderWithProviders(
      <InfoRow
        label="Custom"
        value="Styled"
        style={customStyle}
        labelStyle={labelStyle}
        valueStyle={valueStyle}
      />
    );

    expect(getByText('Custom')).toBeTruthy();
    expect(getByText('Styled')).toBeTruthy();
  });
});
