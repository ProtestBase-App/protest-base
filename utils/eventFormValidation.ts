import { EVENT_TEXT_LIMITS, TEMPLATE_LIMITS } from '@/constants/EventConfig';
import type {
  EventFormField,
  EventFormIntent,
  EventFormIssue,
  FormState,
} from '@/types/eventForm.types';
import type { RepeatFormState } from '@/types/eventSeries.types';
import type { TemplateEventData } from '@/types/template.types';
import { parseAsUTC } from '@/utils/eventFormatters';
import { getPublishIssues } from '@/utils/eventPublishReadiness';
import { t } from '@/utils/i18n';
import { buildRecurrenceRule, repeatFieldMessage } from '@/utils/recurrence';

/**
 * Whether a website address is worth sending. Anything this accepts, the backend does
 * too: it only prepends https:// and parses. Only http(s), and the hostname needs at
 * least 2 non-empty parts (domain + TLD), which rejects "..." or "domain..com" while
 * accepting "a.io" and long TLDs such as "actie.brussels".
 */
export function isValidEventUrl(url: string): boolean {
  try {
    const urlWithProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostnameParts = parsed.hostname.split('.');
    return hostnameParts.length >= 2 && hostnameParts.every((part) => part.length > 0);
  } catch {
    return false;
  }
}

/**
 * The longest text an input may hold. Android's length filter also cuts text set from
 * state, so an input loaded with older, longer text must not be capped below it: the
 * organizer shortens it after being told, it is never silently cut.
 */
export function inputMaxLength(limit: number, value: string | null | undefined): number {
  return Math.max(limit, value?.length ?? 0);
}

/** The backend refuses a template whose serialized `event_data` passes this length. */
export function isTemplateDataTooLong(eventData: TemplateEventData): boolean {
  return JSON.stringify(eventData).length > TEMPLATE_LIMITS.eventData;
}

/** Top to bottom, as the form lays them out: a refused submit jumps to the first one. */
const FIELD_LABEL_KEYS: Record<EventFormField, string> = {
  organization: 'createEvent.organization',
  template_name: 'template.nameLabel',
  title: 'createEvent.title',
  description: 'createEvent.description',
  categories: 'createEvent.category',
  start_time: 'createEvent.startTime',
  end_time: 'createEvent.endTime',
  start_local: 'series.repeat.startTime',
  end_local: 'series.repeat.endTime',
  starts_on: 'series.repeat.startsOn',
  until: 'series.repeat.untilLabel',
  count: 'series.repeat.countLabel',
  website_url: 'createEvent.eventLink',
  help_description: 'createEvent.volunteerRoles',
  disclaimer: 'createEvent.disclaimer',
};

const FORM_ORDER = Object.keys(FIELD_LABEL_KEYS) as EventFormField[];

export interface EventFormCheck {
  intent: EventFormIntent;
  /** The organization a create screen would use. Left out where the form has none to pick. */
  organizationId?: string;
  /** A form that repeats: the rule replaces the start and end. */
  repeat?: RepeatFormState | null;
  /** A new draft: the backend wants a description and a start until it takes title-only ones. */
  requireDraftContent?: boolean;
  /** A draft already on the server. Publishing it asks what the drafts list asks, no more. */
  existingDraft?: boolean;
  templateName?: string;
  now?: Date;
}

function endsBeforeStart({ start_time, end_time }: FormState): boolean {
  if (!start_time || !end_time) return false;
  return parseAsUTC(end_time).getTime() < parseAsUTC(start_time).getTime();
}

/**
 * Everything standing in the way of a submit, in form order.
 *
 * Publishing asks for what `getPublishIssues` asks for, the drafts list's own check.
 * Saving a live event skips it: the event may have started. An existing draft keeps
 * what the server already took, so only what is filled in is checked.
 */
export function validateEventForm(form: FormState, check: EventFormCheck): EventFormIssue[] {
  const { intent, organizationId, repeat, requireDraftContent, existingDraft, templateName, now } =
    check;
  const isTemplate = intent === 'saveTemplate';
  const messages = new Map<EventFormField, string>();

  if (organizationId === '') messages.set('organization', t('createEvent.organizationRequired'));

  if (isTemplate) {
    if (!templateName?.trim()) messages.set('template_name', t('template.nameMissing'));
  } else if (!form.title.trim()) {
    messages.set('title', t('createEvent.titleRequired'));
  }

  if (intent === 'publish') {
    for (const issue of getPublishIssues(form, now)) {
      // The rule's own checks below cover a series' dates.
      if (repeat && issue.field === 'start_time') continue;
      messages.set(issue.field as EventFormField, t(issue.messageKey));
    }
  } else if (intent === 'saveEdit' || requireDraftContent) {
    if (!form.description.trim()) messages.set('description', t('drafts.issueDescription'));
    if (!repeat && !form.start_time) {
      messages.set('start_time', t('createEvent.startTimeRequired'));
    }
  }

  if (repeat) {
    for (const field of buildRecurrenceRule(repeat).errors) {
      messages.set(field, repeatFieldMessage(field));
    }
  } else if (endsBeforeStart(form)) {
    messages.set('end_time', t('eventEdit.invalidTimeRangeError'));
  }

  const websiteUrl = form.website_url?.trim();
  if (!isTemplate && websiteUrl) {
    if (!isValidEventUrl(websiteUrl)) {
      messages.set('website_url', t('createEvent.invalidUrlFormat'));
    } else if (websiteUrl.length > EVENT_TEXT_LIMITS.websiteUrl) {
      messages.set(
        'website_url',
        t('createEvent.linkTooLong', { max: EVENT_TEXT_LIMITS.websiteUrl })
      );
    }
  }

  if (form.help_needed) {
    const helpDescription = form.help_description?.trim() ?? '';
    if (!helpDescription && intent !== 'saveDraft' && !existingDraft) {
      messages.set('help_description', t('template.volunteerDescMissing'));
    } else if (helpDescription.length > EVENT_TEXT_LIMITS.helpDescription) {
      messages.set(
        'help_description',
        t('createEvent.volunteerTooLong', { max: EVENT_TEXT_LIMITS.helpDescription })
      );
    }
  }

  if ((form.disclaimer ?? '').trim().length > EVENT_TEXT_LIMITS.disclaimer) {
    messages.set(
      'disclaimer',
      t('createEvent.disclaimerTooLong', { max: EVENT_TEXT_LIMITS.disclaimer })
    );
  }

  return FORM_ORDER.flatMap((field) => {
    const message = messages.get(field);
    if (!message) return [];
    // Some labels are the form's, with its required mark.
    return [{ field, message, label: t(FIELD_LABEL_KEYS[field]).replace(/\s*\*$/, '') }];
  });
}

/** The heading of the issue summary. */
export function issueSummaryTitle(intent: EventFormIntent, count: number): string {
  return t(
    intent === 'publish' ? 'createEvent.fixBeforePublishing' : 'createEvent.fixBeforeSaving',
    {
      count,
    }
  );
}
