jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import DraftEventsListItem from '@/components/DraftEventsListItem';
import { createMockEvent } from '@/test-utils/render';

describe('DraftEventsListItem', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the draft title', () => {
    render(<DraftEventsListItem event={createMockEvent({ $id: 'd1', title: 'My draft' })} />);
    expect(screen.getByText('My draft')).toBeTruthy();
  });

  it('falls back to a label when the title is empty', () => {
    render(<DraftEventsListItem event={createMockEvent({ $id: 'd1', title: '' })} />);
    expect(screen.getByText('drafts.editTitle')).toBeTruthy();
  });

  it('renders the city when present', () => {
    render(<DraftEventsListItem event={createMockEvent({ $id: 'd1', city: 'Ghent' })} />);
    expect(screen.getByText('Ghent')).toBeTruthy();
  });

  it('renders the category badge using a lowercased key', () => {
    render(<DraftEventsListItem event={createMockEvent({ $id: 'd1', categories: ['Protest'] })} />);
    expect(screen.getByText('categories.protest')).toBeTruthy();
  });

  it('navigates to the draft editor on press', () => {
    render(<DraftEventsListItem event={createMockEvent({ $id: 'd1' })} />);
    fireEvent.press(screen.getByTestId('draft-item-d1'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/draft-edit/[id]',
      params: { id: 'd1' },
    });
  });

  it('renders an incomplete draft (empty start_time/categories/location) without crashing', () => {
    render(
      <DraftEventsListItem
        event={createMockEvent({
          $id: 'd1',
          title: 'WIP',
          start_time: '',
          categories: [],
          city: '',
          street_address: '',
        })}
      />
    );
    expect(screen.getByText('WIP')).toBeTruthy();
  });
});
