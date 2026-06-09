import * as SecureStore from 'expo-secure-store';

/**
 * Shared accessibility options for every SecureStore write.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the same access timing as the
 * expo-secure-store default (`WHEN_UNLOCKED`) — items are readable only while
 * the device is unlocked, which matches the app's foreground-only usage — but
 * adds the `THIS_DEVICE_ONLY` guarantee: the Keychain/Keystore entries are NOT
 * included in encrypted iCloud/Google device-transfer backups, so a thief or a
 * forensic device-migration cannot lift auth tokens or the politically
 * sensitive interest lists onto another device.
 */
export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
