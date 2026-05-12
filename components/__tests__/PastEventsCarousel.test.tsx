jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PastEventsCarousel from '@/components/PastEventsCarousel';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { PastEventForTemplate } from '@/types/template.types';

const makePastEvent = (overrides: Partial<PastEventForTemplate> = {}): PastEventForTemplate => ({
  $id: 'event-1',
  title: 'Education Rally',
  formattedDate: '2025-02-20',
  city: 'Brussels',
  firstCategory: 'Education',
  templateData: {},
  ...overrides,
});

describe('PastEventsCarousel', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders nothing when no events and not loading', () => {
    const { toJSON } = render(
      <PastEventsCarousel events={[]} onSelectEvent={jest.fn()} loading={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders loading indicator when loading', () => {
    render(<PastEventsCarousel events={[]} onSelectEvent={jest.fn()} loading={true} />);
    expect(screen.getByText('Create from Past Events')).toBeTruthy();
  });

  it('renders section header and subtitle', () => {
    render(<PastEventsCarousel events={[makePastEvent()]} onSelectEvent={jest.fn()} />);
    expect(screen.getByText('Create from Past Events')).toBeTruthy();
    expect(screen.getByText("Reuse details from events you've organized")).toBeTruthy();
  });

  it('renders event cards in the carousel', () => {
    render(
      <PastEventsCarousel
        events={[makePastEvent(), makePastEvent({ $id: 'e2', title: 'Climate March' })]}
        onSelectEvent={jest.fn()}
      />
    );
    expect(screen.getByText('Education Rally')).toBeTruthy();
    expect(screen.getByText('Climate March')).toBeTruthy();
  });

  it('renders in dark mode', () => {
    jest.mocked(useColorScheme).mockReturnValue('dark');
    render(<PastEventsCarousel events={[makePastEvent()]} onSelectEvent={jest.fn()} />);
    expect(screen.getByText('Education Rally')).toBeTruthy();
  });
});
