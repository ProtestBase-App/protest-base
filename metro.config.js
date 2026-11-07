// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// In development Expo loads every root `.env*` file Metro can see, but only parses the standard
// names. Any other one (a local test-account file, say) is compiled as JavaScript: the bundle
// fails and the error prints the file's contents. Hide those from Metro.
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  /(^|[\\/])\.env\.(?!(?:local|development|production)(?:\.local)?$)[^\\/]+$/,
];

module.exports = config;
