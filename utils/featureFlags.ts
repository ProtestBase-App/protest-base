import * as Application from 'expo-application';
import Constants from 'expo-constants';

export function getAppEnv(): 'development' | 'preview' | 'production' {
  return (
    (Constants.expoConfig?.extra?.appEnv as 'development' | 'preview' | 'production' | undefined) ||
    'development'
  );
}

// The store app's identifier on both platforms. It is native, so unlike the
// bundle's appEnv no over-the-air update can change it.
const PRODUCTION_APPLICATION_ID = 'be.protestbase.app';

/**
 * Luxembourg can be picked (country chip, location filters, home area) only in
 * development and preview builds until the backend, admin tools and website are
 * live for it in production. Events already set to Luxembourg always display.
 */
export function isLuxembourgEnabled(): boolean {
  if (Application.applicationId === PRODUCTION_APPLICATION_ID) return false;
  return getAppEnv() !== 'production';
}
