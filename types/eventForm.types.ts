import { PickedImage } from '@/types/event.types';

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
  postal_code: number | null;
  co_organizers: string[];
  help_needed: boolean;
  help_description: string | null;
}

export interface EmptyFieldsState {
  title: boolean;
  start_time: boolean;
  description: boolean;
  help_description: boolean;
}

/**
 * Mode for the EventForm component
 * - 'create-event': Creating a new event (default)
 * - 'edit-event': Editing an existing event
 * - 'create-template': Creating a new template (hides date/time and image)
 * - 'edit-template': Editing an existing template (hides date/time and image)
 */
export type EventFormMode = 'create-event' | 'edit-event' | 'create-template' | 'edit-template';

export interface EventFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  emptyFields: EmptyFieldsState;
  userLanguage: string;
  /** Mode determines which fields to show. Defaults to 'create-event' */
  mode?: EventFormMode;
  /** Optional ref to the parent ScrollView for scrolling to bottom fields */
  scrollViewRef?: React.RefObject<any>;
}
