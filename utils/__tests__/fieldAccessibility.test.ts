jest.mock('@/utils/i18n', () => ({ t: (key: string) => key }));

import { Platform } from 'react-native';

import { fieldAccessibilityLabel, inputAccessibilityLabel } from '@/utils/fieldAccessibility';

describe('fieldAccessibilityLabel', () => {
  it('reads the required mark as a word', () => {
    expect(fieldAccessibilityLabel('Title *')).toBe('Title, a11y.required');
  });

  it('keeps an optional title as it is', () => {
    expect(fieldAccessibilityLabel('Event Link (Optional)')).toBe('Event Link (Optional)');
  });

  it('says what is wrong in place of the required word', () => {
    expect(fieldAccessibilityLabel('Title *', 'Add a title')).toBe('Title: Add a title');
  });

  it('falls back to the error for a field with no title', () => {
    expect(fieldAccessibilityLabel(null, 'Add a title')).toBe('Add a title');
    expect(fieldAccessibilityLabel(null)).toBeUndefined();
  });
});

describe('inputAccessibilityLabel', () => {
  const realOS = Platform.OS;

  afterEach(() => {
    Platform.OS = realOS;
  });

  it('names the input on iOS', () => {
    Platform.OS = 'ios';
    expect(inputAccessibilityLabel('Title *')).toBe('Title, a11y.required');
  });

  it('leaves it to the placeholder on Android, so TalkBack still reads what was typed', () => {
    Platform.OS = 'android';
    expect(inputAccessibilityLabel('Title *', 'Add a title')).toBeUndefined();
  });
});
