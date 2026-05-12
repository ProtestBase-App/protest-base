// Mock dependencies before imports
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: { share: jest.fn() },
  Alert: { alert: jest.fn() },
}));

jest.mock('../eventFormatters', () => ({
  formatEventForList: jest.fn((event) => ({
    $id: event.$id,
    id: event.$id,
    title: event.title,
    description: event.description,
    city: event.city || '',
    image: event.image || '',
    start_time: 'Monday 14/07 - 14:30',
    startDateNoFormat: '2025-07-14',
    categories: event.categories || [],
  })),
}));

import { shareEvent, shareEventWithAlert } from '../shareHelpers';
import { Share, Platform, Alert } from 'react-native';
import { Event } from '@/services/event.service';

describe('shareHelpers', () => {
  const mockEvent: Event = {
    $id: 'event123',
    id: 'event123',
    title: 'Test Protest Event',
    description: 'A test event',
    start_time: '2025-07-14T14:30:00Z',
    end_time: undefined,
    image: 'https://example.com/image.jpg',
    street_address: '123 Main St',
    city: 'Brussels',
    region: 'Brussels-Capital',
    country: 'Belgium',
    organizer_id: 'org123',
    organizer_name: 'Test Organizer',
    website_url: null,
    categories: ['climate'],
    disclaimer: null,
    postal_code: 1000,
    geocod_status: null,
    geocod_lat: null,
    geocod_lng: null,
    co_organizers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to iOS
    (Platform as any).OS = 'ios';
  });

  describe('shareEvent', () => {
    describe('Successful sharing', () => {
      it('should share event successfully on iOS', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        (Platform as any).OS = 'ios';

        const result = await shareEvent({ event: mockEvent, userLanguage: 'en' });

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(Share.share).toHaveBeenCalledTimes(1);
      });

      it('should include title in share options on iOS', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        (Platform as any).OS = 'ios';

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        expect(Share.share).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Protest Event',
          })
        );
      });

      it('should NOT include title in share options on Android', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        (Platform as any).OS = 'android';

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.title).toBeUndefined();
      });

      it('should include URL in message on Android', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        (Platform as any).OS = 'android';

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('https://protestbase.be/event/event123');
        expect(shareCall.message).toContain('🔗');
      });

      it('should NOT include URL in message on iOS', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        (Platform as any).OS = 'ios';

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).not.toContain('🔗 https://');
        // URL should still be in the url property
        expect(shareCall.url).toBe('https://protestbase.be/event/event123');
      });

      it('should use custom universal link base', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({
          event: mockEvent,
          universalLinkBase: 'https://custom-domain.com',
          userLanguage: 'en',
        });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.url).toBe('https://custom-domain.com/event/event123');
      });
    });

    describe('Message content and localization', () => {
      it('should include event title with emoji', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('📣 Test Protest Event');
      });

      it('should include formatted event time', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('📅 Monday 14/07 - 14:30');
      });

      it('should include location when cityLabel and postal_code are provided', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({
          event: mockEvent,
          userLanguage: 'en',
          cityLabel: 'Brussels',
        });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('📍 Brussels, 1000');
      });

      it('should include only postal_code when cityLabel is not provided', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('📍 1000');
        expect(shareCall.message).not.toContain('Brussels');
      });

      it('should not include location line when postal_code is missing', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});
        const eventWithoutPostal = { ...mockEvent, postal_code: null };

        await shareEvent({ event: eventWithoutPostal, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).not.toContain('📍');
      });

      it('should use English CTA for English locale', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'en' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('Join this event on ProtestBase!');
      });

      it('should use French CTA for French locale', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'fr' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('Rejoignez cet événement sur ProtestBase !');
      });

      it('should use Dutch CTA for Dutch locale', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'nl' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('Doe mee aan dit evenement op ProtestBase!');
      });

      it('should default to English CTA for unsupported locale', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent, userLanguage: 'es' });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('Join this event on ProtestBase!');
      });
    });

    describe('Error handling', () => {
      it('should return error when event is missing', async () => {
        const result = await shareEvent({ event: null as any, userLanguage: 'en' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Event not found or incomplete data.');
        expect(Share.share).not.toHaveBeenCalled();
      });

      it('should return error when event title is missing', async () => {
        const eventWithoutTitle = { ...mockEvent, title: '' };
        const result = await shareEvent({ event: eventWithoutTitle, userLanguage: 'en' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Event not found or incomplete data.');
        expect(Share.share).not.toHaveBeenCalled();
      });

      it('should return error when event $id is missing', async () => {
        const eventWithoutId = { ...mockEvent, $id: '' };
        const result = await shareEvent({ event: eventWithoutId, userLanguage: 'en' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Event not found or incomplete data.');
        expect(Share.share).not.toHaveBeenCalled();
      });

      it('should handle user cancellation gracefully', async () => {
        (Share.share as jest.Mock).mockRejectedValue(new Error('User did not share'));

        const result = await shareEvent({ event: mockEvent, userLanguage: 'en' });

        expect(result.success).toBe(true); // User cancellation is not an error
        expect(result.error).toBeUndefined();
      });

      it('should return error for other share failures', async () => {
        (Share.share as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await shareEvent({ event: mockEvent, userLanguage: 'en' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to share event. Please try again.');
      });
    });

    describe('Default values', () => {
      it('should use default universalLinkBase', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.url).toBe('https://protestbase.be/event/event123');
      });

      it('should use default userLanguage (en)', async () => {
        (Share.share as jest.Mock).mockResolvedValue({});

        await shareEvent({ event: mockEvent });

        const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
        expect(shareCall.message).toContain('Join this event on ProtestBase!');
      });
    });
  });

  describe('shareEventWithAlert', () => {
    it('should call shareEvent and not show alert on success', async () => {
      (Share.share as jest.Mock).mockResolvedValue({});

      await shareEventWithAlert(mockEvent, 'en');

      expect(Share.share).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should show alert on error', async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error('Share failed'));

      await shareEventWithAlert(mockEvent, 'en');

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to share event. Please try again.');
    });

    it('should not show alert on user cancellation', async () => {
      (Share.share as jest.Mock).mockRejectedValue(new Error('User did not share'));

      await shareEventWithAlert(mockEvent, 'en');

      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should pass cityLabel to shareEvent', async () => {
      (Share.share as jest.Mock).mockResolvedValue({});

      await shareEventWithAlert(mockEvent, 'en', 'Brussels');

      const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
      expect(shareCall.message).toContain('📍 Brussels, 1000');
    });

    it('should use default language when not provided', async () => {
      (Share.share as jest.Mock).mockResolvedValue({});

      await shareEventWithAlert(mockEvent);

      const shareCall = (Share.share as jest.Mock).mock.calls[0][0];
      expect(shareCall.message).toContain('Join this event on ProtestBase!');
    });

    it('should show alert for validation errors', async () => {
      const invalidEvent = { ...mockEvent, title: '' };

      await shareEventWithAlert(invalidEvent, 'en');

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Event not found or incomplete data.');
    });
  });
});
