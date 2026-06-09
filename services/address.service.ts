import api from './api';
import type { AddressSuggestion, AddressCountryCode, AddressLang } from '@/types/address.types';
import { isNetworkError } from '@/utils/networkError';
import { logger } from '@/utils/logger';

export type { AddressSuggestion, AddressCountryCode, AddressLang };

/**
 * Classifies a failed address search so the UI can react appropriately:
 * - `unavailable` → Photon down/unconfigured (503) or network/offline: degrade
 *   gracefully ("address search unavailable"); never block saving.
 * - `rate_limited` → the route's per-IP bucket was exceeded (429). The debounce
 *   already throttles requests; surface the same soft "unavailable" copy.
 * - `generic` → anything else (e.g. an unexpected 4xx/5xx).
 */
export type AddressSearchErrorKind = 'unavailable' | 'rate_limited' | 'generic';

export class AddressSearchError extends Error {
  kind: AddressSearchErrorKind;
  constructor(kind: AddressSearchErrorKind, message: string) {
    super(message);
    this.name = 'AddressSearchError';
    this.kind = kind;
  }
}

/** Detect an axios cancellation (from an aborted AbortController) without importing axios. */
function isCanceled(error: unknown): boolean {
  const e = error as { code?: string; name?: string } | null;
  return (
    !!e && (e.code === 'ERR_CANCELED' || e.name === 'CanceledError' || e.name === 'AbortError')
  );
}

/**
 * Search BE/NL addresses via the backend Photon proxy. Mirrors `getEventsBackend`'s
 * GET pattern; the shared Axios interceptor already attaches `Authorization: Bearer`
 * + `X-Install-Token`, so the auth-gated route works with no extra work here.
 *
 * Privacy: the query is never logged (the backend doesn't log it either).
 *
 * @param q          Search text, 3–100 chars (the caller should debounce + gate on ≥3).
 * @param country    Lowercase ISO code selecting the Photon instance ("be" | "nl").
 * @param lang       Optional language hint for returned names.
 * @param postalCode Optional postcode hint. When set, the backend scopes/biases the
 *                   Photon search to it, killing cross-town street-name collisions
 *                   (e.g. "Avenue des Casernes" in Etterbeek vs OLLN/Liège). It is a
 *                   search hint only — never stored — and the backend retries unscoped
 *                   if nothing matches, so it can only help, never return fewer rows.
 * @param signal     Optional AbortSignal so a newer keystroke can cancel this request.
 * @throws {AddressSearchError} classified by `kind`; cancellations re-throw as-is.
 */
export async function searchAddress(
  q: string,
  country: AddressCountryCode,
  lang?: AddressLang,
  postalCode?: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  try {
    const params: Record<string, string> = { q, country };
    if (lang) params.lang = lang;
    if (postalCode) params.postal_code = postalCode;

    const response = await api.get<{ success: boolean; data: AddressSuggestion[] }>(
      '/address/autocomplete',
      { params, signal }
    );

    if (!response.data.success) {
      throw new AddressSearchError('generic', 'Failed to search addresses');
    }

    return response.data.data ?? [];
  } catch (error: any) {
    // Let cancellations propagate untouched so the caller can ignore them.
    if (isCanceled(error)) {
      throw error;
    }
    if (error instanceof AddressSearchError) {
      throw error;
    }

    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Photon unavailable / upstream timeout — surfaced by the backend as 503.
    if (status === 503 || code === 'GEOCODING_UNAVAILABLE') {
      logger.warn('[AddressService] Address search unavailable (503)');
      throw new AddressSearchError('unavailable', 'Address search is temporarily unavailable');
    }

    // The api.ts response interceptor rewrites 429 into a RateLimitError that has
    // `.code === 'RATE_LIMIT_EXCEEDED'` and NO `.response` — so detect by code,
    // not by status (the status check below is a belt-and-suspenders fallback).
    if (error.code === 'RATE_LIMIT_EXCEEDED' || status === 429) {
      logger.warn('[AddressService] Address search rate-limited (429)');
      throw new AddressSearchError('rate_limited', 'Too many requests, please slow down');
    }

    // Offline / DNS / client-side timeout — degrade the same as Photon being down.
    if (isNetworkError(error)) {
      logger.warn('[AddressService] Address search network error');
      throw new AddressSearchError('unavailable', 'Address search is unavailable (network)');
    }

    logger.error('[AddressService] Address search failed', { status, code });
    throw new AddressSearchError(
      'generic',
      error.response?.data?.error || error.message || 'Failed to search addresses'
    );
  }
}
