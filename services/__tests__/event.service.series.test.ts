// Mock dependencies before imports
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
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
import {
  addSeriesDates,
  cancelSeries,
  createDraftEvent,
  createEventBackend,
  deleteSeriesOccurrences,
  DuplicateEventError,
  editSeries,
  EventIncompleteError,
  EventSeriesError,
  getSeries,
  previewRecurrence,
  publishDraft,
  publishSeries,
} from '@/services/event.service';
import type { DuplicateWarningReport } from '@/types/event.types';
import type {
  CreateEventReport,
  EventSeries,
  EventSeriesSummary,
  RecurrenceInput,
} from '@/types/eventSeries.types';

const mockApi = api as jest.Mocked<typeof api>;

const rule: RecurrenceInput = {
  frequency: 'weekly',
  weekday: 'tuesday',
  start_local: '19:00',
  end_local: '21:00',
  count: 3,
};

const baseSeriesData = {
  organization_id: 'org-1',
  title: 'Weekly vigil',
  description: 'Every Tuesday',
  recurrence: rule,
};

const pickedImage = { uri: 'file:///img.jpg', mimeType: 'image/jpeg', fileName: 'img.jpg' };

const seriesSummary: EventSeriesSummary = {
  id: 'series-123',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: '21:00',
  starts_on: '2026-10-27',
  until: '2026-11-10',
  window_end: '2027-01-27',
  occurrence_count: 3,
  max_occurrences: 14,
  occurrences: [
    { $id: 'event-123', start_time: '2026-10-27T18:00:00.000Z', end_time: null },
    { $id: 'event-124', start_time: '2026-11-03T18:00:00.000Z', end_time: null },
    { $id: 'event-125', start_time: '2026-11-10T18:00:00.000Z', end_time: null },
  ],
};

const series: EventSeries = {
  id: 'series-123',
  frequency: 'weekly',
  weekday: 'tuesday',
  week_of_month: null,
  start_local: '19:00',
  end_local: '21:00',
  starts_on: '2026-11-02',
  until_date: '2026-11-17',
  window_end: '2027-02-03',
  max_occurrences: 14,
  occurrences: [
    { $id: 'event-1', start_time: '2026-11-03T18:00:00.000Z', end_time: null, status: 'active' },
  ],
  can_add_dates: true,
};

const created = (extra: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    data: { $id: 'event-123', series_id: 'series-123' },
    series: seriesSummary,
    message: '3 events created',
    ...extra,
  },
});

const httpError = (status: number, data: Record<string, unknown>) => ({
  response: { status, data: { success: false, statusCode: status, ...data } },
});

const rateLimited = () =>
  Object.assign(new Error('Too many requests'), {
    code: 'RATE_LIMIT_EXCEEDED',
    isRateLimited: true,
  });

describe('event.service recurring series', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Create
  // ============================================================
  describe('createEventBackend with recurrence', () => {
    it('sends the rule as a JSON object, and no times, on the JSON path', async () => {
      mockApi.post.mockResolvedValueOnce(created());

      await createEventBackend(baseSeriesData);

      const [url, payload, config]: any[] = mockApi.post.mock.calls[0];
      expect(url).toBe('/events');
      expect(payload.recurrence).toEqual(rule);
      expect(payload).not.toHaveProperty('start_time');
      expect(payload).not.toHaveProperty('end_time');
      expect(config.timeout).toBe(60000);
    });

    it('drops a leftover start_time, end_time and all_day picked before Repeat', async () => {
      mockApi.post.mockResolvedValueOnce(created());

      await createEventBackend({
        ...baseSeriesData,
        start_time: '2026-11-03T18:00:00.000Z',
        end_time: '2026-11-03T20:00:00.000Z',
        all_day: false,
      } as any);

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload).not.toHaveProperty('start_time');
      expect(payload).not.toHaveProperty('end_time');
      expect(payload).not.toHaveProperty('all_day');
    });

    it('serialises the rule as one JSON string on multipart, with no times', async () => {
      mockApi.post.mockResolvedValueOnce(created());

      await createEventBackend({ ...baseSeriesData, images: [pickedImage] });

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect(payload.getAll('recurrence')).toEqual([JSON.stringify(rule)]);
      expect(payload.getAll('start_time')).toEqual([]);
      expect(payload.getAll('end_time')).toEqual([]);
    });

    it('keeps the rule on the legacy single-image multipart path too', async () => {
      mockApi.post.mockResolvedValueOnce(created());

      await createEventBackend({ ...baseSeriesData, image: pickedImage });

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.getAll('recurrence')).toEqual([JSON.stringify(rule)]);
    });

    it('fits the rule in the multipart limit of 1024 characters', () => {
      const longest: RecurrenceInput = {
        frequency: 'every_2_weeks',
        weekday: 'wednesday',
        week_of_month: -1,
        start_local: '19:00',
        end_local: '21:00',
        starts_on: '2026-11-03',
        until: '2027-02-03',
      };

      expect(JSON.stringify(longest).length).toBeLessThan(1024);
    });

    it('returns the first date and reports the series', async () => {
      mockApi.post.mockResolvedValueOnce(created());
      const report: CreateEventReport = {};

      const event = await createEventBackend(baseSeriesData, { report });

      expect(event.$id).toBe('event-123');
      expect(report.series).toEqual(seriesSummary);
    });

    it('treats a 201 without series as an error, never as a single event', async () => {
      mockApi.post.mockResolvedValueOnce(created({ series: undefined }));

      await expect(createEventBackend(baseSeriesData)).rejects.toMatchObject({
        name: 'EventSeriesError',
        code: 'SERIES_NOT_CONFIRMED',
      });
    });

    it('surfaces MISSING_START_TIME, which means the rule was lost on the way', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(400, {
          code: 'MISSING_START_TIME',
          error: 'Please provide a start time for the event.',
        })
      );

      await expect(createEventBackend(baseSeriesData)).rejects.toMatchObject({
        name: 'EventSeriesError',
        code: 'MISSING_START_TIME',
      });
    });

    it('carries max and window_end on the cap error', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(400, {
          code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
          error: 'The series allows at most 14 occurrences',
          max: 14,
          window_end: '2027-02-03',
        })
      );

      const error = await createEventBackend(baseSeriesData).catch((e) => e);

      expect(error).toBeInstanceOf(EventSeriesError);
      expect(error.max).toBe(14);
      expect(error.windowEnd).toBe('2027-02-03');
    });

    it('keeps the 429 flags: the interceptor rewrites them with no response', async () => {
      const limited = rateLimited();
      mockApi.post.mockRejectedValueOnce(limited);

      await expect(createEventBackend(baseSeriesData)).rejects.toBe(limited);
    });

    it('carries occurrence_start_time on a block-mode 409', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(409, {
          code: 'DUPLICATE_EVENT',
          error: 'An event that looks like this one already exists.',
          canOverride: true,
          duplicates: [
            {
              id: 'dup-1',
              relationship: 'other_org',
              reason: 'content',
              strength: 'strong',
              occurrence_start_time: '2026-11-03T18:00:00.000Z',
            },
          ],
        })
      );

      const error = await createEventBackend(baseSeriesData).catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateEventError);
      expect(error.duplicates[0].occurrence_start_time).toBe('2026-11-03T18:00:00.000Z');
    });

    it('sends the identical rule again with the override, on multipart as a string', async () => {
      mockApi.post.mockResolvedValueOnce(created());

      await createEventBackend(
        { ...baseSeriesData, images: [pickedImage] },
        { duplicateOverride: true }
      );

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.getAll('duplicate_override')).toEqual(['true']);
      expect(payload.getAll('recurrence')).toEqual([JSON.stringify(rule)]);
    });

    it('collects warn-mode warnings with the clashing date', async () => {
      mockApi.post.mockResolvedValueOnce(
        created({
          warnings: {
            possibleDuplicates: [
              {
                id: 'dup-1',
                relationship: 'own',
                reason: 'url',
                strength: 'weak',
                occurrence_start_time: '2026-11-10T18:00:00.000Z',
              },
            ],
          },
        })
      );
      const report: CreateEventReport = {};

      await createEventBackend(baseSeriesData, { report });

      expect(report.possibleDuplicates?.[0].occurrence_start_time).toBe('2026-11-10T18:00:00.000Z');
    });

    it('creates a draft series through the same path', async () => {
      mockApi.post.mockResolvedValueOnce(created());
      const report: CreateEventReport = {};

      await createDraftEvent(
        { organization_id: 'org-1', title: 'Weekly vigil', recurrence: rule },
        { report }
      );

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.is_draft).toBe(true);
      expect(payload.recurrence).toEqual(rule);
      expect(report.series?.id).toBe('series-123');
    });
  });

  // ============================================================
  // A single event stays exactly what it was
  // ============================================================
  describe('createEventBackend without recurrence', () => {
    const single = {
      organization_id: 'org-1',
      title: 'One march',
      description: 'Once',
      start_time: '2026-11-03T18:00:00.000Z',
      end_time: '2026-11-03T20:00:00.000Z',
    };

    it('keeps start_time and end_time, and adds no field', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt', series_id: null } },
      });

      await createEventBackend(single);

      const [, payload]: any[] = mockApi.post.mock.calls[0];
      expect(payload.start_time).toBe(single.start_time);
      expect(payload.end_time).toBe(single.end_time);
      expect(payload).not.toHaveProperty('recurrence');
    });

    it('is fine with no series key, and reports none', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { $id: 'evt', series_id: null } },
      });
      const report: CreateEventReport = {};

      await createEventBackend(single, { report });

      expect(report.series).toBeUndefined();
    });

    it('still shows the backend message on a 400, as a plain Error', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(400, { code: 'VALIDATION_ERROR', error: 'title too long' })
      );

      const error = await createEventBackend(single).catch((e) => e);

      expect(error).not.toBeInstanceOf(EventSeriesError);
      expect(error.message).toBe('title too long');
    });
  });

  // ============================================================
  // Preview
  // ============================================================
  describe('previewRecurrence', () => {
    const preview = {
      occurrences: [{ start_time: '2026-11-03T18:00:00.000Z', end_time: null }],
      count: 1,
      max: 14,
      window_end: '2027-02-03',
    };

    it('posts the rule as JSON and returns the dates', async () => {
      mockApi.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true, data: preview, message: '1 occurrences' },
      });

      await expect(previewRecurrence(rule)).resolves.toEqual(preview);

      const [url, body]: any[] = mockApi.post.mock.calls[0];
      expect(url).toBe('/events/recurrence/preview');
      expect(body).toEqual({ recurrence: rule });
    });

    it('turns a refused rule into a typed error with the cap', async () => {
      mockApi.post.mockResolvedValueOnce({
        status: 400,
        data: {
          success: false,
          code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
          error: 'too many',
          max: 14,
          window_end: '2027-02-03',
        },
      });

      await expect(previewRecurrence(rule)).rejects.toMatchObject({
        code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
        max: 14,
        windowEnd: '2027-02-03',
      });
    });

    it('treats a disabled flag as a typed error too', async () => {
      mockApi.post.mockResolvedValueOnce({
        status: 400,
        data: { success: false, code: 'RECURRENCE_DISABLED', error: 'off' },
      });

      await expect(previewRecurrence(rule)).rejects.toMatchObject({ code: 'RECURRENCE_DISABLED' });
    });

    it('keeps the 429 flags', async () => {
      const limited = rateLimited();
      mockApi.post.mockRejectedValueOnce(limited);

      await expect(previewRecurrence(rule)).rejects.toBe(limited);
    });
  });

  // ============================================================
  // Read
  // ============================================================
  describe('getSeries', () => {
    it('returns the series', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { success: true, data: series } });

      await expect(getSeries('series-123')).resolves.toEqual(series);
      expect(mockApi.get).toHaveBeenCalledWith('/events/series/series-123');
    });

    it('maps SERIES_NOT_FOUND to a typed error', async () => {
      mockApi.get.mockRejectedValueOnce(
        httpError(404, { code: 'SERIES_NOT_FOUND', error: 'Event series not found.' })
      );

      await expect(getSeries('nope')).rejects.toMatchObject({ code: 'SERIES_NOT_FOUND' });
    });

    it('does not read a route 404 as a missing series', async () => {
      mockApi.get.mockRejectedValueOnce(httpError(404, { error: 'Route not found' }));

      const error = await getSeries('series-123').catch((e) => e);

      expect(error).not.toBeInstanceOf(EventSeriesError);
    });
  });

  // ============================================================
  // Edit
  // ============================================================
  describe('editSeries', () => {
    const edited = { data: { success: true, data: { updated: 2, series } } };

    it('sends JSON with from_event_id, a long timeout and the times', async () => {
      mockApi.put.mockResolvedValueOnce(edited);

      const result = await editSeries(
        'series-123',
        { title: 'New title', start_local: '20:00', end_local: null },
        { fromEventId: 'event-2' }
      );

      expect(result.updated).toBe(2);
      const [url, payload, config]: any[] = mockApi.put.mock.calls[0];
      expect(url).toBe('/events/series/series-123');
      expect(payload).toMatchObject({ title: 'New title', start_local: '20:00', end_local: null });
      expect(config.params).toEqual({ from_event_id: 'event-2' });
      expect(config.timeout).toBe(60000);
    });

    it('sends no scope for every upcoming date', async () => {
      mockApi.put.mockResolvedValueOnce(edited);

      await editSeries('series-123', { title: 'New title' });

      const [, , config]: any[] = mockApi.put.mock.calls[0];
      expect(config.params).toBeUndefined();
    });

    it('clears the end time with an empty string on multipart, where a null is skipped', async () => {
      mockApi.put.mockResolvedValueOnce(edited);

      await editSeries('series-123', {
        images: [pickedImage],
        start_local: '20:00',
        end_local: null,
      });

      const [, payload]: any[] = mockApi.put.mock.calls[0];
      expect(payload).toBeInstanceOf(FormData);
      expect(payload.getAll('start_local')).toEqual(['20:00']);
      expect(payload.getAll('end_local')).toEqual(['']);
    });

    it('sends a kept end time as it is on multipart', async () => {
      mockApi.put.mockResolvedValueOnce(edited);

      await editSeries('series-123', { images: [pickedImage], end_local: '22:00' });

      const [, payload]: any[] = mockApi.put.mock.calls[0];
      expect(payload.getAll('end_local')).toEqual(['22:00']);
    });

    it('maps the schedule refusal', async () => {
      mockApi.put.mockRejectedValueOnce(
        httpError(400, { code: 'SERIES_SCHEDULE_IMMUTABLE', error: 'no' })
      );

      await expect(editSeries('series-123', { title: 'x' })).rejects.toMatchObject({
        code: 'SERIES_SCHEDULE_IMMUTABLE',
      });
    });

    it('maps a non-member refusal by code', async () => {
      mockApi.put.mockRejectedValueOnce(
        httpError(403, { code: 'NOT_ORGANIZATION_MEMBER', error: 'no' })
      );

      await expect(editSeries('series-123', { title: 'x' })).rejects.toMatchObject({
        code: 'NOT_ORGANIZATION_MEMBER',
      });
    });
  });

  // ============================================================
  // Cancel and delete
  // ============================================================
  describe('cancelSeries', () => {
    it('sends an empty object and no reason, with the scope', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { cancelled: 1, deleted: 0, series } },
      });

      const result = await cancelSeries('series-123', { fromEventId: 'event-3' });

      expect(result.cancelled).toBe(1);
      expect(mockApi.post).toHaveBeenCalledWith(
        '/events/series/series-123/cancel',
        {},
        { params: { from_event_id: 'event-3' } }
      );
    });

    it('reads SERIES_NOTHING_UPCOMING as such, not as already cancelled', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(409, { code: 'SERIES_NOTHING_UPCOMING', error: 'nothing' })
      );

      await expect(cancelSeries('series-123')).rejects.toMatchObject({
        code: 'SERIES_NOTHING_UPCOMING',
      });
    });

    it('keeps the 429 flags', async () => {
      const limited = rateLimited();
      mockApi.post.mockRejectedValueOnce(limited);

      await expect(cancelSeries('series-123')).rejects.toBe(limited);
    });
  });

  describe('deleteSeriesOccurrences', () => {
    it('returns a null series when nothing is left', async () => {
      mockApi.delete.mockResolvedValueOnce({
        data: { success: true, data: { deleted: 2, series: null } },
      });

      const result = await deleteSeriesOccurrences('series-123', { fromEventId: 'event-2' });

      expect(result).toEqual({ deleted: 2, series: null });
      expect(mockApi.delete).toHaveBeenCalledWith('/events/series/series-123', {
        params: { from_event_id: 'event-2' },
      });
    });
  });

  // ============================================================
  // Publish and add dates
  // ============================================================
  describe('publishSeries', () => {
    it('posts an empty object, never an empty body', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { published: 3, series } },
      });

      await publishSeries('series-123');

      const [url, body, config]: any[] = mockApi.post.mock.calls[0];
      expect(url).toBe('/events/series/series-123/publish');
      expect(body).toEqual({});
      expect(config.timeout).toBe(60000);
    });

    it('sends the override only when acknowledging a 409', async () => {
      mockApi.post.mockResolvedValueOnce({
        data: { success: true, data: { published: 3, series } },
      });

      await publishSeries('series-123', { duplicateOverride: true });

      const [, body]: any[] = mockApi.post.mock.calls[0];
      expect(body).toEqual({ duplicate_override: true });
    });

    it('maps 422 to EventIncompleteError with plain field names', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(422, {
          code: 'EVENT_INCOMPLETE',
          error: 'This series is missing some required information',
          fields: [
            { field: 'description', code: 'MISSING_DESCRIPTION', message: 'Add one' },
            { field: 'categories', code: 'MISSING_CATEGORY', message: 'Select one' },
          ],
        })
      );

      const error = await publishSeries('series-123').catch((e) => e);

      expect(error).toBeInstanceOf(EventIncompleteError);
      expect(error.fields).toEqual(['description', 'categories']);
    });

    it('tells a duplicate 409 from a nothing-upcoming 409', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(409, {
          code: 'DUPLICATE_EVENT',
          canOverride: true,
          duplicates: [{ id: 'dup', relationship: 'own', reason: 'url', strength: 'strong' }],
        })
      );
      await expect(publishSeries('series-123')).rejects.toBeInstanceOf(DuplicateEventError);

      mockApi.post.mockRejectedValueOnce(
        httpError(409, { code: 'SERIES_NOTHING_UPCOMING', error: 'nothing' })
      );
      await expect(publishSeries('series-123')).rejects.toMatchObject({
        code: 'SERIES_NOTHING_UPCOMING',
      });
    });

    it('collects warnings, except on an acknowledged override', async () => {
      const warned = () => ({
        data: {
          success: true,
          data: { published: 1, series },
          warnings: {
            possibleDuplicates: [
              { id: 'dup', relationship: 'own', reason: 'url', strength: 'weak' },
            ],
          },
        },
      });

      mockApi.post.mockResolvedValueOnce(warned());
      const report: DuplicateWarningReport = {};
      await publishSeries('series-123', { report });
      expect(report.possibleDuplicates).toHaveLength(1);

      mockApi.post.mockResolvedValueOnce(warned());
      const overridden: DuplicateWarningReport = {};
      await publishSeries('series-123', { report: overridden, duplicateOverride: true });
      expect(overridden.possibleDuplicates).toBeUndefined();
    });
  });

  describe('publishDraft', () => {
    it('reads field names out of the objects the backend sends on 422', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(422, {
          code: 'EVENT_INCOMPLETE',
          fields: [{ field: 'description', code: 'MISSING_DESCRIPTION', message: 'Add one' }],
        })
      );

      const error = await publishDraft('evt-1').catch((e) => e);

      expect(error.fields).toEqual(['description']);
    });
  });

  describe('addSeriesDates', () => {
    const added = { data: { success: true, data: { created: 1, series } } };

    it('posts add_count', async () => {
      mockApi.post.mockResolvedValueOnce(added);

      const result = await addSeriesDates('series-123', { add_count: 1 });

      expect(result.created).toBe(1);
      expect(mockApi.post).toHaveBeenCalledWith('/events/series/series-123/dates', {
        add_count: 1,
      });
    });

    it('posts until, with the override when acknowledging a 409', async () => {
      mockApi.post.mockResolvedValueOnce(added);

      await addSeriesDates('series-123', { until: '2026-12-01' }, { duplicateOverride: true });

      expect(mockApi.post).toHaveBeenCalledWith('/events/series/series-123/dates', {
        until: '2026-12-01',
        duplicate_override: true,
      });
    });

    it('carries the window on the cap error', async () => {
      mockApi.post.mockRejectedValueOnce(
        httpError(400, {
          code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
          error: 'The series cannot be extended past its 3-month window.',
          max: 14,
          window_end: '2027-02-03',
        })
      );

      await expect(addSeriesDates('series-123', { add_count: 9 })).rejects.toMatchObject({
        code: 'RECURRENCE_TOO_MANY_OCCURRENCES',
        max: 14,
        windowEnd: '2027-02-03',
      });
    });

    it('reads CONFLICT and SERIES_ENDED by code', async () => {
      mockApi.post.mockRejectedValueOnce(httpError(409, { code: 'CONFLICT', error: 'taken' }));
      await expect(addSeriesDates('series-123', { add_count: 1 })).rejects.toMatchObject({
        code: 'CONFLICT',
      });

      mockApi.post.mockRejectedValueOnce(httpError(409, { code: 'SERIES_ENDED', error: 'over' }));
      await expect(addSeriesDates('series-123', { add_count: 1 })).rejects.toMatchObject({
        code: 'SERIES_ENDED',
      });
    });
  });
});
