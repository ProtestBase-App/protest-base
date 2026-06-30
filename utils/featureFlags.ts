import Constants from 'expo-constants';

export function getAppEnv(): 'development' | 'preview' | 'production' {
  return (
    (Constants.expoConfig?.extra?.appEnv as 'development' | 'preview' | 'production' | undefined) ||
    'development'
  );
}

// A function, not a const: tests flip the mutable expo-constants mock, which a
// value captured at import time would never see.
export function screenCaptureProtectionEnabled(): boolean {
  return getAppEnv() === 'production' && Constants.expoConfig?.extra?.allowScreenshots !== true;
}
