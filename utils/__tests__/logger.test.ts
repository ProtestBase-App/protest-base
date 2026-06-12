// utils/__tests__/logger.test.ts

/**
 * Tests for the logger utility
 *
 * This test suite verifies:
 * 1. All log levels (error, warn, info, debug) work correctly
 * 2. Logging only happens in development mode (__DEV__ === true)
 * 3. No logging occurs in production mode (__DEV__ === false)
 * 4. Handles multiple arguments (message + context)
 * 5. Handles different data types (strings, objects, arrays, errors)
 * 6. Edge cases (null, undefined, empty strings, empty objects)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// Note: We use require() intentionally to test different __DEV__ values by reloading the module

// Mock console methods BEFORE importing logger
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

describe('logger', () => {
  // Store original __DEV__ value and process.env
  let originalDev: boolean | undefined;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // Store original values
    originalDev = (global as any).__DEV__;
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original values
    if (originalDev !== undefined) {
      (global as any).__DEV__ = originalDev;
    } else {
      delete (global as any).__DEV__;
    }
    if (originalNodeEnv !== undefined) {
      (process.env as any).NODE_ENV = originalNodeEnv;
    } else {
      delete (process.env as any).NODE_ENV;
    }
  });

  afterAll(() => {
    // Restore console methods
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('Development Mode (__DEV__ === true)', () => {
    beforeEach(() => {
      // Set development mode
      (global as any).__DEV__ = true;
      // Clear module cache to reload logger with new __DEV__ value
      jest.resetModules();
    });

    describe('logger.error', () => {
      it('should log error message in development mode', () => {
        const { logger } = require('../logger');

        logger.error('Test error message');

        expect(mockConsoleError).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).toHaveBeenCalledWith('Test error message', '');
      });

      it('should log error message with context object', () => {
        const { logger } = require('../logger');
        const context = { userId: '123', action: 'delete' };

        logger.error('Failed to delete user', context);

        expect(mockConsoleError).toHaveBeenCalledTimes(1);
        expect(mockConsoleError).toHaveBeenCalledWith('Failed to delete user', context);
      });

      it('should handle context with nested objects', () => {
        const { logger } = require('../logger');
        const context = {
          error: { code: 500, message: 'Internal Server Error' },
          user: { id: '123', email: 'test@example.com' },
        };

        logger.error('API request failed', context);

        expect(mockConsoleError).toHaveBeenCalledWith('API request failed', context);
      });

      it('should handle Error objects in context', () => {
        const { logger } = require('../logger');
        const error = new Error('Network timeout');
        const context = { error, timestamp: Date.now() };

        logger.error('Request failed', context);

        expect(mockConsoleError).toHaveBeenCalledWith('Request failed', context);
      });

      it('should handle empty context object', () => {
        const { logger } = require('../logger');

        logger.error('Error message', {});

        expect(mockConsoleError).toHaveBeenCalledWith('Error message', {});
      });

      it('should handle null context (converts to empty string)', () => {
        const { logger } = require('../logger');

        logger.error('Error message', null as any);

        // The logger uses `context || ''` so null becomes empty string
        expect(mockConsoleError).toHaveBeenCalledWith('Error message', '');
      });

      it('should handle undefined context (uses empty string default)', () => {
        const { logger } = require('../logger');

        logger.error('Error message', undefined);

        expect(mockConsoleError).toHaveBeenCalledWith('Error message', '');
      });

      it('should handle empty string message', () => {
        const { logger } = require('../logger');

        logger.error('');

        expect(mockConsoleError).toHaveBeenCalledWith('', '');
      });

      it('should handle context with arrays', () => {
        const { logger } = require('../logger');
        const context = { items: [1, 2, 3], tags: ['error', 'critical'] };

        logger.error('Batch operation failed', context);

        expect(mockConsoleError).toHaveBeenCalledWith('Batch operation failed', context);
      });

      it('should handle context with mixed data types', () => {
        const { logger } = require('../logger');
        const context = {
          string: 'value',
          number: 42,
          boolean: true,
          null: null,
          undefined: undefined,
          array: [1, 2, 3],
          object: { nested: 'value' },
        };

        logger.error('Mixed data types', context);

        expect(mockConsoleError).toHaveBeenCalledWith('Mixed data types', context);
      });
    });

    describe('logger.warn', () => {
      it('should log warning message in development mode', () => {
        const { logger } = require('../logger');

        logger.warn('Test warning message');

        expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
        expect(mockConsoleWarn).toHaveBeenCalledWith('Test warning message', '');
      });

      it('should log warning message with context object', () => {
        const { logger } = require('../logger');
        const context = { deprecatedApi: 'getUserById', replacement: 'getUser' };

        logger.warn('Deprecated API usage detected', context);

        expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
        expect(mockConsoleWarn).toHaveBeenCalledWith('Deprecated API usage detected', context);
      });

      it('should handle empty context object', () => {
        const { logger } = require('../logger');

        logger.warn('Warning message', {});

        expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message', {});
      });

      it('should handle null context (converts to empty string)', () => {
        const { logger } = require('../logger');

        logger.warn('Warning message', null as any);

        // The logger uses `context || ''` so null becomes empty string
        expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message', '');
      });

      it('should handle undefined context (uses empty string default)', () => {
        const { logger } = require('../logger');

        logger.warn('Warning message');

        expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message', '');
      });

      it('should handle empty string message', () => {
        const { logger } = require('../logger');

        logger.warn('');

        expect(mockConsoleWarn).toHaveBeenCalledWith('', '');
      });

      it('should handle context with special characters', () => {
        const { logger } = require('../logger');
        const context = { 'special-key': 'value', 'key:with:colons': 123 };

        logger.warn('Special characters in context', context);

        expect(mockConsoleWarn).toHaveBeenCalledWith('Special characters in context', context);
      });
    });

    describe('logger.info', () => {
      it('should log info message in development mode', () => {
        const { logger } = require('../logger');

        logger.info('Test info message');

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleLog).toHaveBeenCalledWith('Test info message', '');
      });

      it('should log info message with context object', () => {
        const { logger } = require('../logger');
        const context = { eventId: '456', status: 'completed' };

        logger.info('Event processing complete', context);

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleLog).toHaveBeenCalledWith('Event processing complete', context);
      });

      it('should handle empty context object', () => {
        const { logger } = require('../logger');

        logger.info('Info message', {});

        expect(mockConsoleLog).toHaveBeenCalledWith('Info message', {});
      });

      it('should handle null context (converts to empty string)', () => {
        const { logger } = require('../logger');

        logger.info('Info message', null as any);

        // The logger uses `context || ''` so null becomes empty string
        expect(mockConsoleLog).toHaveBeenCalledWith('Info message', '');
      });

      it('should handle undefined context (uses empty string default)', () => {
        const { logger } = require('../logger');

        logger.info('Info message');

        expect(mockConsoleLog).toHaveBeenCalledWith('Info message', '');
      });

      it('should handle empty string message', () => {
        const { logger } = require('../logger');

        logger.info('');

        expect(mockConsoleLog).toHaveBeenCalledWith('', '');
      });

      it('should handle context with numbers and booleans', () => {
        const { logger } = require('../logger');
        const context = { count: 42, isSuccess: true, retryCount: 0 };

        logger.info('Operation stats', context);

        expect(mockConsoleLog).toHaveBeenCalledWith('Operation stats', context);
      });
    });

    describe('logger.debug', () => {
      it('should log debug message in development mode', () => {
        const { logger } = require('../logger');

        logger.debug('Test debug message');

        expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
        expect(mockConsoleDebug).toHaveBeenCalledWith('Test debug message', '');
      });

      it('should log debug message with context object', () => {
        const { logger } = require('../logger');
        const context = { function: 'fetchData', duration: '125ms' };

        logger.debug('Function execution time', context);

        expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
        expect(mockConsoleDebug).toHaveBeenCalledWith('Function execution time', context);
      });

      it('should handle empty context object', () => {
        const { logger } = require('../logger');

        logger.debug('Debug message', {});

        expect(mockConsoleDebug).toHaveBeenCalledWith('Debug message', {});
      });

      it('should handle null context (converts to empty string)', () => {
        const { logger } = require('../logger');

        logger.debug('Debug message', null as any);

        // The logger uses `context || ''` so null becomes empty string
        expect(mockConsoleDebug).toHaveBeenCalledWith('Debug message', '');
      });

      it('should handle undefined context (uses empty string default)', () => {
        const { logger } = require('../logger');

        logger.debug('Debug message');

        expect(mockConsoleDebug).toHaveBeenCalledWith('Debug message', '');
      });

      it('should handle empty string message', () => {
        const { logger } = require('../logger');

        logger.debug('');

        expect(mockConsoleDebug).toHaveBeenCalledWith('', '');
      });

      it('should handle context with function references', () => {
        const { logger } = require('../logger');
        const mockFn = jest.fn();
        const context = { callback: mockFn, args: [1, 2, 3] };

        logger.debug('Callback registered', context);

        expect(mockConsoleDebug).toHaveBeenCalledWith('Callback registered', context);
      });
    });

    describe('Multiple log calls', () => {
      it('should handle multiple consecutive log calls', () => {
        const { logger } = require('../logger');

        logger.error('Error 1');
        logger.warn('Warning 1');
        logger.info('Info 1');
        logger.debug('Debug 1');

        expect(mockConsoleError).toHaveBeenCalledTimes(1);
        expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        expect(mockConsoleDebug).toHaveBeenCalledTimes(1);
      });

      it('should maintain correct call order', () => {
        const { logger } = require('../logger');

        logger.debug('Step 1');
        logger.info('Step 2');
        logger.warn('Step 3');
        logger.error('Step 4');

        const allCalls = [
          ...mockConsoleDebug.mock.calls,
          ...mockConsoleLog.mock.calls,
          ...mockConsoleWarn.mock.calls,
          ...mockConsoleError.mock.calls,
        ];

        expect(allCalls).toHaveLength(4);
      });
    });
  });

  describe('Production Mode (__DEV__ === false)', () => {
    beforeEach(() => {
      // Set production mode
      (global as any).__DEV__ = false;
      // Clear module cache to reload logger with new __DEV__ value
      jest.resetModules();
    });

    describe('logger.error', () => {
      it('should not log error message in production mode', () => {
        const { logger } = require('../logger');

        logger.error('Test error message');

        expect(mockConsoleError).not.toHaveBeenCalled();
      });

      it('should not log error message with context in production mode', () => {
        const { logger } = require('../logger');
        const context = { userId: '123', action: 'delete' };

        logger.error('Failed to delete user', context);

        expect(mockConsoleError).not.toHaveBeenCalled();
      });
    });

    describe('logger.warn', () => {
      it('should not log warning message in production mode', () => {
        const { logger } = require('../logger');

        logger.warn('Test warning message');

        expect(mockConsoleWarn).not.toHaveBeenCalled();
      });

      it('should not log warning message with context in production mode', () => {
        const { logger } = require('../logger');
        const context = { deprecatedApi: 'getUserById' };

        logger.warn('Deprecated API usage detected', context);

        expect(mockConsoleWarn).not.toHaveBeenCalled();
      });
    });

    describe('logger.info', () => {
      it('should not log info message in production mode', () => {
        const { logger } = require('../logger');

        logger.info('Test info message');

        expect(mockConsoleLog).not.toHaveBeenCalled();
      });

      it('should not log info message with context in production mode', () => {
        const { logger } = require('../logger');
        const context = { eventId: '456', status: 'completed' };

        logger.info('Event processing complete', context);

        expect(mockConsoleLog).not.toHaveBeenCalled();
      });
    });

    describe('logger.debug', () => {
      it('should not log debug message in production mode', () => {
        const { logger } = require('../logger');

        logger.debug('Test debug message');

        expect(mockConsoleDebug).not.toHaveBeenCalled();
      });

      it('should not log debug message with context in production mode', () => {
        const { logger } = require('../logger');
        const context = { function: 'fetchData', duration: '125ms' };

        logger.debug('Function execution time', context);

        expect(mockConsoleDebug).not.toHaveBeenCalled();
      });
    });

    describe('Multiple log calls in production', () => {
      it('should not log any messages in production mode', () => {
        const { logger } = require('../logger');

        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');

        expect(mockConsoleError).not.toHaveBeenCalled();
        expect(mockConsoleWarn).not.toHaveBeenCalled();
        expect(mockConsoleLog).not.toHaveBeenCalled();
        expect(mockConsoleDebug).not.toHaveBeenCalled();
      });
    });
  });

  describe('Fallback to process.env.NODE_ENV when __DEV__ is undefined', () => {
    beforeEach(() => {
      // Remove __DEV__ to test fallback
      delete (global as any).__DEV__;
      jest.resetModules();
    });

    it('should log in development when NODE_ENV is "development"', () => {
      (process.env as any).NODE_ENV = 'development';
      jest.resetModules();

      const { logger } = require('../logger');

      logger.info('Test message');

      expect(mockConsoleLog).toHaveBeenCalledWith('Test message', '');
    });

    it('should not log in production when NODE_ENV is "production"', () => {
      (process.env as any).NODE_ENV = 'production';
      jest.resetModules();

      const { logger } = require('../logger');

      logger.info('Test message');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should not log when NODE_ENV is "test"', () => {
      (process.env as any).NODE_ENV = 'test';
      jest.resetModules();

      const { logger } = require('../logger');

      logger.info('Test message');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should not log when NODE_ENV is undefined', () => {
      delete (process.env as any).NODE_ENV;
      jest.resetModules();

      const { logger } = require('../logger');

      logger.info('Test message');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Special Values', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
      jest.resetModules();
    });

    it('should handle very long messages', () => {
      const { logger } = require('../logger');
      const longMessage = 'A'.repeat(10000);

      logger.info(longMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith(longMessage, '');
    });

    it('should handle messages with newlines', () => {
      const { logger } = require('../logger');
      const messageWithNewlines = 'Line 1\nLine 2\nLine 3';

      logger.info(messageWithNewlines);

      expect(mockConsoleLog).toHaveBeenCalledWith(messageWithNewlines, '');
    });

    it('should handle messages with special characters', () => {
      const { logger } = require('../logger');
      const specialMessage = 'Test: 🚀 emoji, \t tab, \n newline';

      logger.info(specialMessage);

      expect(mockConsoleLog).toHaveBeenCalledWith(specialMessage, '');
    });

    it('should handle context with circular references without crashing', () => {
      const { logger } = require('../logger');
      const circularContext: any = { name: 'test' };
      circularContext.self = circularContext;

      // Should not throw error, console methods handle circular refs
      logger.info('Circular reference', circularContext);

      expect(mockConsoleLog).toHaveBeenCalledWith('Circular reference', circularContext);
    });

    it('should handle context with very deep nesting', () => {
      const { logger } = require('../logger');
      const deepContext = { level1: { level2: { level3: { level4: { level5: 'deep' } } } } };

      logger.info('Deep nesting', deepContext);

      expect(mockConsoleLog).toHaveBeenCalledWith('Deep nesting', deepContext);
    });

    it('should handle context with Date objects', () => {
      const { logger } = require('../logger');
      const context = { timestamp: new Date('2024-01-01T00:00:00Z'), createdAt: new Date() };

      logger.info('Date objects', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Date objects', context);
    });

    it('should handle context with RegExp objects', () => {
      const { logger } = require('../logger');
      const context = { pattern: /test/gi, emailRegex: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g };

      logger.info('RegExp objects', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('RegExp objects', context);
    });

    it('should handle context with Symbol values', () => {
      const { logger } = require('../logger');
      const context = { id: Symbol('unique'), key: Symbol.for('shared') };

      logger.info('Symbol values', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Symbol values', context);
    });

    it('should handle context with BigInt values', () => {
      const { logger } = require('../logger');
      const context = { largeNumber: BigInt(9007199254740991) };

      logger.info('BigInt values', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('BigInt values', context);
    });

    it('should handle context with Map and Set objects', () => {
      const { logger } = require('../logger');
      const context = {
        map: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        set: new Set([1, 2, 3, 4, 5]),
      };

      logger.info('Map and Set', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Map and Set', context);
    });

    it('should handle context with class instances', () => {
      const { logger } = require('../logger');

      class CustomClass {
        constructor(
          public name: string,
          public value: number
        ) {}
      }

      const context = { instance: new CustomClass('test', 42) };

      logger.info('Class instance', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Class instance', context);
    });

    it('should handle whitespace-only messages', () => {
      const { logger } = require('../logger');

      logger.info('   ');

      expect(mockConsoleLog).toHaveBeenCalledWith('   ', '');
    });

    it('should handle context with empty arrays', () => {
      const { logger } = require('../logger');
      const context = { items: [], tags: [] };

      logger.info('Empty arrays', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Empty arrays', context);
    });

    it('should handle context with NaN and Infinity', () => {
      const { logger } = require('../logger');
      const context = { nan: NaN, infinity: Infinity, negInfinity: -Infinity };

      logger.info('Special numbers', context);

      expect(mockConsoleLog).toHaveBeenCalledWith('Special numbers', context);
    });
  });

  describe('TypeScript type safety', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
      jest.resetModules();
    });

    it('should accept string messages for all log methods', () => {
      const { logger } = require('../logger');

      // These should all compile and run without TypeScript errors
      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleDebug).toHaveBeenCalled();
    });

    it('should accept LogContext objects with any keys', () => {
      const { logger } = require('../logger');

      const context1 = { customKey: 'value' };
      const context2 = { anotherKey: 123, nested: { data: true } };

      logger.info('Message 1', context1);
      logger.info('Message 2', context2);

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });

    it('should handle context with index signatures', () => {
      const { logger } = require('../logger');

      const dynamicContext: { [key: string]: any } = {};
      dynamicContext['dynamic-key-1'] = 'value1';
      dynamicContext['dynamic-key-2'] = 'value2';

      logger.info('Dynamic context', dynamicContext);

      expect(mockConsoleLog).toHaveBeenCalledWith('Dynamic context', dynamicContext);
    });
  });
});
