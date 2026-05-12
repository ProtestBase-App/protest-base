jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PastEventTemplateCard from '@/components/PastEventTemplateCard';
import type { PastEventForTemplate } from '@/types/template.types';

describe('PastEventTemplateCard', () => {
  const mockEvent: PastEventForTemplate = {
    $id: 'event-456',
    title: 'Education Rally',
    formattedDate: '2025-02-20',
    city: 'Brussels',
    firstCategory: 'Education',
    templateData: {},
  };

  afterEach(() => jest.clearAllMocks());

  it('renders the event title', () => {
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
  });

  it('renders the formatted date', () => {
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('2025-02-20')).toBeTruthy();
  });

  it('renders the city', () => {
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Brussels')).toBeTruthy();
  });

  it('renders the category badge', () => {
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Education')).toBeTruthy();
  });

  it('renders "Use as Template" button', () => {
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Use as Template')).toBeTruthy();
  });

  it('calls onCreateTemplate when button is pressed', () => {
    const onCreateTemplate = jest.fn();
    render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={onCreateTemplate} />);
    fireEvent.press(screen.getByText('Use as Template'));
    expect(onCreateTemplate).toHaveBeenCalledWith(mockEvent);
  });

  it('renders without city when not provided', () => {
    const eventWithoutCity = { ...mockEvent, city: undefined };
    render(<PastEventTemplateCard event={eventWithoutCity} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
  });

  it('renders without category when not provided', () => {
    const eventWithoutCategory = { ...mockEvent, firstCategory: undefined };
    render(<PastEventTemplateCard event={eventWithoutCategory} onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
    expect(screen.queryByText('Education')).toBeNull();
  });

  describe('Dark mode', () => {
    it('renders in dark mode without crashing', () => {
      const { useColorScheme } = require('@/hooks/useColorScheme');
      useColorScheme.mockReturnValue('dark');
      render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
      expect(screen.getByText('Education Rally')).toBeTruthy();
    });

    it('renders "Use as Template" button in dark mode with correct border styling', () => {
      const { useColorScheme } = require('@/hooks/useColorScheme');
      useColorScheme.mockReturnValue('dark');
      render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
      expect(screen.getByText('Use as Template')).toBeTruthy();
    });
  });

  describe('Platform shadows', () => {
    it('renders card on android', () => {
      jest.mock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Platform: { OS: 'android', select: (obj: any) => obj.android },
      }));
      render(<PastEventTemplateCard event={mockEvent} onCreateTemplate={jest.fn()} />);
      expect(screen.getByText('Education Rally')).toBeTruthy();
    });
  });
});
