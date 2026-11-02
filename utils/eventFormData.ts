import type { FormState } from '@/types/eventForm.types';
import type { RecurrenceInput } from '@/types/eventSeries.types';
import type { TemplateEventData } from '@/types/template.types';

/** An empty form, with whatever the screen already knows laid over it. */
export function createBlankForm(overrides: Partial<FormState> = {}): FormState {
  return {
    organization_id: '',
    title: '',
    description: '',
    images: [],
    street_address: '',
    city: '',
    region: '',
    country: '',
    start_time: '',
    end_time: '',
    organizer_name: '',
    website_url: '',
    categories: '',
    disclaimer: '',
    postal_code: null,
    co_organizers: [],
    help_needed: false,
    help_description: '',
    geocod_lat: null,
    geocod_lng: null,
    ...overrides,
  };
}

function trimEventForm(form: FormState): FormState {
  return {
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    street_address: form.street_address?.trim() || '',
    city: form.city?.trim() || '',
    region: form.region?.trim() || '',
    website_url: form.website_url?.trim() || '',
    disclaimer: form.disclaimer?.trim() || '',
    help_description: form.help_description?.trim() || '',
  };
}

/** What a create sends, for an event or a draft. Empty fields are left out. */
export function buildEventRequest(
  form: FormState,
  organizationId: string,
  rule: RecurrenceInput | null
) {
  const trimmed = trimEventForm(form);
  return {
    organization_id: organizationId,
    title: trimmed.title,
    description: trimmed.description || undefined,
    ...(rule
      ? { recurrence: rule }
      : {
          start_time: trimmed.start_time || undefined,
          end_time: trimmed.end_time || undefined,
        }),
    street_address: trimmed.street_address || undefined,
    city: trimmed.city || undefined,
    region: trimmed.region || undefined,
    country: trimmed.country || undefined,
    postal_code: trimmed.postal_code || undefined,
    // Only set by a street picked this session: the backend adopts the confirmed pin.
    geocod_lat: trimmed.geocod_lat ?? undefined,
    geocod_lng: trimmed.geocod_lng ?? undefined,
    images: trimmed.images.length ? trimmed.images : undefined,
    website_url: trimmed.website_url || undefined,
    categories: trimmed.categories,
    disclaimer: trimmed.disclaimer || undefined,
    co_organizers: trimmed.co_organizers?.length ? trimmed.co_organizers : undefined,
    help_needed: trimmed.help_needed,
    help_description: trimmed.help_needed ? trimmed.help_description || undefined : undefined,
  };
}

/** A template's `event_data`: static details only, no dates or organizer. */
export function buildTemplateEventData(form: FormState, organizationId: string): TemplateEventData {
  const eventData: TemplateEventData = {};

  if (organizationId) eventData.organization_id = organizationId;
  if (form.title) eventData.title = form.title;
  if (form.description) eventData.description = form.description;
  if (form.street_address) eventData.street_address = form.street_address;
  if (form.city) eventData.city = form.city;
  if (form.region) eventData.region = form.region;
  if (form.country) eventData.country = form.country;
  if (form.postal_code) eventData.postal_code = form.postal_code;
  if (form.website_url) eventData.website_url = form.website_url;
  if (form.categories) eventData.categories = form.categories;
  if (form.disclaimer) eventData.disclaimer = form.disclaimer;
  if (form.co_organizers?.length) eventData.co_organizers = form.co_organizers;
  if (form.help_needed) {
    eventData.help_needed = form.help_needed;
    if (form.help_description) eventData.help_description = form.help_description;
  }

  return eventData;
}
