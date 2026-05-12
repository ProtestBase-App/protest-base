jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => key,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EmptyTemplateState from '@/components/EmptyTemplateState';

describe('EmptyTemplateState', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('templates.emptyTitle')).toBeTruthy();
  });

  it('renders the description', () => {
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('templates.emptyDescription')).toBeTruthy();
  });

  it('renders the create button', () => {
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} />);
    expect(screen.getByText('templates.createButton')).toBeTruthy();
  });

  it('calls onCreateTemplate when create button is pressed', () => {
    const onCreateTemplate = jest.fn();
    render(<EmptyTemplateState onCreateTemplate={onCreateTemplate} />);
    fireEvent.press(screen.getByLabelText('templates.createButton'));
    expect(onCreateTemplate).toHaveBeenCalledTimes(1);
  });

  it('renders from past event button by default', () => {
    const onFromPastEvent = jest.fn();
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} onFromPastEvent={onFromPastEvent} />);
    expect(screen.getByText('templates.fromPastEvent')).toBeTruthy();
  });

  it('calls onFromPastEvent when button is pressed', () => {
    const onFromPastEvent = jest.fn();
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} onFromPastEvent={onFromPastEvent} />);
    fireEvent.press(screen.getByLabelText('templates.fromPastEvent'));
    expect(onFromPastEvent).toHaveBeenCalledTimes(1);
  });

  it('hides from past event button when showFromPastEvent is false', () => {
    render(
      <EmptyTemplateState
        onCreateTemplate={jest.fn()}
        onFromPastEvent={jest.fn()}
        showFromPastEvent={false}
      />
    );
    expect(screen.queryByText('templates.fromPastEvent')).toBeNull();
  });

  it('hides from past event button when onFromPastEvent is not provided', () => {
    render(<EmptyTemplateState onCreateTemplate={jest.fn()} />);
    expect(screen.queryByText('templates.fromPastEvent')).toBeNull();
  });
});
