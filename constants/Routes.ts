/**
 * Centralized route definitions for type-safe navigation.
 * Paths must match Expo Router's generated types.
 */

export const Routes = {
  ROOT: '/',
  HOME: '/home',
  EXPLORE: '/explore',

  SIGN_IN: '/sign-in',

  MORE: '/more',
  ABOUT: '/about',
  ACCOUNT: '/account',
  ACCOUNT_INFO: '/account-info',
  DELETE_ACCOUNT: '/delete-account',
  TERMS_AND_CONDITIONS: '/terms-and-conditions',
  PRIVACY_CENTER: '/privacy-center',
  BECOME_ORGANIZER: '/become-organizer',

  CREATE_EVENT: '/create-event',
  CREATE_EVENT_OPTIONS: '/create-event-options',
  EVENT_TEMPLATES: '/event-templates',
  CREATE_TEMPLATE: '/create-template',

  DRAFT_EVENTS: '/draft-events',

  MY_EVENTS: '/my-events',
  MY_EVENTS_UPCOMING: '/upcoming',
  MY_EVENTS_PAST: '/past',

  REPORT_EVENT: '/report-event',
} as const;

/** Dynamic route builders returning objects for Expo Router's typed routes. */
export const DynamicRoutes = {
  event: (id: string, queryParams?: { isCreated?: boolean }) => ({
    pathname: '/event/[id]' as const,
    params: { id, ...(queryParams?.isCreated ? { isCreated: 'true' } : {}) },
  }),
  eventEdit: (id: string, queryParams?: { isCreated?: boolean }) => ({
    pathname: '/event-edit/[id]' as const,
    params: { id, ...(queryParams?.isCreated ? { isCreated: 'true' } : {}) },
  }),
  draftEdit: (id: string) => ({
    pathname: '/draft-edit/[id]' as const,
    params: { id },
  }),
  editTemplate: (id: string) => ({
    pathname: '/edit-template/[id]' as const,
    params: { id },
  }),
  // Cast required because the Expo Router typed-routes cache regenerates at dev time.
  organizer: (id: string) =>
    ({
      pathname: '/organizer/[id]' as '/event/[id]',
      params: { id },
    } as const),
};

export const RelativeRoutes = {
  UPCOMING: './upcoming' as const,
  PAST: './past' as const,
};

export type StaticRoute = (typeof Routes)[keyof typeof Routes];
export type EventRoute = ReturnType<typeof DynamicRoutes.event>;
export type EventEditRoute = ReturnType<typeof DynamicRoutes.eventEdit>;
export type DraftEditRoute = ReturnType<typeof DynamicRoutes.draftEdit>;
export type EditTemplateRoute = ReturnType<typeof DynamicRoutes.editTemplate>;
