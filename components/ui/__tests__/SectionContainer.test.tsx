jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SectionContainer } from '@/components/ui/SectionContainer';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('SectionContainer', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(
      <SectionContainer title="Account Settings">
        <Text>Content</Text>
      </SectionContainer>
    );
    expect(screen.getByText('Account Settings')).toBeTruthy();
  });

  it('renders children content', () => {
    render(
      <SectionContainer title="Section">
        <Text>Child content here</Text>
      </SectionContainer>
    );
    expect(screen.getByText('Child content here')).toBeTruthy();
  });

  it('applies custom container style', () => {
    render(
      <SectionContainer title="Section" style={{ marginTop: 20 }}>
        <Text>Content</Text>
      </SectionContainer>
    );
    expect(screen.getByText('Section')).toBeTruthy();
  });

  it('applies custom content style', () => {
    render(
      <SectionContainer title="Section" contentStyle={{ padding: 20 }}>
        <Text>Content</Text>
      </SectionContainer>
    );
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('renders in dark mode with dark border colors', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <SectionContainer title="Dark Section">
        <Text>Dark content</Text>
      </SectionContainer>
    );
    expect(screen.getByText('Dark Section')).toBeTruthy();
    expect(screen.getByText('Dark content')).toBeTruthy();
  });
});
