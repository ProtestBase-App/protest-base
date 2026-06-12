module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.streams-fix.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    // Utility tests (pure logic, no mocks)
    '<rootDir>/utils/__tests__/**/*.test.{ts,tsx}',
    // Constants tests (pure value validation)
    '<rootDir>/constants/__tests__/**/*.test.{ts,tsx}',
    // Locale tests (real translation key validation)
    '<rootDir>/constants/locales/__tests__/**/*.test.{ts,tsx}',
    // Integration tests (real providers, mocked API boundary)
    '<rootDir>/__integration_tests__/**/*.test.{ts,tsx}',
    // Component tests
    '<rootDir>/components/**/__tests__/**/*.test.{ts,tsx}',
    // Hook tests
    '<rootDir>/hooks/**/__tests__/**/*.test.{ts,tsx}',
    // Service tests
    '<rootDir>/services/**/__tests__/**/*.test.{ts,tsx}',
    // Context tests
    '<rootDir>/context/**/__tests__/**/*.test.{ts,tsx}',
    // Screen tests
    '<rootDir>/app/**/__tests__/**/*.test.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '\\.bak'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transformIgnorePatterns: [
    // DO NOT MODIFY THIS PATTERN
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@sentry/react-native|native-base|react-native-svg|i18n-js|make-plural|standard-navigation)',
  ],
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    // Screens are complex — add once component/hook/service coverage is solid
    // 'app/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__integration_tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.bak*',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
    '!**/jest.config.js',
    '!**/app.config.ts',
    // Config and bootstrap files not suitable for unit testing
    '!**/constants/Colors.ts',
    '!**/utils/logger.ts',
    // Example files and bare re-exports that cannot be instrumented
    '!**/utils/i18n.example.tsx',
    '!**/hooks/useColorScheme.ts',
    // PostalCodeProvider uses dynamic import() branches that Jest CommonJS mode cannot exercise
    '!**/context/PostalCodeProvider.tsx',
    // Barrel re-export files have no logic to test
    '!**/components/version/index.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  coverageDirectory: 'coverage',
};
