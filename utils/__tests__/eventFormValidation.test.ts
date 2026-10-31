jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
  ),
}));

import { EVENT_TEXT_LIMITS, TEMPLATE_LIMITS } from '@/constants/EventConfig';
import type { EventFormIssue, FormState } from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import {
  inputMaxLength,
  issueSummaryTitle,
  isTemplateDataTooLong,
  isValidEventUrl,
  validateEventForm,
} from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';

describe('isValidEventUrl', () => {
  it.each([
    'example.com',
    'a.io',
    'https://example.com/path?x=1',
    'http://example.com',
    'www.example.com',
    // Long TLDs: the regex this replaced refused these on the edit screens.
    'actie.brussels',
    'my.vlaanderen',
    'https://actie.brussels/nl',
  ])('accepts %s', (url) => {
    expect(isValidEventUrl(url)).toBe(true);
  });

  it.each(['not a url', 'localhost', '...', 'domain..com', 'ftp://example.com', ''])(
    'refuses %j',
    (url) => {
      expect(isValidEventUrl(url)).toBe(false);
    }
  );
});

describe('inputMaxLength', () => {
  it('uses the limit for shorter text', () => {
    expect(inputMaxLength(500, 'short')).toBe(500);
  });

  it('makes room for older text over the limit, so it is never cut', () => {
    expect(inputMaxLength(500, 'x'.repeat(800))).toBe(800);
  });

  it('treats missing text as empty', () => {
    expect(inputMaxLength(500, null)).toBe(500);
    expect(inputMaxLength(500, undefined)).toBe(500);
  });
});

describe('isTemplateDataTooLong', () => {
  it('accepts event data at the serialized limit', () => {
    const wrapper = JSON.stringify({ description: '' }).length;
    const description = 'x'.repeat(TEMPLATE_LIMITS.eventData - wrapper);

    expect(isTemplateDataTooLong({ description })).toBe(false);
  });

  it('refuses event data past the serialized limit', () => {
    const wrapper = JSON.stringify({ description: '' }).length;
    const description = 'x'.repeat(TEMPLATE_LIMITS.eventData - wrapper + 1);

    expect(isTemplateDataTooLong({ description })).toBe(true);
  });

  it('counts escaping, as the server does', () => {
    // 8,000 characters of description fit the field but not once each newline is escaped.
    expect(isTemplateDataTooLong({ description: '\n'.repeat(8000) })).toBe(true);
  });
});

describe('validateEventForm', () => {
  const NOW = new Date('2026-11-01T12:00:00.000Z');

  const filled: FormState = {
    organization_id: 'org-1',
    title: 'Rally',
    description: 'For affordable housing',
    images: [],
    street_address: '',
    city: '',
    region: '',
    country: '',
    start_time: '2099-01-02T10:00:00.000Z',
    end_time: '',
    organizer_name: '',
    website_url: '',
    categories: 'protest',
    disclaimer: '',
    postal_code: null,
    co_organizers: [],
    help_needed: false,
    help_description: '',
    geocod_lat: null,
    geocod_lng: null,
  };

  const repeat: RepeatFormState = {
    frequency: 'weekly',
    weekday: 'monday',
    weekOfMonth: 1,
    startLocal: '19:00',
    endLocal: '',
    startsOn: '2099-01-05',
    endMode: 'count',
    until: '',
    count: '4',
  };

  const fields = (issues: EventFormIssue[]) => issues.map((issue) => issue.field);
  const messageOf = (issues: EventFormIssue[], field: EventFormIssue['field']) =>
    issues.find((issue) => issue.field === field)?.message;

  describe('publish', () => {
    it('passes a complete form', () => {
      expect(validateEventForm(filled, { intent: 'publish', now: NOW })).toEqual([]);
    });

    it('lists everything missing at once, in the order of the form', () => {
      const issues = validateEventForm(
        { ...filled, title: ' ', description: ' ', categories: '', start_time: '' },
        { intent: 'publish', organizationId: '', now: NOW }
      );

      expect(fields(issues)).toEqual([
        'organization',
        'title',
        'description',
        'categories',
        'start_time',
      ]);
    });

    it('gives each issue the name of its field and what to do', () => {
      const [issue] = validateEventForm(
        { ...filled, description: '' },
        {
          intent: 'publish',
          now: NOW,
        }
      );

      expect(issue).toEqual({
        field: 'description',
        label: 'createEvent.description',
        message: 'drafts.issueDescription',
      });
    });

    it('refuses a start in the past', () => {
      const issues = validateEventForm(
        { ...filled, start_time: '2026-10-31T10:00:00.000Z' },
        { intent: 'publish', now: NOW }
      );

      expect(messageOf(issues, 'start_time')).toBe('drafts.issueStartTime');
    });

    it('wants volunteer text once the toggle is on', () => {
      const issues = validateEventForm(
        { ...filled, help_needed: true, help_description: '  ' },
        { intent: 'publish', now: NOW }
      );

      expect(messageOf(issues, 'help_description')).toBe('template.volunteerDescMissing');
    });
  });

  describe('publishing a draft that already exists', () => {
    const ticked = { ...filled, help_needed: true, help_description: '' };

    it('asks no more than the drafts list does', () => {
      expect(
        validateEventForm(ticked, { intent: 'publish', existingDraft: true, now: NOW })
      ).toEqual([]);
    });

    it('still caps the volunteer text', () => {
      const long = {
        ...ticked,
        help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1),
      };

      expect(
        fields(validateEventForm(long, { intent: 'publish', existingDraft: true, now: NOW }))
      ).toEqual(['help_description']);
    });
  });

  describe('saving a live event', () => {
    it('leaves a start that has passed alone: the event may have started', () => {
      expect(
        validateEventForm(
          { ...filled, start_time: '2026-10-31T10:00:00.000Z' },
          {
            intent: 'saveEdit',
            now: NOW,
          }
        )
      ).toEqual([]);
    });

    it('lets an older event without a category be saved', () => {
      expect(validateEventForm({ ...filled, categories: '' }, { intent: 'saveEdit' })).toEqual([]);
    });

    it('still wants a title, a description and a start', () => {
      const issues = validateEventForm(
        { ...filled, title: '', description: '', start_time: '' },
        { intent: 'saveEdit' }
      );

      expect(fields(issues)).toEqual(['title', 'description', 'start_time']);
    });

    it('never asks for an organization: the event has one', () => {
      expect(validateEventForm(filled, { intent: 'saveEdit' })).toEqual([]);
    });
  });

  describe('saving a draft', () => {
    it('asks a new draft for a description and a start, as the backend does', () => {
      const issues = validateEventForm(
        { ...filled, description: '', start_time: '' },
        { intent: 'saveDraft', requireDraftContent: true }
      );

      expect(fields(issues)).toEqual(['description', 'start_time']);
    });

    it('does not ask once the backend takes title-only drafts', () => {
      const issues = validateEventForm(
        { ...filled, description: '', start_time: '', categories: '' },
        { intent: 'saveDraft', requireDraftContent: false }
      );

      expect(issues).toEqual([]);
    });

    it('checks only what is filled in on a draft that already exists', () => {
      const issues = validateEventForm(
        { ...filled, description: '', start_time: '', website_url: 'not a url' },
        { intent: 'saveDraft' }
      );

      expect(fields(issues)).toEqual(['website_url']);
    });

    it('always wants a title', () => {
      expect(fields(validateEventForm({ ...filled, title: '' }, { intent: 'saveDraft' }))).toEqual([
        'title',
      ]);
    });

    it('does not ask for volunteer text yet, but still caps it', () => {
      const empty = { ...filled, help_needed: true, help_description: '' };
      expect(validateEventForm(empty, { intent: 'saveDraft' })).toEqual([]);

      const long = {
        ...empty,
        help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1),
      };
      expect(fields(validateEventForm(long, { intent: 'saveDraft' }))).toEqual([
        'help_description',
      ]);
    });
  });

  describe('a template', () => {
    const template = { ...filled, title: '', description: '', categories: '', start_time: '' };

    it('wants a name and an organization, and nothing else of the event', () => {
      const issues = validateEventForm(template, {
        intent: 'saveTemplate',
        organizationId: '',
        templateName: '  ',
      });

      expect(fields(issues)).toEqual(['organization', 'template_name']);
    });

    it('leaves a link for the event to check', () => {
      expect(
        validateEventForm(
          { ...template, website_url: 'not a url' },
          { intent: 'saveTemplate', templateName: 'Weekly' }
        )
      ).toEqual([]);
    });

    it('holds its text to what an event could use', () => {
      const issues = validateEventForm(
        { ...template, disclaimer: 'x'.repeat(EVENT_TEXT_LIMITS.disclaimer + 1) },
        { intent: 'saveTemplate', templateName: 'Weekly' }
      );

      expect(fields(issues)).toEqual(['disclaimer']);
    });

    it('drops the required mark from a field name', () => {
      (t as jest.Mock).mockImplementationOnce((key: string) => key);
      (t as jest.Mock).mockImplementationOnce(() => 'Template Name *');

      const [issue] = validateEventForm(template, { intent: 'saveTemplate' });

      expect(issue.label).toBe('Template Name');
    });
  });

  describe('dates', () => {
    it('refuses an end before the start', () => {
      const issues = validateEventForm(
        { ...filled, end_time: '2099-01-02T09:00:00.000Z' },
        { intent: 'publish', now: NOW }
      );

      expect(messageOf(issues, 'end_time')).toBe('eventEdit.invalidTimeRangeError');
    });

    it('accepts an end at the start', () => {
      expect(
        validateEventForm({ ...filled, end_time: filled.start_time }, { intent: 'saveEdit' })
      ).toEqual([]);
    });

    it('compares moments, not the way they are written', () => {
      // Later as text, an hour earlier as a moment.
      const issues = validateEventForm(
        { ...filled, end_time: '2099-01-02T11:00:00+02:00' },
        { intent: 'saveEdit' }
      );

      expect(fields(issues)).toEqual(['end_time']);
    });

    it('reads a value with no zone as UTC, as the rest of the app does', () => {
      expect(
        validateEventForm({ ...filled, end_time: '2099-01-02T10:30:00' }, { intent: 'saveEdit' })
      ).toEqual([]);
    });
  });

  describe('a series', () => {
    it('lets the rule stand in for the start', () => {
      expect(
        validateEventForm({ ...filled, start_time: '' }, { intent: 'publish', repeat, now: NOW })
      ).toEqual([]);
    });

    it('swaps the missing start for what is wrong with the rule', () => {
      const issues = validateEventForm(
        { ...filled, start_time: '' },
        { intent: 'publish', repeat: { ...repeat, startLocal: '', count: '' }, now: NOW }
      );

      expect(fields(issues)).toEqual(['start_local', 'count']);
      expect(messageOf(issues, 'start_local')).toBe('series.repeat.errors.startLocal');
    });

    it('holds a draft series to the same rule', () => {
      const issues = validateEventForm(
        { ...filled, start_time: '' },
        { intent: 'saveDraft', repeat: { ...repeat, count: '' } }
      );

      expect(fields(issues)).toEqual(['count']);
    });

    it('does not compare the single-event end, which is not sent', () => {
      const issues = validateEventForm(
        { ...filled, end_time: '2099-01-02T09:00:00.000Z' },
        { intent: 'publish', repeat, now: NOW }
      );

      expect(issues).toEqual([]);
    });
  });

  describe('text limits', () => {
    it('accepts text at the limit', () => {
      expect(
        validateEventForm(
          {
            ...filled,
            disclaimer: 'x'.repeat(EVENT_TEXT_LIMITS.disclaimer),
            help_needed: true,
            help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription),
          },
          { intent: 'saveEdit' }
        )
      ).toEqual([]);
    });

    it('refuses a disclaimer over the limit', () => {
      const issues = validateEventForm(
        { ...filled, disclaimer: 'x'.repeat(EVENT_TEXT_LIMITS.disclaimer + 1) },
        { intent: 'saveEdit' }
      );

      expect(messageOf(issues, 'disclaimer')).toBe(
        `createEvent.disclaimerTooLong:{"max":${EVENT_TEXT_LIMITS.disclaimer}}`
      );
    });

    it('refuses volunteer text over the limit', () => {
      const issues = validateEventForm(
        {
          ...filled,
          help_needed: true,
          help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1),
        },
        { intent: 'saveEdit' }
      );

      expect(messageOf(issues, 'help_description')).toBe(
        `createEvent.volunteerTooLong:{"max":${EVENT_TEXT_LIMITS.helpDescription}}`
      );
    });

    it('ignores volunteer text once the toggle is off, because it is not sent', () => {
      expect(
        validateEventForm(
          { ...filled, help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1) },
          { intent: 'saveEdit' }
        )
      ).toEqual([]);
    });

    it('measures the trimmed text, as sent', () => {
      expect(
        validateEventForm(
          { ...filled, disclaimer: `${'x'.repeat(EVENT_TEXT_LIMITS.disclaimer)}   ` },
          { intent: 'saveEdit' }
        )
      ).toEqual([]);
    });

    it('survives a missing volunteer text', () => {
      const issues = validateEventForm(
        { ...filled, help_needed: true, help_description: null },
        { intent: 'saveEdit' }
      );

      expect(fields(issues)).toEqual(['help_description']);
    });

    it('refuses a link that is not one', () => {
      const issues = validateEventForm(
        { ...filled, website_url: 'not a url' },
        { intent: 'saveEdit' }
      );

      expect(messageOf(issues, 'website_url')).toBe('createEvent.invalidUrlFormat');
    });

    it('tells the organizer about an older link over the limit', () => {
      const issues = validateEventForm(
        {
          ...filled,
          website_url: `https://example.com/${'x'.repeat(EVENT_TEXT_LIMITS.websiteUrl)}`,
        },
        { intent: 'saveEdit' }
      );

      expect(messageOf(issues, 'website_url')).toBe(
        `createEvent.linkTooLong:{"max":${EVENT_TEXT_LIMITS.websiteUrl}}`
      );
    });
  });
});

describe('issueSummaryTitle', () => {
  it('speaks of publishing when that is what was refused', () => {
    expect(issueSummaryTitle('publish', 2)).toBe('createEvent.fixBeforePublishing:{"count":2}');
  });

  it.each(['saveEdit', 'saveDraft', 'saveTemplate'] as const)(
    'speaks of saving for %s',
    (intent) => {
      expect(issueSummaryTitle(intent, 1)).toBe('createEvent.fixBeforeSaving:{"count":1}');
    }
  );
});
