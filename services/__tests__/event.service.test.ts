// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/utils/eventStatus', () => ({
  isEventOngoing: jest.fn(),
}));

import api from '@/services/api';
import { isEventOngoing } from '@/utils/eventStatus';
import {
  getEventsBackend,
  getOrganizationUpcomingEvents,
  getOrganizationPastEvents,
  getEventByIdBackend,
  createEventBackend,
  updateEvent,
  deleteEvent,
  fetchEventCounts,
} from '@/services/event.service';
import type { Event } from '@/types/event.types';

const mockApi = api as jest.Mocked<typeof api>;
const mockIsEventOngoing = isEventOngoing as jest.Mock;

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  $id: 'evt-1',
  id: 'evt-1',
  title: 'Test Event',
  description: 'A test protest',
  start_time: '2025-06-01T10:00:00Z',
  end_time: '2025-06-01T12:00:00Z',
  image: 'https://cdn.example.com/img.jpg',
  street_address: 'Rue de la Loi 1',
  city: 'Brussels',
  region: 'Brussels-Capital',
  country: 'Belgium',
  organizer_id: 'org-1',
  organizer_name: 'Test Org',
  website_url: null,
  categories: ['Protest'],
  disclaimer: null,
  postal_code: 1000,
  geocod_status: null,
  geocod_lat: null,
  geocod_lng: null,
  co_organizers: [],
  ...overrides,
});

describe('event.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // getEventsBackend
  // ============================================================
  describe('getEventsBackend', () => {
    it('returns events data on success with no filters', async () => {
      const events = [makeEvent()];
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { events, total: 1, limit: 100, offset: 0 },
        },
      });

      const result = await getEventsBackend();

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: { limit: 100, offset: 0 },
      });
    });

    it('passes startDate filter as param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ startDate: '2025-01-01T00:00:00Z' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ startDate: '2025-01-01T00:00:00Z' }),
      });
    });

    it('passes dateFilter param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ dateFilter: 'today' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ dateFilter: 'today' }),
      });
    });

    it('joins postalCodes array into comma-separated string', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ postalCodes: ['1000', '1040', '1050'] });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ postalCodes: '1000,1040,1050' }),
      });
    });

    it('does not include postalCodes param when array is empty', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ postalCodes: [] });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams).not.toHaveProperty('postalCodes');
    });

    it('joins organizers array into comma-separated string', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ organizers: ['org-1', 'org-2'] });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ organizers: 'org-1,org-2' }),
      });
    });

    it('passes category param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ category: 'Protest' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ category: 'Protest' }),
      });
    });

    it('trims and passes search param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ search: '  climate  ' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ search: 'climate' }),
      });
    });

    it('does not include search param when search is blank whitespace', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ search: '   ' });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams).not.toHaveProperty('search');
    });

    it('passes includeEnded param when defined', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ includeEnded: true });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ includeEnded: true }),
      });
    });

    it('maps organizerId to organizer_id param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ organizerId: 'org-id-123' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ organizer_id: 'org-id-123' }),
      });
    });

    it('maps organizationId to organization_id param', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0, limit: 100, offset: 0 } },
      });

      await getEventsBackend({ organizationId: 'org-abc' });

      expect(mockApi.get).toHaveBeenCalledWith('/events', {
        params: expect.objectContaining({ organization_id: 'org-abc' }),
      });
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false },
      });

      await expect(getEventsBackend()).rejects.toThrow('Failed to fetch events');
    });

    it('throws with backend error message on API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Database connection failed' } },
        message: 'Request failed',
      });

      await expect(getEventsBackend()).rejects.toThrow('Database connection failed');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.get.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(getEventsBackend()).rejects.toThrow('Network Error');
    });
  });

  // ============================================================
  // getOrganizationUpcomingEvents
  // ============================================================
  describe('getOrganizationUpcomingEvents', () => {
    it('returns events on success', async () => {
      const events = [makeEvent()];
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events, total: 1 } },
      });

      const result = await getOrganizationUpcomingEvents('org-1');

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/organizations/org-1/events',
        expect.objectContaining({
          params: expect.objectContaining({ startDate: expect.any(String) }),
        })
      );
    });

    it('uses provided startDate option', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0 } },
      });

      await getOrganizationUpcomingEvents('org-1', { startDate: '2025-01-01T00:00:00Z' });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams.startDate).toBe('2025-01-01T00:00:00Z');
    });

    it('passes limit, offset and includeAvatars options', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0 } },
      });

      await getOrganizationUpcomingEvents('org-1', { limit: 10, offset: 5, includeAvatars: true });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams.limit).toBe(10);
      expect(callParams.offset).toBe(5);
      expect(callParams.includeAvatars).toBe(true);
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false },
      });

      await expect(getOrganizationUpcomingEvents('org-1')).rejects.toThrow(
        'Failed to fetch organization events'
      );
    });

    it('throws with backend error on API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Org not found' } },
        message: 'Request failed',
      });

      await expect(getOrganizationUpcomingEvents('org-missing')).rejects.toThrow('Org not found');
    });
  });

  // ============================================================
  // getOrganizationPastEvents
  // ============================================================
  describe('getOrganizationPastEvents', () => {
    it('returns past events on success', async () => {
      const events = [makeEvent()];
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events, total: 1 } },
      });

      const result = await getOrganizationPastEvents('org-1');

      expect(result.events).toHaveLength(1);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/organizations/org-1/events',
        expect.objectContaining({
          params: expect.objectContaining({ endDate: expect.any(String) }),
        })
      );
    });

    it('uses provided endDate option', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0 } },
      });

      await getOrganizationPastEvents('org-1', { endDate: '2025-01-01T00:00:00Z' });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams.endDate).toBe('2025-01-01T00:00:00Z');
    });

    it('passes limit, offset and includeAvatars options', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 0 } },
      });

      await getOrganizationPastEvents('org-1', { limit: 5, offset: 10, includeAvatars: true });

      const callParams = mockApi.get.mock.calls[0][1]?.params;
      expect(callParams.limit).toBe(5);
      expect(callParams.offset).toBe(10);
      expect(callParams.includeAvatars).toBe(true);
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false },
      });

      await expect(getOrganizationPastEvents('org-1')).rejects.toThrow(
        'Failed to fetch organization past events'
      );
    });

    it('throws with backend error on API error', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Org not found' } },
        message: 'Request failed',
      });

      await expect(getOrganizationPastEvents('org-missing')).rejects.toThrow('Org not found');
    });
  });

  // ============================================================
  // getEventByIdBackend
  // ============================================================
  describe('getEventByIdBackend', () => {
    it('returns event on success', async () => {
      const event = makeEvent();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: event },
      });

      const result = await getEventByIdBackend('evt-1');

      expect(result.$id).toBe('evt-1');
      expect(mockApi.get).toHaveBeenCalledWith('/events/evt-1', undefined);
    });

    it('passes includeAvatars param when true', async () => {
      const event = makeEvent();
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: event },
      });

      await getEventByIdBackend('evt-1', true);

      expect(mockApi.get).toHaveBeenCalledWith('/events/evt-1', {
        params: { includeAvatars: true },
      });
    });

    it('throws when success is false', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: false, data: null },
      });

      await expect(getEventByIdBackend('evt-1')).rejects.toThrow('Failed to fetch event');
    });

    it('throws "Event not found" error on 404', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
        message: 'Request failed',
      });

      await expect(getEventByIdBackend('evt-missing')).rejects.toThrow(
        'Event with ID evt-missing not found'
      );
    });

    it('throws with backend error on other API errors', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server error' } },
        message: 'Request failed',
      });

      await expect(getEventByIdBackend('evt-1')).rejects.toThrow('Server error');
    });

    it('throws with message fallback when no response body', async () => {
      mockApi.get.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(getEventByIdBackend('evt-1')).rejects.toThrow('Network Error');
    });
  });

  // ============================================================
  // createEventBackend
  // ============================================================
  describe('createEventBackend', () => {
    const baseEventData = {
      organization_id: 'org-1',
      title: 'Climate March',
      description: 'A march for the climate',
      start_time: '2025-06-01T10:00:00Z',
    };

    it('sends JSON payload when no image file provided', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-1', title: 'Climate March' } },
      });

      const result = await createEventBackend(baseEventData);

      expect(result.$id).toBe('new-evt-1');
      expect(mockApi.post).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({ organization_id: 'org-1', title: 'Climate March' }),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' }, timeout: 60000 })
      );
    });

    it('sends FormData when image file is provided', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-2', title: 'Climate March' } },
      });

      const dataWithImage = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
      };

      await createEventBackend(dataWithImage);

      const [, payload, config]: any[] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect(config.headers['Content-Type']).toBe('multipart/form-data');
      expect(config.timeout).toBe(60000);
    });

    it('uses fallback mimeType and fileName when not provided in image', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-3' } },
      });

      const dataWithMinimalImage = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg' },
      };

      await createEventBackend(dataWithMinimalImage);

      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it('appends each categories item as a separate FormData field', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-4' } },
      });

      const dataWithCategories = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        categories: ['Protest', 'Strike'],
      };

      await createEventBackend(dataWithCategories);

      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      const values = (payload as FormData).getAll('categories');
      expect(values).toEqual(['Protest', 'Strike']);
    });

    it('omits postal_code from JSON payload when null', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-5' } },
      });

      await createEventBackend({ ...baseEventData, postal_code: null as any });

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.postal_code).toBeUndefined();
    });

    it('wraps a single-string categories into a 1-element FormData array', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-cat-str' } },
      });

      const dataWithStringCategory = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        categories: 'Protest', // form sends a string from the single-select dropdown
      };

      await createEventBackend(dataWithStringCategory);

      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      // The string should have been normalized into a single repeated field.
      expect((payload as FormData).getAll('categories')).toEqual(['Protest']);
    });

    it('omits categories from FormData when the form sent an empty string', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-cat-empty' } },
      });

      const dataWithEmptyCategory = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        categories: '',
      };

      await createEventBackend(dataWithEmptyCategory);

      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect((payload as FormData).getAll('categories')).toEqual([]);
    });

    it('wraps a single-string categories in the JSON payload (no image)', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-json-str' } },
      });

      await createEventBackend({
        ...baseEventData,
        categories: 'Protest', // string
      });

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.categories).toEqual(['Protest']);
    });

    it('omits categories from the JSON payload when the form sent an empty string', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-json-empty' } },
      });

      await createEventBackend({ ...baseEventData, categories: '' });

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.categories).toBeUndefined();
    });

    it('appends each co_organizers item as a separate FormData field', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-co' } },
      });

      const dataWithCoOrganizers = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        co_organizers: ['user-1', 'user-2'],
      };

      await createEventBackend(dataWithCoOrganizers);

      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      const values = (payload as FormData).getAll('co_organizers');
      expect(values).toEqual(['user-1', 'user-2']);
    });

    it('appends postal_code to FormData when provided', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-postal' } },
      });

      const dataWithPostal = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        postal_code: 1000,
      };

      await createEventBackend(dataWithPostal);

      expect(mockApi.post).toHaveBeenCalledTimes(1);
      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
    });

    it('appends help_needed boolean to FormData', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'new-evt-help' } },
      });

      const dataWithHelp = {
        ...baseEventData,
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        help_needed: true,
        help_description: 'We need volunteers',
      };

      await createEventBackend(dataWithHelp);

      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it('throws when success is false or $id is missing', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: {} }, // no $id
      });

      await expect(createEventBackend(baseEventData)).rejects.toThrow('Failed to create event');
    });

    it('throws with backend error on API error', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: 'Validation failed' } },
        message: 'Request failed',
      });

      await expect(createEventBackend(baseEventData)).rejects.toThrow('Validation failed');
    });

    it('throws with network error when no response body', async () => {
      mockApi.post.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(createEventBackend(baseEventData)).rejects.toThrow('Network Error');
    });
  });

  // ============================================================
  // updateEvent
  // ============================================================
  describe('updateEvent', () => {
    const baseUpdates = { title: 'Updated Title', description: 'Updated description' };

    it('sends JSON payload when no new image file', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1', title: 'Updated Title' } },
      });

      const result = await updateEvent('evt-1', baseUpdates);

      expect(result.$id).toBe('evt-1');
      expect(mockApi.put).toHaveBeenCalledWith(
        '/events/evt-1',
        expect.objectContaining({ title: 'Updated Title' }),
        expect.objectContaining({ headers: { 'Content-Type': 'application/json' }, timeout: 60000 })
      );
    });

    it('sends FormData when new image file provided', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      const updatesWithImage = {
        ...baseUpdates,
        image: { uri: 'file:///new-img.jpg', mimeType: 'image/jpeg', fileName: 'new-img.jpg' },
      };

      await updateEvent('evt-1', updatesWithImage);

      const [, payload, config]: any[] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect(config.headers['Content-Type']).toBe('multipart/form-data');
    });

    it('omits postal_code from JSON payload when null', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', { postal_code: null as any });

      const [, payload]: any[] = mockApi.put.mock.calls[0];
      expect(payload.postal_code).toBeUndefined();
    });

    it('wraps single-string categories into a 1-element FormData array in updateEvent', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', {
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        categories: 'Protest', // form sends a string from the single-select dropdown
      });

      const [, payload] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect((payload as FormData).getAll('categories')).toEqual(['Protest']);
    });

    it('wraps single-string categories in the JSON payload of updateEvent', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', { categories: 'Protest' });

      const [, payload]: any[] = mockApi.put.mock.calls[0];
      expect(payload.categories).toEqual(['Protest']);
    });

    it('appends each co_organizers item as a separate FormData field in updateEvent', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', {
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        co_organizers: ['user-1', 'user-2'],
      });

      const [, payload] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      const values = (payload as FormData).getAll('co_organizers');
      expect(values).toEqual(['user-1', 'user-2']);
    });

    it('appends postal_code to FormData in updateEvent', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', {
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        postal_code: 1050,
      });

      const [, payload] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
    });

    it('appends help_needed boolean to FormData in updateEvent', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt-1' } },
      });

      await updateEvent('evt-1', {
        image: { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' },
        help_needed: false,
      });

      const [, payload] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
    });

    it('throws when success is false or data is missing', async () => {
      mockApi.put.mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      await expect(updateEvent('evt-1', baseUpdates)).rejects.toThrow('Failed to update event');
    });

    it('throws permission error on 403', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
        message: 'Request failed',
      });

      await expect(updateEvent('evt-1', baseUpdates)).rejects.toThrow(
        'You do not have permission to update this event'
      );
    });

    it('throws "Event not found" on 404', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
        message: 'Request failed',
      });

      await expect(updateEvent('evt-missing', baseUpdates)).rejects.toThrow('Event not found');
    });

    it('throws with backend error on other API errors', async () => {
      mockApi.put.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Server crash' } },
        message: 'Request failed',
      });

      await expect(updateEvent('evt-1', baseUpdates)).rejects.toThrow('Server crash');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.put.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(updateEvent('evt-1', baseUpdates)).rejects.toThrow('Network Error');
    });
  });

  // ============================================================
  // deleteEvent
  // ============================================================
  describe('deleteEvent', () => {
    it('resolves without error on successful deletion', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      await expect(deleteEvent('evt-1')).resolves.toBeUndefined();
      expect(mockApi.delete).toHaveBeenCalledWith('/events/evt-1');
    });

    it('throws "Event not found" on 404', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Not found' } },
      });

      await expect(deleteEvent('evt-missing')).rejects.toThrow('Event not found');
    });

    it('throws permission error on 403', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Forbidden' } },
      });

      await expect(deleteEvent('evt-1')).rejects.toThrow(
        'You do not have permission to delete this event'
      );
    });

    it('throws "Please log in" on 401', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });

      await expect(deleteEvent('evt-1')).rejects.toThrow('Please log in to delete this event');
    });

    it('throws with backend error on other API errors', async () => {
      mockApi.delete.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Database error' } },
        message: 'Request failed',
      });

      await expect(deleteEvent('evt-1')).rejects.toThrow('Database error');
    });

    it('throws with network error message when no response body', async () => {
      mockApi.delete.mockRejectedValueOnce({ message: 'Network Error' });

      await expect(deleteEvent('evt-1')).rejects.toThrow('Network Error');
    });

    it('throws generic message when no error details available', async () => {
      mockApi.delete.mockRejectedValueOnce({});

      await expect(deleteEvent('evt-1')).rejects.toThrow('Failed to delete event');
    });
  });

  // ============================================================
  // fetchEventCounts
  // ============================================================
  describe('fetchEventCounts', () => {
    it('returns { upcoming: 0, past: 0 } when organizationIds is empty', async () => {
      const result = await fetchEventCounts([]);

      expect(result).toEqual({ upcoming: 0, past: 0 });
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('counts ongoing events for upcoming and uses total for past', async () => {
      const events = [makeEvent(), makeEvent({ $id: 'evt-2', id: 'evt-2' })];
      // First call: getOrganizationUpcomingEvents
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events, total: 2 } },
      });
      // Second call: getOrganizationPastEvents
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 5 } },
      });

      mockIsEventOngoing.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const result = await fetchEventCounts(['org-1']);

      expect(result.upcoming).toBe(1); // Only 1 of 2 is ongoing
      expect(result.past).toBe(5);
    });

    it('counts all events as upcoming when all are ongoing', async () => {
      const events = [makeEvent(), makeEvent({ $id: 'evt-2', id: 'evt-2' })];
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events, total: 2 } },
      });
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { events: [], total: 3 } },
      });

      mockIsEventOngoing.mockReturnValue(true);

      const result = await fetchEventCounts(['org-1']);

      expect(result.upcoming).toBe(2);
      expect(result.past).toBe(3);
    });

    it('uses only the first organizationId', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: { success: true, data: { events: [], total: 0 } },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: { events: [], total: 0 } },
        });

      await fetchEventCounts(['org-1', 'org-2', 'org-3']);

      // Both calls should use org-1
      const firstCallUrl = mockApi.get.mock.calls[0][0];
      const secondCallUrl = mockApi.get.mock.calls[1][0];
      expect(firstCallUrl).toBe('/organizations/org-1/events');
      expect(secondCallUrl).toBe('/organizations/org-1/events');
    });

    it('throws with error message on API failure', async () => {
      mockApi.get.mockRejectedValueOnce({
        response: { data: { error: 'Organization not found' } },
        message: 'Request failed',
      });

      await expect(fetchEventCounts(['org-1'])).rejects.toThrow('Organization not found');
    });
  });
});
