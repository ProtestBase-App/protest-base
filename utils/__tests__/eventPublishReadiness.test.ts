import {
  getPublishIssues,
  publishFieldToMessageKey,
  PublishReadinessInput,
} from '@/utils/eventPublishReadiness';

// Fixed far-future / far-past dates so the suite doesn't depend on the wall clock.
const FUTURE = '2999-01-01T10:00:00Z';
const PAST = '2000-01-01T10:00:00Z';

const validInput: PublishReadinessInput = {
  description: 'A real description of the event.',
  categories: 'Protest',
  city: 'Brussels',
  street_address: '',
  start_time: FUTURE,
};

const codes = (input: PublishReadinessInput) => getPublishIssues(input).map((i) => i.code);

describe('getPublishIssues', () => {
  it('returns no issues when everything is complete and the date is in the future', () => {
    expect(getPublishIssues(validInput)).toEqual([]);
  });

  it('flags a missing description', () => {
    expect(codes({ ...validInput, description: '   ' })).toContain('DESCRIPTION_REQUIRED');
  });

  it('flags missing categories (empty string and empty array)', () => {
    expect(codes({ ...validInput, categories: '' })).toContain('CATEGORY_REQUIRED');
    expect(codes({ ...validInput, categories: [] })).toContain('CATEGORY_REQUIRED');
    expect(codes({ ...validInput, categories: ['  '] })).toContain('CATEGORY_REQUIRED');
  });

  it('accepts categories as a string or a non-empty array', () => {
    expect(codes({ ...validInput, categories: 'Strike' })).not.toContain('CATEGORY_REQUIRED');
    expect(codes({ ...validInput, categories: ['Strike'] })).not.toContain('CATEGORY_REQUIRED');
  });

  it('flags a missing location when both city and street_address are empty', () => {
    expect(codes({ ...validInput, city: '', street_address: '' })).toContain('LOCATION_REQUIRED');
  });

  it('accepts a location given either city only or street_address only', () => {
    expect(codes({ ...validInput, city: 'Ghent', street_address: '' })).not.toContain(
      'LOCATION_REQUIRED'
    );
    expect(codes({ ...validInput, city: '', street_address: 'Main St 1' })).not.toContain(
      'LOCATION_REQUIRED'
    );
  });

  it('flags a past start_time', () => {
    expect(codes({ ...validInput, start_time: PAST })).toContain('START_TIME_FUTURE_REQUIRED');
  });

  it('flags a missing or empty start_time', () => {
    expect(codes({ ...validInput, start_time: '' })).toContain('START_TIME_FUTURE_REQUIRED');
    expect(codes({ ...validInput, start_time: undefined })).toContain('START_TIME_FUTURE_REQUIRED');
  });

  it('accepts a future start_time', () => {
    expect(codes({ ...validInput, start_time: FUTURE })).not.toContain(
      'START_TIME_FUTURE_REQUIRED'
    );
  });

  it('returns every failure at once for a wholly empty draft', () => {
    const result = codes({});
    expect(result).toEqual(
      expect.arrayContaining([
        'DESCRIPTION_REQUIRED',
        'CATEGORY_REQUIRED',
        'LOCATION_REQUIRED',
        'START_TIME_FUTURE_REQUIRED',
      ])
    );
    expect(result).toHaveLength(4);
  });

  it('attaches an i18n message key to every issue', () => {
    for (const issue of getPublishIssues({})) {
      expect(issue.messageKey).toMatch(/^drafts\.issue/);
    }
  });
});

describe('publishFieldToMessageKey', () => {
  it('maps known backend field names to their message keys', () => {
    expect(publishFieldToMessageKey('description')).toBe('drafts.issueDescription');
    expect(publishFieldToMessageKey('categories')).toBe('drafts.issueCategory');
    expect(publishFieldToMessageKey('city')).toBe('drafts.issueLocation');
    expect(publishFieldToMessageKey('street_address')).toBe('drafts.issueLocation');
    expect(publishFieldToMessageKey('start_time')).toBe('drafts.issueStartTime');
  });

  it('falls back to a generic key for unknown fields', () => {
    expect(publishFieldToMessageKey('something_else')).toBe('drafts.issueIncomplete');
  });
});
