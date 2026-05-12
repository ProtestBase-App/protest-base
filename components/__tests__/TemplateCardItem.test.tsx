jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TemplateCardItem from '@/components/TemplateCardItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { ParsedEventTemplate } from '@/types/template.types';

describe('TemplateCardItem', () => {
  const mockTemplate: ParsedEventTemplate = {
    $id: 'tmpl-1',
    $createdAt: '2025-01-01',
    $updatedAt: '2025-01-01',
    name: 'Climate Protest Template',
    description: 'Template for climate events',
    organizer_id: 'org-1',
    event_data: {
      title: 'Climate March',
      description: 'A march for climate',
      city: 'Brussels',
      categories: ['Climate'],
      street_address: '123 Main St',
      country: 'Belgium',
      postal_code: 1000,
      disclaimer: undefined,
      help_needed: false,
      help_description: undefined,
      co_organizers: [],
    },
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the template name', () => {
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate Protest Template')).toBeTruthy();
  });

  it('renders the description', () => {
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Template for climate events')).toBeTruthy();
  });

  it('renders city badge', () => {
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Brussels')).toBeTruthy();
  });

  it('renders category badge', () => {
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate')).toBeTruthy();
  });

  it('calls onPress with template when pressed', () => {
    const onPress = jest.fn();
    render(<TemplateCardItem template={mockTemplate} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockTemplate);
  });

  it('sets correct accessibility label', () => {
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(
      screen.getByLabelText('Template: Climate Protest Template, Template for climate events')
    ).toBeTruthy();
  });

  it('handles template without description', () => {
    const noDescTemplate = { ...mockTemplate, description: '' };
    render(<TemplateCardItem template={noDescTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate Protest Template')).toBeTruthy();
  });

  it('handles template without city or categories', () => {
    const minimalTemplate = {
      ...mockTemplate,
      event_data: {
        ...mockTemplate.event_data,
        city: undefined as any,
        categories: [],
      },
    };
    render(<TemplateCardItem template={minimalTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate Protest Template')).toBeTruthy();
  });

  it('handles categories as a string instead of array', () => {
    const stringCatTemplate = {
      ...mockTemplate,
      event_data: {
        ...mockTemplate.event_data,
        categories: 'Health' as any,
      },
    };
    render(<TemplateCardItem template={stringCatTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('renders in dark mode without crashing', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<TemplateCardItem template={mockTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate Protest Template')).toBeTruthy();
  });

  it('sets accessibility label without description when description is empty', () => {
    const noDescTemplate = { ...mockTemplate, description: '' };
    render(<TemplateCardItem template={noDescTemplate} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Template: Climate Protest Template')).toBeTruthy();
  });

  it('only renders the first category badge when multiple categories exist', () => {
    const multiCatTemplate = {
      ...mockTemplate,
      event_data: {
        ...mockTemplate.event_data,
        categories: ['Climate', 'Education'],
      },
    };
    render(<TemplateCardItem template={multiCatTemplate} onPress={jest.fn()} />);
    expect(screen.getByText('Climate')).toBeTruthy();
    // Component only renders firstCategory = categories[0], not all categories
    expect(screen.queryByText('Education')).toBeNull();
  });
});
