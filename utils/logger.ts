/**
 * Secure logging utility
 *
 * This utility prevents sensitive data from being logged in production builds.
 * In development, it logs full details. In production, it logs NOTHING.
 */

// Check if we're in development mode
// @ts-ignore - __DEV__ is a global in React Native
const isDevelopment =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

interface LogContext {
  [key: string]: any;
}

/**
 * Logger utility
 */
export const logger = {
  /**
   * Log error messages (development only)
   */
  error: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.error(message, context || '');
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.warn(message, context || '');
    }
  },

  /**
   * Log info messages (development only)
   */
  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.log(message, context || '');
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.debug(message, context || '');
    }
  },
};
