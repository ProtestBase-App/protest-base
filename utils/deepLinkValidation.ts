/**
 * Deep Link Validation Utilities
 *
 * Security module to validate and sanitize deep links to prevent:
 * - Domain spoofing attacks
 * - Path traversal attacks
 * - Protocol injection (javascript:, data:, file:)
 * - XSS injection
 * - Unauthorized navigation
 * - Malformed event IDs
 */

// React Native needs the polyfill; Node.js (tests) has a native URL.
if (typeof jest === 'undefined') {
  require('react-native-url-polyfill/auto');
}

/**
 * Validates event ID format
 * Accepts both UUID v4 format and legacy 20-character hex strings
 * Examples: "a0c99ea8-4e45-42c2-960d-3f7e9b40a65a", "691b875c00055a6a124e"
 */
export function isValidEventId(eventId: string): boolean {
  if (!eventId) {
    return false;
  }

  // UUID v4 (36 chars with dashes).
  const uuidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidPattern.test(eventId)) {
    return true;
  }

  // 20-character hex string (from before the move to UUIDs).
  const hexPattern = /^[0-9a-fA-F]{20}$/;
  return hexPattern.test(eventId);
}

/**
 * Validates and extracts event ID from a deep link path
 * Only accepts paths in the format: /event/{valid-event-id}
 *
 * @param path - The path extracted from the deep link URL
 * @returns The validated event ID, or null if invalid
 */
export function validateEventDeepLink(path: string): string | null {
  if (!path || typeof path !== 'string') {
    return null;
  }

  const cleanPath = path.trim().replace(/^\/+|\/+$/g, '');

  // Must match exactly `event/{id}` — no additional path segments allowed.
  // Accepts UUID v4 (36 chars) or 20-char hex.
  const eventPathPattern =
    /^event\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{20})$/;
  const match = cleanPath.match(eventPathPattern);

  if (!match || !match[1]) {
    return null;
  }

  const eventId = match[1];

  if (!isValidEventId(eventId)) {
    return null;
  }

  return eventId;
}

/**
 * Safely extracts and validates the deep link path from a full URL
 *
 * @param url - The full deep link URL (e.g., "https://protestbase.be/event/691b875c00055a6a124e")
 * @returns Object containing validation result and event ID if valid
 */
export function parseEventDeepLink(url: string): {
  isValid: boolean;
  eventId: string | null;
  error?: string;
} {
  try {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        eventId: null,
        error: 'Invalid URL format',
      };
    }

    // Reject malformed URLs like "https:domain" or "https:/domain".
    if (url.includes(':') && !url.includes('://')) {
      return {
        isValid: false,
        eventId: null,
        error: 'Invalid URL format',
      };
    }

    // Custom schemes are normalized to https for downstream parsing.
    const customSchemeMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.+)$/);

    let urlToParse: string;

    if (customSchemeMatch) {
      const [, scheme, remainder] = customSchemeMatch;
      const schemeLower = scheme.toLowerCase();

      // Block dangerous schemes before any further parsing.
      const dangerousProtocols = ['javascript', 'data', 'file', 'vbscript'];
      if (dangerousProtocols.includes(schemeLower)) {
        return {
          isValid: false,
          eventId: null,
          error: 'Dangerous protocol rejected',
        };
      }

      if (schemeLower === 'http' || schemeLower === 'https') {
        urlToParse = url;
      } else {
        const allowedCustomSchemes = ['protest-base', 'protestbase'];
        if (allowedCustomSchemes.includes(schemeLower)) {
          // For custom schemes, the remainder is the path
          // (e.g. "protestbase://event/abc123" -> "event/abc123").
          urlToParse = `https://protestbase.be/${remainder}`;
        } else {
          return {
            isValid: false,
            eventId: null,
            error: 'Unsupported custom scheme',
          };
        }
      }
    } else {
      urlToParse = url;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlToParse);
    } catch (error) {
      return {
        isValid: false,
        eventId: null,
        error: 'Invalid URL format',
      };
    }

    const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
    if (dangerousProtocols.includes(parsedUrl.protocol.toLowerCase())) {
      return {
        isValid: false,
        eventId: null,
        error: 'Dangerous protocol rejected',
      };
    }

    const allowedHosts = ['protestbase.be', 'www.protestbase.be'];
    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return {
        isValid: false,
        eventId: null,
        error: 'Untrusted domain',
      };
    }

    if (parsedUrl.protocol.toLowerCase() === 'http:') {
      return {
        isValid: false,
        eventId: null,
        error: 'Insecure protocol rejected',
      };
    }

    if (parsedUrl.port) {
      return {
        isValid: false,
        eventId: null,
        error: 'Untrusted domain',
      };
    }

    // Reject query strings and fragments — neither has a legitimate use here,
    // and both expand the attack surface (tracking / client-side manipulation).
    if (parsedUrl.search) {
      return {
        isValid: false,
        eventId: null,
        error: 'Query parameters not allowed',
      };
    }

    if (parsedUrl.hash) {
      return {
        isValid: false,
        eventId: null,
        error: 'URL fragments not allowed',
      };
    }

    const path = parsedUrl.pathname;

    const eventId = validateEventDeepLink(path);

    if (!eventId) {
      return {
        isValid: false,
        eventId: null,
        error: 'Invalid event link format or event ID',
      };
    }

    return {
      isValid: true,
      eventId,
    };
  } catch (error) {
    return {
      isValid: false,
      eventId: null,
      error: 'Error parsing deep link',
    };
  }
}

/**
 * Constructs a safe deep link path for navigation
 *
 * @param eventId - The event ID to create a link for
 * @returns Safe navigation path, or null if event ID is invalid
 */
export function buildEventDeepLinkPath(eventId: string): string | null {
  if (!isValidEventId(eventId)) {
    return null;
  }

  return `/event/${eventId}`;
}
