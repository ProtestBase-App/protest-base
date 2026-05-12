/**
 * Jest configuration for CI - runs utility tests + integration tests
 * For faster CI pipeline while maintaining real bug-catching coverage
 *
 * Run locally with: npm run test:ci
 * Full test suite: npm test
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  testMatch: [
    // Utils - Pure logic tests (no mocks)
    '<rootDir>/utils/__tests__/**/*.test.{ts,tsx}',

    // Locale tests - Real translation key validation
    '<rootDir>/constants/locales/__tests__/**/*.test.{ts,tsx}',

    // Integration tests - Real providers with mocked API boundary
    '<rootDir>/__integration_tests__/**/*.test.{ts,tsx}',

    // Component tests
    '<rootDir>/components/__tests__/**/*.test.{ts,tsx}',

    // Context provider tests
    '<rootDir>/context/__tests__/**/*.test.{ts,tsx}',

    // Hook tests - custom hooks logic
    '<rootDir>/hooks/__tests__/**/*.test.{ts,tsx}',

    // Service tests - API boundary, error handling
    '<rootDir>/services/__tests__/**/*.test.{ts,tsx}',

    // Screen tests
    '<rootDir>/app/__tests__/**/*.test.{ts,tsx}',
  ],

  testPathIgnorePatterns: ['/node_modules/', '\\.bak'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|i18n-js|make-plural)',
  ],

  // No coverage collection in CI for speed
  collectCoverage: false,
};
