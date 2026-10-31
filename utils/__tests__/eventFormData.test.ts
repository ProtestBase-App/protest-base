import type { RecurrenceInput } from '@/types/eventSeries.types';
import { buildEventRequest, buildTemplateEventData, createBlankForm } from '@/utils/eventFormData';

describe('createBlankForm', () => {
  it('starts empty, with what the screen knows laid over it', () => {
    const form = createBlankForm({ organization_id: 'org-1' });

    expect(form.organization_id).toBe('org-1');
    expect(form.title).toBe('');
    expect(form.images).toEqual([]);
    expect(form.postal_code).toBeNull();
  });
});

describe('buildEventRequest', () => {
  const form = createBlankForm({
    title: '  Rally  ',
    description: ' For housing ',
    start_time: '2099-01-02T10:00:00.000Z',
    categories: 'protest',
  });

  it('trims text and leaves out what is empty', () => {
    const request = buildEventRequest(form, 'org-1', null);

    expect(request).toMatchObject({
      organization_id: 'org-1',
      title: 'Rally',
      description: 'For housing',
      start_time: '2099-01-02T10:00:00.000Z',
      categories: 'protest',
    });
    expect(request).toMatchObject({ end_time: undefined });
    expect(request.images).toBeUndefined();
    expect(request.co_organizers).toBeUndefined();
  });

  it('never sends an empty date or description, which a draft may have', () => {
    const request = buildEventRequest(createBlankForm({ title: 'Rally' }), 'org-1', null);

    expect(request.description).toBeUndefined();
    expect(request).toMatchObject({ start_time: undefined });
  });

  it('sends a rule instead of the dates', () => {
    const rule = { frequency: 'weekly' } as RecurrenceInput;
    const request = buildEventRequest(form, 'org-1', rule);

    expect(request).toMatchObject({ recurrence: rule });
    expect(request).not.toHaveProperty('start_time');
  });

  it('sends volunteer text only with the toggle on', () => {
    const withText = { ...form, help_description: 'Bring water' };

    expect(buildEventRequest(withText, 'org-1', null).help_description).toBeUndefined();
    expect(
      buildEventRequest({ ...withText, help_needed: true }, 'org-1', null).help_description
    ).toBe('Bring water');
  });
});

describe('buildTemplateEventData', () => {
  it('keeps what is filled in and never the dates', () => {
    const data = buildTemplateEventData(
      createBlankForm({ title: 'Vigil', start_time: '2099-01-02T10:00:00.000Z' }),
      'org-1'
    );

    expect(data).toEqual({ organization_id: 'org-1', title: 'Vigil' });
  });

  it('drops volunteer text once the toggle is off', () => {
    const form = createBlankForm({ help_needed: false, help_description: 'Bring water' });

    expect(buildTemplateEventData(form, 'org-1').help_description).toBeUndefined();
  });
});
