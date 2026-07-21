// Dedicated flat config for the CI accessibility sweep (advisory step in
// .github/workflows/ci.yml). Separate from eslint.config.js so the ~500-warning
// main lint output stays free of a11y noise while the CI step still reports it.
// Run: npx eslint "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" --config eslint.a11y.config.js
const { defineConfig } = require('eslint/config');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');
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
    plugins: { 'react-native-a11y': reactNativeA11y },
    // "all" = basic + iOS + Android rule sets (14 rules).
    rules: reactNativeA11y.configs.all.rules,
  },
]);
