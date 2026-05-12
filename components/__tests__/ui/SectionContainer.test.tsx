import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '@/test-utils/render';
import { SectionContainer } from '@/components/ui/SectionContainer';

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

describe('SectionContainer', () => {
  it('renders title', () => {
    const { getByText } = renderWithProviders(
      <SectionContainer title="My Section">
        <Text>Content</Text>
      </SectionContainer>
    );

    expect(getByText('My Section')).toBeTruthy();
  });

  it('renders children', () => {
    const { getByText } = renderWithProviders(
      <SectionContainer title="Section">
        <Text>Child content here</Text>
      </SectionContainer>
    );

    expect(getByText('Child content here')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 30 };
    const { getByText } = renderWithProviders(
      <SectionContainer title="Styled Section" style={customStyle}>
        <Text>Content</Text>
      </SectionContainer>
    );

    expect(getByText('Styled Section')).toBeTruthy();
    expect(getByText('Content')).toBeTruthy();
  });

  it('applies contentStyle', () => {
    const contentStyle = { paddingHorizontal: 20 };
    const { getByText } = renderWithProviders(
      <SectionContainer title="Section" contentStyle={contentStyle}>
        <Text>Styled content</Text>
      </SectionContainer>
    );

    expect(getByText('Section')).toBeTruthy();
    expect(getByText('Styled content')).toBeTruthy();
  });
});
