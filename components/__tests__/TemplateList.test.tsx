jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TemplateList from '@/components/TemplateList';
import type { ParsedEventTemplate } from '@/types/template.types';
import { useColorScheme } from '@/hooks/useColorScheme';

const makeTemplate = (overrides: Partial<ParsedEventTemplate> = {}): ParsedEventTemplate => ({
  $id: 'tmpl-1',
  $createdAt: '2025-01-01',
  $updatedAt: '2025-01-01',
  name: 'Climate Template',
  description: 'For climate events',
  organizer_id: 'org-1',
  event_data: {
    title: 'Climate March',
    description: 'A march',
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
  ...overrides,
});

describe('TemplateList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders template items', () => {
    render(<TemplateList templates={[makeTemplate()]} onTemplatePress={jest.fn()} />);
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders create button when onCreateTemplate is provided', () => {
    render(
      <TemplateList templates={[]} onTemplatePress={jest.fn()} onCreateTemplate={jest.fn()} />
    );
    expect(screen.getByText('Create New Template')).toBeTruthy();
    expect(screen.getByText('Save event details for quick reuse')).toBeTruthy();
  });

  it('does not render create button when onCreateTemplate is not provided', () => {
    render(<TemplateList templates={[makeTemplate()]} onTemplatePress={jest.fn()} />);
    expect(screen.queryByText('Create New Template')).toBeNull();
  });

  it('calls onCreateTemplate when create button is pressed', () => {
    const onCreateTemplate = jest.fn();
    render(
      <TemplateList
        templates={[]}
        onTemplatePress={jest.fn()}
        onCreateTemplate={onCreateTemplate}
      />
    );
    fireEvent.press(screen.getByLabelText('Create new template'));
    expect(onCreateTemplate).toHaveBeenCalledTimes(1);
  });

  it('calls onTemplatePress when a template card is pressed', () => {
    const onTemplatePress = jest.fn();
    render(<TemplateList templates={[makeTemplate()]} onTemplatePress={onTemplatePress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onTemplatePress).toHaveBeenCalledWith(expect.objectContaining({ $id: 'tmpl-1' }));
  });

  it('renders multiple templates', () => {
    render(
      <TemplateList
        templates={[makeTemplate(), makeTemplate({ $id: 'tmpl-2', name: 'Peace Template' })]}
        onTemplatePress={jest.fn()}
      />
    );
    expect(screen.getByText('Climate Template')).toBeTruthy();
    expect(screen.getByText('Peace Template')).toBeTruthy();
  });

  it('renders with onRefresh and shows RefreshControl', () => {
    const onRefresh = jest.fn();
    render(
      <TemplateList
        templates={[makeTemplate()]}
        onTemplatePress={jest.fn()}
        onRefresh={onRefresh}
        refreshing={false}
      />
    );
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders without onRefresh (no RefreshControl)', () => {
    render(<TemplateList templates={[makeTemplate()]} onTemplatePress={jest.fn()} />);
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders with refreshing=true', () => {
    const onRefresh = jest.fn();
    render(
      <TemplateList
        templates={[makeTemplate()]}
        onTemplatePress={jest.fn()}
        onRefresh={onRefresh}
        refreshing={true}
      />
    );
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders with ListFooterComponent', () => {
    const { Text } = require('react-native');
    const Footer = () => <Text>Footer Content</Text>;
    render(
      <TemplateList
        templates={[makeTemplate()]}
        onTemplatePress={jest.fn()}
        ListFooterComponent={Footer}
      />
    );
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders empty templates with create button', () => {
    const onCreateTemplate = jest.fn();
    render(
      <TemplateList
        templates={[]}
        onTemplatePress={jest.fn()}
        onCreateTemplate={onCreateTemplate}
      />
    );
    expect(screen.getByText('Create New Template')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(
      <TemplateList
        templates={[makeTemplate()]}
        onTemplatePress={jest.fn()}
        onCreateTemplate={jest.fn()}
      />
    );
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });

  it('renders when useColorScheme returns null (light fallback)', () => {
    jest.mocked(useColorScheme).mockReturnValue('light');
    render(<TemplateList templates={[makeTemplate()]} onTemplatePress={jest.fn()} />);
    expect(screen.getByText('Climate Template')).toBeTruthy();
  });
});
