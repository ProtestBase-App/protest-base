import { Share, Platform, Alert } from 'react-native';
import { Event } from '@/services/event.service';
import { formatEventForList } from './eventFormatters';
import { logger } from '@/utils/logger';

interface ShareEventConfig {
  event: Event;
  universalLinkBase?: string;
  userLanguage?: string;
  cityLabel?: string;
}

interface ShareResult {
  success: boolean;
  error?: string;
}

interface ShareStrings {
  cta: string;
  ctaCancelled: string;
  ctaPast: string;
  errorTitle: string;
  eventNotFound: string;
  shareFailed: string;
}

function getShareStrings(language: string): ShareStrings {
  const strings: Record<string, ShareStrings> = {
    en: {
      cta: 'Join this event on ProtestBase!',
      ctaCancelled: '❌ This event has been cancelled.',
      ctaPast: '🕒 This event has already taken place.',
      errorTitle: 'Error',
      eventNotFound: 'Event not found or incomplete data.',
      shareFailed: 'Failed to share event. Please try again.',
    },
    fr: {
      cta: 'Rejoignez cet événement sur ProtestBase !',
      ctaCancelled: '❌ Cet événement a été annulé.',
      ctaPast: '🕒 Cet événement a déjà eu lieu.',
      errorTitle: 'Erreur',
      eventNotFound: 'Événement introuvable ou données incomplètes.',
      shareFailed: "Échec du partage de l'événement. Veuillez réessayer.",
    },
    nl: {
      cta: 'Doe mee aan dit evenement op ProtestBase!',
      ctaCancelled: '❌ Dit evenement is geannuleerd.',
      ctaPast: '🕒 Dit evenement heeft al plaatsgevonden.',
      errorTitle: 'Fout',
      eventNotFound: 'Evenement niet gevonden of onvolledige gegevens.',
      shareFailed: 'Delen van evenement mislukt. Probeer het opnieuw.',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Generate a share message for an event
 *
 * The URL is always included in the message text: on iOS, share targets like
 * Signal and Telegram only consume the text activity item and drop the
 * separate `url` property, so the link must travel in the text itself.
 * Merge-style targets (iMessage, Mail) may show the URL twice — accepted
 * tradeoff for the link never being lost.
 */
function createShareMessage(
  event: Event,
  universalLink: string,
  userLanguage: string,
  cityLabel?: string
): string {
  const formattedEvent = formatEventForList(event, userLanguage);
  const shareStrings = getShareStrings(userLanguage);

  const locationLine =
    cityLabel && event.postal_code
      ? `📍 ${cityLabel}, ${event.postal_code}`
      : event.postal_code
        ? `📍 ${event.postal_code}`
        : '';

  const eventDetails = `📣 ${event.title}\n\n📅 ${formattedEvent.start_time}${
    locationLine ? `\n${locationLine}` : ''
  }`;

  // Cancelled/past events stay shareable (the link spreads the word), but the
  // "join" CTA would be misleading — swap it for a status note.
  const cta =
    event.status === 'cancelled'
      ? shareStrings.ctaCancelled
      : event.status === 'past'
        ? shareStrings.ctaPast
        : shareStrings.cta;

  return `${eventDetails}\n\n${cta}\n\n🔗 ${universalLink}`;
}

interface ShareContent {
  message: string;
  url: string;
  // iOS only — shows in the share sheet header.
  title?: string;
}

/**
 * Share an event using the native share sheet
 *
 * The URL is always in the message text (see createShareMessage). On iOS the
 * separate `url` and `title` properties are also set: `url` powers the share
 * sheet header preview and system actions (Copy, AirDrop, Reading List);
 * Android ignores both.
 *
 * Enhanced for optimal sharing experience on:
 * - WhatsApp: Rich preview with OG tags from website
 * - Instagram: Link sticker preview in Stories, rich preview in DMs
 * - TikTok: Plain URL (no rich preview support)
 */
export async function shareEvent(config: ShareEventConfig): Promise<ShareResult> {
  const {
    event,
    universalLinkBase = 'https://protestbase.be',
    userLanguage = 'en',
    cityLabel,
  } = config;

  const shareStrings = getShareStrings(userLanguage);

  if (!event?.title || !event?.$id) {
    return {
      success: false,
      error: shareStrings.eventNotFound,
    };
  }

  try {
    const universalLink = `${universalLinkBase}/event/${event.$id}`;
    const shareMessage = createShareMessage(event, universalLink, userLanguage, cityLabel);

    const shareOptions: ShareContent = {
      message: shareMessage,
      // iOS uses url for rich previews; Android ignores it.
      url: universalLink,
    };

    if (Platform.OS === 'ios') {
      shareOptions.title = event.title;
    }

    await Share.share(shareOptions);

    return { success: true };
  } catch (error: any) {
    // User cancelled — not an error.
    if (error.message === 'User did not share') {
      return { success: true };
    }

    logger.error('Share error:', { error });
    return {
      success: false,
      error: shareStrings.shareFailed,
    };
  }
}

/** Convenience wrapper around shareEvent() that surfaces errors via Alert. */
export async function shareEventWithAlert(
  event: Event,
  userLanguage: string = 'en',
  cityLabel?: string
): Promise<void> {
  const shareStrings = getShareStrings(userLanguage);
  const result = await shareEvent({ event, userLanguage, cityLabel });

  if (!result.success && result.error) {
    Alert.alert(shareStrings.errorTitle, result.error);
  }
}
