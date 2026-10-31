import { Alert } from 'react-native';

import { clearEventDraft, getEventDraft } from '@/services/localStorageService';
import { confirmReplaceDraft } from '@/utils/eventDraftGuard';

jest.mock('@/services/localStorageService', () => ({
  getEventDraft: jest.fn(),
  clearEventDraft: jest.fn().mockResolvedValue(undefined),
}));

describe('confirmReplaceDraft', () => {
  const proceed = jest.fn();
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => alertSpy.mockRestore());

  it('goes straight on when there is nothing to lose', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue(null);

    await confirmReplaceDraft(proceed);

    expect(proceed).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('asks first, and keeps the draft until the answer is yes', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue({ formData: {}, savedAt: 1 });

    await confirmReplaceDraft(proceed);

    expect(proceed).not.toHaveBeenCalled();
    expect(clearEventDraft).not.toHaveBeenCalled();
  });

  it('clears the draft before moving on', async () => {
    (getEventDraft as jest.Mock).mockResolvedValue({ formData: {}, savedAt: 1 });

    await confirmReplaceDraft(proceed);
    const buttons = alertSpy.mock.calls[0][2];
    await buttons[1].onPress();

    expect(clearEventDraft).toHaveBeenCalled();
    expect(proceed).toHaveBeenCalled();
  });
});
