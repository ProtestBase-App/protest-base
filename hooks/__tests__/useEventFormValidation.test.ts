import { act, renderHook } from '@testing-library/react-native';

import { useEventFormValidation } from '@/hooks/useEventFormValidation';
import type { EventFormIssue } from '@/types/eventForm.types';

const titleIssue: EventFormIssue = { field: 'title', label: 'Title', message: 'Add a title' };
const startIssue: EventFormIssue = { field: 'start_time', label: 'Start', message: 'Pick a date' };

function setup(initial: EventFormIssue[]) {
  const validate = jest.fn();
  return renderHook(
    ({ issues }: { issues: EventFormIssue[] }) => {
      validate.mockReturnValue(issues);
      return useEventFormValidation(validate);
    },
    { initialProps: { issues: initial } }
  );
}

describe('useEventFormValidation', () => {
  it('shows nothing before a submit, whatever is wrong', () => {
    const { result } = setup([titleIssue]);

    expect(result.current.issues).toEqual([]);
    expect(result.current.errors).toEqual({});
    expect(result.current.refused).toBeNull();
  });

  it('lets a valid submit through', () => {
    const { result } = setup([]);

    let allowed = false;
    act(() => {
      allowed = result.current.check('publish');
    });

    expect(allowed).toBe(true);
    expect(result.current.refused).toBeNull();
  });

  it('refuses an invalid submit and shows its issues, by field too', () => {
    const { result } = setup([titleIssue, startIssue]);

    let allowed = true;
    act(() => {
      allowed = result.current.check('saveDraft');
    });

    expect(allowed).toBe(false);
    expect(result.current.refused).toEqual({
      intent: 'saveDraft',
      issues: [titleIssue, startIssue],
    });
    expect(result.current.errors).toEqual({
      title: 'Add a title',
      start_time: 'Pick a date',
    });
  });

  it('drops a message as soon as its field is fixed', () => {
    const { result, rerender } = setup([titleIssue, startIssue]);
    act(() => {
      result.current.check('publish');
    });

    rerender({ issues: [startIssue] });

    expect(result.current.issues).toEqual([startIssue]);
    expect(result.current.errors).toEqual({ start_time: 'Pick a date' });
  });

  it('checks the same intent while it follows the form', () => {
    const validate = jest.fn().mockReturnValue([titleIssue]);
    const { result } = renderHook(() => useEventFormValidation(validate));

    act(() => {
      result.current.check('saveEdit');
    });

    expect(validate).toHaveBeenLastCalledWith('saveEdit');
  });

  it('counts each refused submit as a new one, so each can jump', () => {
    const { result } = setup([titleIssue]);
    act(() => {
      result.current.check('publish');
    });
    const first = result.current.refused;

    act(() => {
      result.current.check('publish');
    });

    expect(result.current.refused).not.toBe(first);
  });

  it('clears everything once a submit goes through', () => {
    const { result, rerender } = setup([titleIssue]);
    act(() => {
      result.current.check('publish');
    });

    rerender({ issues: [] });
    act(() => {
      result.current.check('publish');
    });

    expect(result.current.refused).toBeNull();
    expect(result.current.issues).toEqual([]);
  });
});
