// Dedicated flat config for the CI accessibility sweep (advisory step in
// .github/workflows/ci.yml). Separate from eslint.config.js so the ~500-warning
// main lint output stays free of a11y noise while the CI step still reports it.
// Run: npx eslint "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" --config eslint.a11y.config.js
const { defineConfig } = require('eslint/config');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');
const reactHooks = require('eslint-plugin-react-hooks');
const tsParser = require('@typescript-eslint/parser');

module.exports = defineConfig([
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**', '**/*.test.*'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    // A single-plugin sweep sees every other rule's disable comment as unused.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { 'react-native-a11y': reactNativeA11y, 'react-hooks': reactHooks },
    // "all" = basic + iOS + Android rule sets (14 rules). react-hooks is registered only
    // so that eslint-disable comments naming its rules resolve; this sweep does not run it.
    rules: { ...reactNativeA11y.configs.all.rules, 'react-hooks/exhaustive-deps': 'off' },
  },
]);
