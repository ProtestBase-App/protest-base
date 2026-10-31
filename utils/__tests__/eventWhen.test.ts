jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
  ),
}));

import {
  durationHours,
  endAfterHours,
  endAtTime,
  endsOnAnotherDay,
  formPin,
  moveStart,
  moveToDay,
  whenSummary,
  whereSummary,
} from '@/utils/eventWhen';

// 14:00 to 16:00 in Brussels on Saturday 14 November 2026 (winter time, UTC+1).
const dates = { start_time: '2026-11-14T13:00:00.000Z', end_time: '2026-11-14T15:00:00.000Z' };

describe('moveStart', () => {
  it('keeps the length of the event', () => {
    expect(moveStart(dates, '2026-11-14T14:00:00.000Z')).toEqual({
      start_time: '2026-11-14T14:00:00.000Z',
      end_time: '2026-11-14T16:00:00.000Z',
    });
  });

  it('leaves an event with no end without one', () => {
    expect(moveStart({ ...dates, end_time: '' }, '2026-11-14T14:00:00.000Z').end_time).toBe('');
  });
});

describe('moveToDay', () => {
  it('keeps the Brussels time across a clock change', () => {
    // 28 June is summer time: 14:00 in Brussels is 12:00 UTC.
    expect(moveToDay({ ...dates, end_time: '' }, '2026-06-28').start_time).toBe(
      '2026-06-28T12:00:00.000Z'
    );
  });
});

describe('endAtTime', () => {
  it('stays on the day of the start', () => {
    expect(endAtTime(dates, '17:30').end_time).toBe('2026-11-14T16:30:00.000Z');
  });

  it('runs into the next day when earlier than the start', () => {
    expect(endAtTime(dates, '01:00').end_time).toBe('2026-11-15T00:00:00.000Z');
  });
});

describe('endAfterHours', () => {
  it('counts from the start', () => {
    expect(endAfterHours(dates, 3).end_time).toBe('2026-11-14T16:00:00.000Z');
  });
});

describe('durationHours', () => {
  it('reads whole hours', () => {
    expect(durationHours(dates)).toBe(2);
  });

  it('has nothing to say about part of an hour, or no end', () => {
    expect(durationHours({ ...dates, end_time: '2026-11-14T14:30:00.000Z' })).toBeNull();
    expect(durationHours({ ...dates, end_time: '' })).toBeNull();
  });
});

describe('endsOnAnotherDay', () => {
  it('goes by the Brussels day', () => {
    expect(endsOnAnotherDay(dates)).toBe(false);
    expect(endsOnAnotherDay({ ...dates, end_time: '2026-11-14T23:30:00.000Z' })).toBe(true);
  });
});

describe('whenSummary', () => {
  it('has nothing to show without a date', () => {
    expect(whenSummary({ start_time: '', end_time: '' }, 'en', false)).toBeNull();
  });

  it('shows the day and the times', () => {
    const summary = whenSummary(dates, 'en', false);

    expect(summary?.title).toContain('14');
    expect(summary?.subtitle).toBe('createEvent.whenRange:{"start":"14:00","end":"16:00"}');
  });

  it('shows just the start with no end', () => {
    expect(whenSummary({ ...dates, end_time: '' }, 'en', false)?.subtitle).toBe('14:00');
  });

  it('adds the year when asked, the end day included', () => {
    const overnight = {
      start_time: '2026-11-14T21:00:00.000Z',
      end_time: '2026-11-15T01:00:00.000Z',
    };
    const summary = whenSummary(overnight, 'en', false, true);

    expect(summary?.title).toMatch(/2026$/);
    expect(summary?.subtitle).toContain('2026, 02:00');
  });

  it('says all day for an all-day event still at midnight', () => {
    const midnight = { start_time: '2026-11-13T23:00:00.000Z', end_time: '' };

    expect(whenSummary(midnight, 'en', true)?.subtitle).toBe('events.allDay');
  });
});

describe('formPin', () => {
  const picked = { street_address: 'Rue Neuve', geocod_lat: 50.85, geocod_lng: 4.35 };
  const unpicked = { street_address: 'Rue Neuve', geocod_lat: null, geocod_lng: null };
  const saved = { latitude: 1, longitude: 2, street: 'Rue Neuve' };

  it('prefers the pin picked in this session', () => {
    expect(formPin(picked, saved)).toEqual({ latitude: 50.85, longitude: 4.35 });
  });

  it('keeps the saved pin while the street is unchanged', () => {
    expect(formPin(unpicked, saved)).toBe(saved);
  });

  it('drops the saved pin once the street changes, and any pin without a street', () => {
    expect(formPin({ ...unpicked, street_address: 'Grote Markt' }, saved)).toBeNull();
    expect(formPin({ ...picked, street_address: '' }, saved)).toBeNull();
  });
});

describe('whereSummary', () => {
  it('leads with the street', () => {
    expect(
      whereSummary({ street_address: 'Place Poelaert', city: 'Brussels', postal_code: '1000' })
    ).toEqual({ title: 'Place Poelaert', subtitle: '1000 Brussels' });
  });

  it('falls back to the town', () => {
    expect(whereSummary({ street_address: '', city: 'Ghent', postal_code: null })).toEqual({
      title: 'Ghent',
    });
  });

  it('has nothing to show without a place', () => {
    expect(whereSummary({ street_address: '', city: '', postal_code: null })).toBeNull();
  });
});
