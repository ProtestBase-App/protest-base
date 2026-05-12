jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';

describe('ThemedText', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Basic rendering', () => {
    it('renders text content', () => {
      render(<ThemedText>Hello World</ThemedText>);
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('renders with default type', () => {
      render(<ThemedText>Default text</ThemedText>);
      expect(screen.getByText('Default text')).toBeTruthy();
    });
  });

  describe('All type variants', () => {
    it('renders type="default"', () => {
      render(<ThemedText type="default">Default</ThemedText>);
      expect(screen.getByText('Default')).toBeTruthy();
    });

    it('renders type="defaultSemiBold"', () => {
      render(<ThemedText type="defaultSemiBold">SemiBold</ThemedText>);
      expect(screen.getByText('SemiBold')).toBeTruthy();
    });

    it('renders type="title"', () => {
      render(<ThemedText type="title">Title</ThemedText>);
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('renders type="subtitleBold"', () => {
      render(<ThemedText type="subtitleBold">SubBold</ThemedText>);
      expect(screen.getByText('SubBold')).toBeTruthy();
    });

    it('renders type="subtitleMedium"', () => {
      render(<ThemedText type="subtitleMedium">SubMedium</ThemedText>);
      expect(screen.getByText('SubMedium')).toBeTruthy();
    });

    it('renders type="thin"', () => {
      render(<ThemedText type="thin">Thin text</ThemedText>);
      expect(screen.getByText('Thin text')).toBeTruthy();
    });

    it('renders type="link"', () => {
      render(<ThemedText type="link">Link text</ThemedText>);
      expect(screen.getByText('Link text')).toBeTruthy();
    });

    it('renders type="cardTitle"', () => {
      render(<ThemedText type="cardTitle">Card Title</ThemedText>);
      expect(screen.getByText('Card Title')).toBeTruthy();
    });

    it('renders type="cardMetadata"', () => {
      render(<ThemedText type="cardMetadata">Metadata</ThemedText>);
      expect(screen.getByText('Metadata')).toBeTruthy();
    });

    it('renders type="categoryBadge"', () => {
      render(<ThemedText type="categoryBadge">Badge</ThemedText>);
      expect(screen.getByText('Badge')).toBeTruthy();
    });

    it('renders type="toolbarButton"', () => {
      render(<ThemedText type="toolbarButton">Button</ThemedText>);
      expect(screen.getByText('Button')).toBeTruthy();
    });
  });

  describe('Theme support', () => {
    it('renders in light mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('light');
      render(<ThemedText>Light mode</ThemedText>);
      expect(screen.getByText('Light mode')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<ThemedText>Dark mode</ThemedText>);
      expect(screen.getByText('Dark mode')).toBeTruthy();
    });

    it('accepts lightColor override', () => {
      render(<ThemedText lightColor="#FF0000">Custom light</ThemedText>);
      expect(screen.getByText('Custom light')).toBeTruthy();
    });

    it('accepts darkColor override', () => {
      jest.mocked(useColorScheme).mockReturnValue('dark');
      render(<ThemedText darkColor="#00FF00">Custom dark</ThemedText>);
      expect(screen.getByText('Custom dark')).toBeTruthy();
    });
  });

  describe('Style overrides', () => {
    it('applies custom style', () => {
      render(<ThemedText style={{ fontSize: 30 }}>Styled</ThemedText>);
      expect(screen.getByText('Styled')).toBeTruthy();
    });

    it('applies style on top of type styles', () => {
      render(
        <ThemedText type="title" style={{ color: 'red' }}>
          Custom title
        </ThemedText>
      );
      expect(screen.getByText('Custom title')).toBeTruthy();
    });
  });

  describe('Props passthrough', () => {
    it('passes numberOfLines prop', () => {
      render(<ThemedText numberOfLines={1}>Truncated text</ThemedText>);
      expect(screen.getByText('Truncated text')).toBeTruthy();
    });

    it('passes accessibility props', () => {
      render(<ThemedText accessibilityLabel="Custom label">Accessible</ThemedText>);
      expect(screen.getByLabelText('Custom label')).toBeTruthy();
    });
  });
});
