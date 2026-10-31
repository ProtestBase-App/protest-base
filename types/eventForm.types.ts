import { PickedImage } from '@/types/event.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import type { RepeatField } from '@/utils/recurrence';

export interface FormState {
  organization_id: string;
  title: string;
  description: string;
  /** Ordered images (max 5): URL strings are kept existing images, PickedImages are new picks. */
  images: (PickedImage | string)[];
  street_address: string;
  city: string;
  region: string;
  country: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  website_url: string;
  categories: string;
  disclaimer: string;
  postal_code: string | null;
  co_organizers: string[];
  help_needed: boolean;
  help_description: string | null;
  /**
   * Coordinates of the address suggestion the user accepted via a live pick in
   * the CURRENT form session. `null` until a street suggestion is picked, and
   * never seeded from a loaded event/draft — so a non-null value reliably means
   * "picked this session". Forwarded on save as `geocod_lat`/`geocod_lng`; the
   * backend adopts the confirmed pin (skipping a re-geocode) when both are set
   * and inside the box of the event's country (Benelux, or metropolitan France +
   * Corsica), otherwise it silently falls back to geocoding.
   */
  geocod_lat: number | null;
  geocod_lng: number | null;
  /**
   * The Repeat control, on the create screen only. Absent or `once` is a single event.
   * Survives in a local autosave, so it only counts while the feature is on.
   */
  repeat?: RepeatFormState;
}

/** What a submit asks of the form. */
export type EventFormIntent = 'publish' | 'saveEdit' | 'saveDraft' | 'saveTemplate';

/** A control on the form that can carry an error. */
export type EventFormField =
  | 'organization'
  | 'template_name'
  | 'title'
  | 'description'
  | 'categories'
  | 'start_time'
  | 'end_time'
  | RepeatField
  | 'website_url'
  | 'help_description'
  | 'disclaimer';

export interface EventFormIssue {
  field: EventFormField;
  /** The field's name, for the summary's jump link. */
  label: string;
  /** What to do about it, shown under the field. */
  message: string;
}

export type EventFormErrors = Partial<Record<EventFormField, string>>;

/**
 * Mode for the EventForm component
 * - 'create-event': Creating a new event (default)
 * - 'edit-event': Editing an existing event
 * - 'create-template': Creating a new template (hides date/time)
 * - 'edit-template': Editing an existing template (hides date/time)
 */
export type EventFormMode = 'create-event' | 'edit-event' | 'create-template' | 'edit-template';

export interface EventFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** What is wrong with each field, shown under it. */
  errors?: EventFormErrors;
  userLanguage: string;
  /** Mode determines which fields to show. Defaults to 'create-event' */
  mode?: EventFormMode;
  /** Optional ref to the parent ScrollView for scrolling to bottom fields */
  scrollViewRef?: React.RefObject<any>;
  /**
   * The event being edited is date-only (`all_day`). Only the edit screens set
   * this, and only from the loaded event — there is no authoring UI for it. The
   * date fields then show "All day" for as long as the value stays at Brussels
   * midnight; picking a real time is what converts the event back to timed.
   */
  isAllDay?: boolean;
  /**
   * Show the Repeat control. Only the create screen sets this, and only while the
   * feature is on: the schedule of a series cannot be edited, so no edit form has it.
   */
  showRepeat?: boolean;
}
