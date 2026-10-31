/** Which screens use the new form. Turning one off puts that screen back on the old form. */
export const EVENT_FORM_SHELL = {
  editTemplate: true,
  createTemplate: true,
  draftEdit: true,
  createEvent: true,
  eventEdit: true,
} as const;
