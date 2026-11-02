jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key
  ),
}));

import { Alert } from 'react-native';

import type { DuplicateSummary } from '@/types/event.types';
import {
  alertWithDuplicateWarning,
  countDistinctDuplicates,
  duplicateHref,
  duplicateKey,
  duplicateTitle,
  duplicateWarningNote,
  formatDuplicateMeta,
  formatDuplicateWhen,
  formatDuplicateYourDate,
  relationshipMessageKey,
  relationshipOpenLabelKey,
} from '@/utils/duplicateEvents';

const summary = (overrides: Partial<DuplicateSummary> = {}): DuplicateSummary => ({
  id: 'dup-1',
  title: 'Climate March',
  // 12:00 UTC = 14:00 Brussels in summer — not midnight, so a timed event.
  start_time: '2026-07-22T12:00:00.000Z',
  city: 'Brussels',
  status: 'active',
  organization_id: 'org-1',
  relationship: 'own',
  reason: 'content',
  strength: 'strong',
  ...overrides,
});

describe('duplicateEvents', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('duplicateHref', () => {
    it('routes a published match to the event detail screen', () => {
      expect(duplicateHref(summary())).toEqual({
        pathname: '/event/[id]',
        params: { id: 'dup-1' },
      });
    });

    it('routes a past match to the event detail screen too', () => {
      expect(duplicateHref(summary({ status: 'past' })).pathname).toBe('/event/[id]');
    });

    // A draft match can only ever be the submitter's own — the backend never
    // puts another organization's draft in a human path's candidate set — so
    // the draft editor is always reachable.
    it('routes a draft match to the draft editor', () => {
      expect(duplicateHref(summary({ status: 'draft' }))).toEqual({
        pathname: '/draft-edit/[id]',
        params: { id: 'dup-1' },
      });
    });

    it('falls back to the event screen for an unknown status', () => {
      expect(duplicateHref(summary({ status: null })).pathname).toBe('/event/[id]');
    });
  });

  describe('duplicateTitle', () => {
    it('uses the title when there is one', () => {
      expect(duplicateTitle(summary())).toBe('Climate March');
    });

    it('falls back to the untitled-draft label for a null or blank title', () => {
      expect(duplicateTitle(summary({ title: null }))).toBe('drafts.untitled');
      expect(duplicateTitle(summary({ title: '   ' }))).toBe('drafts.untitled');
    });
  });

  describe('formatDuplicateWhen', () => {
    it('formats a timed match with its clock time', () => {
      expect(formatDuplicateWhen(summary())).toBe('Wednesday July 22 at 2:00 PM');
    });

    // DuplicateSummary carries no `all_day`, so Brussels midnight stands in for
    // it — otherwise every scraped date-only match reads "at 12:00 AM".
    it('renders a Brussels-midnight match as all-day', () => {
      const midnight = summary({ start_time: '2026-07-21T22:00:00.000Z' });
      expect(formatDuplicateWhen(midnight)).toContain('Wednesday July 22 · events.allDay');
    });

    it('returns null when the match carries no start time', () => {
      expect(formatDuplicateWhen(summary({ start_time: null }))).toBeNull();
    });

    // start_time is free-form on the wire; Intl throws on an Invalid Date, and
    // this runs inside the modal's render.
    it('returns null instead of throwing on an unparseable start time', () => {
      expect(formatDuplicateWhen(summary({ start_time: 'not-a-date' }))).toBeNull();
      expect(formatDuplicateMeta(summary({ start_time: 'not-a-date' }))).toBe('Brussels');
    });
  });

  describe('formatDuplicateMeta', () => {
    it('joins the date and the city', () => {
      expect(formatDuplicateMeta(summary())).toBe('Wednesday July 22 at 2:00 PM · Brussels');
    });

    it('drops the missing half', () => {
      expect(formatDuplicateMeta(summary({ city: null }))).toBe('Wednesday July 22 at 2:00 PM');
      expect(formatDuplicateMeta(summary({ start_time: null }))).toBe('Brussels');
    });

    it('returns null when the match has neither', () => {
      expect(formatDuplicateMeta(summary({ start_time: null, city: '  ' }))).toBeNull();
    });
  });

  describe('relationship copy', () => {
    it('maps each relationship to its own line', () => {
      expect(relationshipMessageKey('own')).toBe('duplicates.relationshipOwn');
      expect(relationshipMessageKey('co_organized')).toBe('duplicates.relationshipCoOrganized');
      expect(relationshipMessageKey('other_org')).toBe('duplicates.relationshipOtherOrg');
    });

    it('says "open" for the organizer\'s own, "view" for someone else\'s', () => {
      expect(relationshipOpenLabelKey('own')).toBe('duplicates.open');
      expect(relationshipOpenLabelKey('co_organized')).toBe('duplicates.open');
      expect(relationshipOpenLabelKey('other_org')).toBe('duplicates.view');
    });
  });

  describe('duplicateWarningNote', () => {
    it('is null when the backend flagged nothing', () => {
      expect(duplicateWarningNote({})).toBeNull();
      expect(duplicateWarningNote({ possibleDuplicates: [] })).toBeNull();
    });

    it('names the single match', () => {
      const note = duplicateWarningNote({ possibleDuplicates: [summary()] });
      expect(note).toContain('duplicates.warningNote');
      expect(note).toContain('Climate March');
    });

    // The plural form matters: with exactly two matches the count is 1, which
    // must not read "and 1 other events".
    it('uses the singular form for exactly two matches', () => {
      const note = duplicateWarningNote({
        possibleDuplicates: [summary(), summary({ id: 'dup-2' })],
      });
      expect(note).toContain('duplicates.warningNoteMany');
      expect(note).toContain('"count":1');
    });

    it('counts the rest when there are several', () => {
      const note = duplicateWarningNote({
        possibleDuplicates: [summary(), summary({ id: 'dup-2' }), summary({ id: 'dup-3' })],
      });
      expect(note).toContain('duplicates.warningNoteMany');
      expect(note).toContain('"count":2');
    });
  });

  // On a recurring series one existing event can clash with several of the submitted
  // dates, so the backend lists it once per date, each with the date it clashed on.
  describe('series matches', () => {
    const NOV_3 = '2026-11-03T18:00:00.000Z';
    const NOV_10 = '2026-11-10T18:00:00.000Z';

    describe('duplicateKey', () => {
      it('keeps one existing event listed for two dates apart', () => {
        const first = summary({ occurrence_start_time: NOV_3 });
        const second = summary({ occurrence_start_time: NOV_10 });

        expect(duplicateKey(first)).not.toBe(duplicateKey(second));
        expect(new Set([first, second].map(duplicateKey)).size).toBe(2);
      });

      it('keeps two events apart on the same date', () => {
        expect(duplicateKey(summary({ id: 'a', occurrence_start_time: NOV_3 }))).not.toBe(
          duplicateKey(summary({ id: 'b', occurrence_start_time: NOV_3 }))
        );
      });

      it('is the same for a missing and a null date, which is a single event', () => {
        expect(duplicateKey(summary())).toBe('dup-1-');
        expect(duplicateKey(summary({ occurrence_start_time: null }))).toBe('dup-1-');
      });
    });

    describe('countDistinctDuplicates', () => {
      it('counts events, not rows', () => {
        expect(countDistinctDuplicates([])).toBe(0);
        expect(
          countDistinctDuplicates([
            summary({ occurrence_start_time: NOV_3 }),
            summary({ occurrence_start_time: NOV_10 }),
          ])
        ).toBe(1);
        expect(countDistinctDuplicates([summary(), summary({ id: 'dup-2' })])).toBe(2);
      });
    });

    describe('formatDuplicateYourDate', () => {
      it('is null on a single event', () => {
        expect(formatDuplicateYourDate(summary())).toBeNull();
        expect(formatDuplicateYourDate(summary({ occurrence_start_time: null }))).toBeNull();
        expect(formatDuplicateYourDate(summary({ occurrence_start_time: '' }))).toBeNull();
      });

      // Intl throws on an Invalid Date, and this runs inside the modal's render.
      it('is null instead of throwing on an unparseable date', () => {
        expect(
          formatDuplicateYourDate(summary({ occurrence_start_time: 'not-a-date' }))
        ).toBeNull();
      });

      it('names the date the submitted series clashed on', () => {
        expect(formatDuplicateYourDate(summary({ occurrence_start_time: NOV_3 }))).toBe(
          'duplicates.yourDate:{"date":"Tue 3 Nov"}'
        );
      });

      it('reads the date in Brussels time, not UTC', () => {
        // 23:30 UTC on the 3rd is already the 4th in Brussels.
        expect(
          formatDuplicateYourDate(summary({ occurrence_start_time: '2026-11-03T23:30:00.000Z' }))
        ).toBe('duplicates.yourDate:{"date":"Wed 4 Nov"}');
      });

      it('writes the date in the given language', () => {
        const duplicate = summary({ occurrence_start_time: NOV_3 });

        expect(formatDuplicateYourDate(duplicate, 'fr')).toBe(
          'duplicates.yourDate:{"date":"mar. 3 nov."}'
        );
        expect(formatDuplicateYourDate(duplicate, 'nl')).toBe(
          'duplicates.yourDate:{"date":"di 3 nov"}'
        );
      });
    });

    describe('duplicateWarningNote', () => {
      it('is unchanged on a single event: no dates line', () => {
        expect(duplicateWarningNote({ possibleDuplicates: [summary()] })).toBe(
          'duplicates.warningNote:{"title":"Climate March"}'
        );
        expect(
          duplicateWarningNote({
            possibleDuplicates: [summary(), summary({ id: 'dup-2', occurrence_start_time: null })],
          })
        ).toBe('duplicates.warningNoteMany:{"title":"Climate March","count":1}');
      });

      it('appends the clashing dates after the note, each once and in date order', () => {
        const note = duplicateWarningNote({
          possibleDuplicates: [
            summary({ id: 'a', occurrence_start_time: NOV_10 }),
            summary({ id: 'b', occurrence_start_time: NOV_3 }),
            summary({ id: 'c', occurrence_start_time: NOV_10 }),
          ],
        });

        expect(note).toBe(
          'duplicates.warningNoteMany:{"title":"Climate March","count":2}\n' +
            'duplicates.clashingDates:{"dates":"Tue 3 Nov, Tue 10 Nov"}'
        );
      });

      it('counts one event listed for two dates once, and still lists both dates', () => {
        const note = duplicateWarningNote({
          possibleDuplicates: [
            summary({ occurrence_start_time: NOV_3 }),
            summary({ occurrence_start_time: NOV_10 }),
          ],
        });

        expect(note).toBe(
          'duplicates.warningNote:{"title":"Climate March"}\n' +
            'duplicates.clashingDates:{"dates":"Tue 3 Nov, Tue 10 Nov"}'
        );
      });

      it('lists only the matches that carry a usable date', () => {
        const note = duplicateWarningNote({
          possibleDuplicates: [
            summary({ id: 'a', occurrence_start_time: 'garbage' }),
            summary({ id: 'b', occurrence_start_time: null }),
            summary({ id: 'c', occurrence_start_time: NOV_3 }),
          ],
        });

        expect(note).toContain('duplicates.clashingDates:{"dates":"Tue 3 Nov"}');
        expect(note).not.toContain('garbage');
      });

      it('adds no dates line when no date is usable', () => {
        expect(
          duplicateWarningNote({
            possibleDuplicates: [summary({ occurrence_start_time: 'garbage' })],
          })
        ).toBe('duplicates.warningNote:{"title":"Climate March"}');
      });

      it('writes the dates in the given language', () => {
        const report = { possibleDuplicates: [summary({ occurrence_start_time: NOV_3 })] };

        expect(duplicateWarningNote(report, 'nl')).toContain(
          'duplicates.clashingDates:{"dates":"di 3 nov"}'
        );
      });
    });

    describe('alertWithDuplicateWarning', () => {
      it('puts the clashing dates in the alert, in the user language', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        alertWithDuplicateWarning(
          'common.success',
          'series.messages.created:{"count":3}',
          { possibleDuplicates: [summary({ occurrence_start_time: NOV_3 })] },
          jest.fn(),
          undefined,
          'fr'
        );

        const message = alertSpy.mock.calls[0][1] as string;
        expect(message).toContain('series.messages.created:{"count":3}');
        expect(message).toContain('duplicates.clashingDates:{"dates":"mar. 3 nov."}');
        alertSpy.mockRestore();
      });

      it('shows the plain alert when nothing clashed, whatever the language', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        alertWithDuplicateWarning('common.success', 'message', {}, jest.fn(), undefined, 'fr');

        expect(alertSpy).toHaveBeenCalledWith('common.success', 'message');
        alertSpy.mockRestore();
      });
    });
  });

  describe('alertWithDuplicateWarning', () => {
    it('shows exactly the plain alert when there is no warning', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const onView = jest.fn();

      alertWithDuplicateWarning('common.success', 'alerts.eventCreated', {}, onView);

      expect(alertSpy).toHaveBeenCalledWith('common.success', 'alerts.eventCreated');
      expect(alertSpy.mock.calls[0]).toHaveLength(2);
      alertSpy.mockRestore();
    });

    it('appends the note and offers a button that opens the match', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const onView = jest.fn();
      const match = summary({ relationship: 'other_org' });

      alertWithDuplicateWarning(
        'common.success',
        'alerts.eventCreated',
        { possibleDuplicates: [match] },
        onView
      );

      const [title, message, buttons] = alertSpy.mock.calls[0] as [string, string, any[]];
      expect(title).toBe('common.success');
      expect(message).toContain('alerts.eventCreated');
      expect(message).toContain('duplicates.warningNote');
      expect(buttons[0].text).toBe('duplicates.view');

      buttons[0].onPress();
      expect(onView).toHaveBeenCalledWith(match);

      alertSpy.mockRestore();
    });
  });
});
