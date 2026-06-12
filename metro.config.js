// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

// TODO(expo >= 56.0.12): remove once expo/expo#46806 ships a fix.
// expo 56.0.10's async-require runtime (PR expo/expo#46539) broke dynamic
// import() of lazy-split chunks on native in DEV ("Requiring unknown module
// ...") — it hits the postal-code datasets loaded by
// context/PostalCodeProvider.tsx. Disabling dev lazy bundling bypasses the
// broken client runtime path entirely. Production/EAS exports are unaffected
// either way (the CLI forces lazy bundling off for exports).
process.env.EXPO_NO_METRO_LAZY = '1';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
