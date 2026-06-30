/**
 * Routes Tests
 *
 * Validates all route constants and dynamic route builder functions
 * return the expected values for type-safe navigation.
 */

import { Routes, DynamicRoutes, RelativeRoutes } from '@/constants/Routes';

describe('Routes', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Static Routes', () => {
    it('should define ROOT as /', () => {
      expect(Routes.ROOT).toBe('/');
    });

    it('should define HOME as /home', () => {
      expect(Routes.HOME).toBe('/home');
    });

    it('should define EXPLORE as /explore', () => {
      expect(Routes.EXPLORE).toBe('/explore');
    });

    it('should define SIGN_IN as /sign-in', () => {
      expect(Routes.SIGN_IN).toBe('/sign-in');
    });

    it('should define MORE as /more', () => {
      expect(Routes.MORE).toBe('/more');
    });

    it('should define ABOUT as /about', () => {
      expect(Routes.ABOUT).toBe('/about');
    });

    it('should define ACCOUNT as /account', () => {
      expect(Routes.ACCOUNT).toBe('/account');
    });

    it('should define ACCOUNT_INFO as /account-info', () => {
      expect(Routes.ACCOUNT_INFO).toBe('/account-info');
    });

    it('should define DELETE_ACCOUNT as /delete-account', () => {
      expect(Routes.DELETE_ACCOUNT).toBe('/delete-account');
    });

    it('should define TERMS_AND_CONDITIONS as /terms-and-conditions', () => {
      expect(Routes.TERMS_AND_CONDITIONS).toBe('/terms-and-conditions');
    });

    it('should define PRIVACY_CENTER as /privacy-center', () => {
      expect(Routes.PRIVACY_CENTER).toBe('/privacy-center');
    });

    it('should define BECOME_ORGANIZER as /become-organizer', () => {
      expect(Routes.BECOME_ORGANIZER).toBe('/become-organizer');
    });

    it('should define CREATE_EVENT as /create-event', () => {
      expect(Routes.CREATE_EVENT).toBe('/create-event');
    });

    it('should define CREATE_EVENT_OPTIONS as /create-event-options', () => {
      expect(Routes.CREATE_EVENT_OPTIONS).toBe('/create-event-options');
    });

    it('should define EVENT_TEMPLATES as /event-templates', () => {
      expect(Routes.EVENT_TEMPLATES).toBe('/event-templates');
    });

    it('should define CREATE_TEMPLATE as /create-template', () => {
      expect(Routes.CREATE_TEMPLATE).toBe('/create-template');
    });

    it('should define MY_EVENTS as /my-events', () => {
      expect(Routes.MY_EVENTS).toBe('/my-events');
    });

    it('should define MY_EVENTS_UPCOMING as /upcoming', () => {
      expect(Routes.MY_EVENTS_UPCOMING).toBe('/upcoming');
    });

    it('should define MY_EVENTS_PAST as /past', () => {
      expect(Routes.MY_EVENTS_PAST).toBe('/past');
    });

    it('should define REPORT_EVENT as /report-event', () => {
      expect(Routes.REPORT_EVENT).toBe('/report-event');
    });

    it('should define DRAFT_EVENTS as /draft-events', () => {
      expect(Routes.DRAFT_EVENTS).toBe('/draft-events');
    });

    it('should define HOME_AREA as /home-area', () => {
      expect(Routes.HOME_AREA).toBe('/home-area');
    });

    it('should have 22 static route definitions', () => {
      expect(Object.keys(Routes)).toHaveLength(22);
    });

    it('should have all route values starting with /', () => {
      for (const route of Object.values(Routes)) {
        expect(route).toMatch(/^\//);
      }
    });

    it('should have no duplicate route values', () => {
      const values = Object.values(Routes);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('DynamicRoutes.event', () => {
    it('should return the correct pathname', () => {
      const result = DynamicRoutes.event('abc123');
      expect(result.pathname).toBe('/event/[id]');
    });

    it('should include the id in params', () => {
      const result = DynamicRoutes.event('abc123');
      expect(result.params.id).toBe('abc123');
    });

    it('should not include isCreated when no query params provided', () => {
      const result = DynamicRoutes.event('abc123');
      expect(result.params).not.toHaveProperty('isCreated');
    });

    it('should not include isCreated when isCreated is false', () => {
      const result = DynamicRoutes.event('abc123', { isCreated: false });
      expect(result.params).not.toHaveProperty('isCreated');
    });

    it('should include isCreated as string "true" when isCreated is true', () => {
      const result = DynamicRoutes.event('abc123', { isCreated: true });
      expect(result.params.isCreated).toBe('true');
    });

    it('should work with a numeric-like string id', () => {
      const result = DynamicRoutes.event('42');
      expect(result.params.id).toBe('42');
    });

    it('should work with an empty string id', () => {
      const result = DynamicRoutes.event('');
      expect(result.params.id).toBe('');
    });
  });

  describe('DynamicRoutes.eventEdit', () => {
    it('should return the correct pathname', () => {
      const result = DynamicRoutes.eventEdit('xyz789');
      expect(result.pathname).toBe('/event-edit/[id]');
    });

    it('should include the id in params', () => {
      const result = DynamicRoutes.eventEdit('xyz789');
      expect(result.params.id).toBe('xyz789');
    });

    it('should not include isCreated when no query params provided', () => {
      const result = DynamicRoutes.eventEdit('xyz789');
      expect(result.params).not.toHaveProperty('isCreated');
    });

    it('should not include isCreated when isCreated is false', () => {
      const result = DynamicRoutes.eventEdit('xyz789', { isCreated: false });
      expect(result.params).not.toHaveProperty('isCreated');
    });

    it('should include isCreated as string "true" when isCreated is true', () => {
      const result = DynamicRoutes.eventEdit('xyz789', { isCreated: true });
      expect(result.params.isCreated).toBe('true');
    });
  });

  describe('DynamicRoutes.draftEdit', () => {
    it('should return the correct pathname', () => {
      const result = DynamicRoutes.draftEdit('draft001');
      expect(result.pathname).toBe('/draft-edit/[id]');
    });

    it('should include the id in params', () => {
      const result = DynamicRoutes.draftEdit('draft001');
      expect(result.params.id).toBe('draft001');
    });

    it('should only have id in params', () => {
      const result = DynamicRoutes.draftEdit('draft001');
      expect(Object.keys(result.params)).toEqual(['id']);
    });
  });

  describe('DynamicRoutes.editTemplate', () => {
    it('should return the correct pathname', () => {
      const result = DynamicRoutes.editTemplate('tpl001');
      expect(result.pathname).toBe('/edit-template/[id]');
    });

    it('should include the id in params', () => {
      const result = DynamicRoutes.editTemplate('tpl001');
      expect(result.params.id).toBe('tpl001');
    });

    it('should only have id in params', () => {
      const result = DynamicRoutes.editTemplate('tpl001');
      expect(Object.keys(result.params)).toEqual(['id']);
    });
  });

  describe('RelativeRoutes', () => {
    it('should define UPCOMING as ./upcoming', () => {
      expect(RelativeRoutes.UPCOMING).toBe('./upcoming');
    });

    it('should define PAST as ./past', () => {
      expect(RelativeRoutes.PAST).toBe('./past');
    });

    it('should have 2 relative route definitions', () => {
      expect(Object.keys(RelativeRoutes)).toHaveLength(2);
    });

    it('should have all relative routes starting with ./', () => {
      for (const route of Object.values(RelativeRoutes)) {
        expect(route).toMatch(/^\.\//);
      }
    });
  });
});
