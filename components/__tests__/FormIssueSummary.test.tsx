import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { FormIssueSummary } from '@/components/FormIssueSummary';
import type { EventFormValidation } from '@/hooks/useEventFormValidation';
import type { EventFormIssue } from '@/types/eventForm.types';

const mockScrollToField = jest.fn();

jest.mock('@/components/FormScreenScaffold', () => ({
  useFormFieldJump: () => ({ scrollToField: mockScrollToField, registerField: jest.fn() }),
}));

const description: EventFormIssue = {
  field: 'description',
  label: 'Description',
  message: 'Add a description.',
};
const start: EventFormIssue = {
  field: 'start_time',
  label: 'Start Time',
  message: 'Pick a date.',
};

function validationOf(issues: EventFormIssue[], refusedIssues = issues): EventFormValidation {
  return {
    issues,
    errors: {},
    refused: refusedIssues.length > 0 ? { intent: 'publish', issues: refusedIssues } : null,
    check: jest.fn(),
  };
}

describe('FormIssueSummary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows nothing before a submit is refused', () => {
    const { queryByTestId } = render(<FormIssueSummary validation={validationOf([])} />);

    expect(queryByTestId('form-issue-summary')).toBeNull();
    expect(mockScrollToField).not.toHaveBeenCalled();
  });

  it('shows nothing once every issue is fixed', () => {
    const { queryByTestId } = render(
      <FormIssueSummary validation={validationOf([], [description])} />
    );

    expect(queryByTestId('form-issue-summary')).toBeNull();
  });

  it('names how many things are left and each field', () => {
    const { getByText } = render(
      <FormIssueSummary validation={validationOf([description, start])} />
    );

    expect(getByText('2 things to fix before publishing')).toBeTruthy();
    expect(getByText('Description')).toBeTruthy();
    expect(getByText('Start Time')).toBeTruthy();
  });

  it('jumps to a field from its link', () => {
    const { getByTestId } = render(
      <FormIssueSummary validation={validationOf([description, start])} />
    );
    mockScrollToField.mockClear();

    fireEvent.press(getByTestId('form-issue-start_time'));

    expect(mockScrollToField).toHaveBeenCalledWith('start_time');
  });

  it('tells a screen reader what each link leads to', () => {
    const { getByLabelText } = render(
      <FormIssueSummary validation={validationOf([description])} />
    );

    expect(getByLabelText('Description: Add a description.')).toBeTruthy();
  });

  it('takes a refused submit to its first issue', () => {
    render(<FormIssueSummary validation={validationOf([description, start])} />);

    expect(mockScrollToField).toHaveBeenCalledTimes(1);
    expect(mockScrollToField).toHaveBeenCalledWith('description');
  });

  it('says what stopped the submit to a screen reader', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

    render(<FormIssueSummary validation={validationOf([description])} />);

    expect(announce).toHaveBeenCalledWith('1 thing to fix before publishing. Add a description.');
  });

  it('stays put when an issue is fixed', () => {
    const validation = validationOf([description, start]);
    const { rerender } = render(<FormIssueSummary validation={validation} />);
    mockScrollToField.mockClear();

    rerender(<FormIssueSummary validation={{ ...validation, issues: [start] }} />);

    expect(mockScrollToField).not.toHaveBeenCalled();
  });

  it('jumps again when the next submit is refused', () => {
    const validation = validationOf([description]);
    const { rerender } = render(<FormIssueSummary validation={validation} />);
    mockScrollToField.mockClear();

    rerender(
      <FormIssueSummary
        validation={{ ...validation, refused: { intent: 'publish', issues: [start] } }}
      />
    );

    expect(mockScrollToField).toHaveBeenCalledWith('start_time');
  });
});
