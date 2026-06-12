// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-config-expo 56 ships eslint-plugin-react-hooks v7, whose new
    // React-Compiler-powered rules flag ~56 pre-existing patterns (latest-ref
    // mirrors, setState-in-effect, manual memoization) as errors. Keep them
    // visible as warnings and fix opportunistically when editing those files;
    // promote back to errors once the codebase is clean.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.*', 'test-utils/**'],
    rules: {
      'react/display-name': 'off',
    },
  },
]);
