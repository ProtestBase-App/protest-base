import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test-utils/render';
import { SectionGroup } from '@/components/ui/SectionGroup';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('SectionGroup', () => {
  it('renders title via SectionHeader', () => {
    const { getByText } = renderWithProviders(
      <SectionGroup title="Group Title">
        <Text>Content</Text>
      </SectionGroup>
    );

    expect(getByText('Group Title')).toBeTruthy();
  });

  it('renders children', () => {
    const { getByText } = renderWithProviders(
      <SectionGroup title="Group">
        <Text>Child element</Text>
      </SectionGroup>
    );

    expect(getByText('Child element')).toBeTruthy();
  });

  it('default variant has no extra styles', () => {
    const { getByText } = renderWithProviders(
      <SectionGroup title="Default Group">
        <Text>Content</Text>
      </SectionGroup>
    );

    expect(getByText('Default Group')).toBeTruthy();
    expect(getByText('Content')).toBeTruthy();
  });

  it('highlight variant renders without crashing', () => {
    const { getByText } = renderWithProviders(
      <SectionGroup title="Highlight Group" variant="highlight">
        <Text>Highlighted content</Text>
      </SectionGroup>
    );

    expect(getByText('Highlight Group')).toBeTruthy();
    expect(getByText('Highlighted content')).toBeTruthy();
  });
});
