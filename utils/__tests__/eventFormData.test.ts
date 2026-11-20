import type { RecurrenceInput } from '@/types/eventSeries.types';
import {
  buildEventRequest,
  buildTemplateEventData,
  createBlankForm,
  ownerCoOrganizerUpdate,
} from '@/utils/eventFormData';

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

  it('answers the co-organizer question only for the platform organization, No by default', () => {
    expect(buildEventRequest(form, 'org-1', null)).not.toHaveProperty('owner_is_co_organizer');
    expect(
      buildEventRequest({ ...form, owner_is_co_organizer: true }, 'org-1', null)
    ).not.toHaveProperty('owner_is_co_organizer');
    expect(buildEventRequest(form, 'org-1', null, true).owner_is_co_organizer).toBe(false);
    expect(
      buildEventRequest({ ...form, owner_is_co_organizer: true }, 'org-1', null, true)
        .owner_is_co_organizer
    ).toBe(true);
  });
});

describe('ownerCoOrganizerUpdate', () => {
  const yes = createBlankForm({ owner_is_co_organizer: true });
  const no = createBlankForm({ owner_is_co_organizer: false });

  it('sends the answer only when it changed', () => {
    expect(ownerCoOrganizerUpdate(yes, yes, true)).toEqual({});
    expect(ownerCoOrganizerUpdate(no, no, true)).toEqual({});
    expect(ownerCoOrganizerUpdate(no, yes, true)).toEqual({ owner_is_co_organizer: false });
    expect(ownerCoOrganizerUpdate(yes, no, true)).toEqual({ owner_is_co_organizer: true });
  });

  it('sends nothing for another organization or before the event loaded', () => {
    expect(ownerCoOrganizerUpdate(no, yes, false)).toEqual({});
    expect(ownerCoOrganizerUpdate(no, null, true)).toEqual({});
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
