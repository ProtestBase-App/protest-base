/**
 * Network Error Detection
 *
 * Identifies axios network/timeout errors so callers can distinguish
 * "backend unreachable" from "backend returned an error".
 */

import axios from 'axios';

/**
 * Returns true when the error indicates a network-level failure
 * (timeout, DNS, no internet) rather than an HTTP error response.
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    (!error.response && !!error.request) ||
    error.message === 'Network Error'
  );
}
