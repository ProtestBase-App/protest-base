import { EVENT_TEXT_LIMITS, TEMPLATE_LIMITS } from '@/constants/EventConfig';
import type { FormState } from '@/types/eventForm.types';
import type { TemplateEventData } from '@/types/template.types';
import { t } from '@/utils/i18n';

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

/**
 * What is over the server's limit, worded for the organizer, or null. Text can arrive
 * over the limit from a template or an older event, so the input cap alone won't do.
 */
export function textLimitMessage(
  form: Pick<FormState, 'disclaimer' | 'help_needed' | 'help_description'>
): string | null {
  if ((form.disclaimer ?? '').trim().length > EVENT_TEXT_LIMITS.disclaimer) {
    return t('createEvent.disclaimerTooLong', { max: EVENT_TEXT_LIMITS.disclaimer });
  }
  if (
    form.help_needed &&
    (form.help_description ?? '').trim().length > EVENT_TEXT_LIMITS.helpDescription
  ) {
    return t('createEvent.volunteerTooLong', { max: EVENT_TEXT_LIMITS.helpDescription });
  }
  return null;
}

/** The backend refuses a template whose serialized `event_data` passes this length. */
export function isTemplateDataTooLong(eventData: TemplateEventData): boolean {
  return JSON.stringify(eventData).length > TEMPLATE_LIMITS.eventData;
}
