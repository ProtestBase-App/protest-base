jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
  ),
}));

import { EVENT_TEXT_LIMITS, TEMPLATE_LIMITS } from '@/constants/EventConfig';
import {
  inputMaxLength,
  isTemplateDataTooLong,
  isValidEventUrl,
  textLimitMessage,
} from '@/utils/eventFormValidation';

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

describe('textLimitMessage', () => {
  const withinLimits = { disclaimer: '', help_needed: false, help_description: '' };

  it('accepts text at the limit', () => {
    expect(
      textLimitMessage({
        disclaimer: 'x'.repeat(EVENT_TEXT_LIMITS.disclaimer),
        help_needed: true,
        help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription),
      })
    ).toBeNull();
  });

  it('refuses a disclaimer over the limit', () => {
    expect(
      textLimitMessage({
        ...withinLimits,
        disclaimer: 'x'.repeat(EVENT_TEXT_LIMITS.disclaimer + 1),
      })
    ).toBe(`createEvent.disclaimerTooLong:{"max":${EVENT_TEXT_LIMITS.disclaimer}}`);
  });

  it('refuses volunteer text over the limit', () => {
    expect(
      textLimitMessage({
        ...withinLimits,
        help_needed: true,
        help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1),
      })
    ).toBe(`createEvent.volunteerTooLong:{"max":${EVENT_TEXT_LIMITS.helpDescription}}`);
  });

  it('ignores volunteer text once the toggle is off, because it is not sent', () => {
    expect(
      textLimitMessage({
        ...withinLimits,
        help_needed: false,
        help_description: 'x'.repeat(EVENT_TEXT_LIMITS.helpDescription + 1),
      })
    ).toBeNull();
  });

  it('measures the trimmed text, as sent', () => {
    expect(
      textLimitMessage({
        ...withinLimits,
        disclaimer: `${'x'.repeat(EVENT_TEXT_LIMITS.disclaimer)}   `,
      })
    ).toBeNull();
  });

  it('survives a missing volunteer text', () => {
    expect(textLimitMessage({ ...withinLimits, help_needed: true, help_description: null })).toBe(
      null
    );
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
